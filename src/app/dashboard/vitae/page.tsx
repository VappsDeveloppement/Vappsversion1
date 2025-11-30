

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, FileText, Briefcase, FlaskConical, Search, PlusCircle, UserPlus, X, EyeOff, Eye, Loader2, Trash2 } from "lucide-react";
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { differenceInMonths, differenceInYears } from 'date-fns';

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


const experienceSchema = z.object({
    id: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    romeCode: z.array(z.string()).optional(),
    jobTitle: z.array(z.string()).optional(),
    characteristics: z.array(z.string()).optional(),
});


const cvProfileSchema = z.object({
  mobility: z.array(z.string()).optional(),
  drivingLicence: z.array(z.string()).optional(),
  lastJob: z.array(z.string()).optional(),
  lastJobTitle: z.array(z.string()).optional(),
  searchedJob: z.array(z.string()).optional(),
  searchedJobTitle: z.array(z.string()).optional(),
  contractType: z.array(z.string()).optional(),
  duration: z.array(z.string()).optional(),
  workEnvironment: z.array(z.string()).optional(),
  highestFormation: z.array(z.string()).optional(),
  currentJobFormation: z.array(z.string()).optional(),
  projectFormation: z.array(z.string()).optional(),
  fundingOptions: z.array(z.string()).optional(),
  experiences: z.array(experienceSchema).optional(),
  otherInterests: z.array(z.string()).optional(),
});
type CvProfileFormData = z.infer<typeof cvProfileSchema>;


