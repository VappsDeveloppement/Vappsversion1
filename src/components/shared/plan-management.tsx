

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PlusCircle, Trash2, Edit, Upload, EyeOff, CheckCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const planFormSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Le nom est requis."),
    description: z.string().optional(),
    price: z.coerce.number().min(0, "Le prix doit être positif."),
    period: z.string().min(1, "La période est requise (ex: /mois)."),
    features: z.array(z.object({ text: z.string() })).optional(),
    isFeatured: z.boolean().default(false),
    isPublic: z.boolean().default(true),
    hasPrismeAccess: z.boolean().default(false),
    imageUrl: z.string().nullable().optional(),
    cta: z.string().optional(),
    contractId: z.string().optional(),
    paypalSubscriptionId: z.string().optional(),
});


type PlanFormData = z.infer<typeof planFormSchema>;

export type Plan = {
    id: string;
    counselorId: string;
    name: string;
    description: string;
    price: number;
    period: string;
    features: string[];
    isFeatured: boolean;
    isPublic: boolean;
    hasPrismeAccess: boolean;
    imageUrl?: string;
    cta?: string;
    contractId?: string;
    paypalSubscriptionId?: string;
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});


export function PlanManagement() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const plansQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'plans'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(plansQuery);
    
    const contractsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'contracts'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: contracts, isLoading: areContractsLoading } = useCollection<{id: string, title: string}>(contractsQuery);

    const form = useForm<PlanFormData>({
        resolver: zodResolver(planFormSchema),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "features"
    });

    useEffect(() => {
        if (isSheetOpen) {
            if (editingPlan) {
                form.reset({
                    ...editingPlan,
                    features: (editingPlan.features || []).map(f => ({ text: f }))
                });
                setImagePreview(editingPlan.imageUrl || null);
            } else {
                 form.reset({
                    id: `plan-${Date.now()}`,
                    name: '', description: '', price: 0, period: '/prestation',
                    features: [{ text: '' }], isFeatured: false, isPublic: false, hasPrismeAccess: false,
                    imageUrl: null, contractId: '', cta: 'Souscrire'
                });
                setImagePreview(null);
            }
        }
    }, [isSheetOpen, editingPlan, form]);


    const handleNewPlan = () => {
        setEditingPlan(null);
        setIsSheetOpen(true);
    };

    const handleEditPlan = (plan: Plan) => {
        setEditingPlan(plan);
        setIsSheetOpen(true);
    };
    
    const handleDeletePlan = (planId: string) => {
        const planRef = doc(firestore, 'plans', planId);
        deleteDocumentNonBlocking(planRef);
        toast({ title: "Prestation supprimée" });
    };

    const onSubmit = (data: PlanFormData) => {
        if (!user) return;

        const planData: Omit<Plan, 'id'> = {
            counselorId: user.uid,
            name: data.name,
            description: data.description || '',
            price: data.price,
            period: data.period,
            features: data.features?.map(f => f.text).filter(Boolean) || [],
            isFeatured: data.isFeatured,
            isPublic: data.isPublic,
            hasPrismeAccess: data.hasPrismeAccess,
            imageUrl: imagePreview || '',
            cta: data.cta || 'Choisir',
            contractId: data.contractId || '',
            paypalSubscriptionId: data.paypalSubscriptionId || '',
        };

        if (editingPlan) {
            const planRef = doc(firestore, 'plans', editingPlan.id);
            setDocumentNonBlocking(planRef, planData, { merge: true });
            toast({ title: "Prestation mise à jour" });
        } else {
            addDocumentNonBlocking(collection(firestore, 'plans'), planData);
            toast({ title: "Prestation créée" });
        }
        setIsSheetOpen(false);
    };
    
     const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            setImagePreview(base64);
        }
    };

    return (
         <div>
            <div className="flex justify-end items-center mb-4">
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button type="button" onClick={handleNewPlan}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-2xl w-full">
                        <SheetHeader>
                            <SheetTitle>{editingPlan ? 'Modifier' : 'Ajouter'} une prestation</SheetTitle>
                        </SheetHeader>
                         <ScrollArea className="h-[calc(100vh-8rem)]">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la prestation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="period" render={({ field }) => (<FormItem><FormLabel>Période</FormLabel><FormControl><Input placeholder="/mois, /an, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div>
                                        <Label>Points clés</Label>
                                        <div className="space-y-2 mt-2">
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="flex items-center gap-2">
                                                    <FormField control={form.control} name={`features.${index}.text`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ text: "" })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un point clé</Button>
                                    </div>
                                     <FormField
                                        control={form.control}
                                        name="contractId"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contrat associé (Optionnel)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger disabled={areContractsLoading}>
                                                <SelectValue placeholder="Sélectionner un modèle de contrat" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {contracts?.map((contract) => (
                                                    <SelectItem key={contract.id} value={contract.id}>{contract.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="hasPrismeAccess"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>Accès à Prisme</FormLabel>
                                                    <p className="text-sm text-muted-foreground">
                                                        Ce plan donne-t-il accès à l'outil Prisme ?
                                                    </p>
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
                            <TableHead>Nom</TableHead>
                            <TableHead>Prix</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {arePlansLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow> 
                        : plans && plans.length > 0 ? (
                            plans.map(plan => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-medium">{plan.name}</TableCell>
                                    <TableCell>{plan.price}€ {plan.period}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditPlan(plan)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeletePlan(plan.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">Aucune prestation créée.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
             </div>
        </div>
    );
};
