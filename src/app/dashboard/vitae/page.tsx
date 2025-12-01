

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, FileText, Briefcase, FlaskConical, Search, PlusCircle, UserPlus, X, EyeOff, Eye, Loader2, Trash2, Mail, Phone, Edit, Download, Upload } from "lucide-react";
import { useForm, useFieldArray, useWatch, Control, UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, getDocs, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirestore, useAuth, useStorage } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAgency } from '@/context/agency-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { differenceInMonths, differenceInYears } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/rich-text-editor';


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
    dateJoined: string;
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
    jobTitle: z.array(z.string()).optional(),
    characteristics: z.array(z.string()).optional(),
    activities: z.array(z.string()).optional(),
});


const cvProfileSchema = z.object({
  mobility: z.array(z.string()).optional(),
  drivingLicence: z.array(z.string()).optional(),
  lastJob: z.array(z.string()).optional(),
  searchedJob: z.array(z.string()).optional(),
  contractType: z.array(z.string()).optional(),
  duration: z.array(z.string()).optional(),
  workEnvironment: z.array(z.string()).optional(),
  highestFormation: z.array(z.string()).optional(),
  highestFormationSkills: z.array(z.string()).optional(),
  currentJobFormation: z.array(z.string()).optional(),
  currentJobFormationSkills: z.array(z.string()).optional(),
  projectFormation: z.array(z.string()).optional(),
  projectFormationSkills: z.array(z.string()).optional(),
  fundingOptions: z.array(z.string()).optional(),
  experiences: z.array(experienceSchema).optional(),
  otherInterests: z.array(z.string()).optional(),
  softskills: z.array(z.string()).optional(),
  status: z.enum(['disponible', 'en_mission', 'en_emploi']).default('disponible').optional(),
  cvUrl: z.string().url().optional().nullable(),
});
type CvProfileFormData = z.infer<typeof cvProfileSchema>;

type CvProfile = CvProfileFormData & {
    id: string;
    counselorId: string;
    clientId: string;
    clientName: string;
};

const rncpFormSchema = z.object({
    formationName: z.string().min(1, "Le nom est requis."),
    formationLevel: z.array(z.string()).optional(),
    rncpCode: z.array(z.string()).optional(),
    formationTitle: z.array(z.string()).optional(),
    codeRomeCompatible: z.array(z.string()).optional(),
    metierCompatible: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    activities: z.array(z.string()).optional(),
    trainingIds: z.array(z.string()).optional(),
});
type RncpFormData = z.infer<typeof rncpFormSchema>;

type FicheRNCP = RncpFormData & {
    id: string;
    counselorId: string;
};

const romeFormSchema = z.object({
    name: z.string().min(1, "Le nom est requis."),
    associatedRomeCode: z.array(z.string()).optional(),
    associatedJobs: z.array(z.string()).optional(),
    mission: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    accessConditions: z.array(z.string()).optional(),
    knowledge: z.array(z.string()).optional(),
    knowHowAndActivities: z.array(z.string()).optional(),
    softSkills: z.array(z.string()).optional(),
});
type RomeFormData = z.infer<typeof romeFormSchema>;

type FicheROME = RomeFormData & {
    id: string;
    counselorId: string;
};


type Training = {
    id: string;
    title: string;
};

const infoMatchingSchema = z.object({
    yearsExperience: z.string().optional(),
    desiredTraining: z.string().optional(),
    romeCode: z.array(z.string()).optional(),
    otherNames: z.array(z.string()).optional(),
    geographicSector: z.array(z.string()).optional(),
    workingConditions: z.array(z.string()).optional(),
    environment: z.array(z.string()).optional(),
    desiredSkills: z.array(z.string()).optional(),
    softSkills: z.array(z.string()).optional(),
    internalNotes: z.string().optional(),
});

const jobOfferFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Le titre du poste est requis."),
  reference: z.string().optional(),
  description: z.string().optional(),
  contractType: z.string().optional(),
  workingHours: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  infoMatching: infoMatchingSchema.optional(),
});


export type JobOfferFormData = z.infer<typeof jobOfferFormSchema>;

export type JobOffer = JobOfferFormData & {
  id: string;
  counselorId: string;
};

type JobApplication = {
    id: string;
    jobOfferTitle: string;
    applicantName: string;
    applicantEmail: string;
    cvUrl: string;
    status: 'new' | 'reviewed' | 'contacted' | 'rejected';
    appliedAt: string;
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});


const TagInput = ({ value, onChange, placeholder }: { value: string[] | undefined; onChange: (value: string[]) => void, placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');
    const currentValues = Array.isArray(value) ? value : [];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.trim() && !currentValues.includes(inputValue.trim())) {
                onChange([...currentValues, inputValue.trim()]);
                setInputValue('');
            }
        }
    };
    
    const removeTag = (tagToRemove: string) => {
        onChange(currentValues.filter(tag => tag !== tagToRemove));
    };

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
            <Input 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)} 
                onKeyDown={handleKeyDown}
                placeholder={placeholder} 
                className="border-none shadow-none focus-visible:ring-0 h-8" 
            />
        </div>
    );
};

