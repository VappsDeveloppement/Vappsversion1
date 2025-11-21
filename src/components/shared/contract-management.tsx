
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, useFirestore, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { RichTextEditor } from '../ui/rich-text-editor';

type Contract = {
  id: string;
  title: string;
  content: string;
  counselorId: string;
};

const contractSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.'),
  content: z.string().min(50, 'Le contenu doit avoir au moins 50 caractères.'),
});

type ContractFormData = z.infer<typeof contractSchema>;

export function ContractManagement() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const contractsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'contracts'), where('counselorId', '==', user.uid));
  }, [firestore, user]);

  const { data: contracts, isLoading: areContractsLoading } = useCollection<Contract>(contractsCollectionRef);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    form.reset(contract);
    setIsSheetOpen(true);
  };
  
  const handleNew = () => {
    setEditingContract(null);
    form.reset({ title: '', content: '' });
    setIsSheetOpen(true);
  }

  const handleDelete = (contractId: string) => {
    if(!user) return;
    const contractDocRef = doc(firestore, 'contracts', contractId);
    deleteDocumentNonBlocking(contractDocRef);
    toast({ title: 'Contrat supprimé', description: 'Le modèle de contrat a été supprimé.' });
  };


  const onSubmit = async (data: ContractFormData) => {
    if(!user) return;
    setIsSubmitting(true);
    
    const contractData = { 
        ...data,
        counselorId: user.uid
    };

    try {
      if (editingContract) {
        const contractDocRef = doc(firestore, 'contracts', editingContract.id);
        await setDocumentNonBlocking(contractDocRef, contractData, { merge: true });
        toast({ title: 'Contrat mis à jour', description: 'Le modèle de contrat a été mis à jour.' });
      } else {
        const contractsCollectionRef = collection(firestore, 'contracts');
        await addDocumentNonBlocking(contractsCollectionRef, contractData);
        toast({ title: 'Contrat créé', description: 'Le nouveau modèle de contrat a été créé.' });
      }
      setIsSheetOpen(false);
      setEditingContract(null);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isLoading = areContractsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Gestion des Modèles de Contrats</CardTitle>
            <CardDescription>
              Créez et gérez vos modèles de contrats à attacher à vos devis.
            </CardDescription>
          </div>
           <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button onClick={handleNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouveau Modèle
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-3xl w-full overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{editingContract ? 'Modifier le Modèle de Contrat' : 'Créer un Nouveau Modèle'}</SheetTitle>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Titre du contrat</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Contrat de prestation de service" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contenu du contrat</FormLabel>
                                    <FormControl>
                                        <RichTextEditor content={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <SheetFooter className="pt-6">
                            <SheetClose asChild>
                                <Button type="button" variant="outline">Annuler</Button>
                            </SheetClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingContract ? 'Sauvegarder les modifications' : 'Créer le modèle'}
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={2}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                ))
            ) : contracts && contracts.length > 0 ? (
                contracts.map((contract) => (
                    <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.title}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(contract.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Aucun modèle de contrat créé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
