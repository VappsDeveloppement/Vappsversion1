
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, useFirestore, useUser } from '@/firebase';
import { collection, doc, query, where, writeBatch, getDocs } from 'firebase/firestore';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Edit, Loader2, Upload, Star } from 'lucide-react';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Assuming Contract type is defined elsewhere and imported
interface Contract {
    id: string;
    title: string;
    content: string;
}


export type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  period: string;
  features: string[];
  isFeatured: boolean;
  isPublic: boolean;
  imageUrl?: string;
  cta?: string;
  counselorId?: string;
  contractId?: string;
};

const planSchema = z.object({
  name: z.string().min(1, 'Le titre est requis.'),
  description: z.string().optional(),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().min(0, "Le prix doit être un nombre positif.")
  ),
  period: z.string().min(1, 'La période est requise (ex: /prestation).'),
  features: z.array(z.object({ value: z.string() })).default([]),
  imageUrl: z.string().optional(),
  cta: z.string().optional(),
  contractId: z.string().optional(),
  isPublic: z.boolean().default(false).optional(),
  isFeatured: z.boolean().default(false).optional(),
});

type PlanFormData = z.infer<typeof planSchema>;

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});

export function PlanManagement() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const plansCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'plans'), where('counselorId', '==', user.uid));
  }, [firestore, user]);

  const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(plansCollectionRef);

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'contracts'), where('counselorId', '==', user.uid));
  }, [firestore, user]);

  const { data: contracts, isLoading: areContractsLoading } = useCollection<Contract>(contractsQuery);

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      period: '/prestation',
      features: [],
      imageUrl: '',
      cta: 'Choisir cette formule',
      contractId: 'none',
      isPublic: false,
      isFeatured: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'features',
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSheetOpen) {
      if (editingPlan) {
          form.reset({
              ...editingPlan,
              price: editingPlan.price || 0,
              features: editingPlan.features.map(f => ({ value: f })),
              cta: editingPlan.cta || 'Choisir cette formule',
              contractId: editingPlan.contractId || 'none'
          });
          setImagePreview(editingPlan.imageUrl || null);
      } else {
          form.reset({
              name: '',
              description: '',
              price: 0,
              period: '/prestation',
              features: [],
              imageUrl: '',
              cta: 'Choisir cette formule',
              contractId: 'none',
              isPublic: false,
              isFeatured: false,
          });
          setImagePreview(null);
      }
    }
  }, [editingPlan, isSheetOpen, form]);


  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsSheetOpen(true);
  };
  
  const handleNew = () => {
    setEditingPlan(null);
    setIsSheetOpen(true);
  }

  const handleDelete = (planId: string) => {
    if(!user) return;
    const planDocRef = doc(firestore, 'plans', planId);
    deleteDocumentNonBlocking(planDocRef);
    toast({ title: 'Plan supprimé', description: 'Le modèle de prestation a été supprimé.' });
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      setImagePreview(base64);
      form.setValue('imageUrl', base64);
    }
  };


  const onSubmit = async (data: PlanFormData) => {
    if(!user) return;
    setIsSubmitting(true);
    
    const planData = {
      ...data,
      features: data.features.map(f => f.value),
      counselorId: user.uid,
      contractId: data.contractId === 'none' ? undefined : data.contractId,
    };

    if (planData.contractId === undefined) {
      delete (planData as Partial<typeof planData>).contractId;
    }


    const batch = writeBatch(firestore);

    try {
      if (planData.isFeatured && planData.isPublic) {
          const publicPlansQuery = query(collection(firestore, 'plans'), where("isPublic", "==", true), where("counselorId", "==", user.uid));
          const querySnapshot = await getDocs(publicPlansQuery);
          querySnapshot.forEach(docSnap => {
              if (docSnap.id !== editingPlan?.id) {
                  const planRef = doc(firestore, 'plans', docSnap.id);
                  batch.update(planRef, { isFeatured: false });
              }
          });
      }


      if (editingPlan) {
        const planDocRef = doc(firestore, 'plans', editingPlan.id);
        batch.set(planDocRef, planData, { merge: true });
        toast({ title: 'Modèle mis à jour', description: 'Le modèle de prestation a été mis à jour.' });
      } else {
        const newPlanRef = doc(collection(firestore, 'plans'));
        batch.set(newPlanRef, planData);
        toast({ title: 'Modèle créé', description: 'Le nouveau modèle de prestation a été créé.' });
      }

      await batch.commit();

      setIsSheetOpen(false);
      setEditingPlan(null);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isLoading = arePlansLoading || areContractsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Gestion des Modèles de Prestation</CardTitle>
            <CardDescription>
              Créez des prestations réutilisables pour les ajouter rapidement à vos devis.
            </CardDescription>
          </div>
           <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button onClick={handleNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouveau Modèle
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{editingPlan ? 'Modifier le Modèle' : 'Créer un Nouveau Modèle'}</SheetTitle>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Titre du modèle</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Bilan de compétences" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prix</FormLabel>
                                    <FormControl>
                                    <Input type="number" step="0.01" placeholder="500.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="period"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Période</FormLabel>
                                    <FormControl>
                                    <Input placeholder="/prestation" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description courte</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Pour faire le point sur sa carrière..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div>
                            <FormLabel>Caractéristiques (puces)</FormLabel>
                            <div className="space-y-2 mt-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`features.${index}.value`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                             <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })} className="mt-2">
                                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une caractéristique
                            </Button>
                        </div>
                        
                        <div>
                          <FormLabel>Image du modèle (optionnel)</FormLabel>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                              {imagePreview ? (
                                <Image src={imagePreview} alt="Aperçu du plan" layout="fill" objectFit="cover" />
                              ) : (
                                <span className="text-xs text-muted-foreground">Aucune image</span>
                              )}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                            <div className='flex flex-col gap-2'>
                              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" /> Uploader
                              </Button>
                              <Button type="button" variant="destructive" size="sm" onClick={() => {
                                setImagePreview(null);
                                form.setValue('imageUrl', '');
                              }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                              </Button>
                            </div>
                          </div>
                        </div>

                         <FormField
                            control={form.control}
                            name="cta"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Texte du bouton d'action</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Choisir cette formule" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="contractId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contrat à lier (Optionnel)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value || 'none'}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un contrat à associer..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Aucun contrat</SelectItem>
                                            {(contracts || []).map((contract) => (
                                                <SelectItem key={contract.id} value={contract.id}>
                                                    {contract.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Si un contrat est lié, il sera présenté à l'utilisateur lors de la sélection du plan.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                         <FormField
                            control={form.control}
                            name="isPublic"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Affichage public</FormLabel>
                                    <FormDescription>
                                    Rendre ce modèle sélectionnable sur votre mini-site ou la page d'accueil principale.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isFeatured"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Le plus populaire</FormLabel>
                                    <FormDescription>
                                       Mettre ce plan en avant sur les pages publiques. Un seul plan peut être populaire.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />

                        <SheetFooter className="pt-6">
                            <SheetClose asChild>
                                <Button type="button" variant="outline">Annuler</Button>
                            </SheetClose>
                            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingPlan ? 'Sauvegarder les modifications' : 'Créer le modèle'}
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
              <TableHead>Nom du Modèle</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Populaire</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                ))
            ) : plans && plans.length > 0 ? (
                plans.map((plan) => (
                    <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{plan.price}€ {plan.period}</TableCell>
                        <TableCell>
                           <Badge variant={plan.isPublic ? 'default' : 'secondary'}>
                              {plan.isPublic ? 'Oui' : 'Non'}
                           </Badge>
                        </TableCell>
                        <TableCell>
                           {plan.isFeatured ? <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /> : <Star className="h-5 w-5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Aucun modèle de prestation créé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