function ApplicationManager() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [applicationToDelete, setApplicationToDelete] = useState<JobApplication | null>(null);

    const applicationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'job_applications'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: applications, isLoading: areApplicationsLoading } = useCollection<JobApplication>(applicationsQuery);

    const handleUpdateStatus = (appId: string, status: JobApplication['status']) => {
        const appRef = doc(firestore, 'job_applications', appId);
        setDocumentNonBlocking(appRef, { status }, { merge: true });
        toast({ title: "Statut mis à jour." });
    };

    const handleDelete = () => {
        if (!applicationToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'job_applications', applicationToDelete.id));
        toast({ title: 'Candidature supprimée' });
        setApplicationToDelete(null);
    };

    const applicationStatusVariant: Record<JobApplication['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
        new: 'destructive',
        reviewed: 'outline',
        contacted: 'default',
        rejected: 'secondary',
    };
    const applicationStatusText: Record<JobApplication['status'], string> = {
        new: 'Nouvelle',
        reviewed: 'Examinée',
        contacted: 'Contacté',
        rejected: 'Rejetée',
    };

    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Candidatures</CardTitle>
          <CardDescription>
            Liste des candidatures reçues pour vos offres d'emploi.
          </CardDescription>
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
              {areApplicationsLoading || isUserLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : applications && applications.length > 0 ? (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.applicantName}</div>
                      <div className="text-sm text-muted-foreground">
                        {app.applicantEmail}
                      </div>
                    </TableCell>
                    <TableCell>{app.jobOfferTitle}</TableCell>
                    <TableCell>
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={applicationStatusVariant[app.status]}>
                        {applicationStatusText[app.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={app.cvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="mr-2 h-4 w-4" /> Télécharger
                              le CV
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(app.id, 'reviewed')}
                          >
                            Marquer comme examinée
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(app.id, 'contacted')}
                          >
                            Marquer comme contacté
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(app.id, 'rejected')}
                          >
                            Marquer comme rejetée
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setApplicationToDelete(app)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Aucune candidature pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <AlertDialog
            open={!!applicationToDelete}
            onOpenChange={(open) => !open && setApplicationToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette candidature ?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
}

function Cvtheque() {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
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
    const [editingProfile, setEditingProfile] = useState<CvProfile | null>(null);
    const [profileToDelete, setProfileToDelete] = useState<CvProfile | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isUploading, setIsUploading] = useState(false);
    const pdfInputRef = React.useRef<HTMLInputElement>(null);
    
    const cvProfilesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/cv_profiles`)) : null, [user, firestore]);
    const { data: cvProfiles, isLoading: areCvProfilesLoading } = useCollection<CvProfile>(cvProfilesQuery);

    const clientsQuery = useMemoFirebase(() => {
        if(!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
    
    const newUserForm = useForm<NewUserFormData>({
        resolver: zodResolver(newUserSchema),
    });

    const cvForm = useForm<CvProfileFormData>({
      resolver: zodResolver(cvProfileSchema),
      defaultValues: {
        mobility: [],
        drivingLicence: [],
        lastJob: [],
        searchedJob: [],
        contractType: [],
        duration: [],
        workEnvironment: [],
        highestFormation: [],
        highestFormationSkills: [],
        currentJobFormation: [],
        currentJobFormationSkills: [],
        projectFormation: [],
        projectFormationSkills: [],
        fundingOptions: [],
        experiences: [],
        otherInterests: [],
        softskills: [],
        status: 'disponible',
        cvUrl: null,
      }
    });
    
    const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
        control: cvForm.control,
        name: "experiences"
    });
    
    useEffect(() => {
        if (isSheetOpen) {
            if (editingProfile) {
                const client: Client | undefined = clients?.find(c => c.id === editingProfile.clientId);
                if (client) {
                    setSelectedClient(client);
                }
                cvForm.reset(editingProfile);
            } else {
                 resetSheet();
            }
        }
    }, [isSheetOpen, editingProfile, cvForm, clients]);


    const calculateSeniority = (startDate?: string, endDate?: string) => {
        if (!startDate) return null;
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        
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
        setEditingProfile(null);
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
                dateJoined: new Date().toISOString(),
            };
            await setDocumentNonBlocking(userDocRef, {
                ...newUserData,
                role: 'membre',
            });

            if (personalization.emailSettings.fromEmail) {
                 await sendEmail({
                    emailSettings: personalization.emailSettings,
                    recipientEmail: values.email,
                    recipientName: `${values.firstName} ${values.lastName}`,
                    subject: `Bienvenue ! Vos accès à votre espace client`,
                    textBody: `Bonjour ${values.firstName},\n\nUn compte client a été créé pour vous. Vous pouvez vous connecter à votre espace en utilisant les identifiants suivants:\nEmail: ${values.email}\nMot de passe: ${values.password}\n\nCordialement,\nL'équipe ${personalization.emailSettings.fromName}`,
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

    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !storage || !user) return;

        setIsUploading(true);
        toast({ title: 'Téléversement du CV en cours...', description: 'Veuillez patienter.' });
        
        const filePath = `cv/${file.name}`;
        const fileRef = ref(storage, filePath);

        try {
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);
            cvForm.setValue('cvUrl', downloadURL, { shouldValidate: true });
            toast({ title: 'Téléversement réussi', description: 'Le CV a été enregistré.' });
        } catch (error) {
            console.error("PDF Upload Error:", error);
            toast({ title: 'Erreur de téléversement', description: "Impossible d'envoyer le fichier.", variant: 'destructive' });
        } finally {
            setIsUploading(false);
             if (pdfInputRef.current) {
                pdfInputRef.current.value = "";
            }
        }
    }

    const onCvProfileSubmit = (data: CvProfileFormData) => {
        if (!user || !selectedClient) return;
    
        const cvProfileData: Omit<CvProfile, 'id'> = {
            counselorId: user.uid,
            clientId: selectedClient.id,
            clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
            ...data
        };

        if (editingProfile) {
            const profileRef = doc(firestore, `users/${user.uid}/cv_profiles`, editingProfile.id);
            setDocumentNonBlocking(profileRef, cvProfileData, { merge: true });
            toast({ title: "Profil CV mis à jour" });
        } else {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/cv_profiles`), cvProfileData);
            toast({title: "Profil CV enregistré"});
        }
        
        resetSheet();
    };

    const handleEdit = (profile: CvProfile) => {
        setEditingProfile(profile);
        setIsSheetOpen(true);
    };
    
    const handleDelete = async () => {
        if (!profileToDelete || !user) return;
        try {
            const profileRef = doc(firestore, `users/${user.uid}/cv_profiles`, profileToDelete.id);
            await deleteDocumentNonBlocking(profileRef);
            toast({ title: "Profil CV supprimé" });
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de supprimer le profil.", variant: "destructive" });
        } finally {
            setProfileToDelete(null);
        }
    };

    const handleStatusUpdate = (profileId: string, status: 'disponible' | 'en_mission' | 'en_emploi') => {
        if (!user) return;
        const profileRef = doc(firestore, `users/${user.uid}/cv_profiles`, profileId);
        setDocumentNonBlocking(profileRef, { status }, { merge: true });
        toast({ title: "Statut mis à jour" });
    };

    const generateCvPdf = async (profile: CvProfile) => {
        const client = clients?.find(c => c.id === profile.clientId);
        if (!client) {
            toast({ title: "Erreur", description: "Données client introuvables.", variant: "destructive" });
            return;
        }

        const doc = new jsPDF();
        let y = 20;

        const checkArray = (arr: any): string[] => Array.isArray(arr) ? arr : [];
        const join = (arr: any) => checkArray(arr).join(' • ');
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`${client.firstName} ${client.lastName}`, 105, y, { align: 'center' });
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const contactInfo = [client.email, client.phone, client.address].filter(Boolean).join(' | ');
        doc.text(contactInfo, 105, y, { align: 'center' });
        y += 10;
        doc.setDrawColor(220, 220, 220);
        doc.line(15, y, 195, y);
        y += 10;

        const addSection = (title: string, content: (string | null | undefined)[]) => {
            const filteredContent = content.filter(Boolean);
            if (filteredContent.length === 0) return;
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 15, y);
            y += 2;
            doc.setDrawColor(180, 180, 180);
            doc.line(15, y, 195, y);
            y += 8;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            filteredContent.forEach(item => {
                const lines = doc.splitTextToSize(`• ${item}`, 180);
                if (y + (lines.length * 5) > 280) { doc.addPage(); y = 20; }
                doc.text(lines, 15, y);
                y += (lines.length * 5) + 2;
            });
            y += 6;
        };

        const addExperienceSection = (exps?: CvProfile['experiences']) => {
            if (!exps || exps.length === 0) return;
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("Expériences Professionnelles", 15, y);
            y += 2;
            doc.setDrawColor(180, 180, 180);
            doc.line(15, y, 195, y);
            y += 8;

            exps.forEach(exp => {
                if (y > 250) { doc.addPage(); y = 20; }
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                const expTitle = `${join(exp.jobTitle)} (${calculateSeniority(exp.startDate, exp.endDate) || 'N/A'})`;
                doc.text(expTitle, 15, y);
                y += 6;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                if (checkArray(exp.activities).length > 0) {
                     const activitiesLines = doc.splitTextToSize(`Activités: ${join(exp.activities)}`, 175);
                     doc.text(activitiesLines, 20, y);
                     y += (activitiesLines.length * 5) + 4;
                }
                if (checkArray(exp.characteristics).length > 0) {
                    const skillsLines = doc.splitTextToSize(`Compétences: ${join(exp.characteristics)}`, 175);
                    doc.text(skillsLines, 20, y);
                    y += (skillsLines.length * 5) + 6;
                }
                y += 4;
            });
             y += 10;
        };
        
        addSection("Projet Professionnel", [
            `Dernier métier: ${join(profile.lastJob)}`,
            `Métier recherché: ${join(profile.searchedJob)}`,
            `Contrat: ${join(profile.contractType)}`,
            `Durée: ${join(profile.duration)}`,
            `Environnement: ${join(profile.workEnvironment)}`,
        ]);
        
        addExperienceSection(profile.experiences);

        addSection("Formations", [
            `Niveau le plus élevé: ${join(profile.highestFormation)} - Compétences: ${join(profile.highestFormationSkills)}`,
            `En lien avec le métier actuel: ${join(profile.currentJobFormation)} - Compétences: ${join(profile.currentJobFormationSkills)}`,
            `En lien avec le projet: ${join(profile.projectFormation)} - Compétences: ${join(profile.projectFormationSkills)}`
        ].filter(line => !line.endsWith(': ') && !line.endsWith(':  - Compétences: ')));
        
        addSection("Compétences comportementales (Softskills)", checkArray(profile.softskills));
        addSection("Centres d'intérêt", checkArray(profile.otherInterests));
        addSection("Mobilité & Permis", [`${join(profile.mobility)}`, `${join(profile.drivingLicence)}`].filter(Boolean));

        doc.save(`CV_${client.firstName}_${client.lastName}.pdf`);
    };

    const filteredProfiles = useMemo(() => {
        return (cvProfiles || []).filter(p => {
            const statusMatch = statusFilter === 'all' || p.status === statusFilter;
            const searchMatch = !searchTerm ||
                p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (Array.isArray(p.lastJob) && p.lastJob.some(job => job.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                (Array.isArray(p.searchedJob) && p.searchedJob.some(job => job.toLowerCase().includes(searchTerm.toLowerCase())));
            return statusMatch && searchMatch;
        });
    }, [cvProfiles, searchTerm, statusFilter]);

    const statusConfig = {
        disponible: { text: "Disponible", variant: "default" as const },
        en_mission: { text: "En mission", variant: "secondary" as const },
        en_emploi: { text: "En emploi", variant: "outline" as const },
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
                        <SheetContent className="sm:max-w-3xl w-full">
                            <SheetHeader>
                                <SheetTitle>{editingProfile ? "Modifier le profil CV" : "Nouveau profil CV"}</SheetTitle>
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
                                                <div className='flex items-start justify-between'>
                                                  <div>
                                                    <p className="font-semibold">{searchResult.firstName} {searchResult.lastName}</p>
                                                    <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                                                  </div>
                                                   <p className='text-xs text-muted-foreground'>Client depuis: {new Date(searchResult.dateJoined).toLocaleDateString()}</p>
                                                </div>
                                                
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
                                                        {selectedClient.email && <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1"><Mail className="h-4 w-4" /><span>{selectedClient.email}</span></div>}
                                                        {selectedClient.phone && <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1"><Phone className="h-4 w-4" /><span>{selectedClient.phone}</span></div>}
                                                        {selectedClient.address && <div className="text-sm text-muted-foreground mt-1"><span>{selectedClient.address}, {selectedClient.zipCode} {selectedClient.city}</span></div>}
                                                    </div>
                                                    {!editingProfile && <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>Changer</Button>}
                                                </div>
                                            </Card>
                                            
                                            <FormField control={cvForm.control} name="cvUrl" render={() => (
                                                <FormItem>
                                                    <FormLabel>CV du candidat (PDF)</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-2">
                                                            <Input disabled value={cvForm.watch('cvUrl') || 'Aucun CV téléversé'}/>
                                                            <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} className="hidden" accept="application/pdf" />
                                                            <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => pdfInputRef.current?.click()} disabled={isUploading}>
                                                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                                                            </Button>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}/>
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
                                                    <FormField control={cvForm.control} name="lastJob" render={({ field }) => ( <FormItem><FormLabel>Dernier métier exercé (Code ROME et intitulé)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="searchedJob" render={({ field }) => ( <FormItem><FormLabel>Métier Recherché (Code ROME et intitulé)</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="contractType" render={({ field }) => ( <FormItem><FormLabel>Type de contrat</FormLabel><FormControl><TagInput {...field} placeholder="CDI, CDD..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="duration" render={({ field }) => ( <FormItem><FormLabel>Durée</FormLabel><FormControl><TagInput {...field} placeholder="Temps plein, Temps partiel..."/></FormControl><FormMessage/></FormItem> )}/>
                                                    <FormField control={cvForm.control} name="workEnvironment" render={({ field }) => ( <FormItem><FormLabel>Environnement souhaité</FormLabel><FormControl><TagInput {...field} placeholder="Télétravail, Bureau..."/></FormControl><FormMessage/></FormItem> )}/>
                                                </CardContent>
                                            </Card>

                                             <Card>
                                                <CardHeader><CardTitle>Formation</CardTitle></CardHeader>
                                                <CardContent className="space-y-6">
                                                    <div className="space-y-2">
                                                        <FormField control={cvForm.control} name="highestFormation" render={({ field }) => ( <FormItem><FormLabel>Formation la plus élevée</FormLabel><FormControl><TagInput {...field} placeholder="Code RNCP, Niveau, Libellé..."/></FormControl><FormMessage/></FormItem> )}/>
                                                        <FormField control={cvForm.control} name="highestFormationSkills" render={({ field }) => (<FormItem className="mt-2"><FormLabel className="text-xs text-muted-foreground">Compétences et activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..."/></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <FormField control={cvForm.control} name="currentJobFormation" render={({ field }) => ( <FormItem><FormLabel>Formation en lien avec métier actuel</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une formation..."/></FormControl><FormMessage/></FormItem> )}/>
                                                        <FormField control={cvForm.control} name="currentJobFormationSkills" render={({ field }) => (<FormItem className="mt-2"><FormLabel className="text-xs text-muted-foreground">Compétences et activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..."/></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <FormField control={cvForm.control} name="projectFormation" render={({ field }) => ( <FormItem><FormLabel>Formation en lien avec projet</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une formation..."/></FormControl><FormMessage/></FormItem> )}/>
                                                        <FormField control={cvForm.control} name="projectFormationSkills" render={({ field }) => (<FormItem className="mt-2"><FormLabel className="text-xs text-muted-foreground">Compétences et activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..."/></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
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
                                                                <FormField control={cvForm.control} name={`experiences.${index}.jobTitle`} render={({ field }) => (<FormItem><FormLabel>Intitulé du poste (Code ROME et intitulé)</FormLabel><FormControl><TagInput {...field} placeholder="Code ROME, intitulé..."/></FormControl></FormItem>)}/>
                                                                <FormField control={cvForm.control} name={`experiences.${index}.activities`} render={({ field }) => (<FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..."/></FormControl></FormItem>)}/>
                                                                <FormField control={cvForm.control} name={`experiences.${index}.characteristics`} render={({ field }) => (<FormItem><FormLabel>Compétences exercées / développées</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..."/></FormControl></FormItem>)}/>
                                                            </div>
                                                        );
                                                    })}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => appendExperience({ id: `exp-${Date.now()}`, startDate: '', endDate: '', jobTitle:[], characteristics: [], activities: [] })}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une expérience
                                                    </Button>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader><CardTitle>Softskills & Centres d'intérêt</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <FormField control={cvForm.control} name="softskills" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Compétences comportementales (Softskills)</FormLabel>
                                                            <FormControl>
                                                                <TagInput {...field} placeholder="Ajouter une compétence..."/>
                                                            </FormControl>
                                                            <FormMessage/>
                                                        </FormItem>
                                                    )}/>
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
                 <div className="flex flex-col md:flex-row gap-2 mt-4">
                    <Input
                        placeholder="Rechercher par nom ou métier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filtrer par statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="disponible">Disponible</SelectItem>
                            <SelectItem value="en_mission">En mission</SelectItem>
                            <SelectItem value="en_emploi">En emploi</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom du Candidat</TableHead>
                                <TableHead>Dernier Métier</TableHead>
                                <TableHead>Métier Recherché</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {areCvProfilesLoading ? (
                                <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            ) : filteredProfiles && filteredProfiles.length > 0 ? (
                                filteredProfiles.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.clientName}</TableCell>
                                        <TableCell>{Array.isArray(p.lastJob) ? p.lastJob.join(', ') : ''}</TableCell>
                                        <TableCell>{Array.isArray(p.searchedJob) ? p.searchedJob.join(', ') : ''}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusConfig[p.status || 'disponible'].variant}>
                                                {statusConfig[p.status || 'disponible'].text}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(p)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                                     <DropdownMenuItem onClick={() => generateCvPdf(p)}><Download className="mr-2 h-4 w-4" /> Exporter en PDF</DropdownMenuItem>
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>Changer statut</DropdownMenuSubTrigger>
                                                        <DropdownMenuPortal>
                                                            <DropdownMenuSubContent>
                                                                <DropdownMenuItem onClick={() => handleStatusUpdate(p.id, 'disponible')}>Disponible</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusUpdate(p.id, 'en_mission')}>En mission</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusUpdate(p.id, 'en_emploi')}>En emploi</DropdownMenuItem>
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuPortal>
                                                    </DropdownMenuSub>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => setProfileToDelete(p)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Aucun profil CV créé.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <AlertDialog open={!!profileToDelete} onOpenChange={(open) => !open && setProfileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le profil de {profileToDelete?.clientName} ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}


function RncpManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingFiche, setEditingFiche] = useState<FicheRNCP | null>(null);

    const fichesQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/rncp_sheets`)) : null, [user, firestore]);
    const { data: fiches, isLoading } = useCollection<FicheRNCP>(fichesQuery);

    const trainingsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'trainings'), where('authorId', '==', user.uid)) : null, [user, firestore]);
    const { data: trainings, isLoading: areTrainingsLoading } = useCollection<Training>(trainingsQuery);


    const form = useForm<RncpFormData>({
        resolver: zodResolver(rncpFormSchema),
        defaultValues: { formationName: '', formationLevel: [], rncpCode: [], formationTitle: [], codeRomeCompatible: [], metierCompatible: [], skills: [], activities: [], trainingIds: [] }
    });

    useEffect(() => {
        if (isSheetOpen) {
            form.reset(editingFiche || { formationName: '', formationLevel: [], rncpCode: [], formationTitle: [], codeRomeCompatible: [], metierCompatible: [], skills: [], activities: [], trainingIds: [] });
        }
    }, [isSheetOpen, editingFiche, form]);

    const handleNew = () => {
        setEditingFiche(null);
        setIsSheetOpen(true);
    };
    
    const handleEdit = (fiche: FicheRNCP) => {
        setEditingFiche(fiche);
        setIsSheetOpen(true);
    };

    const handleDelete = (ficheId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/rncp_sheets`, ficheId));
        toast({ title: 'Fiche RNCP supprimée' });
    };

    const onSubmit = (data: RncpFormData) => {
        if (!user) return;
        const ficheData = { counselorId: user.uid, ...data };
        if (editingFiche) {
            setDocumentNonBlocking(doc(firestore, `users/${user.uid}/rncp_sheets`, editingFiche.id), ficheData, { merge: true });
            toast({ title: 'Fiche RNCP mise à jour' });
        } else {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/rncp_sheets`), ficheData);
            toast({ title: 'Fiche RNCP créée' });
        }
        setIsSheetOpen(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Fiches RNCP</CardTitle>
                        <CardDescription>Gérez vos fiches de Répertoire National des Certifications Professionnelles.</CardDescription>
                    </div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" />Nouvelle Fiche RNCP</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de la Formation</TableHead>
                                <TableHead>Code(s) RNCP</TableHead>
                                <TableHead>Formations Associées</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            ) : fiches && fiches.length > 0 ? (
                                fiches.map((fiche) => (
                                    <TableRow key={fiche.id}>
                                        <TableCell className="font-medium">{fiche.formationName}</TableCell>
                                        <TableCell>{Array.isArray(fiche.rncpCode) ? fiche.rncpCode.join(', ') : ''}</TableCell>
                                        <TableCell>{fiche.trainingIds?.length || 0}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(fiche)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(fiche.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Aucune fiche RNCP créée.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-2xl w-full">
                         <SheetHeader>
                            <SheetTitle>{editingFiche ? 'Modifier la' : 'Nouvelle'} fiche RNCP</SheetTitle>
                        </SheetHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                            <ScrollArea className="flex-1 pr-6 py-4 -mr-6">
                                <div className="space-y-4">
                                    <FormField control={form.control} name="formationName" render={({ field }) => ( <FormItem><FormLabel>Nom de la formation</FormLabel><FormControl><Input placeholder="Ex: Développeur Web et Web Mobile" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="formationLevel" render={({ field }) => ( <FormItem><FormLabel>Niveau de formation</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau (ex: 5, 6...)" /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="rncpCode" render={({ field }) => ( <FormItem><FormLabel>Code RNCP</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code (ex: RNCP31114...)" /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="formationTitle" render={({ field }) => ( <FormItem><FormLabel>Intitulé de formation</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un intitulé..." /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="codeRomeCompatible" render={({ field }) => ( <FormItem><FormLabel>Code ROME compatible</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code ROME..." /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="metierCompatible" render={({ field }) => ( <FormItem><FormLabel>Métier compatible</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..." /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="skills" render={({ field }) => ( <FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="activities" render={({ field }) => ( <FormItem><FormLabel>Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une activité..." /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField
                                        control={form.control}
                                        name="trainingIds"
                                        render={() => (
                                            <FormItem>
                                                <div className="mb-4">
                                                    <FormLabel className="text-base">Formations associées</FormLabel>
                                                    <p className="text-sm text-muted-foreground">
                                                        Liez une ou plusieurs de vos formations à cette fiche RNCP.
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    {areTrainingsLoading ? <Skeleton className="h-20 w-full" /> : trainings && trainings.length > 0 ? (
                                                        trainings.map((training) => (
                                                            <FormField
                                                                key={training.id}
                                                                control={form.control}
                                                                name="trainingIds"
                                                                render={({ field }) => {
                                                                    return (
                                                                        <FormItem key={training.id} className="flex flex-row items-center space-x-3 space-y-0 p-3 border rounded-md">
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
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Aucune formation créée. Allez dans l'onglet E-learning pour en ajouter.</p>
                                                    )}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                             </ScrollArea>
                            <SheetFooter className="pt-6 border-t mt-auto">
                                <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                <Button type="submit">Enregistrer</Button>
                            </SheetFooter>
                          </form>
                        </Form>
                    </SheetContent>
                </Sheet>
            </CardContent>
        </Card>
    );
}

function RomeManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingFiche, setEditingFiche] = useState<FicheROME | null>(null);
    const [ficheToDelete, setFicheToDelete] = useState<FicheROME | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fichesRomeQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/rome_sheets`)) : null, [user, firestore]);
    const { data: fiches, isLoading } = useCollection<FicheROME>(fichesRomeQuery);

    const fichesRncpQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/rncp_sheets`)) : null, [user, firestore]);
    const { data: fichesRncp, isLoading: areFichesRncpLoading } = useCollection<FicheRNCP>(fichesRncpQuery);

    const form = useForm<RomeFormData>({
        resolver: zodResolver(romeFormSchema),
        defaultValues: { name: '', associatedRomeCode: [], associatedJobs: [], mission: [], skills: [], accessConditions: [], knowledge: [], knowHowAndActivities: [], softSkills: [] }
    });

    useEffect(() => {
        if (isSheetOpen) {
            form.reset(editingFiche || { name: '', associatedRomeCode: [], associatedJobs: [], mission: [], skills: [], accessConditions: [], knowledge: [], knowHowAndActivities: [], softSkills: [] });
        }
    }, [isSheetOpen, editingFiche, form]);

    const handleNew = () => {
        setEditingFiche(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (fiche: FicheROME) => {
        setEditingFiche(fiche);
        setIsSheetOpen(true);
    };

    const handleDelete = () => {
        if (!ficheToDelete || !user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/rome_sheets`, ficheToDelete.id));
        toast({ title: "Fiche ROME supprimée" });
        setFicheToDelete(null);
    };

    const onSubmit = (data: RomeFormData) => {
        if (!user) return;
        const ficheData = { counselorId: user.uid, ...data };
        if (editingFiche) {
            setDocumentNonBlocking(doc(firestore, `users/${user.uid}/rome_sheets`, editingFiche.id), ficheData, { merge: true });
            toast({ title: 'Fiche ROME mise à jour' });
        } else {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/rome_sheets`), ficheData);
            toast({ title: 'Fiche ROME créée' });
        }
        setIsSheetOpen(false);
    };

    const filteredFiches = useMemo(() => {
        if (!fiches) return [];
        if (!searchTerm) return fiches;
        return fiches.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [fiches, searchTerm]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Fiches ROME</CardTitle>
                        <CardDescription>Gérez vos fiches du Répertoire Opérationnel des Métiers et des Emplois.</CardDescription>
                    </div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" />Nouvelle Fiche ROME</Button>
                </div>
                <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-[-50%]" />
                    <Input
                        placeholder="Rechercher par nom..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Code(s) ROME</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            : filteredFiches && filteredFiches.length > 0 ? (
                                filteredFiches.map((fiche) => (
                                    <TableRow key={fiche.id}>
                                        <TableCell className="font-medium">{fiche.name}</TableCell>
                                        <TableCell>{Array.isArray(fiche.associatedRomeCode) ? fiche.associatedRomeCode.join(', ') : ''}</TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="ghost" size="icon" onClick={() => handleEdit(fiche)}><Edit className="h-4 w-4" /></Button>
                                             <Button variant="ghost" size="icon" onClick={() => setFicheToDelete(fiche)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">Aucune fiche ROME créée.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                 </div>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-2xl w-full">
                        <SheetHeader>
                            <SheetTitle>{editingFiche ? 'Modifier la' : 'Nouvelle'} fiche ROME</SheetTitle>
                        </SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                                 <ScrollArea className="flex-1 pr-6 py-4 -mr-6">
                                    <div className="space-y-4">
                                         <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Ex: Études et développement informatique" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                         <FormField control={form.control} name="associatedRomeCode" render={({ field }) => ( <FormItem><FormLabel>Code ROME associé</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code (ex: M1805...)" /></FormControl><FormMessage /></FormItem> )}/>
                                         <FormField control={form.control} name="associatedJobs" render={({ field }) => ( <FormItem><FormLabel>Métiers associés</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un métier..." /></FormControl><FormMessage /></FormItem> )}/>
                                         <FormField control={form.control} name="mission" render={({ field }) => ( <FormItem><FormLabel>Mission</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une mission..." /></FormControl><FormMessage /></FormItem> )}/>
                                         <FormField control={form.control} name="skills" render={({ field }) => ( <FormItem><FormLabel>Compétences</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl><FormMessage /></FormItem> )}/>
                                          <FormField control={form.control} name="knowledge" render={({ field }) => ( <FormItem><FormLabel>Savoir</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un savoir..." /></FormControl><FormMessage /></FormItem> )}/>
                                          <FormField control={form.control} name="knowHowAndActivities" render={({ field }) => ( <FormItem><FormLabel>Savoir-faire et Activités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un savoir-faire..." /></FormControl><FormMessage /></FormItem> )}/>
                                          <FormField control={form.control} name="softSkills" render={({ field }) => ( <FormItem><FormLabel>Savoir-être et Softskills</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un savoir-être..." /></FormControl><FormMessage /></FormItem> )}/>
                                         <FormField
                                            control={form.control}
                                            name="accessConditions"
                                            render={() => (
                                                <FormItem>
                                                    <div className="mb-4">
                                                        <FormLabel className="text-base">Condition d'accès (Fiches RNCP)</FormLabel>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {areFichesRncpLoading ? <Skeleton className="h-20 w-full" /> : fichesRncp && fichesRncp.length > 0 ? (
                                                            fichesRncp.map((fiche) => (
                                                                <FormField
                                                                    key={fiche.id}
                                                                    control={form.control}
                                                                    name="accessConditions"
                                                                    render={({ field }) => {
                                                                        return (
                                                                            <FormItem key={fiche.id} className="flex flex-row items-center space-x-3 space-y-0 p-3 border rounded-md">
                                                                                <FormControl>
                                                                                    <Checkbox
                                                                                        checked={field.value?.includes(fiche.id)}
                                                                                        onCheckedChange={(checked) => {
                                                                                            return checked
                                                                                                ? field.onChange([...(field.value || []), fiche.id])
                                                                                                : field.onChange(field.value?.filter((value) => value !== fiche.id));
                                                                                        }}
                                                                                    />
                                                                                </FormControl>
                                                                                <FormLabel className="font-normal">{fiche.formationName}</FormLabel>
                                                                            </FormItem>
                                                                        );
                                                                    }}
                                                                />
                                                            ))
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">Aucune fiche RNCP créée.</p>
                                                        )}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                 </ScrollArea>
                                <SheetFooter className="pt-6 border-t mt-auto">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit">Enregistrer</Button>
                                </SheetFooter>
                            </form>
                        </Form>
                    </SheetContent>
                 </Sheet>
                 <AlertDialog open={!!ficheToDelete} onOpenChange={(open) => !open && setFicheToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la fiche "{ficheToDelete?.name}" ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

function JobOfferManager() {
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const offersQuery = useMemoFirebase(() => user ? query(collection(firestore, 'job_offers'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: offers, isLoading: areOffersLoading } = useCollection<JobOffer>(offersQuery);

    
    const filteredOffers = useMemo(() => {
        if (!offers) return [];
        if (!searchTerm) return offers;
        const lowercasedTerm = searchTerm.toLowerCase();
        return offers.filter(offer => 
            offer.title?.toLowerCase().includes(lowercasedTerm) ||
            offer.location?.toLowerCase().includes(lowercasedTerm) ||
            offer.contractType?.toLowerCase().includes(lowercasedTerm)
        );
    }, [offers, searchTerm]);
    
    const form = useForm<JobOfferFormData>({
        resolver: zodResolver(jobOfferFormSchema),
        defaultValues: { title: '', reference: '', description: '', contractType: '', workingHours: '', location: '', salary: '', infoMatching: { internalNotes: '' } },
    });
    
    useEffect(() => {
        if (isSheetOpen) {
            form.reset({
                title: editingOffer?.title || '',
                reference: editingOffer?.reference || '',
                description: editingOffer?.description || '',
                contractType: editingOffer?.contractType || '',
                workingHours: editingOffer?.workingHours || '',
                location: editingOffer?.location || '',
                salary: editingOffer?.salary || '',
                infoMatching: editingOffer?.infoMatching || { internalNotes: '' },
            });
        }
    }, [isSheetOpen, editingOffer, form]);

    const handleNew = () => {
        setEditingOffer(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (offer: JobOffer) => {
        setEditingOffer(offer);
        setIsSheetOpen(true);
    };
    
    const handleDelete = (offerId: string) => {
        deleteDocumentNonBlocking(doc(firestore, 'job_offers', offerId));
        toast({ title: "Offre d'emploi supprimée" });
    };

    const onSubmit = async (data: JobOfferFormData) => {
        if (!user) return;
        setIsSubmitting(true);

        const offerData = {
            ...data,
            counselorId: user.uid,
        };

        try {
            if (editingOffer) {
                const offerRef = doc(firestore, 'job_offers', editingOffer.id);
                await setDocumentNonBlocking(offerRef, offerData, { merge: true });
                toast({ title: "Offre mise à jour" });
            } else {
                await addDocumentNonBlocking(collection(firestore, 'job_offers'), offerData);
                toast({ title: "Offre créée" });
            }
            setIsSheetOpen(false);
        } catch(e) {
            console.error(e);
            toast({ title: "Erreur", description: "Impossible de sauvegarder l'offre.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Offres d'emploi</CardTitle>
                        <CardDescription>Gérez les offres d'emploi pour votre mini-site.</CardDescription>
                    </div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" />Nouvelle offre</Button>
                </div>
                 <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-[-50%]" />
                    <Input
                        placeholder="Rechercher par titre, lieu, contrat..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader><TableRow><TableHead>Titre du poste</TableHead><TableHead>Lieu</TableHead><TableHead>Contrat</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {areOffersLoading ? <TableRow><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            : filteredOffers.length > 0 ? (
                                filteredOffers.map((offer) => (
                                    <TableRow key={offer.id}>
                                        <TableCell className="font-medium">{offer.title}</TableCell>
                                        <TableCell>{offer.location}</TableCell>
                                        <TableCell>{offer.contractType}</TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="ghost" size="icon" onClick={() => handleEdit(offer)}><Edit className="h-4 w-4" /></Button>
                                             <Button variant="ghost" size="icon" onClick={() => handleDelete(offer.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune offre d'emploi créée.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-3xl w-full">
                        <SheetHeader><SheetTitle>{editingOffer ? 'Modifier' : 'Nouvelle'} offre d'emploi</SheetTitle></SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <ScrollArea className="h-[calc(100vh-8rem)]">
                                    <div className="space-y-6 py-4 pr-6">
                                        <section>
                                            <h3 className="text-lg font-medium border-b pb-2 mb-4">Annonce Publique</h3>
                                            <div className="space-y-4">
                                                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Titre du poste</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>Référence</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><RichTextEditor content={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="contractType" render={({ field }) => ( <FormItem><FormLabel>Type de contrat</FormLabel><FormControl><Input placeholder="CDI, CDD, Alternance..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="workingHours" render={({ field }) => ( <FormItem><FormLabel>Temps de travail</FormLabel><FormControl><Input placeholder="Temps plein, Temps partiel..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="location" render={({ field }) => ( <FormItem><FormLabel>Lieu</FormLabel><FormControl><Input placeholder="Paris, France" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="salary" render={({ field }) => ( <FormItem><FormLabel>Salaire</FormLabel><FormControl><Input placeholder="À négocier, 45k€ - 55k€..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                            </div>
                                        </section>
                                        <section className="pt-6 border-t">
                                            <h3 className="text-lg font-medium border-b pb-2 mb-4">Info Matching (Interne)</h3>
                                            <div className="space-y-4">
                                                <FormField control={form.control} name="infoMatching.yearsExperience" render={({ field }) => ( <FormItem><FormLabel>Années d'expérience souhaitées</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="infoMatching.desiredTraining" render={({ field }) => ( <FormItem><FormLabel>Formation souhaitée</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="infoMatching.romeCode" render={({ field }) => (<FormItem><FormLabel>Code ROME</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un code ROME..." /></FormControl><FormMessage /></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.otherNames" render={({ field }) => (<FormItem><FormLabel>Autres appellations</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une appellation..." /></FormControl><FormMessage /></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.geographicSector" render={({ field }) => (<FormItem><FormLabel>Secteur géographique</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un secteur..." /></FormControl><FormMessage /></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.workingConditions" render={({ field }) => (<FormItem><FormLabel>Conditions de travail</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une condition..." /></FormControl><FormMessage /></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.environment" render={({ field }) => (<FormItem><FormLabel>Environnement</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag d'environnement..." /></FormControl><FormMessage /></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.desiredSkills" render={({ field }) => (<FormItem><FormLabel>Mission/Compétences recherchées</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une compétence..." /></FormControl><FormMessage /></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.softSkills" render={({ field }) => (<FormItem><FormLabel>Savoir-être et Softskills</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un softskill..." /></FormControl><FormMessage /></FormItem>)}/>
                                                <FormField control={form.control} name="infoMatching.internalNotes" render={({ field }) => (<FormItem><FormLabel>Informations internes (privées)</FormLabel><FormControl><RichTextEditor content={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        </section>
                                    </div>
                                </ScrollArea>
                                <SheetFooter className="pt-6 border-t mt-auto">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        {editingOffer ? 'Sauvegarder' : 'Créer'}
                                    </Button>
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
    return (
        <Card>
            <CardHeader>
                <CardTitle>Test</CardTitle>
                <CardDescription>Section de test pour le matching.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Contenu à venir pour l'outil de test.</p>
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


