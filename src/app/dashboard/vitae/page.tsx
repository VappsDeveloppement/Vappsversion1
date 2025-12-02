
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Briefcase, FlaskConical, Search, Inbox, PlusCircle, Trash2, Edit, X, Download, BarChart, FileCheck, BrainCircuit, Goal, Clock, MapPin, Euro, Upload } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirestore, useStorage } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, differenceInYears, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


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
const TagInput = ({ value, onChange, placeholder }: { value: string[] | undefined; onChange: (value: string[]) => void, placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');
    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!value?.includes(inputValue.trim())) {
                onChange([...(value || []), inputValue.trim()]);
            }
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove: string) => onChange(value?.filter(tag => tag !== tagToRemove) || []);
    return (
        <div className="border p-2 rounded-md bg-background">
            <div className="flex flex-wrap gap-1 mb-2">
                {value?.map(tag => (
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
  drivingLicences: z.array(z.string()).optional(),
  formations: z.array(z.object({
      id: z.string(),
      rncpCode: z.array(z.string()).optional(),
      title: z.array(z.string()).optional(),
      level: z.array(z.string()).optional(),
      skills: z.array(z.string()).optional(),
  })).optional(),
   experiences: z.array(z.object({
      id: z.string(),
      romeCode: z.array(z.string()).optional(),
      title: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      skills: z.array(z.string()).optional(),
      activities: z.array(z.string()).optional(),
  })).optional(),
  softSkills: z.array(z.string()).optional(),
  cvUrl: z.string().optional().nullable(),
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
    const storage = useStorage();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<CvProfile | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [cvFile, setCvFile] = useState<File | null>(null);

    const form = useForm<CvProfileFormData>({
        resolver: zodResolver(cvProfileSchema),
        defaultValues: {
            currentJobs: [], searchedJobs: [], contractTypes: [], workDurations: [],
            workEnvironments: [], desiredSalary: [], mobility: [], drivingLicences: [],
            formations: [], experiences: [], softSkills: [], cvUrl: null,
        }
    });

    const { fields: formationFields, append: appendFormation, remove: removeFormation } = useFieldArray({
        control: form.control, name: "formations",
    });

    const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
        control: form.control, name: "experiences",
    });
    
    const calculateSeniority = (startDate?: string, endDate?: string) => {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

        const years = differenceInYears(end, start);
        const months = differenceInMonths(end, start) % 12;
        
        let result = '';
        if (years > 0) result += `${years} an(s) `;
        if (months > 0) result += `${months} mois`;
        
        return result.trim() || 'Moins d\'un mois';
    };

    const handleCvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCvFile(file);
        }
    };
    
    const onSubmit = async (data: CvProfileFormData) => {
        if (!user) return;
        setIsUploading(true);

        let fileUrl = editingProfile?.cvUrl || null;
        
        if (cvFile) {
            try {
                const filePath = `CV/${Date.now()}_${cvFile.name}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, cvFile);
                fileUrl = await getDownloadURL(fileRef);
                toast({ title: "CV téléversé avec succès" });
            } catch (error) {
                console.error("Error uploading CV:", error);
                toast({ title: "Erreur de téléversement", description: "Impossible d'envoyer le fichier CV.", variant: "destructive" });
                setIsUploading(false);
                return;
            }
        }
        
        const profileData = {
            ...data,
            cvUrl: fileUrl,
        };

        // Here you would typically also select a client/candidate
        // For now, it's just a placeholder for the form logic.
        console.log("Submitting:", profileData);
        toast({ title: "Profil sauvegardé (simulation)" });
        setIsUploading(false);
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
                    <Button onClick={() => { setEditingProfile(null); form.reset(); setCvFile(null); }}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un profil CV</Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-3xl w-full">
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
                                    <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Formation et Qualification</h3>
                                        <div className="space-y-4">
                                            <FormField control={form.control} name="drivingLicences" render={({ field }) => (<FormItem><FormLabel>Permis</FormLabel><FormControl><TagInput {...field} placeholder="Permis B, C..." /></FormControl><FormMessage /></FormItem>)}/>
                                            <div>
                                                <Label>Formations</Label>
                                                <div className="space-y-4 mt-2">
                                                    {formationFields.map((field, index) => (
                                                        <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/50">
                                                            <div className="flex justify-between items-center">
                                                                <h4 className="font-medium">Formation {index + 1}</h4>
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeFormation(index)}>
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                            <FormField control={form.control} name={`formations.${index}.rncpCode`} render={({ field }) => (<FormItem><FormLabel>Code RNCP</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..." /></FormControl><FormMessage /></FormItem>)}/>
                                                            <FormField control={form.control} name={`formations.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Intitulé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..." /></FormControl><FormMessage /></FormItem>)}/>
                                                            <FormField control={form.control} name={`formations.${index}.level`} render={({ field }) => (<FormItem><FormLabel>Niveau</FormLabel><FormControl><TagInput {...field} placeholder="Bac+3, Niveau 6..." /></FormControl><FormMessage /></FormItem>)}/>
                                                            <FormField control={form.control} name={`formations.${index}.skills`} render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl><FormMessage /></FormItem>)}/>
                                                        </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => appendFormation({ id: `formation-${Date.now()}`, rncpCode: [], title: [], level: [], skills: [] })}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une formation
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                     <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Parcours Professionnel</h3>
                                        <div>
                                            <Label>Expériences</Label>
                                            <div className="space-y-4 mt-2">
                                                {experienceFields.map((field, index) => {
                                                    const startDate = form.watch(`experiences.${index}.startDate`);
                                                    const endDate = form.watch(`experiences.${index}.endDate`);
                                                    const seniority = calculateSeniority(startDate, endDate);
                                                    return (
                                                        <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/50">
                                                            <div className="flex justify-between items-center">
                                                                <h4 className="font-medium">Expérience {index + 1}</h4>
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(index)}>
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                            <FormField control={form.control} name={`experiences.${index}.romeCode`} render={({ field }) => (<FormItem><FormLabel>Code ROME</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..." /></FormControl><FormMessage /></FormItem>)}/>
                                                            <FormField control={form.control} name={`experiences.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Intitulé du poste</FormLabel><FormControl><TagInput {...field} placeholder="Développeur, etc." /></FormControl><FormMessage /></FormItem>)}/>
                                                            <div className="grid grid-cols-2 gap-4 items-end">
                                                                <FormField control={form.control} name={`experiences.${index}.startDate`} render={({ field }) => (<FormItem><FormLabel>Début</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)}/>
                                                                <FormField control={form.control} name={`experiences.${index}.endDate`} render={({ field }) => (<FormItem><FormLabel>Fin</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)}/>
                                                            </div>
                                                             {seniority && <div className="text-sm text-muted-foreground"><span className="font-semibold">Ancienneté :</span> {seniority}</div>}
                                                            <FormField control={form.control} name={`experiences.${index}.skills`} render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl><FormMessage /></FormItem>)}/>
                                                            <FormField control={form.control} name={`experiences.${index}.activities`} render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl><FormMessage /></FormItem>)}/>
                                                        </div>
                                                    )
                                                })}
                                                <Button type="button" variant="outline" size="sm" onClick={() => appendExperience({ id: `exp-${Date.now()}`, romeCode:[], title: [], startDate: '', endDate: '', skills: [], activities: [] })}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une expérience
                                                </Button>
                                            </div>
                                        </div>
                                    </section>
                                     <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Savoir-être (Softskills)</h3>
                                        <div className="space-y-4">
                                            <FormField control={form.control} name="softSkills" render={({ field }) => (<FormItem><FormLabel>Compétences comportementales</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un softskill..." /></FormControl><FormMessage /></FormItem>)}/>
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Curriculum Vitae (PDF)</h3>
                                        <div className="space-y-2">
                                            <Label htmlFor="cv-upload">Joindre un CV</Label>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-grow border rounded-md h-10 px-3 py-2 text-sm bg-muted flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground truncate">
                                                        {cvFile?.name || (editingProfile?.cvUrl ? 'Fichier existant' : 'Aucun fichier')}
                                                    </span>
                                                </div>
                                                <Input id="cv-upload" type="file" onChange={handleCvFileChange} className="hidden" accept=".pdf" />
                                                <Button type="button" variant="outline" onClick={() => document.getElementById('cv-upload')?.click()}>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Choisir
                                                </Button>
                                            </div>
                                             {editingProfile?.cvUrl && !cvFile && (
                                                <a href={editingProfile.cvUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Voir le CV actuel</a>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </ScrollArea>
                            <SheetFooter className="pt-4 border-t mt-auto">
                                <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                <Button type="submit" disabled={isUploading}>
                                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sauvegarder
                                </Button>
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