const TagInput = ({ value, onChange, placeholder }: { value: string[] | undefined; onChange: (value: string[]) => void, placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');
    const currentValues = value || [];
    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!currentValues.includes(inputValue.trim())) {
                onChange([...currentValues, inputValue.trim()]);
            }
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove: string) => onChange(currentValues.filter(tag => tag !== tagToRemove));
    return (
        <div className="border p-2 rounded-md">
            <div className="flex flex-wrap gap-1 mb-2">
                {currentValues.map(tag => (
                    <Badge key={tag} variant="secondary">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={addTag} placeholder={placeholder} className="border-none shadow-none focus-visible:ring-0 h-8" />
        </div>
    );
};

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

    const cvForm = useForm<CvProfileFormData>({
      resolver: zodResolver(cvProfileSchema),
      defaultValues: {
        mobility: [],
        drivingLicence: [],
        lastJob: [],
        lastJobTitle: [],
        searchedJob: [],
        searchedJobTitle: [],
        contractType: [],
        duration: [],
        workEnvironment: [],
        highestFormation: [],
        currentJobFormation: [],
        projectFormation: [],
        fundingOptions: [],
        experiences: [],
        otherInterests: [],
      }
    });

    const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
        control: cvForm.control,
        name: "experiences"
    });

    const calculateSeniority = (startDate?: string, endDate?: string) => {
        if (!startDate) return null;
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date(); // Use today if no end date
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

        const years = differenceInYears(end, start);
        const months = differenceInMonths(end, start) % 12;

        let result = '';
        if (years > 0) {
            result += `${years} an${years > 1 ? 's' : ''}`;
        }
        if (months > 0) {
            result += `${years > 0 ? ' et ' : ''}${months} mois`;
        }

        return result || 'Moins d\'un mois';
    };


    const resetSheet = () => {
        setIsSheetOpen(false);
        setSearchEmail('');
        setSearchResult(null);
        setSelectedClient(null);
        setShowCreateForm(false);
        newUserForm.reset();
        cvForm.reset();
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
                phone: values.phone || '',
                address: values.address || '',
                zipCode: values.zipCode || '',
                city: values.city || '',
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

    const onCvProfileSubmit = (data: CvProfileFormData) => {
        if (!user || !selectedClient) return;
    
        const cvProfileData = {
            counselorId: user.uid,
            clientId: selectedClient.id,
            clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
            mobility: data.mobility || [],
            drivingLicence: data.drivingLicence || [],
            lastJob: data.lastJob || [],
            lastJobTitle: data.lastJobTitle || [],
            searchedJob: data.searchedJob || [],
            searchedJobTitle: data.searchedJobTitle || [],
            contractType: data.contractType || [],
            duration: data.duration || [],
            workEnvironment: data.workEnvironment || [],
            highestFormation: data.highestFormation || [],
            currentJobFormation: data.currentJobFormation || [],
            projectFormation: data.projectFormation || [],
            fundingOptions: data.fundingOptions || [],
            experiences: data.experiences || [],
            otherInterests: data.otherInterests || [],
        };
        
        addDocumentNonBlocking(collection(firestore, `users/${user.uid}/cv_profiles`), cvProfileData);
        
        toast({title: "Profil CV enregistré"});
        resetSheet();
    }

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
                                      <Form {...cvForm}>
                                        <form onSubmit={cvForm.handleSubmit(onCvProfileSubmit)} className="space-y-6">
                                            <Card className="p-4 bg-secondary">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold">{selectedClient.firstName} {selectedClient.lastName}</p>
                                                        <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>Changer</Button>
                                                </div>
                                            </Card>

                                            <Card>
                                                <CardHeader><CardTitle>Mobilité</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <FormField control={cvForm.control} name="mobility" render={({ field }) => (<FormItem><FormLabel>Mobilité Géographique</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une ville, région..." /></FormControl><FormMessage /></FormItem>)}/>
                                                    <FormField control={cvForm.control} name="drivingLicence" render={({ field }) => (<FormItem><FormLabel>Moyen de locomotion et permis</FormLabel><FormControl><TagInput {...field} placeholder="Permis B, Véhicule personnel..." /></FormControl><FormMessage /></FormItem>)}/>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader><CardTitle>Projet Professionnel</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <FormField control={cvForm.control} name="lastJob" render={({ field }) => ( <FormItem><FormLabel>Dernier métier exercé (Code ROME)</FormLabel><FormControl><TagInput {...field} placeholder="Code ROME..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="lastJobTitle" render={({ field }) => ( <FormItem><FormLabel>Intitulé du poste</FormLabel><FormControl><TagInput {...field} placeholder="Intitulé..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="searchedJob" render={({ field }) => ( <FormItem><FormLabel>Métier Recherché (Code ROME)</FormLabel><FormControl><TagInput {...field} placeholder="Code ROME..."/></FormControl><FormMessage/></FormItem> )}/>
                                                     <FormField control={cvForm.control} name="searchedJobTitle" render={({ field }) => ( <FormItem><FormLabel>Intitulé du poste recherché</FormLabel><FormControl><TagInput {...field} placeholder="Intitulé..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="contractType" render={({ field }) => ( <FormItem><FormLabel>Type de contrat</FormLabel><FormControl><TagInput {...field} placeholder="CDI, CDD..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="duration" render={({ field }) => ( <FormItem><FormLabel>Durée</FormLabel><FormControl><TagInput {...field} placeholder="Temps plein, Temps partiel..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="workEnvironment" render={({ field }) => ( <FormItem><FormLabel>Environnement souhaité</FormLabel><FormControl><TagInput {...field} placeholder="Télétravail, Bureau..."/></FormControl><FormMessage/></FormItem> )}/>
                                                </CardContent>
                                            </Card>

                                             <Card>
                                                <CardHeader><CardTitle>Formation</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <FormField control={cvForm.control} name="highestFormation" render={({ field }) => ( <FormItem><FormLabel>Formation la plus élevée</FormLabel><FormControl><TagInput {...field} placeholder="Code RNCP, Niveau, Libellé..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="currentJobFormation" render={({ field }) => ( <FormItem><FormLabel>Formation en lien avec métier actuel</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une formation..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="projectFormation" render={({ field }) => ( <FormItem><FormLabel>Formation en lien avec projet</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une formation..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="fundingOptions" render={({ field }) => ( <FormItem><FormLabel>Financement possible</FormLabel><FormControl><TagInput {...field} placeholder="CPF, Pôle Emploi..."/></FormControl><FormMessage/></FormItem> )}/>
                                                </CardContent>
                                            </Card>
                                            
                                            <Card>
                                                <CardHeader><CardTitle>Expériences</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    {experienceFields.map((field, index) => {
                                                        const startDate = cvForm.watch(`experiences.${index}.startDate`);
                                                        const endDate = cvForm.watch(`experiences.${index}.endDate`);
                                                        const seniority = calculateSeniority(startDate, endDate);
                                                        
                                                        return (
                                                            <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                                                <div className="flex justify-between items-center">
                                                                    <h4 className="font-medium">Expérience {index + 1}</h4>
                                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(index)}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <FormField control={cvForm.control} name={`experiences.${index}.startDate`} render={({ field }) => (<FormItem><FormLabel>Date de début</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''}/></FormControl></FormItem>)}/>
                                                                    <FormField control={cvForm.control} name={`experiences.${index}.endDate`} render={({ field }) => (<FormItem><FormLabel>Date de fin</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''}/></FormControl></FormItem>)}/>
                                                                </div>
                                                                {seniority && <p className="text-sm font-medium text-muted-foreground">Ancienneté: {seniority}</p>}
                                                                <FormField control={cvForm.control} name={`experiences.${index}.jobTitle`} render={({ field }) => (<FormItem><FormLabel>Intitulé du poste</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..."/></FormControl></FormItem>)}/>
                                                                <FormField control={cvForm.control} name={`experiences.${index}.romeCode`} render={({ field }) => (<FormItem><FormLabel>Code ROME</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..."/></FormControl></FormItem>)}/>
                                                                <FormField control={cvForm.control} name={`experiences.${index}.characteristics`} render={({ field }) => (<FormItem><FormLabel>Compétences exercées / développées</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..."/></FormControl></FormItem>)}/>
                                                            </div>
                                                        );
                                                    })}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => appendExperience({ id: `exp-${Date.now()}`, startDate: '', endDate: '', romeCode:[], jobTitle:[], characteristics: [] })}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une expérience
                                                    </Button>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader><CardTitle>Autres et centres d'intérêt</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <FormField control={cvForm.control} name="otherInterests" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Centres d'intérêt, activités extra-professionnelles, etc.</FormLabel>
                                                            <FormControl>
                                                                <TagInput {...field} placeholder="Ajouter un intérêt..."/>
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}/>
                                                </CardContent>
                                            </Card>

                                            <SheetFooter className="pt-6 border-t">
                                              <SheetClose asChild><Button type="button" variant="outline">Fermer</Button></SheetClose>
                                              <Button type="submit">Enregistrer le profil</Button>
                                            </SheetFooter>
                                        </form>
                                      </Form>
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

