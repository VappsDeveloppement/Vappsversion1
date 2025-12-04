
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Briefcase, FlaskConical, Search, Inbox, PlusCircle, Trash2, Edit, X, Download, MoreHorizontal, Upload, ChevronsUpDown, Check, BookCopy, Eye, User, FileSymlink, Users, Link as LinkIcon, Building, Percent, CheckCircle, XCircle } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
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
                                        <TableCell>{formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true, locale: fr })}</TableCell>
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
    
    const form = useForm<FicheMetierFormData>({
        resolver: zodResolver(ficheMetierSchema),
        defaultValues: { name: '', entryLevel: [], associatedRncp: [], associatedTraining: [], associatedRomeCode: [], associatedJobs: [], expectedSoftSkills: [], competences: [] }
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
                 form.reset({ name: '', entryLevel: [], associatedRncp: [], associatedTraining: [], associatedRomeCode: [], associatedJobs: [], expectedSoftSkills: [], competences: [] });
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
                            <ScrollArea className="flex-1 pr-6 py-4 -mr-6">
                                <div className="space-y-8">
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la fiche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <section>
                                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Formation</h3>
                                    <div className="space-y-4">
                                        <FormField control={form.control} name="entryLevel" render={({ field }) => (<FormItem><FormLabel>Niveau d'accès</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau..." /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name="associatedRncp" render={({ field }) => (<FormItem><FormLabel>RNCP associés</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code RNCP..." /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name="associatedTraining" render={({ field }) => (<FormItem><FormLabel>Intitulé de formation associé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..." /></FormControl><FormMessage /></FormItem>)}/>
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
            </CardContent>
        </Card>
    );
}

function TestManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
    const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
    const [matchResult, setMatchResult] = useState<{ score: number; details: string[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const cvProfilesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/cv_profiles`)) : null, [user, firestore]);
    const { data: cvProfiles, isLoading: areCvProfilesLoading } = useCollection<any>(cvProfilesQuery);
    
    const jobOffersQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/job_offers`)) : null, [user, firestore]);
    const { data: jobOffers, isLoading: areJobOffersLoading } = useCollection<any>(jobOffersQuery);

    const handleRunMatch = () => {
        if (!selectedCvId || !selectedOfferId || !cvProfiles || !jobOffers) return;
        setIsLoading(true);

        const cv = cvProfiles.find(p => p.id === selectedCvId);
        const offer = jobOffers.find(o => o.id === selectedOfferId);

        if (!cv || !offer) {
            setIsLoading(false);
            return;
        }

        let score = 0;
        const details: string[] = [];
        const totalChecks = 5; // Nombre de critères de matching

        // 1. Soft Skills
        const cvSoftSkills = new Set(cv.softSkills || []);
        const offerSoftSkills = new Set(offer.softSkills || []);
        const matchingSoftSkills = [...cvSoftSkills].filter(skill => offerSoftSkills.has(skill));
        if (matchingSoftSkills.length > 0) {
            score++;
            details.push(`Compétences comportementales communes : ${matchingSoftSkills.join(', ')}.`);
        }

        // 2. ROME Codes
        const cvRomeCodes = new Set(cv.experiences?.flatMap((e:any) => e.romeCode || []) || []);
        const offerRomeCodes = new Set(offer.infoMatching?.romeCodes || []);
        const matchingRomeCodes = [...cvRomeCodes].filter(code => offerRomeCodes.has(code));
        if (matchingRomeCodes.length > 0) {
            score++;
            details.push(`Codes ROME correspondants : ${matchingRomeCodes.join(', ')}.`);
        }

        // 3. RNCP Codes from Formations
        const cvRncpCodes = new Set(cv.formations?.flatMap((f:any) => f.rncpCode || []) || []);
        const offerRncpCodes = new Set(offer.infoMatching?.rncpCodes || []);
        const matchingRncpCodes = [...cvRncpCodes].filter(code => offerRncpCodes.has(code));
        if (matchingRncpCodes.length > 0) {
            score++;
            details.push(`Certifications RNCP correspondantes : ${matchingRncpCodes.join(', ')}.`);
        }

        // 4. Contract Type
        const cvContracts = new Set(cv.contractTypes || []);
        const offerContracts = new Set(offer.contractType || []);
        if ([...cvContracts].some(c => offerContracts.has(c))) {
            score++;
            details.push("Le type de contrat est compatible.");
        }
        
        // 5. Location/Mobility
        const cvMobility = new Set(cv.mobility?.map((m:string) => m.toLowerCase()) || []);
        const offerLocation = new Set(offer.location?.map((l:string) => l.toLowerCase()) || []);
        if ([...cvMobility].some(m => offerLocation.has(m))) {
            score++;
            details.push("La localisation est compatible.");
        }


        const finalScore = (score / totalChecks) * 100;
        setMatchResult({ score: Math.round(finalScore), details });
        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test de Matching Vitae</CardTitle>
                <CardDescription>Simulez un matching entre un profil de CV et une offre d'emploi.</CardDescription>
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
                        <Label>Offre d'emploi</Label>
                        <Select onValueChange={setSelectedOfferId} disabled={areJobOffersLoading}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner une offre..." /></SelectTrigger>
                            <SelectContent>
                                {jobOffers?.map(o => <SelectItem key={o.id} value={o.id}>{o.title?.join(', ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button onClick={handleRunMatch} disabled={!selectedCvId || !selectedOfferId || isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                    Lancer le matching
                </Button>
                {matchResult && (
                    <div className="pt-6 border-t space-y-4">
                        <h3 className="text-xl font-semibold">Résultat du Matching</h3>
                        <div className="flex items-center gap-4">
                             <div className="relative h-24 w-24">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${matchResult.score}, 100`} />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">{matchResult.score}%</div>
                            </div>
                            <div className="flex-1 space-y-2">
                                {matchResult.details.map((detail, index) => (
                                    <div key={index} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                        <span>{detail}</span>
                                    </div>
                                ))}
                                {matchResult.score < 50 && (
                                    <div className="flex items-start gap-2 text-sm text-destructive">
                                        <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>Peu de points communs trouvés.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function JobOfferManager() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Offres d'emploi</CardTitle>
                <CardDescription>Gérez vos offres d'emploi ici.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>La gestion des offres d'emploi est en cours de développement.</p>
                </div>
            </CardContent>
        </Card>
    )
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
                <TabsList className="grid w-full grid-cols-3 h-auto">
                    <TabsTrigger value="fiches-metiers">
                        <BookCopy className="mr-2 h-4 w-4" /> FICHES METIERS
                    </TabsTrigger>
                    <TabsTrigger value="jobs">
                        <Briefcase className="mr-2 h-4 w-4" /> OFFRE D'EMPLOI
                    </TabsTrigger>
                    <TabsTrigger value="test">
                        <FlaskConical className="mr-2 h-4 w-4" /> TEST
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="fiches-metiers">
                    <FichesMetiersManager />
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
