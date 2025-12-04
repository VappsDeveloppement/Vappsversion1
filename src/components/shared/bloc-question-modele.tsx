
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { TagInput } from './TagInput';
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, doc, where } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { ChevronsUpDown, Check, Loader2, Wand2, Download } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Product, Protocole } from '@/app/dashboard/aura/page';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const LOCAL_STORAGE_KEY = 'lastSelectedWellnessSheetId';

export function BlocQuestionModele() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedSheet, setSelectedSheet] = useState<WellnessSheet | null>(null);
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for the new independent fields
    const [tempContraindications, setTempContraindications] = useState<string[]>([]);
    const [pathologiesToTreat, setPathologiesToTreat] = useState<string[]>([]);

    // Analysis state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    // Queries to fetch products and protocols
    const productsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'products'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: allProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

    const protocolsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'protocols'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: allProtocols, isLoading: areProtocolsLoading } = useCollection<Protocole>(protocolsQuery);

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
        if (sheets && sheets.length > 0) {
            const lastSelectedId = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (lastSelectedId) {
                const sheet = sheets.find(s => s.id === lastSelectedId);
                if (sheet) {
                    setSelectedSheet(sheet);
                }
            }
        }
    }, [sheets]);

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
        localStorage.setItem(LOCAL_STORAGE_KEY, sheet.id);
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

        const filterItems = (items: (Product | Protocole)[]) => {
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

        const availableProducts = filterItems(allProducts || []);
        const availableProtocols = filterItems(allProtocols || []);

        const byPathology = pathologiesToTreat.map(pathology => {
            const products = availableProducts.filter(p => p.pathologies?.includes(pathology));
            const protocoles = availableProtocols.filter(p => p.pathologies?.includes(pathology));
            return { pathology, products, protocoles };
        });

        const byHolisticProfile = () => {
            const profileTags = new Set(formData.holisticProfile || []);
            if (profileTags.size === 0) return { products: [], protocoles: [] };
            
            const products = availableProducts.filter(p => 
                p.holisticProfile?.some(tag => profileTags.has(tag))
            );
            const protocoles = availableProtocols.filter(p => 
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
            setAnalysisResult({
                byPathology: byPathology,
                byHolisticProfile: byHolisticProfile(),
                perfectMatch: perfectMatch(),
            });
            setIsAnalyzing(false);
        }, 500);
    };

    const handleExportPdf = () => {
        if (!selectedSheet || !analysisResult) return;

        const doc = new jsPDF();
        let y = 20;

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`Analyse Bien-être pour ${selectedSheet.clientName}`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 15;

        // Client Info
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Informations du Client', 15, y);
        y += 8;

        const formData = form.getValues();
        const clientInfo = [
            ['Date de naissance', formData.dob ? new Date(formData.dob).toLocaleDateString('fr-FR') : 'N/A'],
            ['Genre', formData.gender || 'N/A'],
            ['IMC', formData.bmi?.toString() || 'N/A'],
            ['Habitudes alimentaires', formData.foodHabits?.join(', ') || 'Aucune'],
            ['Allergies', formData.allergies?.join(', ') || 'Aucune'],
            ['Antécédents / Contre-indications', formData.contraindications?.join(', ') || 'Aucun'],
            ['Contre-indications temporaires', tempContraindications.join(', ') || 'Aucune'],
            ['Profil Holistique', formData.holisticProfile?.join(', ') || 'Aucun'],
            ['Pathologies / Emotions à traiter', pathologiesToTreat.join(', ') || 'Aucune'],
        ];

        autoTable(doc, {
            startY: y,
            head: [['Critère', 'Information']],
            body: clientInfo,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });

        y = (doc as any).lastAutoTable.finalY + 15;

        // Analysis Results
        doc.addPage();
        y = 20;
        doc.setFontSize(18);
        doc.text('Résultats de l\'Analyse', 15, y);
        y += 10;
        
        const addResultSection = (title: string, data: { products: any[], protocoles: any[] }) => {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 15, y);
            y += 8;
            
            const body = [];
            if (data.products.length > 0) {
                 body.push(['Produits', data.products.map(p => p.title).join('\n')]);
            }
            if (data.protocoles.length > 0) {
                 body.push(['Protocoles', data.protocoles.map(p => p.name).join('\n')]);
            }
             if (body.length === 0) {
                body.push(['Aucune suggestion trouvée', '']);
            }

            autoTable(doc, { startY: y, head: [['Type', 'Suggestions']], body, theme: 'grid' });
            y = (doc as any).lastAutoTable.finalY + 10;
        }

        if (analysisResult.byPathology.length > 0) {
             doc.setFontSize(16);
            doc.text("Correspondance par Pathologie", 15, y);
            y += 8;
            analysisResult.byPathology.forEach((item: any) => {
                addResultSection(item.pathology, { products: item.products, protocoles: item.protocoles });
            });
        }
        
        addResultSection("Adapté au Profil Holistique", analysisResult.byHolisticProfile);
        addResultSection("Cohérence Parfaite", analysisResult.perfectMatch);

        doc.save(`Analyse_${selectedSheet.clientName.replace(' ', '_')}.pdf`);
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

                        <FormField control={form.control} name="dob" render={({ field }) => (
                             <FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl></FormItem>
                        )}/>

                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Genre</FormLabel>
                                <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-2">
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel>Femme</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel>Homme</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="other" /></FormControl><FormLabel>Autre</FormLabel></FormItem>
                                </RadioGroup>
                                </FormControl>
                            </FormItem>
                        )}/>

                         <FormField control={form.control} name="bmi" render={({ field }) => (
                             <FormItem><FormLabel>Dernier IMC</FormLabel><FormControl><Input type="number" placeholder="Ex: 22.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>
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
                
                <div className="mt-8 pt-6 border-t space-y-6">
                    <div className="space-y-2">
                        <Label>Contre-indication temporaire</Label>
                        <TagInput 
                            value={tempContraindications} 
                            onChange={setTempContraindications} 
                            placeholder="Ajouter une contre-indication..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Pathologie ou Emotion à traiter</Label>
                         <TagInput 
                            value={pathologiesToTreat} 
                            onChange={setPathologiesToTreat} 
                            placeholder="Ajouter une pathologie/émotion..."
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t flex flex-col items-center gap-4">
                    <Button type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Analyser
                    </Button>
                    {isAnalyzing && <p className="text-sm text-muted-foreground">Analyse en cours...</p>}
                </div>
                
                 {analysisResult && (
                    <div className="mt-8 pt-6 border-t space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold">Résultats de l'Analyse</h3>
                             <Button variant="outline" onClick={handleExportPdf}>
                                <Download className="mr-2 h-4 w-4" /> Exporter en PDF
                            </Button>
                        </div>
                        <section>
                            <h4 className="font-semibold text-lg mb-4">Correspondance par Pathologie</h4>
                             {analysisResult.byPathology.length > 0 ? analysisResult.byPathology.map((item: any) => (
                                <div key={item.pathology} className="mb-4 p-4 border rounded-md">
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

            </CardContent>
        </Card>
    );
}
