
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { RichTextEditor } from '../ui/rich-text-editor';
import { ScrollArea } from '../ui/scroll-area';

const contractFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, "Le titre est requis."),
    content: z.string().min(50, "Le contenu doit avoir au moins 50 caractères."),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

export type Contract = {
    id: string;
    counselorId: string;
    title: string;
    content: string;
};

export function ContractManagement() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);

    const contractsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'contracts'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: contracts, isLoading: areContractsLoading } = useCollection<Contract>(contractsQuery);
    
    const form = useForm<ContractFormData>({
        resolver: zodResolver(contractFormSchema),
    });

    useEffect(() => {
        if (isSheetOpen) {
            if (editingContract) {
                form.reset(editingContract);
            } else {
                form.reset({ title: '', content: '' });
            }
        }
    }, [isSheetOpen, editingContract, form]);

    const handleNewContract = () => {
        setEditingContract(null);
        setIsSheetOpen(true);
    };

    const handleEditContract = (contract: Contract) => {
        setEditingContract(contract);
        setIsSheetOpen(true);
    };
    
    const handleDeleteContract = (contractId: string) => {
        const contractRef = doc(firestore, 'contracts', contractId);
        deleteDocumentNonBlocking(contractRef);
        toast({ title: "Contrat supprimé" });
    };

    const onSubmit = (data: ContractFormData) => {
        if (!user) return;
        const contractData = {
            counselorId: user.uid,
            title: data.title,
            content: data.content,
        };

        if (editingContract) {
            const contractRef = doc(firestore, 'contracts', editingContract.id);
            setDocumentNonBlocking(contractRef, contractData, { merge: true });
            toast({ title: "Contrat mis à jour" });
        } else {
            addDocumentNonBlocking(collection(firestore, 'contracts'), contractData);
            toast({ title: "Contrat créé" });
        }
        setIsSheetOpen(false);
    };
    
    return (
         <div>
            <div className="flex justify-end items-center mb-4">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button type="button" onClick={handleNewContract}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-3xl w-full">
                        <SheetHeader>
                            <SheetTitle>{editingContract ? 'Modifier le' : 'Nouveau'} modèle de contrat</SheetTitle>
                        </SheetHeader>
                         <ScrollArea className="h-[calc(100vh-8rem)]">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre du contrat</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="content" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contenu du contrat</FormLabel>
                                            <FormControl>
                                                <RichTextEditor content={field.value || ''} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <SheetFooter className="pt-6">
                                        <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                        <Button type="submit">Sauvegarder</Button>
                                    </SheetFooter>
                                </form>
                            </Form>
                         </ScrollArea>
                    </SheetContent>
                </Sheet>
            </div>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Titre</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {areContractsLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-10 w-full" /></TableCell></TableRow> 
                        : contracts && contracts.length > 0 ? (
                            contracts.map(contract => (
                                <TableRow key={contract.id}>
                                    <TableCell className="font-medium">{contract.title}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditContract(contract)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteContract(contract.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground h-24">Aucun contrat créé.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
