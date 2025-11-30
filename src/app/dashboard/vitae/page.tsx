
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, FileText, Briefcase, FlaskConical, Search, PlusCircle, UserPlus, X, EyeOff, Eye, Loader2 } from "lucide-react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs, arrayUnion } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAgency } from '@/context/agency-provider';
import { sendGdprEmail as sendEmail } from '@/app/actions/gdpr';
import { ScrollArea } from '@/components/ui/scroll-area';

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    counselorIds?: string[];
};

const newUserSchema = z.object({
    firstName: z.string().min(1, 'Le prénom est requis.'),
    lastName: z.string().min(1, 'Le nom est requis.'),
    email: z.string().email('Email invalide.'),
    phone: z.string().optional(),
    address: z.string().optional(),
    zipCode: z.string().optional(),
    city: z.string().optional(),
    password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères."),
});
type NewUserFormData = z.infer<typeof newUserSchema>;

function Cvtheque() {
    const { user } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const { personalization } = useAgency();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<Client | 'not-found' | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const newUserForm = useForm<NewUserFormData>({
        resolver: zodResolver(newUserSchema),
    });

    const resetSheet = () => {
        setIsSheetOpen(false);
        setSearchEmail('');
        setSearchResult(null);
        setSelectedClient(null);
        setShowCreateForm(false);
        newUserForm.reset();
    };

    const handleSearchUser = async () => {
        if (!searchEmail) return;
        setIsSearching(true);
        setSearchResult(null);
        setShowCreateForm(false);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', searchEmail.trim()));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setSearchResult('not-found');
                newUserForm.reset({ firstName: '', lastName: '', email: searchEmail, phone: '', address: '', zipCode: '', city: '', password: '' });
            } else {
                const foundUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Client;
                setSearchResult(foundUser);
            }
        } finally {
            setIsSearching(false);
        }
    };
    
    const onCreateNewUser = async (values: NewUserFormData) => {
        if (!user || !personalization?.emailSettings) {
            toast({title: "Erreur", description: "Impossible de créer le client sans configuration complète.", variant: "destructive"});
            return;
        }
        setIsSubmitting(true);
        try {
            const tempAuth = auth;
            const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, values.password);
            const newUser = userCredential.user;

            const userDocRef = doc(firestore, 'users', newUser.uid);
            const newUserData: Client = {
                id: newUser.uid,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                phone: values.phone,
                address: values.address,
                zipCode: values.zipCode,
                city: values.city,
                counselorIds: [user.uid],
            };
            await setDocumentNonBlocking(userDocRef, {
                ...newUserData,
                role: 'membre',
                dateJoined: new Date().toISOString(),
            });

            if (personalization.emailSettings.fromEmail) {
                 await sendEmail({
                    emailSettings: personalization.emailSettings,
                    recipientEmail: values.email,
                    recipientName: `${values.firstName} ${values.lastName}`,
                    subject: `Bienvenue ! Vos accès à votre espace client`,
                    textBody: `Bonjour ${values.firstName},\n\nUn compte client a été créé pour vous. Vous pouvez vous connecter en utilisant les identifiants suivants:\nEmail: ${values.email}\nMot de passe: ${values.password}\n\nCordialement,\nL'équipe ${personalization.emailSettings.fromName}`,
                    htmlBody: `<p>Bonjour ${values.firstName},</p><p>Un compte client a été créé pour vous. Vous pouvez vous connecter à votre espace en utilisant les identifiants suivants :</p><ul><li><strong>Email :</strong> ${values.email}</li><li><strong>Mot de passe :</strong> ${values.password}</li></ul><p>Cordialement,<br/>L'équipe ${personalization.emailSettings.fromName}</p>`
                });
            }

            toast({ title: 'Client créé' });
            setSelectedClient(newUserData);
            setShowCreateForm(false);
            setSearchResult(null);
        } catch(error: any) {
            let message = "Une erreur est survenue lors de la création du client.";
            if (error.code === 'auth/email-already-in-use') {
                message = "Cette adresse e-mail est déjà utilisée. Essayez de rechercher cet utilisateur pour l'ajouter.";
            }
            toast({ title: 'Erreur', description: message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAddClient = async (client: Client) => {
        if (!user) return;
        setIsSubmitting(true);
        const clientRef = doc(firestore, 'users', client.id);
        
        try {
            await setDocumentNonBlocking(clientRef, { counselorIds: arrayUnion(user.uid) }, { merge: true });
            toast({ title: "Client ajouté", description: `${client.firstName} ${client.lastName} a été ajouté à votre liste.` });
            setSelectedClient(client);
            setSearchResult(null);
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible d'ajouter le client.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectExistingClient = (client: Client) => {
        setSelectedClient(client);
        setSearchResult(null);
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>CVthèque</CardTitle>
                        <CardDescription>Gérez et consultez les CV de vos candidats.</CardDescription>
                    </div>
                    <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) resetSheet(); setIsSheetOpen(open); }}>
                        <SheetTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" />Nouveau Profil CV</Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-2xl w-full">
                            <SheetHeader>
                                <SheetTitle>Nouveau profil CV</SheetTitle>
                                <SheetDescription>
                                    {selectedClient ? `Profil pour ${selectedClient.firstName} ${selectedClient.lastName}` : "Commencez par sélectionner ou créer un client."}
                                </SheetDescription>
                            </SheetHeader>
                            <div className="py-4">
                                {!selectedClient ? (
                                    <div className="space-y-4">
                                        {!showCreateForm && (
                                            <div className="flex gap-2">
                                                <Input placeholder="Rechercher par email..." value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                                                <Button onClick={handleSearchUser} disabled={isSearching || !searchEmail}>
                                                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        )}
                                        {searchResult === 'not-found' && !showCreateForm && (
                                            <Card className="p-4 bg-muted"><p className="text-sm text-center text-muted-foreground mb-4">Aucun utilisateur trouvé.</p><Button className="w-full" variant="secondary" onClick={() => setShowCreateForm(true)}><UserPlus className="mr-2 h-4 w-4" /> Créer une fiche client</Button></Card>
                                        )}
                                        {searchResult && searchResult !== 'not-found' && (
                                            <Card className="p-4">
                                                <p className="font-semibold">{searchResult.firstName} {searchResult.lastName}</p>
                                                <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                                                
                                                {searchResult.counselorIds?.includes(user?.uid || '') ? (
                                                     <Button className="w-full mt-4" onClick={() => handleSelectExistingClient(searchResult)}>
                                                        Sélectionner ce client
                                                    </Button>
                                                ) : (
                                                    <Button className="w-full mt-4" onClick={() => handleAddClient(searchResult)} disabled={isSubmitting}>
                                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                        Ajouter comme client
                                                    </Button>
                                                )}
                                            </Card>
                                        )}
                                        {showCreateForm && (
                                            <Card className="p-4">
                                                <div className="flex justify-between items-center mb-4"><h4 className="font-semibold">Nouveau client</h4><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreateForm(false)}><X className="h-4 w-4"/></Button></div>
                                                <Form {...newUserForm}>
                                                    <form onSubmit={newUserForm.handleSubmit(onCreateNewUser)} className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <FormField control={newUserForm.control} name="firstName" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Prénom" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                            <FormField control={newUserForm.control} name="lastName" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Nom" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                        </div>
                                                        <FormField control={newUserForm.control} name="email" render={({ field }) => ( <FormItem><FormControl><Input disabled value={searchEmail} {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                        <FormField control={newUserForm.control} name="phone" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Téléphone" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                        <FormField control={newUserForm.control} name="address" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Adresse" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                         <div className="grid grid-cols-2 gap-2">
                                                            <FormField control={newUserForm.control} name="zipCode" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Code Postal" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                            <FormField control={newUserForm.control} name="city" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Ville" {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                        </div>
                                                        <FormField control={newUserForm.control} name="password" render={({ field }) => (
                                                            <FormItem>
                                                                <div className="relative">
                                                                    <FormControl><Input type={showPassword ? "text":"password"} placeholder="Mot de passe" {...field}/></FormControl>
                                                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-0.5 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff/>:<Eye/>}</Button>
                                                                </div>
                                                                <FormMessage/>
                                                            </FormItem> 
                                                        )}/>
                                                        <Button type="submit" disabled={isSubmitting} className="w-full">
                                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                            Créer et sélectionner
                                                        </Button>
                                                    </form>
                                                </Form>
                                            </Card>
                                        )}
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                                        <div className="space-y-6">
                                            <Card className="p-4 bg-secondary">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold">{selectedClient.firstName} {selectedClient.lastName}</p>
                                                        <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                                                        <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>
                                                        <p className="text-sm text-muted-foreground">{selectedClient.address}, {selectedClient.zipCode} {selectedClient.city}</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>Changer</Button>
                                                </div>
                                            </Card>
                                            {/* Future form fields will go here */}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </CardHeader>
            <CardContent className="text-center p-12 text-muted-foreground">
                <p>La liste des profils CV sera bientôt disponible ici.</p>
            </CardContent>
        </Card>
    );
}


export default function VitaePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Vitae</h1>
                <p className="text-muted-foreground">Votre outil de gestion de parcours professionnels</p>
            </div>
            <Tabs defaultValue="cvtheque" className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-auto">
                    <TabsTrigger value="cvtheque">
                        <FileText className="mr-2 h-4 w-4" /> CVTHEQUE
                    </TabsTrigger>
                    <TabsTrigger value="rncp">
                        <Search className="mr-2 h-4 w-4" /> FICHE RNCP
                    </TabsTrigger>
                    <TabsTrigger value="rome">
                        <Search className="mr-2 h-4 w-4" /> FICHE ROME
                    </TabsTrigger>
                    <TabsTrigger value="jobs">
                        <Briefcase className="mr-2 h-4 w-4" /> OFFRE D'EMPLOI
                    </TabsTrigger>
                    <TabsTrigger value="test">
                        <FlaskConical className="mr-2 h-4 w-4" /> TEST
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="cvtheque">
                    <Cvtheque />
                </TabsContent>
                <TabsContent value="rncp">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fiches RNCP</CardTitle>
                            <CardDescription>Recherchez et consultez les fiches du Répertoire National des Certifications Professionnelles.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                             <p>La recherche de fiches RNCP sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="rome">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fiches ROME</CardTitle>
                            <CardDescription>Recherchez et consultez les fiches du Répertoire Opérationnel des Métiers et des Emplois.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                            <p>La recherche de fiches ROME sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="jobs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Offres d'emploi</CardTitle>
                            <CardDescription>Consultez et gérez les offres d'emploi.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                            <p>La gestion des offres d'emploi sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="test">
                    <Card>
                        <CardHeader>
                            <CardTitle>Test</CardTitle>
                            <CardDescription>Section de test pour l'outil Vitae.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                             <p>La section de test sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

    