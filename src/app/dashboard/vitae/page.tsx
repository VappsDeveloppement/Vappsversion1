'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Briefcase, FlaskConical, Search, Inbox, PlusCircle, Trash2, Edit, X } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


type JobApplication = {
    id: string;
    applicantName: string;
    applicantEmail: string;
    jobOfferTitle: string;
    appliedAt: string;
    status: 'new' | 'reviewed' | 'contacted' | 'rejected';
};

const statusVariant: Record<JobApplication['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'destructive',
  reviewed: 'default',
  contacted: 'outline',
  rejected: 'secondary',
};

const statusText: Record<JobApplication['status'], string> = {
  new: 'Nouvelle',
  reviewed: 'Examinée',
  contacted: 'Contacté',
  rejected: 'Rejetée',
};


function ApplicationManager() {
    const { user } = useUser();
    const firestore = useFirestore();

    const applicationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'job_applications'), where('counselorId', '==', user.uid));
    }, [user, firestore]);

    const { data: applications, isLoading } = useCollection<JobApplication>(applicationsQuery);
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>Candidatures Reçues</CardTitle>
                <CardDescription>Liste des candidatures reçues pour vos offres d'emploi.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Candidat</TableHead>
                            <TableHead>Offre</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Statut</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                            ))
                        ) : applications && applications.length > 0 ? (
                            applications.map(app => (
                                <TableRow key={app.id}>
                                    <TableCell>
                                        <div className="font-medium">{app.applicantName}</div>
                                        <div className="text-sm text-muted-foreground">{app.applicantEmail}</div>
                                    </TableCell>
                                    <TableCell>{app.jobOfferTitle}</TableCell>
                                    <TableCell>{formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true, locale: fr })}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant[app.status]}>{statusText[app.status]}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Aucune candidature reçue pour le moment.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
    );
}

// Reusable Tag Input Component
const TagInput = ({ value, onChange, placeholder }: { value: string[]; onChange: (value: string[]) => void, placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');
    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!value.includes(inputValue.trim())) {
                onChange([...value, inputValue.trim()]);
            }
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove: string) => onChange(value.filter(tag => tag !== tagToRemove));
    return (
        <div className="border p-2 rounded-md">
            <div className="flex flex-wrap gap-1 mb-2">
                {value.map(tag => (
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


const cvProfileSchema = z.object({
  currentJobs: z.array(z.string()).optional(),
  searchedJobs: z.array(z.string()).optional(),
  contractTypes: z.array(z.string()).optional(),
  workDurations: z.array(z.string()).optional(),
  workEnvironments: z.array(z.string()).optional(),
  desiredSalary: z.array(z.string()).optional(),
  mobility: z.array(z.string()).optional(),
});

type CvProfileFormData = z.infer<typeof cvProfileSchema>;

type CvProfile = CvProfileFormData & {
  id: string;
  counselorId: string;
  clientId: string;
  clientName: string;
}

function Cvtheque() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<CvProfile | null>(null);

    const form = useForm<CvProfileFormData>({
        resolver: zodResolver(cvProfileSchema),
        defaultValues: {
            currentJobs: [],
            searchedJobs: [],
            contractTypes: [],
            workDurations: [],
            workEnvironments: [],
            desiredSalary: [],
            mobility: [],
        }
    });

    const onSubmit = (data: CvProfileFormData) => {
        console.log(data);
        // Logic to save data to be implemented
        toast({ title: "Profil sauvegardé (simulation)" });
        setIsSheetOpen(false);
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>CV-Thèque</CardTitle>
              <CardDescription>Gérez les profils et CV de vos candidats.</CardDescription>
            </div>
             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button onClick={() => { setEditingProfile(null); form.reset(); }}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un profil CV</Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-2xl w-full">
                     <SheetHeader>
                        <SheetTitle>{editingProfile ? 'Modifier le profil' : 'Nouveau Profil CV'}</SheetTitle>
                    </SheetHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                            <ScrollArea className="flex-1 pr-6 py-4 -mr-6">
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Projet Professionnel</h3>
                                        <div className="space-y-4">
                                             <FormField control={form.control} name="currentJobs" render={({ field }) => (<FormItem><FormLabel>Métiers Actuel</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..." /></FormControl><FormMessage /></FormItem>)}/>
                                             <FormField control={form.control} name="searchedJobs" render={({ field }) => (<FormItem><FormLabel>Métier recherché ou projet</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier/projet..." /></FormControl><FormMessage /></FormItem>)}/>
                                             <FormField control={form.control} name="contractTypes" render={({ field }) => (<FormItem><FormLabel>Type de contrat</FormLabel><FormControl><TagInput {...field} placeholder="CDI, CDD..." /></FormControl><FormMessage /></FormItem>)}/>
                                             <FormField control={form.control} name="workDurations" render={({ field }) => (<FormItem><FormLabel>Durée de travail</FormLabel><FormControl><TagInput {...field} placeholder="Temps plein, temps partiel..." /></FormControl><FormMessage /></FormItem>)}/>
                                             <FormField control={form.control} name="workEnvironments" render={({ field }) => (<FormItem><FormLabel>Environnement souhaité</FormLabel><FormControl><TagInput {...field} placeholder="Bureau, Télétravail..." /></FormControl><FormMessage /></FormItem>)}/>
                                             <FormField control={form.control} name="desiredSalary" render={({ field }) => (<FormItem><FormLabel>Salaire souhaité</FormLabel><FormControl><TagInput {...field} placeholder="35k, 40-45k..." /></FormControl><FormMessage /></FormItem>)}/>
                                             <FormField control={form.control} name="mobility" render={({ field }) => (<FormItem><FormLabel>Mobilité / Lieux de travail souhaité</FormLabel><FormControl><TagInput {...field} placeholder="Paris, Lyon..." /></FormControl><FormMessage /></FormItem>)}/>
                                        </div>
                                    </section>
                                </div>
                            </ScrollArea>
                            <SheetFooter className="pt-4 border-t mt-auto">
                                <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                <Button type="submit">Sauvegarder</Button>
                            </SheetFooter>
                        </form>
                    </Form>
                </SheetContent>
             </Sheet>
          </div>
        </CardHeader>
        <CardContent>
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Aucun profil CV pour le moment.</p>
            </div>
        </CardContent>
      </Card>
    );
}

function UnderConstruction({ title }: { title: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">En cours de construction...</p>
            </CardContent>
        </Card>
    );
}


function RncpManager() { return <UnderConstruction title="FICHE RNCP" />; }
function RomeManager() { return <UnderConstruction title="FICHE ROME" />; }
function JobOfferManager() { return <UnderConstruction title="OFFRE D'EMPLOI" />; }
function TestManager() { return <UnderConstruction title="TEST" />; }

export default function VitaePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Vitae</h1>
                <p className="text-muted-foreground">Votre outil de gestion de parcours professionnels</p>
            </div>
            
            <ApplicationManager />

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
                    <RncpManager />
                </TabsContent>
                 <TabsContent value="rome">
                    <RomeManager />
                </TabsContent>
                <TabsContent value="jobs">
                    <JobOfferManager />
                </TabsContent>
                <TabsContent value="test">
                    <TestManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
