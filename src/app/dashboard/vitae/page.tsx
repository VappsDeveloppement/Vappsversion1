
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
        if (!cvUrl) {
            toast({ title: "Erreur", description: "Aucun CV n'est associé à cette candidature.", variant: 'destructive'});
            return;
        }
        const link = document.createElement("a");
        link.href = cvUrl;
        link.download = `CV_${applicantName.replace(/ /g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
      activities: z.array(z.string()).optional(),
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
    address?: string;
    zipCode?: string;
    city?: string;
    counselorIds?: string[];
};

function ClientSelector({ clients, onClientSelect, isLoading, defaultValue }: { clients: Client[], onClientSelect: (client: z.infer<typeof clientInfoSchema>) => void, isLoading: boolean, defaultValue?: z.infer<typeof clientInfoSchema> }) {
    const [open, setOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<z.infer<typeof clientInfoSchema> | null>(defaultValue || null);

    useEffect(() => {
        if (defaultValue?.name && !selectedClient?.name) {
            setSelectedClient(defaultValue);
        }
    }, [defaultValue, selectedClient]);


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
            <h3 className="text-lg font-medium mb-4">Client</h3>
            {isLoading ? <Skeleton className="h-10 w-full" /> : (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
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

const calculateSeniority = (startDate?: string, endDate?: string) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    const years = differenceInYears(end, start);
    const months = differenceInMonths(end, start) % 12;
    
    let result = '';
    if (years > 0) result += `${years} an(s) `;
    if (months > 0) result += `${months} mois`;
    
    return result.trim() || 'Moins d\'un mois';
};

const generateCvProfilePdf = async (profile: CvProfile, client?: Client | null) => {
    const doc = new jsPDF();
    let y = 20;

    const printList = (list?: string[]) => (list && list.length > 0 ? list.join(', ') : 'Non spécifié');

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
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 20, y);
            doc.setFont('helvetica', 'normal');
            const textToPrint = value.join(', ');
            const splitText = doc.splitTextToSize(textToPrint, 130);
            doc.text(splitText, 60, y);
            y += splitText.length * 5 + 2;
        }
    };

    addSectionData("Métier(s) recherché(s)", profile.searchedJobs);
    addSectionData("Contrat(s) souhaité(s)", profile.contractTypes);
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
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("FORMATION", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;
        
        profile.formations.forEach(formation => {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(printList(formation.title), 20, y);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(printList(formation.level), 195, y, { align: 'right' });
            y += 6;
            
            if (formation.skills && formation.skills.length > 0) {
                doc.setFont('helvetica', 'italic');
                const skillsText = `Compétences: ${printList(formation.skills)}`;
                const skillsLines = doc.splitTextToSize(skillsText, 170);
                doc.text(skillsLines, 25, y);
                y += skillsLines.length * 5 + 4;
            }
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
            const dateRange = `${exp.startDate ? new Date(exp.startDate).toLocaleDateString('fr-FR') : '?'} - ${exp.endDate ? new Date(exp.endDate).toLocaleDateString('fr-FR') : 'Aujourd\'hui'}`;
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(printList(exp.title), 20, y);
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
            
            const addExpDetails = (label: string, items?: string[]) => {
                if (items && items.length > 0) {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'italic');
                    const text = `${label}: ${printList(items)}`;
                    const lines = doc.splitTextToSize(text, 170);
                    doc.text(lines, 25, y);
                    y += lines.length * 5 + 2;
                }
            };
            
            addExpDetails("Activités", exp.activities);
            addExpDetails("Compétences", exp.skills);
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

        let cvUrl = editingProfile?.cvUrl || null;
        if (cvFile) {
             const cvDataUrl = await toBase64(cvFile);
             cvUrl = cvDataUrl;
        }

        const profileData: Omit<CvProfile, 'id'> = {
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
            formations: data.formations?.map(f => ({...f, activities: f.activities || [] })) || [],
            experiences: data.experiences || [],
            softSkills: data.softSkills || [],
            cvUrl: cvUrl,
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
                                                            <FormField control={form.control} name={`formations.${index}.activities`} render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl><FormMessage /></FormItem>)}/>
                                                        </div>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => appendFormation({ id: `formation-${Date.now()}`, rncpCode: [], title: [], level: [], skills: [], activities: [] })}>
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

function FicheSelector({ fiches, title, onSelect }: { fiches: any[], title: string, onSelect: (fiche: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start"><PlusCircle className="mr-2 h-4 w-4" /> Ajouter depuis une fiche {title}...</Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder={`Rechercher une fiche ${title}...`} />
          <CommandList>
            <CommandEmpty>Aucune fiche trouvée.</CommandEmpty>
            <CommandGroup>
              {fiches.map((fiche) => (
                <CommandItem key={fiche.id} onSelect={() => { onSelect(fiche); setOpen(false); }}>
                  {fiche.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RncpSelector({ fiches, onSelect }: { fiches: any[], onSelect: (fiche: any) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-start"><PlusCircle className="mr-2 h-4 w-4" /> Ajouter depuis une fiche RNCP...</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
                <Command>
                    <CommandInput placeholder="Rechercher une fiche RNCP..." />
                    <CommandList>
                        <CommandEmpty>Aucune fiche trouvée.</CommandEmpty>
                        <CommandGroup>
                            {fiches.map((fiche) => (
                                <CommandItem key={fiche.id} onSelect={() => { onSelect(fiche); setOpen(false); }}>
                                    {fiche.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const generateRncpPdf = (fiche: any) => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Fiche RNCP: ${fiche.name}`, 15, y);
    y += 15;

    const addSection = (title: string, items: string[] | undefined) => {
        if (items && items.length > 0) {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 15, y);
            y += 8;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const text = items.join(', ');
            const lines = doc.splitTextToSize(text, 180);
            doc.text(lines, 20, y);
            y += lines.length * 5 + 5;
        }
    };
    
    addSection("Codes RNCP", fiche.rncpCodes);
    addSection("Intitulés RNCP", fiche.rncpTitle);
    addSection("Niveaux RNCP", fiche.rncpLevel);
    y += 5;
    doc.line(15, y, 195, y);
    y += 10;
    addSection("Codes ROME associés", fiche.romeCodes);
    addSection("Métiers ROME associés", fiche.romeMetiers);
    y += 5;
    doc.line(15, y, 195, y);
    y += 10;
    addSection("Compétences", fiche.competences);
    addSection("Activités", fiche.activites);
    
    if (fiche.associatedTrainings && fiche.associatedTrainings.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Formations Associées", 15, y);
        y += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        fiche.associatedTrainings.forEach((training: any) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`- ${training.title}`, 20, y);
            y += 6;
        });
    }

    doc.save(`Fiche_RNCP_${fiche.name.replace(' ', '_')}.pdf`);
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
  
  const trainingsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'trainings'), where('authorId', '==', user.uid));
  }, [user, firestore]);
  const { data: trainings, isLoading: areTrainingsLoading } = useCollection<Training>(trainingsQuery);
  
  const filteredFiches = useMemo(() => {
    if (!fiches) return [];
    if (!searchTerm) return fiches;
    return fiches.filter((f: any) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
    associatedTrainings: z.array(z.string()).optional(),
  });
  
  type FicheFormData = z.infer<typeof ficheFormSchema>;
  
  const form = useForm<FicheFormData>({
    resolver: zodResolver(ficheFormSchema),
    defaultValues: {
      name: '', rncpCodes: [], rncpLevel: [], rncpTitle: [], romeCodes: [],
      romeMetiers: [], competences: [], activites: [], associatedTrainings: [],
    },
  });

  const handleNew = () => {
    setEditingFiche(null);
    form.reset();
    setIsSheetOpen(true);
  };
  
  const handleEdit = (fiche: any) => {
    setEditingFiche(fiche);
    form.reset({
      ...fiche,
      associatedTrainings: fiche.associatedTrainings || [],
    });
    setIsSheetOpen(true);
  }
  
  const handleDelete = async () => {
      if (!ficheToDelete || !user) return;
      await deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/rncp_fiches`, ficheToDelete.id));
      toast({ title: "Fiche supprimée" });
      setFicheToDelete(null);
  };
  
  const handleExportPdf = (fiche: any) => {
    const populatedFiche = {
      ...fiche,
      associatedTrainings: fiche.associatedTrainings?.map((id: string) => trainings?.find(t => t.id === id)).filter(Boolean) || [],
    }
    generateRncpPdf(populatedFiche);
  };

  const onSubmit = async (data: FicheFormData) => {
    if (!user) return;
    const ficheData = { 
        counselorId: user.uid,
        name: data.name,
        rncpCodes: data.rncpCodes || [],
        rncpLevel: data.rncpLevel || [],
        rncpTitle: data.rncpTitle || [],
        romeCodes: data.romeCodes || [],
        romeMetiers: data.romeMetiers || [],
        competences: data.competences || [],
        activites: data.activites || [],
        associatedTrainings: data.associatedTrainings || [],
    };
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
            <CardTitle>Fiches RNCP</CardTitle>
            <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Fiche</Button>
        </div>
        <div className="relative pt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" /><Input placeholder="Rechercher une fiche..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9"/></div>
      </CardHeader>
      <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nom de la fiche</TableHead><TableHead>Formations associées</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8" /></TableCell></TableRow>
              : filteredFiches && filteredFiches.length > 0 ? filteredFiches.map((fiche: any) => (
                <TableRow key={fiche.id}>
                  <TableCell>{fiche.name}</TableCell>
                   <TableCell>{fiche.associatedTrainings?.length || 0}</TableCell>
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
              )) : <TableRow><TableCell colSpan={3} className="text-center h-24">Aucune fiche créée.</TableCell></TableRow>}
            </TableBody>
          </Table>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-2xl w-full">
              <SheetHeader>
                <SheetTitle>{editingFiche ? 'Modifier la' : 'Nouvelle'} fiche RNCP</SheetTitle>
              </SheetHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="py-4 pr-4 space-y-6">
                      <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la fiche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Codification RNCP</h3>
                        <FormField control={form.control} name="rncpCodes" render={({ field }) => (<FormItem><FormLabel>Code(s) RNCP</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="rncpTitle" render={({ field }) => (<FormItem><FormLabel>Intitulé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="rncpLevel" render={({ field }) => (<FormItem><FormLabel>Niveau(x)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau..." /></FormControl></FormItem>)} />
                      </section>
                      <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Codification ROME</h3>
                        <FormField control={form.control} name="romeCodes" render={({ field }) => (<FormItem><FormLabel>Code(s) ROME</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="romeMetiers" render={({ field }) => (<FormItem><FormLabel>Métier(s) associé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..." /></FormControl></FormItem>)} />
                      </section>
                      <section className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Compétences et Activités</h3>
                        <FormField control={form.control} name="competences" render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="activites" render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl></FormItem>)} />
                      </section>
                      <section className="space-y-4 pt-4 border-t">
                          <h3 className="font-semibold">Formations Associées</h3>
                           <FormField
                                control={form.control}
                                name="associatedTrainings"
                                render={() => (
                                    <FormItem>
                                        {areTrainingsLoading ? <Skeleton className="h-20 w-full" /> : trainings && trainings.length > 0 ? trainings.map((training) => (
                                            <FormField
                                                key={training.id}
                                                control={form.control}
                                                name="associatedTrainings"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                            key={training.id}
                                                            className="flex flex-row items-start space-x-3 space-y-0"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(training.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                        ? field.onChange([...(field.value || []), training.id])
                                                                        : field.onChange(field.value?.filter((value) => value !== training.id));
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{training.title}</FormLabel>
                                                        </FormItem>
                                                    );
                                                }}
                                            />
                                        )) : <p className="text-sm text-muted-foreground">Aucune formation dans votre catalogue.</p>}
                                    </FormItem>
                                )}
                            />
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

    const rncpFichesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/rncp_fiches`));
    }, [user, firestore]);
    const { data: rncpFiches, isLoading: areRncpFichesLoading } = useCollection(rncpFichesQuery);

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
        defaultValues: { name: '', romeCodes: [], romeTitles: [], associatedJobs: [], associatedRncp: [], softSkills: [], competences: [], activites: [] },
    });

    const handleNew = () => { setEditingFiche(null); form.reset(); setIsSheetOpen(true); };
    const handleEdit = (fiche: any) => { setEditingFiche(fiche); form.reset(fiche); setIsSheetOpen(true); };
    const handleDelete = async () => { if (!ficheToDelete || !user) return; await deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/rome_fiches`, ficheToDelete.id)); toast({ title: "Fiche supprimée" }); setFicheToDelete(null); };

    const onSubmit = async (data: FicheFormData) => {
        if (!user) return;
        const ficheData = { 
            counselorId: user.uid,
            name: data.name,
            romeCodes: data.romeCodes || [],
            romeTitles: data.romeTitles || [],
            associatedJobs: data.associatedJobs || [],
            associatedRncp: data.associatedRncp || [],
            softSkills: data.softSkills || [],
            competences: data.competences || [],
            activites: data.activites || [],
        };
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
                <div className="flex justify-between items-center"><CardTitle>Fiches ROME</CardTitle><Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Fiche</Button></div>
                <div className="relative pt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" /><Input placeholder="Rechercher une fiche..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9"/></div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nom de la fiche</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-8" /></TableCell></TableRow>
                        : filteredFiches && filteredFiches.length > 0 ? filteredFiches.map((fiche: any) => (
                            <TableRow key={fiche.id}><TableCell>{fiche.name}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleEdit(fiche)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setFicheToDelete(fiche)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={2} className="text-center h-24">Aucune fiche créée.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-2xl w-full">
                        <SheetHeader><SheetTitle>{editingFiche ? 'Modifier la' : 'Nouvelle'} fiche ROME</SheetTitle></SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <ScrollArea className="h-[calc(100vh-8rem)]"><div className="py-4 pr-4 space-y-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la fiche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <section className="space-y-4 pt-4 border-t"><h3 className="font-semibold">Codification ROME</h3>
                                        <FormField control={form.control} name="romeCodes" render={({ field }) => (<FormItem><FormLabel>Code(s) ROME</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code..." /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="romeTitles" render={({ field }) => (<FormItem><FormLabel>Intitulé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..." /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="associatedJobs" render={({ field }) => (<FormItem><FormLabel>Métier(s) associé(s)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..." /></FormControl></FormItem>)} />
                                    </section>
                                    <section className="space-y-4 pt-4 border-t"><h3 className="font-semibold">Condition d'accès</h3>
                                       <FormField
                                            control={form.control}
                                            name="associatedRncp"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Codes RNCP Associés</FormLabel>
                                                    <RncpSelector
                                                        fiches={rncpFiches || []}
                                                        onSelect={(fiche) => {
                                                            const currentCodes = new Set(field.value || []);
                                                            (fiche.rncpCodes || []).forEach((code: string) => currentCodes.add(code));
                                                            field.onChange(Array.from(currentCodes));
                                                        }}
                                                    />
                                                    <FormControl>
                                                        <TagInput {...field} placeholder="Ajouter un code RNCP..." />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                       <FormField control={form.control} name="softSkills" render={({ field }) => (<FormItem><FormLabel>Savoir-être (Softskills)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un savoir-être..." /></FormControl></FormItem>)} />
                                    </section>
                                    <section className="space-y-4 pt-4 border-t"><h3 className="font-semibold">Compétences et Activités</h3>
                                        <FormField control={form.control} name="competences" render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="activites" render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl></FormItem>)} />
                                    </section>
                                </div></ScrollArea>
                                <SheetFooter className="pt-4 border-t mt-auto"><SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose><Button type="submit">Sauvegarder</Button></SheetFooter>
                            </form>
                        </Form>
                    </SheetContent>
                </Sheet>
                <AlertDialog open={!!ficheToDelete} onOpenChange={(open) => !open && setFicheToDelete(null)}><AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent></AlertDialog>
            </CardContent>
        </Card>
    );
}

function TestManager() {
    const { user } = useUser();
    const firestore = useFirestore();

    const [selectedCvProfile, setSelectedCvProfile] = useState<any>(null);
    const [selectedRncpFiche, setSelectedRncpFiche] = useState<any>(null);
    const [selectedRomeFiche, setSelectedRomeFiche] = useState<any>(null);
    const [selectedJobOffer, setSelectedJobOffer] = useState<any>(null);

    const [rncpAnalysisResult, setRncpAnalysisResult] = useState<any>(null);
    const [romeAnalysisResult, setRomeAnalysisResult] = useState<any>(null);
    const [jobAnalysisResult, setJobAnalysisResult] = useState<any>(null);
    
    // Data fetching
    const cvProfilesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/cv_profiles`)) : null, [user, firestore]);
    const { data: cvProfiles } = useCollection<CvProfile>(cvProfilesQuery);

    const rncpFichesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/rncp_fiches`)) : null, [user, firestore]);
    const { data: rncpFiches } = useCollection(rncpFichesQuery);

    const romeFichesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/rome_fiches`)) : null, [user, firestore]);
    const { data: romeFiches } = useCollection(romeFichesQuery);

    const offersQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/job_offers`)) : null, [user, firestore]);
    const { data: jobOffers } = useCollection(offersQuery);

    const trainingsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'trainings'), where('authorId', '==', user.uid));
    }, [user, firestore]);
    const { data: trainings } = useCollection<Training>(trainingsQuery);


    useEffect(() => {
        if (selectedCvProfile && selectedRncpFiche) {
            // RNCP Analysis
            const cvRncpCodes = new Set(selectedCvProfile.formations?.flatMap((f: any) => f.rncpCode || []) || []);
            const cvFormationTitles = new Set(selectedCvProfile.formations?.flatMap((f: any) => f.title || []) || []);
            
            const ficheRncpCodes = new Set(selectedRncpFiche.rncpCodes || []);
            const ficheRncpTitles = new Set(selectedRncpFiche.rncpTitle || []);

            const codeMatch = [...cvRncpCodes].some(code => ficheRncpCodes.has(code));
            const titleMatch = [...cvFormationTitles].some(title => ficheRncpTitles.has(title));

            const cvSkills = new Set(selectedCvProfile.formations?.flatMap((f: any) => f.skills || []) || []);
            const ficheSkills = new Set(selectedRncpFiche.competences || []);
            const commonSkills = [...cvSkills].filter(skill => ficheSkills.has(skill));
            const skillsPercentage = ficheSkills.size > 0 ? (commonSkills.length / ficheSkills.size) * 100 : 0;
            
            const cvActivities = new Set(selectedCvProfile.formations?.flatMap((f: any) => f.activities || []) || []);
            const ficheActivities = new Set(selectedRncpFiche.activites || []);
            const commonActivities = [...cvActivities].filter(act => ficheActivities.has(act));
            const activitiesPercentage = ficheActivities.size > 0 ? (commonActivities.length / ficheActivities.size) * 100 : 0;

            setRncpAnalysisResult({
                hasCodeOrTitleMatch: codeMatch || titleMatch,
                skills: { matches: commonSkills, percentage: skillsPercentage.toFixed(0) },
                activities: { matches: commonActivities, percentage: activitiesPercentage.toFixed(0) },
            });
        } else {
            setRncpAnalysisResult(null);
        }

        if (selectedCvProfile && selectedRomeFiche) {
            // ROME Analysis
            const cvRomeCodes = new Set(selectedCvProfile.experiences?.flatMap((e: any) => e.romeCode || []) || []);
            const cvExperienceTitles = new Set(selectedCvProfile.experiences?.flatMap((e: any) => e.title || []) || []);

            const ficheRomeCodes = new Set(selectedRomeFiche.romeCodes || []);
            const ficheRomeMetiers = new Set(selectedRomeFiche.associatedJobs || []);

            const codeMatch = [...cvRomeCodes].some(code => ficheRomeCodes.has(code));
            const titleMatch = [...cvExperienceTitles].some(title => ficheRomeMetiers.has(title));

            const cvSkills = new Set(selectedCvProfile.experiences?.flatMap((e: any) => e.skills || []) || []);
            const ficheSkills = new Set(selectedRomeFiche.competences || []);
            const commonSkills = [...cvSkills].filter(skill => ficheSkills.has(skill));
            const skillsPercentage = ficheSkills.size > 0 ? (commonSkills.length / ficheSkills.size) * 100 : 0;

            const cvActivities = new Set(selectedCvProfile.experiences?.flatMap((e: any) => e.activities || []) || []);
            const ficheActivities = new Set(selectedRomeFiche.activites || []);
            const commonActivities = [...cvActivities].filter(act => ficheActivities.has(act));
            const activitiesPercentage = ficheActivities.size > 0 ? (commonActivities.length / ficheActivities.size) * 100 : 0;

            setRomeAnalysisResult({
                hasCodeOrTitleMatch: codeMatch || titleMatch,
                skills: { matches: commonSkills, percentage: skillsPercentage.toFixed(0) },
                activities: { matches: commonActivities, percentage: activitiesPercentage.toFixed(0) },
            });
        } else {
            setRomeAnalysisResult(null);
        }

    }, [selectedCvProfile, selectedRncpFiche, selectedRomeFiche]);

    const AnalysisResultCard = ({ title, results, fiche, allTrainings }: { title: string, results: any, fiche: any, allTrainings?: Training[] }) => {
        if (!results) return null;

        const recommendedTrainings = useMemo(() => {
            if (!fiche?.associatedTrainings || !allTrainings) return [];
            return fiche.associatedTrainings.map((id: string) => allTrainings.find(t => t.id === id)).filter(Boolean);
        }, [fiche, allTrainings]);

        const showRecommendations = results.skills.percentage < 50 || results.activities.percentage < 50;

        const ResultItem = ({ label, value, unit, isMatch }: { label: string, value: string | number, unit?: string, isMatch?: boolean }) => (
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted text-center">
                <div className="text-sm text-muted-foreground">{label}</div>
                 {isMatch !== undefined ? (
                    isMatch ? <CheckCircle className="h-8 w-8 text-green-500 my-2"/> : <XCircle className="h-8 w-8 text-destructive my-2"/>
                 ) : (
                    <div className="text-3xl font-bold my-2">{value}<span className="text-lg">{unit}</span></div>
                 )}
            </div>
        );

        return (
            <Card>
                <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultItem label="Code/Titre" isMatch={results.hasCodeOrTitleMatch} value={0}/>
                        <ResultItem label="Compétences" value={results.skills.percentage} unit="%" />
                        <ResultItem label="Activités" value={results.activities.percentage} unit="%" />
                    </div>
                     <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="details">
                            <AccordionTrigger>Voir les détails</AccordionTrigger>
                            <AccordionContent>
                                <div className="text-xs space-y-2">
                                    <p><strong>Compétences communes :</strong> {results.skills.matches.join(', ') || 'Aucune'}</p>
                                    <p><strong>Activités communes :</strong> {results.activities.matches.join(', ') || 'Aucune'}</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                     {showRecommendations && recommendedTrainings.length > 0 && (
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold text-amber-600 mb-2">Recommandations de Formation</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                {recommendedTrainings.map(training => (
                                    <li key={training.id} className="text-sm">
                                        <Link href={`/dashboard/e-learning/path/${training.id}`} className="text-blue-600 hover:underline">
                                            {training.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const Selector = ({ items, title, onSelect, selectedItem }: { items: any[] | undefined, title: string, onSelect: (item: any) => void, selectedItem: any }) => {
        const [open, setOpen] = useState(false);
        const itemName = selectedItem ? (selectedItem.clientName || selectedItem.name || renderCell(selectedItem.title)) : `Sélectionner ${title}...`;

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                        <span className="truncate">{itemName}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder={`Rechercher ${title}...`} />
                        <CommandList>
                            <CommandEmpty>Aucun résultat.</CommandEmpty>
                            <CommandGroup>
                                {(items || []).map((item) => (
                                    <CommandItem key={item.id} onSelect={() => { onSelect(item); setOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedItem?.id === item.id ? "opacity-100" : "opacity-0")} />
                                        {item.clientName || item.name || renderCell(item.title)}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test de Matching</CardTitle>
                <CardDescription>Sélectionnez des éléments pour voir les correspondances potentielles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><FileText className="h-4 w-4" />Profil CV</Label>
                        <Selector items={cvProfiles} title="un profil" onSelect={setSelectedCvProfile} selectedItem={selectedCvProfile} />
                    </div>
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2"><BookCopy className="h-4 w-4" />Fiche RNCP</Label>
                        <Selector items={rncpFiches} title="une fiche RNCP" onSelect={setSelectedRncpFiche} selectedItem={selectedRncpFiche} />
                    </div>
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Search className="h-4 w-4" />Fiche ROME</Label>
                        <Selector items={romeFiches} title="une fiche ROME" onSelect={setSelectedRomeFiche} selectedItem={selectedRomeFiche} />
                    </div>
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4" />Offre d'emploi (Optionnel)</Label>
                        <Selector items={jobOffers} title="une offre" onSelect={setSelectedJobOffer} selectedItem={selectedJobOffer} />
                    </div>
                </div>

                <div className="pt-8 border-t space-y-6">
                    <h3 className="text-lg font-semibold mb-4">Résultats de l'analyse</h3>
                    {rncpAnalysisResult && <AnalysisResultCard title="Analyse RNCP (Formation)" results={rncpAnalysisResult} fiche={selectedRncpFiche} allTrainings={trainings} />}
                    {romeAnalysisResult && <AnalysisResultCard title="Analyse ROME (Parcours Professionnel)" results={romeAnalysisResult} fiche={selectedRomeFiche} />}
                    {!rncpAnalysisResult && !romeAnalysisResult && (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>Sélectionnez des éléments ci-dessus pour lancer l'analyse.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

const renderCell = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return value.join(', ');
    return value || '-';
};

function JobOfferManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<any>(null);
    const [offerToDelete, setOfferToDelete] = useState<any>(null);

    const offersQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/job_offers`)) : null, [user, firestore]);
    const { data: offers, isLoading: areOffersLoading } = useCollection(offersQuery);

    const rncpFichesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/rncp_fiches`)) : null, [user, firestore]);
    const { data: rncpFiches } = useCollection(rncpFichesQuery);

    const romeFichesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/rome_fiches`)) : null, [user, firestore]);
    const { data: romeFiches } = useCollection(romeFichesQuery);

    const jobOfferSchema = z.object({
        reference: z.string().optional(),
        title: z.array(z.string()).optional(),
        description: z.string().optional(),
        contractType: z.array(z.string()).optional(),
        workingHours: z.array(z.string()).optional(),
        location: z.array(z.string()).optional(),
        salary: z.array(z.string()).optional(),
        infoMatching: z.object({
            rncpCodes: z.array(z.string()).optional(),
            rncpLevels: z.array(z.string()).optional(),
            rncpTitles: z.array(z.string()).optional(),
            rncpSkills: z.array(z.string()).optional(),
            rncpActivities: z.array(z.string()).optional(),
            romeCodes: z.array(z.string()).optional(),
            romeTitles: z.array(z.string()).optional(),
            romeSkills: z.array(z.string()).optional(),
            romeActivities: z.array(z.string()).optional(),
        }).optional(),
    });
    
    type JobOfferFormData = z.infer<typeof jobOfferSchema>;
    const form = useForm<JobOfferFormData>({
        resolver: zodResolver(jobOfferSchema),
        defaultValues: {
            reference: '', title: [], description: '', contractType: [],
            workingHours: [], location: [], salary: [],
            infoMatching: {
                rncpCodes: [], rncpLevels: [], rncpTitles: [], rncpSkills: [], rncpActivities: [],
                romeCodes: [], romeTitles: [], romeSkills: [], romeActivities: [],
            }
        }
    });

    useEffect(() => {
        if (isSheetOpen) {
            form.reset(editingOffer || {
                reference: '', title: [], description: '', contractType: [],
                workingHours: [], location: [], salary: [],
                infoMatching: {
                    rncpCodes: [], rncpLevels: [], rncpTitles: [], rncpSkills: [], rncpActivities: [],
                    romeCodes: [], romeTitles: [], romeSkills: [], romeActivities: [],
                }
            });
        }
    }, [isSheetOpen, editingOffer, form]);

    const handleNew = () => { setEditingOffer(null); setIsSheetOpen(true); };
    const handleEdit = (offer: any) => { setEditingOffer(offer); setIsSheetOpen(true); };

    const onSubmit = async (data: JobOfferFormData) => {
        if (!user) return;
        const offerData = { counselorId: user.uid, ...data };
        if (editingOffer) {
            await setDocumentNonBlocking(doc(firestore, `users/${user.uid}/job_offers`, editingOffer.id), offerData, { merge: true });
            toast({ title: 'Offre mise à jour' });
        } else {
            await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/job_offers`), offerData);
            toast({ title: 'Offre créée' });
        }
        setIsSheetOpen(false);
    };

    const handleDelete = async () => {
        if (!offerToDelete || !user) return;
        await deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/job_offers`, offerToDelete.id));
        toast({ title: "Offre supprimée" });
        setOfferToDelete(null);
    };

    const handleSelectRncp = (fiche: any) => {
        form.setValue('infoMatching.rncpCodes', fiche.rncpCodes);
        form.setValue('infoMatching.rncpLevels', fiche.rncpLevel);
        form.setValue('infoMatching.rncpTitles', fiche.rncpTitle);
        form.setValue('infoMatching.rncpSkills', fiche.competences);
        form.setValue('infoMatching.rncpActivities', fiche.activites);
    };
    
    const handleSelectRome = (fiche: any) => {
        form.setValue('infoMatching.romeCodes', fiche.romeCodes);
        form.setValue('infoMatching.romeTitles', fiche.romeTitles);
        form.setValue('infoMatching.romeSkills', fiche.competences);
        form.setValue('infoMatching.romeActivities', fiche.activites);
    };
  
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Offres d'emploi</CardTitle>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4"/>Nouvelle Offre</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Contrat</TableHead><TableHead>Lieu</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {areOffersLoading ? <TableRow><TableCell colSpan={4}><Skeleton className="h-8"/></TableCell></TableRow>
                        : offers && offers.length > 0 ? offers.map((offer: any) => (
                          <TableRow key={offer.id}>
                            <TableCell>{renderCell(offer.title)}</TableCell>
                            <TableCell>{renderCell(offer.contractType)}</TableCell>
                            <TableCell>{renderCell(offer.location)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(offer)}><Edit className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" onClick={() => setOfferToDelete(offer)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune offre créée.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-4xl w-full">
                      <SheetHeader><SheetTitle>{editingOffer ? 'Modifier' : 'Nouvelle'} Offre d'Emploi</SheetTitle></SheetHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                          <ScrollArea className="h-[calc(100vh-8rem)]">
                            <div className="py-4 pr-4 space-y-6">
                              <section>
                                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Infos Générales</h3>
                                <div className="space-y-4">
                                  <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Référence</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)}/>
                                  <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Métier - Titre de l'annonce</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un titre..."/></FormControl></FormItem>)}/>
                                  <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description de l'offre</FormLabel><FormControl><Textarea rows={5} {...field} value={field.value || ''} /></FormControl></FormItem>)}/>
                                  <FormField control={form.control} name="contractType" render={({ field }) => (<FormItem><FormLabel>Type de contrat</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un type..." /></FormControl></FormItem>)}/>
                                  <FormField control={form.control} name="workingHours" render={({ field }) => (<FormItem><FormLabel>Temps de travail</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter..."/></FormControl></FormItem>)}/>
                                  <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Lieu</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un lieu..." /></FormControl></FormItem>)}/>
                                  <FormField control={form.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salaire</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter..."/></FormControl></FormItem>)}/>
                                </div>
                              </section>
                              <section className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Infos Match</h3>
                                <FicheSelector fiches={rncpFiches || []} title="RNCP" onSelect={handleSelectRncp}/>
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField control={form.control} name="infoMatching.rncpCodes" render={({ field }) => (<FormItem><FormLabel>Codes RNCP</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
                                  <FormField control={form.control} name="infoMatching.rncpLevels" render={({ field }) => (<FormItem><FormLabel>Niveaux</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
                                </div>
                                <FormField control={form.control} name="infoMatching.rncpTitles" render={({ field }) => (<FormItem><FormLabel>Intitulés</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="infoMatching.rncpSkills" render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="infoMatching.rncpActivities" render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
  
                                <div className="pt-4 border-t"/>
                                <FicheSelector fiches={romeFiches || []} title="ROME" onSelect={handleSelectRome}/>
                                <FormField control={form.control} name="infoMatching.romeCodes" render={({ field }) => (<FormItem><FormLabel>Codes ROME</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="infoMatching.romeTitles" render={({ field }) => (<FormItem><FormLabel>Intitulés</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="infoMatching.romeSkills" render={({ field }) => (<FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="infoMatching.romeActivities" render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="" /></FormControl></FormItem>)}/>
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
                  <AlertDialog open={!!offerToDelete} onOpenChange={(open) => !open && setOfferToDelete(null)}>
                      <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Supprimer cette offre ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
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

