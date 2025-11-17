
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette, FileText } from 'lucide-react';
import Link from 'next/link';


function VisualIdentityTab() {
    const { user } = useUser();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Identité Visuelle</CardTitle>
                <CardDescription>
                    Personnalisez les couleurs et l'apparence de votre mini-site pour qu'il corresponde à votre image de marque.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Couleur Principale</Label>
                    <Input type="color" className="w-24 h-12 p-1" defaultValue="#3b82f6" />
                </div>
                <div className="flex justify-end pt-6 border-t">
                    <Button disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrer
                    </Button>
                </div>
                 {user && (
                    <div className="text-center mt-4">
                        <Button variant="outline" asChild>
                            <Link href={`/c/${user.uid}`} target="_blank">
                                Voir ma page publique
                            </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function PersonalPageTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Ma Page Perso</CardTitle>
                <CardDescription>
                   Configurez le contenu et les sections de votre page publique.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Gestionnaire de contenu à venir</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Vous pourrez bientôt organiser les sections de votre page ici.</p>
                </div>
            </CardContent>
        </Card>
    )
}


export default function MiniSitePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Mon Mini-site</h1>
        <p className="text-muted-foreground">
          Gérez l'apparence et le contenu de votre page publique de conseiller.
        </p>
      </div>
      <Tabs defaultValue="visual-identity">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual-identity">
            <Palette className="mr-2 h-4 w-4" />
            Identité Visuelle
          </TabsTrigger>
          <TabsTrigger value="personal-page">
            <FileText className="mr-2 h-4 w-4" />
            Ma Page Perso
          </TabsTrigger>
        </TabsList>
        <TabsContent value="visual-identity">
          <VisualIdentityTab />
        </TabsContent>
        <TabsContent value="personal-page">
          <PersonalPageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
