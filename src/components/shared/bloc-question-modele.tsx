
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { TagInput } from './TagInput';
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { ChevronsUpDown, Check, Loader2, Wand2, Download, Save } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


// Define types locally to ensure component is self-contained
type Product = {
    id: string;
    title: string;
    pathologies?: string[];
    holisticProfile?: string[];
    contraindications?: string[];
};

type Protocole = {
    id: string;
    name: string;
    pathologies?: string[];
    holisticProfile?: string[];
    contraindications?: string[];
}


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
  bmi: z.coerce.number().optional(),
  foodHabits: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  holisticProfile: z.array(z.string()).optional(),
});

type BlocQuestionFormData = z.infer<typeof blocQuestionSchema>;

interface BlocQuestionModeleProps {
    savedAnalysis: any | null;
    onSaveAnalysis: (result: any) => void;
    followUpClientId: string;
    onSaveBlock: () => Promise<void>;
}

export function BlocQuestionModele({ savedAnalysis, onSaveAnalysis, followUpClientId, onSaveBlock }: BlocQuestionModeleProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedSheet, setSelectedSheet] = useState<WellnessSheet | null>(null);
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [tempContraindications, setTempContraindications] = useState<string[]>([]);
    const [pathologiesToTreat, setPathologiesToTreat] = useState<string[]>([]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(savedAnalysis);

    useEffect(() => {
        setAnalysisResult(savedAnalysis);
    }, [savedAnalysis]);


    const productsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'products'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: allProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

    const protocolsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'protocols'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: allProtocols, isLoading: areProtocolsLoading } = useCollection<Protocole>(protocolsQuery);

    const wellnessSheetsQuery = useMemoFirebase(() => {
        if (!user) return null;
        const baseQuery = query(collection(firestore, `users/${user.uid}/wellness_sheets`));
        if (followUpClientId) {
             return query(baseQuery, where('clientId', '==', followUpClientId));
        }
        return baseQuery;
    }, [user, firestore, followUpClientId]);

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
        if (sheets && sheets.length > 0 && !selectedSheet) {
           handleSelectSheet(sheets[0]);
        }
    }, [sheets, selectedSheet]);


    useEffect(() => {
        if (selectedSheet) {
            form.reset({
                dob: selectedSheet.dob || '',
                gender: selectedSheet.gender,
                bmi: selectedSheet.bmiRecords?.[0]?.bmi || undefined,
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

    const handleSelectSheet = (sheet: WellnessSheet) => {
        setSelectedSheet(sheet);
        setOpen(false);
    }

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
    
    const handleAnalyze = () => {
        setIsAnalyzing(true);
        const formData = form.getValues();
        const allContraindications = new Set([
            ...(formData.contraindications || []),
            ...(formData.allergies || []),
            ...tempContraindications
        ]);
    
        const filterItemsByContraindications = (items: (Product | Protocole)[]) => {
            return items.filter(item => {
                const itemContraindications = new Set(item.contraindications || []);
                for (const contra of allContraindications) {
                    if (itemContraindications.has(contra)) {
                        return false;
                    }
                }
                return true;
            });
        };
    
        const availableProducts = filterItemsByContraindications(allProducts || []);
        const availableProtocols = filterItemsByContraindications(allProtocols || []);
    
        const byPathology = pathologiesToTreat.map(pathology => {
            const products = availableProducts.filter(p => p.pathologies?.includes(pathology));
            const protocoles = availableProtocols.filter(p => p.pathologies?.includes(pathology));
            return { pathology, products, protocoles };
        });
    
        const byHolisticProfile = () => {
            const profileTags = new Set(formData.holisticProfile || []);
            const pathologyTags = new Set(pathologiesToTreat);
            if (profileTags.size === 0) return { products: [], protocoles: [] };
    
            // First filter by selected pathologies
            const productsFilteredByPathology = availableProducts.filter(p => 
                pathologyTags.size === 0 || p.pathologies?.some(pathology => pathologyTags.has(pathology))
            );
            const protocolsFilteredByPathology = availableProtocols.filter(p => 
                pathologyTags.size === 0 || p.pathologies?.some(pathology => pathologyTags.has(pathology))
            );
    
            // Then filter by holistic profile
            const products = productsFilteredByPathology.filter(p => 
                p.holisticProfile?.some(tag => profileTags.has(tag))
            );
            const protocoles = protocolsFilteredByPathology.filter(p => 
                p.holisticProfile?.some(tag => profileTags.has(tag))
            );
    
            return { products, protocoles };
        };
    
        const perfectMatch = () => {
             const profileTags = new Set(formData.holisticProfile || []);
             const pathologyTags = new Set(pathologiesToTreat);
             if (pathologyTags.size === 0) return { products: [], protocoles: []};
    
             const products = availableProducts.filter(p => {
                const productPathologies = new Set(p.pathologies || []);
                const productHolistic = new Set(p.holisticProfile || []);
                const matchesAllPathologies = [...pathologyTags].every(tag => productPathologies.has(tag));
                const matchesAnyHolistic = profileTags.size > 0 ? [...profileTags].some(tag => productHolistic.has(tag)) : true;
                return matchesAllPathologies && matchesAnyHolistic;
             });
    
              const protocoles = availableProtocols.filter(p => {
                const protocolPathologies = new Set(p.pathologies || []);
                const protocolHolistic = new Set(p.holisticProfile || []);
                const matchesAllPathologies = [...pathologyTags].every(tag => protocolPathologies.has(tag));
                const matchesAnyHolistic = profileTags.size > 0 ? [...profileTags].some(tag => protocolHolistic.has(tag)) : true;
                return matchesAllPathologies && matchesAnyHolistic;
             });
    
             return { products, protocoles };
        };
    
        setTimeout(() => {
            const result = {
                byPathology: byPathology,
                byHolisticProfile: byHolisticProfile(),
                perfectMatch: perfectMatch(),
            };
            setAnalysisResult(result);
            onSaveAnalysis(result);
            setIsAnalyzing(false);
        }, 500);
    };

    return (
        <div className="space-y-6">
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
                                                onSelect={() => handleSelectSheet(sheet)}
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

            <Accordion type="single" collapsible>
                <AccordionItem value="details">
                    <AccordionTrigger>Voir/Modifier les détails de la fiche</AccordionTrigger>
                    <AccordionContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                                <FormField control={form.control} name="contraindications" render={({ field }) => (<FormItem><FormLabel>Antécédents / Contre-indications</FormLabel><FormControl><TagInput {...field} value={field.value || []} placeholder="Hypertension, diabète..." /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="holisticProfile" render={({ field }) => (<FormItem><FormLabel>Profil Holistique</FormLabel><FormControl><TagInput {...field} value={field.value || []} placeholder="Stressé, anxieux..." /></FormControl></FormItem>)}/>
                                 <div className="flex justify-end">
                                    <Button type="submit" disabled={!selectedSheet || isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enregistrer les modifications
                                    </Button>
                                 </div>
                            </form>
                        </Form>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
            <div className="mt-4 pt-4 border-t space-y-4">
                <div className="space-y-2">
                    <Label>Contre-indication temporaire (pour cette séance)</Label>
                    <TagInput 
                        value={tempContraindications} 
                        onChange={setTempContraindications} 
                        placeholder="Ajouter une contre-indication..."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Pathologie ou Emotion à traiter (pour cette séance)</Label>
                     <TagInput 
                        value={pathologiesToTreat} 
                        onChange={setPathologiesToTreat} 
                        placeholder="Ajouter une pathologie/émotion..."
                    />
                </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4">
                <Button type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Analyser
                </Button>
                {isAnalyzing && <p className="text-sm text-muted-foreground">Analyse en cours...</p>}
            </div>
            
             {analysisResult && (
                <div className="mt-6 pt-6 border-t space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">Résultats de l'Analyse</h3>
                         <Button variant="outline" size="sm" onClick={onSaveBlock}>
                            <Save className="mr-2 h-4 w-4" /> Enregistrer l'analyse dans le suivi
                        </Button>
                    </div>
                    <section>
                        <h4 className="font-semibold text-lg mb-4">Correspondance par Pathologie</h4>
                         {analysisResult.byPathology.length > 0 ? analysisResult.byPathology.map((item: any, index: React.Key | null | undefined) => (
                            <div key={index} className="mb-4 p-4 border rounded-md">
                                <p className="font-medium text-primary">{item.pathology}</p>
                                <p className="text-sm">Produits: {item.products.length > 0 ? item.products.map((p: any) => p.title).join(', ') : 'Aucun'}</p>
                                <p className="text-sm">Protocoles: {item.protocoles.length > 0 ? item.protocoles.map((p: any) => p.name).join(', ') : 'Aucun'}</p>
                            </div>
                        )) : <p className="text-sm text-muted-foreground">Aucune correspondance trouvée.</p>}
                    </section>

                    <section>
                        <h4 className="font-semibold text-lg mb-2">Adapté au Profil Holistique</h4>
                        <p className="text-sm">Produits: {analysisResult.byHolisticProfile.products.length > 0 ? analysisResult.byHolisticProfile.products.map((p: any) => p.title).join(', ') : 'Aucun'}</p>
                        <p className="text-sm">Protocoles: {analysisResult.byHolisticProfile.protocoles.length > 0 ? analysisResult.byHolisticProfile.protocoles.map((p: any) => p.name).join(', ') : 'Aucun'}</p>
                    </section>

                    <section>
                        <h4 className="font-semibold text-lg mb-2">Cohérence Parfaite</h4>
                         <p className="text-sm">Produits: {analysisResult.perfectMatch.products.length > 0 ? analysisResult.perfectMatch.products.map((p: any) => p.title).join(', ') : 'Aucun'}</p>
                        <p className="text-sm">Protocoles: {analysisResult.perfectMatch.protocoles.length > 0 ? analysisResult.perfectMatch.protocoles.map((p: any) => p.name).join(', ') : 'Aucun'}</p>
                    </section>
                </div>
             )}

        </div>
    );
}
