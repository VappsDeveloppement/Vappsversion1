
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { TagInput } from './TagInput';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

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

export function BlocQuestionModele() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedSheet, setSelectedSheet] = useState<WellnessSheet | null>(null);
    const [open, setOpen] = useState(false);

    const wellnessSheetsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/wellness_sheets`));
    }, [user, firestore]);

    const { data: sheets, isLoading } = useCollection<WellnessSheet>(wellnessSheetsQuery);
    
    // Derived state for form fields
    const [habitudes, setHabitudes] = useState<string[]>([]);
    const [antecedents, setAntecedents] = useState<string[]>([]);
    const [allergies, setAllergies] = useState<string[]>([]);
    const [holistique, setHolistique] = useState<string[]>([]);

    useEffect(() => {
        if (selectedSheet) {
            setHabitudes(selectedSheet.foodHabits || []);
            setAntecedents(selectedSheet.contraindications || []);
            setAllergies(selectedSheet.allergies || []);
            setHolistique(selectedSheet.holisticProfile || []);
        } else {
            // Reset fields if no sheet is selected
            setHabitudes([]);
            setAntecedents([]);
            setAllergies([]);
            setHolistique([]);
        }
    }, [selectedSheet]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Bloc Question Modèle</CardTitle>
                <CardDescription>
                    Recherchez une fiche bien-être existante pour pré-remplir les informations.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

                <div className="space-y-2">
                    <Label htmlFor="dob">Date de naissance</Label>
                    <Input id="dob" type="date" value={selectedSheet?.dob ? selectedSheet.dob.split('T')[0] : ''} readOnly disabled />
                </div>
                <div className="space-y-2">
                    <Label>Genre</Label>
                    <RadioGroup value={selectedSheet?.gender || ''} className="flex gap-4 pt-2" disabled>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="female" />
                            <Label htmlFor="female">Femme</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="male" id="male" />
                             <Label htmlFor="male">Homme</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="other" />
                            <Label htmlFor="other">Autre</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bmi">Dernier IMC</Label>
                    <Input id="bmi" type="number" placeholder="Ex: 22.5" value={selectedSheet?.bmiRecords?.[0]?.bmi || ''} readOnly disabled />
                </div>
                <div className="space-y-2">
                    <Label>Habitudes Alimentaires</Label>
                    <TagInput
                        value={habitudes}
                        onChange={setHabitudes}
                        placeholder="Végétarien, sans gluten..."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Antécédents / Contre-indications</Label>
                    <TagInput
                        value={antecedents}
                        onChange={setAntecedents}
                        placeholder="Hypertension, diabète..."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Allergies</Label>
                    <TagInput
                        value={allergies}
                        onChange={setAllergies}
                        placeholder="Arachides, lactose..."
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Profil Holistique</Label>
                    <TagInput
                        value={holistique}
                        onChange={setHolistique}
                        placeholder="Stressé, anxieux..."
                    />
                </div>
            </CardContent>
        </Card>
    );
}
