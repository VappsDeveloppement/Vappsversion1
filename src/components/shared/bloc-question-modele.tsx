
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

export function BlocQuestionModele() {
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
            </CardContent>
        </Card>
    );
}
