
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
                    <FormLabel>Date de naissance</FormLabel>
                    <Input type="date" />
                </div>
                <div className="space-y-2">
                    <FormLabel>Genre</FormLabel>
                    <RadioGroup className="flex gap-4 pt-2">
                        <FormItem className="flex items-center space-x-2">
                            <FormControl>
                                <RadioGroupItem value="female" />
                            </FormControl>
                            <FormLabel>Femme</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                            <FormControl>
                                <RadioGroupItem value="male" />
                            </FormControl>
                            <FormLabel>Homme</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                            <FormControl>
                                <RadioGroupItem value="other" />
                            </FormControl>
                            <FormLabel>Autre</FormLabel>
                        </FormItem>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <FormLabel>Dernier IMC</FormLabel>
                    <Input type="number" placeholder="Ex: 22.5" />
                </div>
            </CardContent>
        </Card>
    );
}
