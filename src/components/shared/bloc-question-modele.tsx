
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { TagInput } from './TagInput';
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, doc } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useToast } from '@/hooks/use-toast';

type WellnessSheet = {
    id: string;
    clientName: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other';
    bmiRecords?: { bmi: number }[];
    foodHabits?: string[];
    contraindications?: string[];
    allergies?: string[];
    holisticProfile?: string[];
};

const blocQuestionSchema = z.object({
  dob: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  bmi: z.number().optional(),
  foodHabits: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  holisticProfile: z.array(z.string()).optional(),
});

type BlocQuestionFormData = z.infer<typeof blocQuestionSchema>;

export function BlocQuestionModele() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedSheet, setSelectedSheet] = useState<WellnessSheet | null>(null);
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const wellnessSheetsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/wellness_sheets`));
    }, [user, firestore]);

    const { data: sheets, isLoading } = useCollection<WellnessSheet>(wellnessSheetsQuery);
    
    const form = useForm<BlocQuestionFormData>({
        resolver: zodResolver(blocQuestionSchema),
        defaultValues: {
            dob: '',
            gender: undefined,
            bmi: undefined,
            foodHabits: [],
            contraindications: [],
            allergies: [],
            holisticProfile: [],
        },
    });

    useEffect(() => {
        if (selectedSheet) {
            form.reset({
                dob: selectedSheet.dob || '',
                gender: selectedSheet.gender,
                bmi: selectedSheet.bmiRecords?.[0]?.bmi,
                foodHabits: selectedSheet.foodHabits || [],
                contraindications: selectedSheet.contraindications || [],
                allergies: selectedSheet.allergies || [],
                holisticProfile: selectedSheet.holisticProfile || [],
            });
        } else {
            form.reset({
                dob: '',
                gender: undefined,
                bmi: undefined,
                foodHabits: [],
                contraindications: [],
                allergies: [],
                holisticProfile: [],
            });
        }
    }, [selectedSheet, form]);

    const onSubmit = async (data: BlocQuestionFormData) => {
        if (!selectedSheet || !user) {
            toast({ title: 'Aucune fiche sélectionnée', description: 'Veuillez sélectionner une fiche avant de sauvegarder.', variant: 'destructive'});
            return;
        }
        setIsSubmitting(true);
        try {
            const sheetRef = doc(firestore, `users/${user.uid}/wellness_sheets`, selectedSheet.id);
            await setDocumentNonBlocking(sheetRef, {
                dob: data.dob,
                gender: data.gender,
                foodHabits: data.foodHabits,
                contraindications: data.contraindications,
                allergies: data.allergies,
                holisticProfile: data.holisticProfile,
            }, { merge: true });
            toast({ title: 'Fiche sauvegardée', description: 'Les informations ont été mises à jour.'});
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de sauvegarder les modifications.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Bloc Question Modèle</CardTitle>
                <CardDescription>
                    Recherchez une fiche bien-être existante pour pré-remplir les informations.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Fiche Bien-être du Client</Label>
                            {isLoading ? <Skeleton className="h-10 w-full" /> : (
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {selectedSheet ? selectedSheet.clientName : "Sélectionner une fiche..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Rechercher un client..." />
                                            <CommandList>
                                                <CommandEmpty>Aucune fiche trouvée.</CommandEmpty>
                                                <CommandGroup>
                                                    {sheets?.map((sheet) => (
                                                        <CommandItem
                                                            key={sheet.id}
                                                            value={sheet.clientName}
                                                            onSelect={() => {
                                                                setSelectedSheet(sheet);
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedSheet?.id === sheet.id ? "opacity-100" : "opacity-0")}/>
                                                            {sheet.clientName}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        <FormField control={form.control} name="dob" render={({ field }) => (
                             <FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly disabled /></FormControl></FormItem>
                        )}/>

                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Genre</FormLabel>
                                <FormControl>
                                <RadioGroup value={field.value} className="flex gap-4 pt-2" disabled>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel>Femme</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel>Homme</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="other" /></FormControl><FormLabel>Autre</FormLabel></FormItem>
                                </RadioGroup>
                                </FormControl>
                            </FormItem>
                        )}/>

                         <FormField control={form.control} name="bmi" render={({ field }) => (
                             <FormItem><FormLabel>Dernier IMC</FormLabel><FormControl><Input type="number" placeholder="Ex: 22.5" {...field} value={field.value ?? ''} readOnly disabled /></FormControl></FormItem>
                         )}/>
                         
                         <FormField control={form.control} name="foodHabits" render={({ field }) => (
                             <FormItem><FormLabel>Habitudes Alimentaires</FormLabel><FormControl><TagInput {...field} value={field.value || []} placeholder="Végétarien, sans gluten..." /></FormControl></FormItem>
                         )}/>
                         <FormField control={form.control} name="contraindications" render={({ field }) => (
                             <FormItem><FormLabel>Antécédents / Contre-indications</FormLabel><FormControl><TagInput {...field} value={field.value || []} placeholder="Hypertension, diabète..." /></FormControl></FormItem>
                         )}/>
                         <FormField control={form.control} name="allergies" render={({ field }) => (
                             <FormItem><FormLabel>Allergies</FormLabel><FormControl><TagInput {...field} value={field.value || []} placeholder="Arachides, lactose..." /></FormControl></FormItem>
                         )}/>
                         <FormField control={form.control} name="holisticProfile" render={({ field }) => (
                             <FormItem><FormLabel>Profil Holistique</FormLabel><FormControl><TagInput {...field} value={field.value || []} placeholder="Stressé, anxieux..." /></FormControl></FormItem>
                         )}/>
                         <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={!selectedSheet || isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enregistrer
                            </Button>
                         </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
