

'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Briefcase, FlaskConical, Search, Inbox, PlusCircle, Trash2, Edit, X, Download, MoreHorizontal, Upload, ChevronsUpDown, Check, BookCopy } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

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

const clientInfoSchema = z.object({
  id: z.string().min(1, "La sélection d'un client est requise."),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
});


const cvProfileSchema = z.object({
  clientId: z.string().min(1, "La sélection d'un client est requise."),
  clientName: z.string(),
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
}

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    counselorIds?: string[];
};

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

const generateCvProfilePdf = async (profile: CvProfile, client?: Client | null) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    let y = 20;

    // --- HEADER ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.clientName, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
    y += 8;

    if (client) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const contactInfo = [client.email, client.phone].filter(Boolean).join('  •  ');
        doc.text(contactInfo, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 10;
    }

    // --- PROJET PROFESSIONNEL ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("PROJET PROFESSIONNEL", 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 10;

    const addSectionData = (label: string, value?: string[]) => {
        if (value && value.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value.join(', '), 60, y, { maxWidth: 130 });
            y += (doc.splitTextToSize(value.join(', '), 130).length * 5) + 2;
        }
    };

    addSectionData("Métier(s) actuel(s)", profile.currentJobs);
    addSectionData("Projet(s) recherché(s)", profile.searchedJobs);
    addSectionData("Type(s) de contrat", profile.contractTypes);
    addSectionData("Durée de travail", profile.workDurations);
    addSectionData("Environnement", profile.workEnvironments);
    addSectionData("Salaire souhaité", profile.desiredSalary);
    addSectionData("Mobilité", profile.mobility);
    y += 5;
    
    // --- PERMIS ---
    if (profile.drivingLicences && profile.drivingLicences.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("PERMIS", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(profile.drivingLicences.join(', '), 20, y);
        y += 10;
    }


    // --- FORMATIONS ---
    if (profile.formations && profile.formations.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("FORMATIONS", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;

        profile.formations.forEach(formation => {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(formation.title?.join(', ') || 'Formation non spécifiée', 20, y);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(formation.level?.join(', ') || '', 195, y, { align: 'right' });
            y += 6;
            
            if (formation.skills && formation.skills.length > 0) {
                doc.setFont('helvetica', 'italic');
                const skillsText = `Compétences: ${formation.skills.join(', ')}`;
                const skillsLines = doc.splitTextToSize(skillsText, 170);
                doc.text(skillsLines, 20, y);
                y += skillsLines.length * 5;
            }
             y += 4;
        });
        y += 5;
    }

    // --- EXPÉRIENCES ---
    if (profile.experiences && profile.experiences.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("PARCOURS PROFESSIONNEL", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;

        profile.experiences.forEach(exp => {
            if (y > 250) { doc.addPage(); y = 20; }
            const seniority = calculateSeniority(exp.startDate, exp.endDate);
            const dateRange = `${exp.startDate ? new Date(exp.startDate).toLocaleDateString('fr-FR') : '?'} - ${exp.endDate ? new Date(exp.endDate).toLocaleDateString('fr-FR') : '?'}`;
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(exp.title?.join(', ') || 'Poste non spécifié', 20, y);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(dateRange, 195, y, { align: 'right' });
            y += 6;
            if (seniority) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150);
                doc.text(seniority, 195, y, { align: 'right' });
                doc.setTextColor(0);
            }
            if (exp.activities && exp.activities.length > 0) {
                doc.setFontSize(10);
                const activitiesText = `Activités: ${exp.activities.join(', ')}`;
                const activitiesLines = doc.splitTextToSize(activitiesText, 170);
                doc.text(activitiesLines, 20, y);
                 y += (activitiesLines.length * 5) + 2;
            }
             if (exp.skills && exp.skills.length > 0) {
                doc.setFontSize(10);
                const skillsText = `Compétences: ${exp.skills.join(', ')}`;
                const skillsLines = doc.splitTextToSize(skillsText, 170);
                doc.text(skillsLines, 20, y);
                y += (skillsLines.length * 5) + 2;
            }
            y += 5;
        });
        y += 5;
    }

    // --- SOFTSKILLS ---
    if (profile.softSkills && profile.softSkills.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("SAVOIR-ÊTRE", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const softSkillsText = profile.softSkills.join(' • ');
        const softSkillsLines = doc.splitTextToSize(softSkillsText, 170);
        doc.text(softSkillsLines, 20, y);
        y += softSkillsLines.length * 5 + 5;
    }

    doc.save(`CV_Profil_${profile.clientName.replace(' ', '_')}.pdf`);
};

function Cvtheque() {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<CvProfile | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [selectedClientForDisplay, setSelectedClientForDisplay] = useState<{name:string, email?:string, phone?:string} | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const clientsQuery = useMemoFirebase(() => {
        if(!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

    const cvProfilesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/cv_profiles`));
    }, [user, firestore]);
    const { data: cvProfiles, isLoading: areProfilesLoading } = useCollection<CvProfile>(cvProfilesQuery);
    
    const filteredCvProfiles = useMemo(() => {
        if (!cvProfiles) return [];
        if (!searchTerm) return cvProfiles;
        const lowercasedTerm = searchTerm.toLowerCase();
        return cvProfiles.filter(profile => profile.clientName.toLowerCase().includes(lowercasedTerm));
    }, [cvProfiles, searchTerm]);


    const form = useForm<CvProfileFormData>({
        resolver: zodResolver(cvProfileSchema),
        defaultValues: {
            clientId: '',
            clientName: '',
            currentJobs: [], searchedJobs: [], contractTypes: [], workDurations: [],
            workEnvironments: [], desiredSalary: [], mobility: [], drivingLicences: [],
            formations: [], experiences: [], softSkills: [], cvUrl: null,
        }
    });
    
    useEffect(() => {
        if(isSheetOpen) {
            if(editingProfile) {
                form.reset({
                  ...editingProfile,
                  currentJobs: editingProfile.currentJobs || [],
                  searchedJobs: editingProfile.searchedJobs || [],
                  contractTypes: editingProfile.contractTypes || [],
                  workDurations: editingProfile.workDurations || [],
                  workEnvironments: editingProfile.workEnvironments || [],
                  desiredSalary: editingProfile.desiredSalary || [],
                  mobility: editingProfile.mobility || [],
                  drivingLicences: editingProfile.drivingLicences || [],
                  formations: editingProfile.formations || [],
                  experiences: editingProfile.experiences || [],
                  softSkills: editingProfile.softSkills || [],
                });
                const client = clients?.find(c => c.id === editingProfile.clientId);
                if (client) {
                    setSelectedClientForDisplay({ name: editingProfile.clientName, email: client.email, phone: client.phone });
                }
            } else {
                 form.reset({
                    clientId: '', clientName: '', currentJobs: [], searchedJobs: [], contractTypes: [], workDurations: [],
                    workEnvironments: [], desiredSalary: [], mobility: [], drivingLicences: [],
                    formations: [], experiences: [], softSkills: [], cvUrl: null,
                });
                setSelectedClientForDisplay(null);
            }
        }
    }, [isSheetOpen, editingProfile, form, clients]);

    const { fields: formationFields, append: appendFormation, remove: removeFormation } = useFieldArray({
        control: form.control, name: "formations",
    });

    const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
        control: form.control, name: "experiences",
    });
    

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
            counselorId: user.uid,
            clientId: data.clientId,
            clientName: data.clientName,
            currentJobs: data.currentJobs || [],
            searchedJobs: data.searchedJobs || [],
            contractTypes: data.contractTypes || [],
            workDurations: data.workDurations || [],
            workEnvironments: data.workEnvironments || [],
            desiredSalary: data.desiredSalary || [],
            mobility: data.mobility || [],
            drivingLicences: data.drivingLicences || [],
            formations: data.formations || [],
            experiences: data.experiences || [],
            softSkills: data.softSkills || [],
            cvUrl: fileUrl,
        };

        if (editingProfile) {
            const profileRef = doc(firestore, `users/${user.uid}/cv_profiles`, editingProfile.id);
            await setDocumentNonBlocking(profileRef, profileData, { merge: true });
            toast({ title: "Profil mis à jour" });
        } else {
            await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/cv_profiles`), profileData);
            toast({ title: "Profil créé" });
        }
        
        setIsUploading(false);
        setIsSheetOpen(false);
    };

    const handleEditProfile = (profile: CvProfile) => {
        setEditingProfile(profile);
        setIsSheetOpen(true);
    };

    const handleDeleteProfile = (profileId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/cv_profiles`, profileId));
        toast({ title: "Profil supprimé" });
    };

    const handleExport = (profile: CvProfile) => {
        const client = clients?.find(c => c.id === profile.clientId);
        generateCvProfilePdf(profile, client);
    }

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
                    <Button onClick={() => { setEditingProfile(null); form.reset(); setCvFile(null); setSelectedClientForDisplay(null); }}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un profil CV</Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-3xl w-full">
                     <SheetHeader>
                        <SheetTitle>{editingProfile ? 'Modifier le profil' : 'Nouveau Profil CV'}</SheetTitle>
                    </SheetHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                            <ScrollArea className="flex-1 pr-6 py-4 -mr-6">
                                <div className="space-y-8">
                                     <ClientSelector
                                        clients={clients || []}
                                        onClientSelect={(client) => {
                                            form.setValue('clientId', client.id || '');
                                            form.setValue('clientName', client.name);
                                            setSelectedClientForDisplay(client);
                                        }}
                                        isLoading={areClientsLoading}
                                        defaultValue={editingProfile ? {id: editingProfile.clientId, name: editingProfile.clientName} : undefined}
                                    />
                                    {selectedClientForDisplay && (
                                        <Card className="p-4 bg-muted/50">
                                            <p className="text-sm font-semibold">{selectedClientForDisplay.name}</p>
                                            {selectedClientForDisplay.email && <p className="text-xs text-muted-foreground">{selectedClientForDisplay.email}</p>}
                                            {selectedClientForDisplay.phone && <p className="text-xs text-muted-foreground">{selectedClientForDisplay.phone}</p>}
                                        </Card>
                                    )}
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
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
            <Input
                placeholder="Rechercher par nom de client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
            {areProfilesLoading ? (
                 <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : filteredCvProfiles && filteredCvProfiles.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Projet</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCvProfiles.map(profile => (
                            <TableRow key={profile.id}>
                                <TableCell className="font-medium">{profile.clientName}</TableCell>
                                <TableCell className="text-muted-foreground">{profile.searchedJobs?.join(', ') || '-'}</TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleExport(profile)}>
                                                <Download className="mr-2 h-4 w-4" /> Exporter PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleEditProfile(profile)}>
                                                <Edit className="mr-2 h-4 w-4"/> Modifier
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProfile(profile.id)}>
                                                <Trash2 className="mr-2 h-4 w-4"/> Supprimer
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Aucun profil CV pour le moment.</p>
                </div>
            )}
        </CardContent>
      </Card>
    );
}

type ClientSelectorProps = {
    clients: Client[];
    onClientSelect: (client: {id: string, name: string, email?: string, phone?: string}) => void;
    isLoading: boolean;
    defaultValue?: {id:string, name:string};
};

function ClientSelector({ clients, onClientSelect, isLoading, defaultValue }: ClientSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<{id: string, name: string} | null>(defaultValue || null);

    useEffect(() => {
        if (defaultValue) {
            setSelectedClient(defaultValue);
        } else {
            setSelectedClient(null);
        }
    }, [defaultValue]);

    const handleSelect = (client: Client) => {
        const clientInfo = {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
            phone: client.phone,
        };
        setSelectedClient(clientInfo);
        onClientSelect(clientInfo);
        setOpen(false);
    }
    
    return (
        <div>
            <Label>Client</Label>
            {isLoading ? <Skeleton className="h-10 w-full mt-2" /> : (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between mt-2">
                        {selectedClient?.name ? selectedClient.name : "Sélectionner un client..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Rechercher un client..." />
                        <CommandList>
                            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                            <CommandGroup>
                                {clients.map((client) => (
                                    <CommandItem key={client.id} value={client.email} onSelect={() => handleSelect(client)}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedClient?.id === client.id ? "opacity-100" : "opacity-0")}/>
                                        <div>
                                            <p>{client.firstName} {client.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{client.email}</p>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            )}
        </div>
    )
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

const generateRncpPdf = (fiche: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Fiche: ${fiche.name}`, 15, 20);

    let y = 35;
    
    const addSection = (title: string, data: {label: string, values: string[]}[]) => {
        if (data.every(d => !d.values || d.values.length === 0)) return;
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(16);
        doc.text(title, 15, y);
        y += 8;
        data.forEach(item => {
            if (item.values && item.values.length > 0) {
                 if (y > 270) { doc.addPage(); y = 20; }
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(item.label, 20, y);
                y += 6;
                doc.setFont('helvetica', 'normal');
                const lines = doc.splitTextToSize(item.values.join(', '), 170);
                doc.text(lines, 20, y);
                y += (lines.length * 5) + 4;
            }
        });
    };

    addSection("Codification RNCP", [
        { label: "Code(s) RNCP:", values: fiche.rncpCodes },
        { label: "Intitulé(s):", values: fiche.rncpTitle },
        { label: "Niveau(x):", values: fiche.rncpLevel },
    ]);
    
     addSection("Codification ROME", [
        { label: "Code(s) ROME:", values: fiche.romeCodes },
        { label: "Métier(s) associé(s):", values: fiche.romeMetiers },
    ]);

     addSection("Compétences et Activités", [
        { label: "Compétences:", values: fiche.competences },
        { label: "Activités:", values: fiche.activites },
    ]);


    doc.save(`Fiche_${fiche.name.replace(/\s/g, '_')}.pdf`);
};

function RncpManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingFiche, setEditingFiche] = useState<any>(null);
  const [ficheToDelete, setFicheToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const rncpFichesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/rncp_fiches`));
  }, [user, firestore]);
  const { data: fiches, isLoading } = useCollection(rncpFichesQuery);
  
  const filteredFiches = useMemo(() => {
    if (!fiches) return [];
    if (!searchTerm) return fiches;
    return fiches.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [fiches, searchTerm]);

  const ficheFormSchema = z.object({
    name: z.string().min(1, 'Le nom est requis.'),
    rncpCodes: z.array(z.string()).optional(),
    rncpLevel: z.array(z.string()).optional(),
    rncpTitle: z.array(z.string()).optional(),
    romeCodes: z.array(z.string()).optional(),
    romeMetiers: z.array(z.string()).optional(),
    competences: z.array(z.string()).optional(),
    activites: z.array(z.string()).optional(),
  });
  
  type FicheFormData = z.infer<typeof ficheFormSchema>;
  
  const form = useForm<FicheFormData>({
    resolver: zodResolver(ficheFormSchema),
    defaultValues: {
      name: '', rncpCodes: [], rncpLevel: [], rncpTitle: [], romeCodes: [],
      romeMetiers: [], competences: [], activites: [],
    },
  });

  const handleNew = () => {
    setEditingFiche(null);
    form.reset();
    setIsSheetOpen(true);
  };
  
  const handleEdit = (fiche: any) => {
    setEditingFiche(fiche);
    form.reset(fiche);
    setIsSheetOpen(true);
  }
  
  const handleDelete = async () => {
      if (!ficheToDelete || !user) return;
      await deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/rncp_fiches`, ficheToDelete.id));
      toast({ title: "Fiche supprimée" });
      setFicheToDelete(null);
  };
  
  const handleExportPdf = (fiche: any) => {
    generateRncpPdf(fiche);
  };

  const onSubmit = async (data: FicheFormData) => {
    if (!user) return;
    const ficheData = { counselorId: user.uid, ...data };
    if (editingFiche) {
      await setDocumentNonBlocking(doc(firestore, `users/${user.uid}/rncp_fiches`, editingFiche.id), ficheData, { merge: true });
      toast({ title: 'Fiche RNCP mise à jour' });
    } else {
      await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/rncp_fiches`), ficheData);
      toast({ title: 'Fiche RNCP créée' });
    }
    setIsSheetOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Fiches RNCP/ROME</CardTitle>
            <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Fiche</Button>
        </div>
        <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
            <Input
                placeholder="Rechercher une fiche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
            />
        </div>
      </CardHeader>
      <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nom de la fiche</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-8" /></TableCell></TableRow>
              : filteredFiches && filteredFiches.length > 0 ? filteredFiches.map((fiche: any) => (
                <TableRow key={fiche.id}>
                  <TableCell>{fiche.name}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleExportPdf(fiche)}><Download className="mr-2 h-4 w-4" /> Exporter PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(fiche)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setFicheToDelete(fiche)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={2} className="text-center h-24">Aucune fiche créée.</TableCell></TableRow>}
            </TableBody>
          </Table>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-2xl w-full">
              <SheetHeader>
                <SheetTitle>{editingFiche ? 'Modifier la' : 'Nouvelle'} fiche RNCP/ROME</SheetTitle>
              </SheetHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="py-4 pr-4 space-y-6">
                      <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la fiche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Codification RNCP</h3>
                        <FormField control={form.control} name="rncpCodes" render={({ field }) => (<FormItem><FormLabel>Code(s) RNCP associé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="rncpTitle" render={({ field }) => (<FormItem><FormLabel>Intitulé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="rncpLevel" render={({ field }) => (<FormItem><FormLabel>Niveau(x)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau..." /></FormControl></FormItem>)} />
                      </section>
                      <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Codification ROME</h3>
                        <FormField control={form.control} name="romeCodes" render={({ field }) => (<FormItem><FormLabel>Code(s) ROME associé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="romeMetiers" render={({ field }) => (<FormItem><FormLabel>Métier(s) associé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..." /></FormControl></FormItem>)} />
                      </section>
                      <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Compétences et Activités</h3>
                        <FormField control={form.control} name="competences" render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="activites" render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl></FormItem>)} />
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
          <AlertDialog open={!!ficheToDelete} onOpenChange={(open) => !open && setFicheToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </CardContent>
    </Card>
  );
}

function RomeManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingFiche, setEditingFiche] = useState<any>(null);
  const [ficheToDelete, setFicheToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const romeFichesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/rome_fiches`));
  }, [user, firestore]);
  const { data: fiches, isLoading } = useCollection(romeFichesQuery);
  
  const filteredFiches = useMemo(() => {
    if (!fiches) return [];
    if (!searchTerm) return fiches;
    return fiches.filter((f: any) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [fiches, searchTerm]);

  const ficheFormSchema = z.object({
    name: z.string().min(1, 'Le nom est requis.'),
    romeCodes: z.array(z.string()).optional(),
    romeTitles: z.array(z.string()).optional(),
    associatedJobs: z.array(z.string()).optional(),
    associatedRncp: z.array(z.string()).optional(),
    softSkills: z.array(z.string()).optional(),
    competences: z.array(z.string()).optional(),
    activites: z.array(z.string()).optional(),
  });
  
  type FicheFormData = z.infer<typeof ficheFormSchema>;
  
  const form = useForm<FicheFormData>({
    resolver: zodResolver(ficheFormSchema),
    defaultValues: {
      name: '', romeCodes: [], romeTitles: [], associatedJobs: [], associatedRncp: [],
      softSkills: [], competences: [], activites: [],
    },
  });

  const handleNew = () => {
    setEditingFiche(null);
    form.reset();
    setIsSheetOpen(true);
  };
  
  const handleEdit = (fiche: any) => {
    setEditingFiche(fiche);
    form.reset(fiche);
    setIsSheetOpen(true);
  };
  
  const handleDelete = async () => {
      if (!ficheToDelete || !user) return;
      await deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/rome_fiches`, ficheToDelete.id));
      toast({ title: "Fiche supprimée" });
      setFicheToDelete(null);
  };

  const onSubmit = async (data: FicheFormData) => {
    if (!user) return;
    const ficheData = { counselorId: user.uid, ...data };
    if (editingFiche) {
      await setDocumentNonBlocking(doc(firestore, `users/${user.uid}/rome_fiches`, editingFiche.id), ficheData, { merge: true });
      toast({ title: 'Fiche ROME mise à jour' });
    } else {
      await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/rome_fiches`), ficheData);
      toast({ title: 'Fiche ROME créée' });
    }
    setIsSheetOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Fiches ROME</CardTitle>
            <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Fiche</Button>
        </div>
        <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
            <Input
                placeholder="Rechercher une fiche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
            />
        </div>
      </CardHeader>
      <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nom de la fiche</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-8" /></TableCell></TableRow>
              : filteredFiches && filteredFiches.length > 0 ? filteredFiches.map((fiche: any) => (
                <TableRow key={fiche.id}>
                  <TableCell>{fiche.name}</TableCell>
                  <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(fiche)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setFicheToDelete(fiche)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={2} className="text-center h-24">Aucune fiche créée.</TableCell></TableRow>}
            </TableBody>
          </Table>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-2xl w-full">
              <SheetHeader>
                <SheetTitle>{editingFiche ? 'Modifier la' : 'Nouvelle'} fiche ROME</SheetTitle>
              </SheetHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="py-4 pr-4 space-y-6">
                      <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la fiche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Codification ROME</h3>
                        <FormField control={form.control} name="romeCodes" render={({ field }) => (<FormItem><FormLabel>Code(s) ROME</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="romeTitles" render={({ field }) => (<FormItem><FormLabel>Intitulé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="associatedJobs" render={({ field }) => (<FormItem><FormLabel>Métier(s) associé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..." /></FormControl></FormItem>)} />
                      </section>
                       <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Condition d'accès</h3>
                        <FormField control={form.control} name="associatedRncp" render={({ field }) => (<FormItem><FormLabel>RNCP Associé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code RNCP..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="softSkills" render={({ field }) => (<FormItem><FormLabel>Savoir-être</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un savoir-être..." /></FormControl></FormItem>)} />
                      </section>
                      <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Compétences et Activités</h3>
                        <FormField control={form.control} name="competences" render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="activites" render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl></FormItem>)} />
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
          <AlertDialog open={!!ficheToDelete} onOpenChange={(open) => !open && setFicheToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </CardContent>
    </Card>
  );
}

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
                        <BookCopy className="mr-2 h-4 w-4" /> FICHE RNCP
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
