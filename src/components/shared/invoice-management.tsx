'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export function InvoiceManagement() {

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Factures</CardTitle>
                        <CardDescription>
                            Consultez, gérez et créez vos factures.
                        </CardDescription>
                    </div>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Facture</Button>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                    <h3 className="text-xl font-semibold">Gestion des factures</h3>
                    <p className="text-muted-foreground mt-2 max-w-2xl">Cette section est en cours de construction.</p>
                </div>
            </CardContent>
        </Card>
    );
}
