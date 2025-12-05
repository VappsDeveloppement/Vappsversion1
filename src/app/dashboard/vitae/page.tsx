
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Briefcase, FlaskConical, Search, Inbox, PlusCircle, Trash2, Edit, X, Download, MoreHorizontal, Upload, ChevronsUpDown, Check, BookCopy, Eye, User, FileSymlink, Users, Link as LinkIcon, Building, Percent, CheckCircle, XCircle, Save, BookOpen } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs, documentId } from 'firebase/firestore';
import { useFirestore, useStorage } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { Training } from '@/app/dashboard/e-learning/page';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type JobApplication = {
    id: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    jobOfferTitle: string;
    appliedAt: string;
    status: 'new' | 'reviewed' | 'contacted' | 'rejected';
    coverLetter?: string;
    cvUrl: string;
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

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});


function ApplicationManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [viewingApplication, setViewingApplication] = useState<JobApplication | null>(null);
    const [deletingApplication, setDeletingApplication] = useState<JobApplication | null>(null);

    const applicationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'job_applications'), where('counselorId', '==', user.uid));
    }, [user, firestore]);

    const { data: applications, isLoading } = useCollection<JobApplication>(applicationsQuery);
    
    const handleUpdateStatus = (applicationId: string, status: JobApplication['status']) => {
        const appRef = doc(firestore, 'job_applications', applicationId);
        setDocumentNonBlocking(appRef, { status }, { merge: true });
        toast({ title: "Statut mis à jour", description: `La candidature est maintenant marquée comme "${statusText[status]}".` });
    };

    const handleDelete = async () => {
        if (!deletingApplication) return;
        await deleteDocumentNonBlocking(doc(firestore, 'job_applications', deletingApplication.id));
        toast({ title: "Candidature supprimée" });
        setDeletingApplication(null);
    };

    const handleDownloadCv = (cvUrl: string, applicantName: string) => {
        if (!cvUrl || !cvUrl.startsWith('data:')) {
            toast({ title: "Erreur", description: "Le lien du CV est invalide ou manquant.", variant: 'destructive'});
            return;
        }

        try {
            const link = document.createElement('a');
            link.href = cvUrl;
            link.download = `CV_${applicantName.replace(/ /g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Error downloading CV:", e);
            toast({ title: "Erreur de téléchargement", description: "Impossible de télécharger le CV.", variant: 'destructive'});
        }
    };

    return (
         <>
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
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                ))
                            ) : applications && applications.length > 0 ? (
                                applications.map(app => (
                                    <TableRow key={app.id}>
                                        <TableCell>
                                            <div className="font-medium">{app.applicantName}</div>
                                            <div className="text-sm text-muted-foreground">{app.applicantEmail}</div>
                                        </TableCell>
                                        <TableCell>{app.jobOfferTitle}</TableCell>
                                        <TableCell>{new Date(app.appliedAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[app.status]}>{statusText[app.status]}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setViewingApplication(app)}>
                                                        <Eye className="mr-2 h-4 w-4" /> Voir la candidature
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDownloadCv(app.cvUrl, app.applicantName)} disabled={!app.cvUrl}>
                                                        <Download className="mr-2 h-4 w-4" /> Voir le CV
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'reviewed')}>Examinée</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'contacted')}>Contacté</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'rejected')}>Rejetée</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => setDeletingApplication(app)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Aucune candidature reçue pour le moment.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Dialog open={!!viewingApplication} onOpenChange={(open) => !open && setViewingApplication(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Candidature de {viewingApplication?.applicantName}</DialogTitle>
                        <DialogDescription>Pour l'offre : {viewingApplication?.jobOfferTitle}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p><strong>Email :</strong> {viewingApplication?.applicantEmail}</p>
                        <p><strong>Téléphone :</strong> {viewingApplication?.applicantPhone || 'Non fourni'}</p>
                        <Label>Message</Label>
                        <div className="p-3 border rounded-md bg-muted text-sm h-48 overflow-y-auto">
                            {viewingApplication?.coverLetter || 'Aucun message.'}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingApplication} onOpenChange={(open) => !open && setDeletingApplication(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette candidature ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
         </>
    );
}

const TagInput = ({ value, onChange, placeholder }: { value: string[] | undefined; onChange: (value: string[]) => void, placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');
    const currentValues = Array.isArray(value) ? value : (value ? [String(value)] : []);

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
        <div className="border p-2 rounded-md bg-background">
            <div className="flex flex-wrap gap-1 mb-2">
                {currentValues?.map(tag => (
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

const ficheMetierSchema = z.object({
  name: z.string().min(1, 'Le nom de la fiche est requis.'),
  entryLevel: z.array(z.string()).optional(),
  associatedRncp: z.array(z.string()).optional(),
  associatedTraining: z.array(z.string()).optional(),
  associatedRomeCode: z.array(z.string()).optional(),
  associatedJobs: z.array(z.string()).optional(),
  expectedSoftSkills: z.array(z.string()).optional(),
  competences: z.array(z.object({
      id: z.string(),
      competence: z.string().min(1, 'La compétence est requise.'),
      activities: z.array(z.string()).optional(),
  })).optional(),
  associatedTrainings: z.array(z.string()).optional(),
});

type FicheMetierFormData = z.infer<typeof ficheMetierSchema>;

type FicheMetier = FicheMetierFormData & {
  id: string;
  counselorId: string;
};

function FichesMetiersManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingFiche, setEditingFiche] = useState<FicheMetier | null>(null);

    const fichesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/fiches_metiers`)) : null, [user, firestore]);
    const { data: fiches, isLoading } = useCollection<FicheMetier>(fichesQuery);

    const trainingsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'trainings'), where('authorId', '==', user.uid)) : null, [user, firestore]);
    const { data: trainings, isLoading: areTrainingsLoading } = useCollection<Training>(trainingsQuery);
    
    const form = useForm<FicheMetierFormData>({
        resolver: zodResolver(ficheMetierSchema),
        defaultValues: { name: '', entryLevel: [], associatedRncp: [], associatedTraining: [], associatedRomeCode: [], associatedJobs: [], expectedSoftSkills: [], competences: [], associatedTrainings: [] }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "competences",
    });

    const onSubmit = (data: FicheMetierFormData) => {
        if (!user) return;
        const ficheData = { counselorId: user.uid, ...data };
        if (editingFiche) {
            setDocumentNonBlocking(doc(firestore, `users/${user.uid}/fiches_metiers`, editingFiche.id), ficheData, { merge: true });
            toast({ title: "Fiche métier mise à jour" });
        } else {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/fiches_metiers`), ficheData);
            toast({ title: "Fiche métier créée" });
        }
        setIsSheetOpen(false);
    };
    
    const handleEdit = (fiche: FicheMetier) => {
        setEditingFiche(fiche);
        setIsSheetOpen(true);
    };

    const handleDelete = (ficheId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/fiches_metiers`, ficheId));
        toast({ title: "Fiche métier supprimée" });
    };
    
     useEffect(() => {
        if (isSheetOpen) {
            if (editingFiche) {
                form.reset(editingFiche);
            } else {
                 form.reset({ name: '', entryLevel: [], associatedRncp: [], associatedTraining: [], associatedRomeCode: [], associatedJobs: [], expectedSoftSkills: [], competences: [], associatedTrainings: [] });
            }
        }
    }, [isSheetOpen, editingFiche, form]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Fiches Métiers</CardTitle>
                        <CardDescription>Gérez vos fiches métiers (ROME, RNCP).</CardDescription>
                    </div>
                    <Button onClick={() => setIsSheetOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une fiche</Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-40 w-full" /> : (
                <Table>
                     <TableHeader><TableRow><TableHead>Nom de la fiche</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                     <TableBody>
                        {fiches && fiches.length > 0 ? (
                            fiches.map(fiche => (
                                <TableRow key={fiche.id}>
                                    <TableCell>{fiche.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(fiche)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(fiche.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={2} className="h-24 text-center">Aucune fiche métier créée.</TableCell></TableRow>
                        )}
                     </TableBody>
                </Table>
                )}

                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-2xl w-full">
                        <SheetHeader>
                            <SheetTitle>{editingFiche ? 'Modifier' : 'Nouvelle'} Fiche Métier</SheetTitle>
                        </SheetHeader>
                        <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                            <ScrollArea className="flex-1 pr-6 py-4 -mr-6"><div className="space-y-8">
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la fiche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <section>
                                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Formation</h3>
                                    <div className="space-y-4">
                                        <FormField control={form.control} name="entryLevel" render={({ field }) => (<FormItem><FormLabel>Niveau d'accès</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau..." /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name="associatedRncp" render={({ field }) => (<FormItem><FormLabel>RNCP associés</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code RNCP..." /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name="associatedTraining" render={({ field }) => (<FormItem><FormLabel>Intitulé de formation associé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..." /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField
                                            control={form.control}
                                            name="associatedTrainings"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Formations du catalogue associées</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                                                                    {field.value && field.value.length > 0 ? `${field.value.length} formation(s) sélectionnée(s)` : "Sélectionner des formations..."}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Rechercher..." />
                                                                <CommandList>
                                                                    <CommandEmpty>Aucune formation trouvée.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {trainings?.map((training) => (
                                                                            <CommandItem
                                                                                key={training.id}
                                                                                onSelect={() => {
                                                                                    const selected = field.value || [];
                                                                                    const newSelection = selected.includes(training.id)
                                                                                        ? selected.filter((id) => id !== training.id)
                                                                                        : [...selected, training.id];
                                                                                    field.onChange(newSelection);
                                                                                }}
                                                                            >
                                                                                <Check className={cn("mr-2 h-4 w-4", (field.value || []).includes(training.id) ? "opacity-100" : "opacity-0")} />
                                                                                {training.title}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </section>
                                 <section>
                                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Métiers</h3>
                                    <div className="space-y-4">
                                         <FormField control={form.control} name="associatedRomeCode" render={({ field }) => (<FormItem><FormLabel>Code Rome associé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code ROME..." /></FormControl><FormMessage /></FormItem>)}/>
                                         <FormField control={form.control} name="associatedJobs" render={({ field }) => (<FormItem><FormLabel>Libellés métiers associé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un libellé..." /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                </section>
                                <section>
                                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Savoir-être</h3>
                                    <FormField control={form.control} name="expectedSoftSkills" render={({ field }) => (<FormItem><FormLabel>Softskills attendus</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un softskill..." /></FormControl><FormMessage /></FormItem>)}/>
                                </section>
                                <section>
                                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Compétences</h3>
                                    <div className="space-y-4">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/50">
                                                <div className="flex justify-between items-center"><h4 className="font-medium">Compétence {index + 1}</h4><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                                                <FormField control={form.control} name={`competences.${index}.competence`} render={({ field }) => ( <FormItem><FormLabel>Compétence</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name={`competences.${index}.activities`} render={({ field }) => ( <FormItem><FormLabel>Activités associées</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl><FormMessage /></FormItem> )}/>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `comp-${Date.now()}`, competence: '', activities: [] })}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une compétence
                                        </Button>
                                    </div>
                                </section>
                                </div></ScrollArea>
                            <SheetFooter className="pt-4 border-t mt-auto">
                                <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                <Button type="submit">Sauvegarder</Button>
                            </SheetFooter>
                        </form>
                        </Form>
                    </SheetContent>
                </Sheet>
            </CardContent>
        </Card>
    );
}

const cvProfileSchema = z.object({
    clientId: z.string().min(1, "Veuillez sélectionner un client."),
    currentJobs: z.array(z.string()).optional(),
    searchedJobs: z.array(z.string()).optional(),
    contractTypes: z.array(z.string()).optional(),
    workDurations: z.array(z.string()).optional(),
    workEnvironments: z.array(z.string()).optional(),
    salary: z.array(z.string()).optional(),
    mobility: z.array(z.string()).optional(),
    
    formations: z.array(z.object({
        id: z.string(),
        level: z.array(z.string()).optional(),
        rncpCode: z.array(z.string()).optional(),
        title: z.array(z.string()).optional(),
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
});

type CvProfileFormData = z.infer<typeof cvProfileSchema>;
type CvProfile = CvProfileFormData & { id: string; counselorId: string; clientName: string; };
type Client = { id: string; firstName: string; lastName: string; email: string; };

function CvManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<CvProfile | null>(null);

    const cvProfilesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/cv_profiles`)) : null, [user, firestore]);
    const { data: cvProfiles, isLoading } = useCollection<CvProfile>(cvProfilesQuery);
    
    const clientsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid)) : null, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
    
    const form = useForm<CvProfileFormData>({
        resolver: zodResolver(cvProfileSchema),
        defaultValues: { clientId: '', currentJobs: [], searchedJobs: [], contractTypes: [], workDurations: [], workEnvironments: [], salary: [], mobility: [], formations: [], experiences: [], softSkills: [] }
    });

    const { fields: formationFields, append: appendFormation, remove: removeFormation } = useFieldArray({ control: form.control, name: "formations" });
    const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({ control: form.control, name: "experiences" });

    const onSubmit = (data: CvProfileFormData) => {
        if (!user || !clients) return;
        const client = clients.find(c => c.id === data.clientId);
        if (!client) return;

        const profileData = { counselorId: user.uid, clientName: `${client.firstName} ${client.lastName}`, ...data };
        if (editingProfile) {
            setDocumentNonBlocking(doc(firestore, `users/${user.uid}/cv_profiles`, editingProfile.id), profileData, { merge: true });
            toast({ title: "Profil CV mis à jour" });
        } else {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/cv_profiles`), profileData);
            toast({ title: "Profil CV créé" });
        }
        setIsSheetOpen(false);
    };

    const handleEdit = (profile: CvProfile) => {
        setEditingProfile(profile);
        setIsSheetOpen(true);
    };

    const handleDelete = (profileId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/cv_profiles`, profileId));
        toast({ title: "Profil CV supprimé" });
    };

     useEffect(() => {
        if (isSheetOpen) {
            form.reset(editingProfile || { clientId: '', currentJobs: [], searchedJobs: [], contractTypes: [], workDurations: [], workEnvironments: [], salary: [], mobility: [], formations: [], experiences: [], softSkills: [] });
        }
    }, [isSheetOpen, editingProfile, form]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div><CardTitle>CV-Thèque</CardTitle><CardDescription>Gérez les profils de CV de vos clients.</CardDescription></div>
                    <Button onClick={() => setIsSheetOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un profil CV</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Métier recherché</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                        : cvProfiles && cvProfiles.length > 0 ? (
                            cvProfiles.map(profile => (
                                <TableRow key={profile.id}>
                                    <TableCell>{profile.clientName}</TableCell>
                                    <TableCell>{profile.searchedJobs?.join(', ')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(profile)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(profile.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : <TableRow><TableCell colSpan={3} className="h-24 text-center">Aucun profil CV.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-3xl w-full">
                        <SheetHeader><SheetTitle>{editingProfile ? 'Modifier le' : 'Nouveau'} Profil CV</SheetTitle></SheetHeader>
                        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                            <ScrollArea className="flex-1 pr-6 py-4 -mr-6"><div className="space-y-8">
                                <FormField control={form.control} name="clientId" render={({ field }) => (
                                    <FormItem><FormLabel>Client</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!editingProfile}>
                                            <FormControl><SelectTrigger disabled={areClientsLoading}>{clients?.find(c => c.id === field.value)?.email || "Sélectionner un client"}</SelectTrigger></FormControl>
                                            <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                                        </Select><FormMessage />
                                    </FormItem>
                                )}/>
                                <Accordion type="multiple" defaultValue={['projet']} className="w-full space-y-4">
                                    <AccordionItem value="projet" className="border p-4 rounded-lg">
                                        <AccordionTrigger className="font-semibold text-lg py-0">Projet Professionnel</AccordionTrigger>
                                        <AccordionContent className="pt-6 space-y-4">
                                            <FormField control={form.control} name="currentJobs" render={({ field }) => (<FormItem><FormLabel>Métier actuel</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..."/></FormControl></FormItem>)}/>
                                            <FormField control={form.control} name="searchedJobs" render={({ field }) => (<FormItem><FormLabel>Métier recherché</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..."/></FormControl></FormItem>)}/>
                                            <FormField control={form.control} name="contractTypes" render={({ field }) => (<FormItem><FormLabel>Type de contrat</FormLabel><FormControl><TagInput {...field} placeholder="CDI, CDD..."/></FormControl></FormItem>)}/>
                                            <FormField control={form.control} name="workDurations" render={({ field }) => (<FormItem><FormLabel>Durée du travail</FormLabel><FormControl><TagInput {...field} placeholder="Temps plein..."/></FormControl></FormItem>)}/>
                                            <FormField control={form.control} name="workEnvironments" render={({ field }) => (<FormItem><FormLabel>Environnement de travail</FormLabel><FormControl><TagInput {...field} placeholder="Bureau, télétravail..."/></FormControl></FormItem>)}/>
                                            <FormField control={form.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salaire souhaité</FormLabel><FormControl><TagInput {...field} placeholder="min, max..."/></FormControl></FormItem>)}/>
                                            <FormField control={form.control} name="mobility" render={({ field }) => (<FormItem><FormLabel>Mobilité</FormLabel><FormControl><TagInput {...field} placeholder="Ville, département..."/></FormControl></FormItem>)}/>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="formation" className="border p-4 rounded-lg">
                                        <AccordionTrigger className="font-semibold text-lg py-0">Formation</AccordionTrigger>
                                        <AccordionContent className="pt-6 space-y-4">
                                            {formationFields.map((field, index) => (
                                                <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/50">
                                                    <div className="flex justify-between items-center"><h4 className="font-medium">Formation {index + 1}</h4><Button type="button" variant="ghost" size="icon" onClick={() => removeFormation(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
                                                    <FormField control={form.control} name={`formations.${index}.level`} render={({ field }) => (<FormItem><FormLabel>Niveau</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau..."/></FormControl></FormItem>)}/>
                                                    <FormField control={form.control} name={`formations.${index}.rncpCode`} render={({ field }) => (<FormItem><FormLabel>RNCP associé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..."/></FormControl></FormItem>)}/>
                                                    <FormField control={form.control} name={`formations.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Intitulé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..."/></FormControl></FormItem>)}/>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendFormation({ id: `form-${Date.now()}`, level: [], rncpCode: [], title: [] })}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter une formation</Button>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="experience" className="border p-4 rounded-lg">
                                        <AccordionTrigger className="font-semibold text-lg py-0">Expériences</AccordionTrigger>
                                        <AccordionContent className="pt-6 space-y-4">
                                            {experienceFields.map((field, index) => (
                                                <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/50">
                                                    <div className="flex justify-between items-center"><h4 className="font-medium">Expérience {index + 1}</h4><Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
                                                    <FormField control={form.control} name={`experiences.${index}.romeCode`} render={({ field }) => (<FormItem><FormLabel>Code ROME</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..."/></FormControl></FormItem>)}/>
                                                    <FormField control={form.control} name={`experiences.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Intitulé du poste</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..."/></FormControl></FormItem>)}/>
                                                    <FormField control={form.control} name={`experiences.${index}.skills`} render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..."/></FormControl></FormItem>)}/>
                                                    <FormField control={form.control} name={`experiences.${index}.activities`} render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..."/></FormControl></FormItem>)}/>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendExperience({ id: `exp-${Date.now()}`, romeCode: [], title: [], skills: [], activities: [] })}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter une expérience</Button>
                                        </AccordionContent>
                                    </AccordionItem>
                                     <AccordionItem value="softskills" className="border p-4 rounded-lg">
                                        <AccordionTrigger className="font-semibold text-lg py-0">Soft Skills</AccordionTrigger>
                                        <AccordionContent className="pt-6">
                                            <FormField control={form.control} name="softSkills" render={({ field }) => (<FormItem><FormLabel>Savoir-être</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un soft skill..."/></FormControl></FormItem>)}/>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div></ScrollArea>
                            <SheetFooter className="pt-4 border-t mt-auto">
                                <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                <Button type="submit">Sauvegarder</Button>
                            </SheetFooter>
                        </form></Form>
                    </SheetContent>
                </Sheet>
            </CardContent>
        </Card>
    );
}

const jobOfferFormSchema = z.object({
    title: z.string().min(1, "Le titre est requis."),
    reference: z.string().optional(),
    description: z.string().optional(),
    contractType: z.array(z.string()).optional(),
    workingHours: z.array(z.string()).optional(),
    environment: z.array(z.string()).optional(),
    location: z.array(z.string()).optional(),
    salary: z.array(z.string()).optional(),
    infoMatching: z.object({
        trainingLevels: z.array(z.string()).optional(),
        trainingRncps: z.array(z.string()).optional(),
        trainingTitles: z.array(z.string()).optional(),
        jobRomeCodes: z.array(z.string()).optional(),
        jobTitles: z.array(z.string()).optional(),
        competences: z.array(z.object({
            id: z.string(),
            name: z.string().min(1, 'La compétence est requise.'),
            activities: z.array(z.string()).optional(),
        })).optional(),
        softSkills: z.array(z.string()).optional(),
    }).optional(),
    additionalInfo: z.object({
        companyCoordinates: z.string().optional(),
        internalNotes: z.string().optional(),
    }).optional(),
});
type JobOfferFormData = z.infer<typeof jobOfferFormSchema>;
type JobOffer = {
  id: string;
  counselorId: string;
  title: string;
  reference?: string;
  description?: string;
  contractType?: string[];
  workingHours?: string[];
  environment?: string[];
  location?: string[];
  salary?: string[];
  infoMatching?: {
    trainingLevels?: string[];
    trainingRncps?: string[];
    trainingTitles?: string[];
    jobRomeCodes?: string[];
    jobTitles?: string[];
    competences?: { id: string; name: string; activities?: string[] }[];
    softSkills?: string[];
  };
  additionalInfo?: {
    companyCoordinates?: string;
    internalNotes?: string;
  };
};

function JobOfferManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);

    const jobOffersQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/job_offers`)) : null, [user, firestore]);
    const { data: jobOffers, isLoading } = useCollection<JobOffer>(jobOffersQuery);

    const form = useForm<JobOfferFormData>({
        resolver: zodResolver(jobOfferFormSchema),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "infoMatching.competences",
    });

    useEffect(() => {
        if (isSheetOpen) {
             const defaultValues = {
                title: '', reference: '', description: '', contractType: [], workingHours: [],
                environment: [], location: [], salary: [],
                infoMatching: {
                    trainingLevels: [], trainingRncps: [], trainingTitles: [],
                    jobRomeCodes: [], jobTitles: [], competences: [], softSkills: []
                },
                additionalInfo: { companyCoordinates: '', internalNotes: '' }
            };
            
            if (editingOffer) {
                form.reset({
                    ...defaultValues,
                    ...editingOffer,
                    infoMatching: { ...defaultValues.infoMatching, ...editingOffer.infoMatching },
                    additionalInfo: { ...defaultValues.additionalInfo, ...editingOffer.additionalInfo },
                });
            } else {
                form.reset(defaultValues);
            }
        }
    }, [isSheetOpen, editingOffer, form]);


    const onSubmit = (data: JobOfferFormData) => {
        if (!user) return;
        
        const offerData = {
          counselorId: user.uid,
          ...data,
          contractType: data.contractType || [],
          workingHours: data.workingHours || [],
          environment: data.environment || [],
          location: data.location || [],
          salary: data.salary || [],
          infoMatching: {
            trainingLevels: data.infoMatching?.trainingLevels || [],
            trainingRncps: data.infoMatching?.trainingRncps || [],
            trainingTitles: data.infoMatching?.trainingTitles || [],
            jobRomeCodes: data.infoMatching?.jobRomeCodes || [],
            jobTitles: data.infoMatching?.jobTitles || [],
            competences: data.infoMatching?.competences || [],
            softSkills: data.infoMatching?.softSkills || [],
          },
          additionalInfo: {
            companyCoordinates: data.additionalInfo?.companyCoordinates || '',
            internalNotes: data.additionalInfo?.internalNotes || '',
          }
        };

        if (editingOffer) {
            setDocumentNonBlocking(doc(firestore, `users/${user.uid}/job_offers`, editingOffer.id), offerData, { merge: true });
            toast({ title: "Offre d'emploi mise à jour" });
        } else {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/job_offers`), offerData);
            toast({ title: "Offre d'emploi créée" });
        }
        setIsSheetOpen(false);
    };

    const handleEdit = (offer: JobOffer) => {
        setEditingOffer(offer);
        setIsSheetOpen(true);
    };

    const handleDelete = (offerId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/job_offers`, offerId));
        toast({ title: "Offre d'emploi supprimée" });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div><CardTitle>Offres d'emploi</CardTitle><CardDescription>Gérez vos offres d'emploi ici.</CardDescription></div>
                    <Button onClick={() => setIsSheetOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Nouvelle offre</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Référence</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                        : jobOffers && jobOffers.length > 0 ? (
                            jobOffers.map(offer => (
                                <TableRow key={offer.id}>
                                    <TableCell>{offer.title}</TableCell>
                                    <TableCell>{offer.reference}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(offer)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(offer.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : <TableRow><TableCell colSpan={3} className="h-24 text-center">Aucune offre d'emploi créée.</TableCell></TableRow>}
                    </TableBody>
                </Table>

                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-3xl w-full">
                        <SheetHeader><SheetTitle>{editingOffer ? 'Modifier' : 'Nouvelle'} Offre d'Emploi</SheetTitle></SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                                <ScrollArea className="flex-1 pr-6 py-4 -mr-6"><div className="space-y-8">
                                    <Accordion type="multiple" defaultValue={['public']} className="w-full space-y-4">
                                        <AccordionItem value="public" className="border p-4 rounded-lg">
                                            <AccordionTrigger className="font-semibold text-lg py-0">Infos Publiques</AccordionTrigger>
                                            <AccordionContent className="pt-6 space-y-4">
                                                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre du poste</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Référence</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description du poste</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                                <FormField control={form.control} name="contractType" render={({ field }) => (<FormItem><FormLabel>Type de contrat</FormLabel><FormControl><TagInput {...field} placeholder="..."/></FormControl></FormItem>)}/>
                                                <FormField control={form.control} name="workingHours" render={({ field }) => (<FormItem><FormLabel>Durée du travail</FormLabel><FormControl><TagInput {...field} placeholder="..."/></FormControl></FormItem>)}/>
                                                <FormField control={form.control} name="environment" render={({ field }) => (<FormItem><FormLabel>Environnement</FormLabel><FormControl><TagInput {...field} placeholder="..."/></FormControl></FormItem>)}/>
                                                <FormField control={form.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salaire</FormLabel><FormControl><TagInput {...field} placeholder="..."/></FormControl></FormItem>)}/>
                                                <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Lieu</FormLabel><FormControl><TagInput {...field} placeholder="..."/></FormControl></FormItem>)}/>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="matching" className="border p-4 rounded-lg">
                                            <AccordionTrigger className="font-semibold text-lg py-0">Infos de Matching</AccordionTrigger>
                                            <AccordionContent className="pt-6 space-y-4">
                                                <h4 className="font-medium text-base mb-2">Formation</h4>
                                                <FormField control={form.control} name="infoMatching.trainingLevels" render={({ field }) => (<FormItem><FormLabel>Niveau Requis</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau..."/></FormControl></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.trainingRncps" render={({ field }) => (<FormItem><FormLabel>Codes RNCP</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..."/></FormControl></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.trainingTitles" render={({ field }) => (<FormItem><FormLabel>Intitulés de formation</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..."/></FormControl></FormItem>)}/>
                                                
                                                <h4 className="font-medium text-base mb-2 pt-4 border-t">Métier</h4>
                                                <FormField control={form.control} name="infoMatching.jobRomeCodes" render={({ field }) => (<FormItem><FormLabel>Codes ROME</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..."/></FormControl></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.jobTitles" render={({ field }) => (<FormItem><FormLabel>Intitulés de poste</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..."/></FormControl></FormItem>)}/>
                                                
                                                <h4 className="font-medium text-base mb-2 pt-4 border-t">Compétences</h4>
                                                <div className="space-y-4">
                                                    {fields.map((field, index) => (
                                                        <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-background">
                                                            <div className="flex justify-between items-center"><h5 className="font-medium">Compétence {index + 1}</h5><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                                                            <FormField control={form.control} name={`infoMatching.competences.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Compétence</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                            <FormField control={form.control} name={`infoMatching.competences.${index}.activities`} render={({ field }) => ( <FormItem><FormLabel>Activités associées</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl><FormMessage /></FormItem> )}/>
                                                        </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `comp-offer-${Date.now()}`, name: '', activities: [] })}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une compétence
                                                    </Button>
                                                </div>

                                                <h4 className="font-medium text-base mb-2 pt-4 border-t">Soft Skills</h4>
                                                <FormField control={form.control} name="infoMatching.softSkills" render={({ field }) => (<FormItem><FormLabel>Softskills attendus</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un softskill..."/></FormControl></FormItem>)}/>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="additional" className="border p-4 rounded-lg">
                                             <AccordionTrigger className="font-semibold text-lg py-0">Infos Supplémentaires</AccordionTrigger>
                                             <AccordionContent className="pt-6 space-y-4">
                                                <FormField control={form.control} name="additionalInfo.companyCoordinates" render={({ field }) => (<FormItem><FormLabel>Coordonnées de l'entreprise</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)}/>
                                                <FormField control={form.control} name="additionalInfo.internalNotes" render={({ field }) => (<FormItem><FormLabel>Notes internes</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)}/>
                                             </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div></ScrollArea>
                                <SheetFooter className="pt-4 border-t mt-auto">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit">Sauvegarder</Button>
                                </SheetFooter>
                            </form>
                        </Form>
                    </SheetContent>
                </Sheet>
            </CardContent>
        </Card>
    );
}

function TestManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
    const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null);
    const [comparisonType, setComparisonType] = useState<'offer' | 'fiche'>('offer');
    const [matchResult, setMatchResult] = useState<{ score: number; matching: string[]; missing: string[]; suggestedTrainings: Training[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const savedAnalysis = localStorage.getItem('lastVitaeAnalysisResult');
        if (savedAnalysis) {
            setMatchResult(JSON.parse(savedAnalysis));
        }
    }, []);

    const cvProfilesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/cv_profiles`)) : null, [user, firestore]);
    const { data: cvProfiles, isLoading: areCvProfilesLoading } = useCollection<CvProfile>(cvProfilesQuery);
    
    const jobOffersQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/job_offers`)) : null, [user, firestore]);
    const { data: jobOffers, isLoading: areJobOffersLoading } = useCollection<JobOffer>(jobOffersQuery);
    
    const fichesMetiersQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/fiches_metiers`)) : null, [user, firestore]);
    const { data: fichesMetiers, isLoading: areFichesMetiersLoading } = useCollection<FicheMetier>(fichesMetiersQuery);

    const handleRunMatch = async () => {
        if (!selectedCvId || !selectedComparisonId || !cvProfiles) return;
        setIsLoading(true);

        const cv = cvProfiles.find(p => p.id === selectedCvId);
        if (!cv) {
            setIsLoading(false);
            return;
        }

        let offer: any = null;
        let suggestedTrainingIds: string[] = [];

        if (comparisonType === 'offer') {
            offer = jobOffers?.find(o => o.id === selectedComparisonId);
        } else {
            const fiche = fichesMetiers?.find(f => f.id === selectedComparisonId);
            if(fiche) {
                offer = {
                    infoMatching: {
                        softSkills: fiche.expectedSoftSkills,
                        jobRomeCodes: fiche.associatedRomeCode,
                        trainingRncps: fiche.associatedRncp,
                        trainingLevels: fiche.entryLevel,
                        trainingTitles: fiche.associatedTraining,
                        competences: fiche.competences,
                    },
                    contractType: [],
                    location: []
                };
                suggestedTrainingIds = fiche.associatedTrainings || [];
            }
        }
        
        if (!offer) {
            setIsLoading(false);
            return;
        }


        let score = 0;
        const matchingDetails: string[] = [];
        const missingDetails: string[] = [];
        let totalChecks = 0;

        const checkMatch = (cvItems: Set<string>, offerItems: Set<string>, matchText: string, mismatchText: string) => {
            if (offerItems.size > 0) {
                totalChecks++;
                const matches = [...cvItems].filter(item => offerItems.has(item));
                const misses = [...offerItems].filter(item => !cvItems.has(item));
                if (matches.length > 0) {
                    score++;
                    matchingDetails.push(`${matchText}: ${matches.join(', ')}.`);
                }
                if (misses.length > 0) {
                    missingDetails.push(`${mismatchText}: ${misses.join(', ')}.`);
                }
            }
        };

        const cvFormations = cv.formations || [];
        const cvLevels = new Set(cvFormations.flatMap(f => f.level || []));
        const cvRncpCodes = new Set(cvFormations.flatMap(f => f.rncpCode || []));
        const cvFormationTitles = new Set(cvFormations.flatMap(f => f.title || []));

        const offerLevels = new Set(offer.infoMatching?.trainingLevels || []);
        const offerRncpCodes = new Set(offer.infoMatching?.trainingRncps || []);
        const offerFormationTitles = new Set(offer.infoMatching?.trainingTitles || []);
        
        checkMatch(cvLevels, offerLevels, "Niveaux de formation correspondants", "Niveaux de formation manquants");
        checkMatch(cvRncpCodes, offerRncpCodes, "Certifications RNCP correspondantes", "Certifications RNCP requises");
        checkMatch(cvFormationTitles, offerFormationTitles, "Intitulés de formation correspondants", "Formations spécifiques manquantes");

        const cvSoftSkills = new Set(cv.softSkills || []);
        const offerSoftSkills = new Set(offer.infoMatching?.softSkills || []);
        checkMatch(cvSoftSkills, offerSoftSkills, "Soft skills communs", "Soft skills manquants");
        
        const cvExperiences = cv.experiences || [];
        const cvRomeCodes = new Set(cvExperiences.flatMap(e => e.romeCode || []));
        const offerRomeCodes = new Set(offer.infoMatching?.jobRomeCodes || []);
        checkMatch(cvRomeCodes, offerRomeCodes, "Codes ROME correspondants", "Codes ROME requis");
        
        const cvJobTitles = new Set(cvExperiences.flatMap(e => e.title || []));
        const offerJobTitles = new Set(offer.infoMatching?.jobTitles || []);
        checkMatch(cvJobTitles, offerJobTitles, "Intitulés de poste correspondants", "Intitulés de poste requis");
        
        const cvCompetences = new Set(cvExperiences.flatMap(e => e.skills || []));
        const offerCompetences = new Set(offer.infoMatching?.competences?.map((c: any) => c.name || c.competence) || []);
        checkMatch(cvCompetences, offerCompetences, "Compétences techniques correspondantes", "Compétences techniques manquantes");
        
        const cvActivities = new Set(cvExperiences.flatMap(e => e.activities || []));
        const offerActivities = new Set(offer.infoMatching?.competences?.flatMap((c: any) => c.activities || []));
        checkMatch(cvActivities, offerActivities, "Activités correspondantes", "Activités manquantes");

        if (comparisonType === 'offer') {
            checkMatch(new Set(cv.contractTypes), new Set(offer.contractType), "Type de contrat compatible", "Type de contrat non spécifié");
            checkMatch(new Set(cv.mobility?.map(m => m.toLowerCase())), new Set(offer.location?.map((l: string) => l.toLowerCase())), "Localisation compatible", "Mobilité requise");
        }

        let suggestedTrainingsData: Training[] = [];
        if (suggestedTrainingIds.length > 0) {
            const trainingsCollection = collection(firestore, 'trainings');
            const trainingsQuery = query(trainingsCollection, where(documentId(), 'in', suggestedTrainingIds));
            const trainingsSnapshot = await getDocs(trainingsQuery);
            suggestedTrainingsData = trainingsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Training));
        }

        const finalScore = totalChecks > 0 ? (score / totalChecks) * 100 : 0;
        const result = { score: Math.round(finalScore), matching: matchingDetails, missing: missingDetails, suggestedTrainings: suggestedTrainingsData };
        setMatchResult(result);
        localStorage.setItem('lastVitaeAnalysisResult', JSON.stringify(result));
        setIsLoading(false);
    };

    const handleSaveAnalysis = () => {
        if (matchResult) {
            localStorage.setItem('lastVitaeAnalysisResult', JSON.stringify(matchResult));
            toast({ title: "Analyse sauvegardée", description: "Les résultats actuels ont été mémorisés localement." });
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>ANALYSE DE PARCOURS PROFESSIONNEL</CardTitle>
                <CardDescription>Simulez un matching entre un profil de CV et une offre d'emploi ou une fiche métier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Profil CV</Label>
                        <Select onValueChange={setSelectedCvId} disabled={areCvProfilesLoading}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner un profil..." /></SelectTrigger>
                            <SelectContent>
                                {cvProfiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.clientName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Comparer avec</Label>
                         <Tabs value={comparisonType} onValueChange={(val) => {setComparisonType(val as any); setSelectedComparisonId(null); setMatchResult(null);}}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="offer">Offre d'emploi</TabsTrigger>
                                <TabsTrigger value="fiche">Fiche Métier</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        {comparisonType === 'offer' ? (
                             <Select onValueChange={setSelectedComparisonId} disabled={areJobOffersLoading}>
                                <SelectTrigger><SelectValue placeholder="Sélectionner une offre..." /></SelectTrigger>
                                <SelectContent>
                                    {jobOffers?.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Select onValueChange={setSelectedComparisonId} disabled={areFichesMetiersLoading}>
                                <SelectTrigger><SelectValue placeholder="Sélectionner une fiche..." /></SelectTrigger>
                                <SelectContent>
                                    {fichesMetiers?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
                <Button onClick={handleRunMatch} disabled={!selectedCvId || !selectedComparisonId || isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                    Lancer l'analyse
                </Button>
                {matchResult && (
                    <div className="pt-6 border-t space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold">Résultat de l'analyse</h3>
                            <Button variant="outline" size="sm" onClick={handleSaveAnalysis}>
                                <Save className="mr-2 h-4 w-4" /> Enregistrer l'analyse
                            </Button>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                             <div className="relative h-24 w-24">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${matchResult.score}, 100`} />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">{matchResult.score}%</div>
                            </div>
                            <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
                                <div className='space-y-2'>
                                    <h4 className='font-semibold'>Points de correspondance</h4>
                                    {matchResult.matching.length > 0 ? matchResult.matching.map((detail, index) => (
                                        <div key={index} className="flex items-start gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                            <span>{detail}</span>
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">Aucun point de correspondance direct trouvé.</p>}
                                </div>
                                <div className='space-y-2'>
                                     <h4 className='font-semibold'>Axes d'amélioration</h4>
                                     {matchResult.missing.length > 0 ? matchResult.missing.map((detail, index) => (
                                        <div key={index} className="flex items-start gap-2 text-sm">
                                            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                            <span>{detail}</span>
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">Aucun axe d'amélioration identifié.</p>}
                                </div>
                            </div>
                        </div>
                        {matchResult.suggestedTrainings && matchResult.suggestedTrainings.length > 0 && (
                            <div className="pt-6 border-t">
                                <h4 className="font-semibold text-lg mb-4">Formations suggérées</h4>
                                <div className="space-y-2">
                                    {matchResult.suggestedTrainings.map(training => (
                                        <Link href={`/dashboard/e-learning/path/${training.id}`} key={training.id} passHref>
                                            <a className="block p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                                <p className="font-semibold">{training.title}</p>
                                                <p className="text-sm text-muted-foreground line-clamp-2">{training.description}</p>
                                            </a>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
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
            
            <ApplicationManager />

            <Tabs defaultValue="fiches-metiers" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="fiches-metiers">
                        <BookCopy className="mr-2 h-4 w-4" /> FICHES METIERS
                    </TabsTrigger>
                    <TabsTrigger value="cv-theque">
                        <FileSymlink className="mr-2 h-4 w-4" /> CV-THÈQUE
                    </TabsTrigger>
                    <TabsTrigger value="jobs">
                        <Briefcase className="mr-2 h-4 w-4" /> OFFRE D'EMPLOI
                    </TabsTrigger>
                     <TabsTrigger value="bloc-question-vitae">
                        <FlaskConical className="mr-2 h-4 w-4" /> ANALYSE DE PARCOURS PROFESSIONNEL
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="fiches-metiers">
                    <FichesMetiersManager />
                </TabsContent>
                <TabsContent value="cv-theque">
                    <CvManager />
                </TabsContent>
                <TabsContent value="jobs">
                    <JobOfferManager />
                </TabsContent>
                 <TabsContent value="bloc-question-vitae">
                    <TestManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}

    

    