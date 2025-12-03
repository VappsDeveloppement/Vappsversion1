
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ApiSettingsPage() {
    const { toast } = useToast();
    const [baseUrl, setBaseUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // This ensures the window object is available, making it client-side only.
        setBaseUrl(window.location.origin);
    }, []);

    const apiUrl = `${baseUrl}/api/job-offers`;

    const handleCopy = () => {
        navigator.clipboard.writeText(apiUrl).then(() => {
            setCopied(true);
            toast({ title: "Copié !", description: "L'URL de l'API a été copiée dans le presse-papiers." });
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            toast({ title: "Erreur", description: "Impossible de copier l'URL.", variant: "destructive" });
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">API & Intégrations</h1>
                <p className="text-muted-foreground">
                    Gérez les points d'accès API pour connecter d'autres applications.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>API des Offres d'Emploi</CardTitle>
                    <CardDescription>
                        Utilisez cette URL pour récupérer la liste complète de toutes les offres d'emploi de tous les conseillers au format JSON.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Label htmlFor="api-url">URL de l'API</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="api-url"
                                value={apiUrl}
                                readOnly
                                className="bg-muted"
                            />
                            <Button variant="outline" size="icon" onClick={handleCopy}>
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                <span className="sr-only">Copier l'URL</span>
                            </Button>
                        </div>
                        <Alert>
                            <AlertTitle>Comment ça marche ?</AlertTitle>
                            <AlertDescription>
                                Ce point d'accès public (<span className="font-mono text-xs">GET</span>) renvoie un tableau de toutes les offres d'emploi. Il est conçu pour être utilisé par des applications externes, comme un site d'offres d'emploi ou une application de cartographie.
                            </AlertDescription>
                        </Alert>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
