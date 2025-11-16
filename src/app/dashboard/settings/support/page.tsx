
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Send, MessageSquare, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AgencySupportPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Support</h1>
                <p className="text-muted-foreground">
                    Accédez à la FAQ, créez votre propre base de connaissances et contactez le support.
                </p>
            </div>
            <Tabs defaultValue="faq-generale">
                <TabsList>
                    <TabsTrigger value="faq-generale">FAQ Générale</TabsTrigger>
                    <TabsTrigger value="faq-agence">FAQ de l'Agence</TabsTrigger>
                </TabsList>
                <TabsContent value="faq-generale">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>FAQ Générale de la Plateforme</CardTitle>
                                    <CardDescription>Retrouvez les réponses aux questions les plus fréquentes sur l'utilisation de la plateforme.</CardDescription>
                                </div>
                                 <Dialog>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Send className="mr-2 h-4 w-4" />
                                            Contacter le support
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Soumettre une demande de support</DialogTitle>
                                            <DialogDescription>
                                                Décrivez votre problème ou votre question. Notre équipe vous répondra dans les plus brefs délais.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="support-name">Votre Nom</Label>
                                                <Input id="support-name" placeholder="Jean Dupont" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="support-email">Votre Email</Label>
                                                <Input id="support-email" type="email" placeholder="jean.dupont@votreagence.com" />
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="support-subject">Sujet</Label>
                                                <Input id="support-subject" placeholder="Ex: Problème d'affichage..." />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="support-message">Message</Label>
                                                <Textarea id="support-message" placeholder="Décrivez votre problème ici..." />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit">Envoyer la demande</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg text-center">
                                <MessageSquare className="h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">FAQ Générale en cours de construction</h3>
                                <p className="mt-2 text-sm text-muted-foreground">Cette section affichera bientôt la FAQ gérée par les administrateurs de la plateforme.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="faq-agence">
                     <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Votre FAQ Interne</CardTitle>
                                    <CardDescription>Créez une base de connaissances pour les membres et conseillers de votre agence.</CardDescription>
                                </div>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter une question
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg text-center">
                                <BookOpen className="h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">Aucune question dans votre FAQ</h3>
                                <p className="mt-2 text-sm text-muted-foreground">Cliquez sur "Ajouter une question" pour commencer à construire votre base de connaissances interne.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
