
'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAgency } from '@/context/agency-provider';
import { useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Edit, Loader2, Upload } from 'lucide-react';
import Image from 'next/image';

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  period: string;
  features: string[];
  appointmentCredits: number;
  isFeatured: boolean;
  imageUrl?: string;
};

const planSchema = z.object({
  name: z.string().min(1, 'Le titre est requis.'),
  description: z.string().optional(),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive('Le prix doit être positif.')
  ),
  period: z.string().min(1, 'La période est requise (ex: /mois).'),
  features: z.array(z.object({ value: z.string() })).default([]),
  appointmentCredits: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().int().min(0, 'Les crédits doivent être positifs.')
  ),
  isFeatured: z.boolean().default(false),
  imageUrl: z.string().optional(),
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
  const { agency, isLoading: isAgencyLoading } = useAgency();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const plansCollectionRef = useMemoFirebase(() => {
    if (!agency) return null;
    return collection(firestore, 'agencies', agency.id, 'plans');
  }, [agency, firestore]);

  const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(plansCollectionRef);

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      period: '/mois',
      features: [],
      appointmentCredits: 0,
      isFeatured: false,
      imageUrl: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'features',
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    form.reset({
      ...plan,
      features: plan.features.map(f => ({ value: f })),
    });
    setImagePreview(plan.imageUrl || null);
    setIsSheetOpen(true);
  };
  
  const handleNew = () => {
    setEditingPlan(null);
    form.reset({
      name: '',
      description: '',
      price: 0,
      period: '/mois',
      features: [],
      appointmentCredits: 0,
      isFeatured: false,
      imageUrl: '',
    });
    setImagePreview(null);
    setIsSheetOpen(true);
  }

  const handleDelete = (planId: string) => {
    if (!agency) return;
    const planDocRef = doc(firestore, 'agencies', agency.id, 'plans', planId);
    deleteDocumentNonBlocking(planDocRef);
    toast({ title: 'Plan supprimé', description: 'Le plan a été supprimé avec succès.' });
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
    if (!agency) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Agence non trouvée.' });
      return;
    }
    setIsSubmitting(true);
    
    const planData = {
      ...data,
      features: data.features.map(f => f.value),
      agencyId: agency.id,
    };

    try {
      if (editingPlan) {
        const planDocRef = doc(firestore, 'agencies', agency.id, 'plans', editingPlan.id);
        setDocumentNonBlocking(planDocRef, planData, { merge: true });
        toast({ title: 'Plan mis à jour', description: 'Le plan a été mis à jour avec succès.' });
      } else {
        const plansCollectionRef = collection(firestore, 'agencies', agency.id, 'plans');
        await addDocumentNonBlocking(plansCollectionRef, planData);
        toast({ title: 'Plan créé', description: 'Le nouveau plan a été créé avec succès.' });
      }
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
  
  const isLoading = isAgencyLoading || arePlansLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Gestion des Plans</CardTitle>
            <CardDescription>
              Créez et gérez les plans d'abonnement pour la section "Tarifs" de votre page d'accueil.
            </CardDescription>
          </div>
           <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button onClick={handleNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouveau Plan
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{editingPlan ? 'Modifier le Plan' : 'Créer un Nouveau Plan'}</SheetTitle>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Titre du plan</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Essentiel" {...field} />
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
                                    <Input type="number" step="0.01" placeholder="29.99" {...field} />
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
                                    <Input placeholder="/mois" {...field} />
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
                                        <Textarea placeholder="Idéal pour commencer..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="appointmentCredits"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Crédits de RDV inclus</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="4" {...field} />
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
                          <FormLabel>Image du plan</FormLabel>
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
                            name="isFeatured"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Mettre en avant</FormLabel>
                                        <FormMessage />
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
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingPlan ? 'Sauvegarder' : 'Créer le plan'}
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
              <TableHead>Nom du Plan</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Crédits RDV</TableHead>
              <TableHead>Mis en avant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : plans && plans.length > 0 ? (
                plans.map((plan) => (
                    <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{plan.price}€ {plan.period}</TableCell>
                        <TableCell>{plan.appointmentCredits}</TableCell>
                        <TableCell>
                            {plan.isFeatured && <Badge>Oui</Badge>}
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
                  Aucun plan n'a été créé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
