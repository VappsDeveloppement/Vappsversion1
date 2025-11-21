
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';

export default function MiniSitePage() {

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Mon Mini-site</h1>
        <p className="text-muted-foreground">
          Gérez l'apparence et le contenu de votre page publique de conseiller.
        </p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Section en maintenance</CardTitle>
            <CardDescription>
                Cette section est en cours de refonte pour simplifier votre expérience.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Page en construction</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                    Nous améliorons cet espace. Bientôt, vous pourrez de nouveau personnaliser votre page publique simplement et efficacement.
                </p>
                <Button disabled className="mt-6">
                    Personnaliser mon mini-site (Bientôt disponible)
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
