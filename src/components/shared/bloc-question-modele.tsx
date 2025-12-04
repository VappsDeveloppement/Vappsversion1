
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { TagInput } from './TagInput';

export function BlocQuestionModele() {
    // These states are for demonstration within this component.
    // They will be replaced by react-hook-form props when integrated.
    const [habitudes, setHabitudes] = useState<string[]>([]);
    const [antecedents, setAntecedents] = useState<string[]>([]);
    const [allergies, setAllergies] = useState<string[]>([]);
    const [holistique, setHolistique] = useState<string[]>([]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Modèle de Fiche Bien-être</CardTitle>
                <CardDescription>Informations de base pour le suivi du client.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="dob">Date de naissance</Label>
                    <Input id="dob" type="date" />
                </div>
                <div className="space-y-2">
                    <Label>Genre</Label>
                    <RadioGroup className="flex gap-4 pt-2">
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
                    <Input id="bmi" type="number" placeholder="Ex: 22.5" />
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
