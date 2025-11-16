

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAgency } from "@/context/agency-provider";
import { useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import React, { useMemo, useState, useEffect } from "react";
import { collection, query, where, doc, getDocs } from "firebase/firestore";
import { useAuth, useFirestore, useUser as useFirebaseUser } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2, Eye, EyeOff, MoreHorizontal, Edit, Trash2, Info, Repeat, UserCog, UserPlus, UserCheck, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { randomBytes } from "crypto";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'superadmin' | 'membre'; // Role on the user document is now global
  dateJoined: string;
  phone: string;
  address?: string;
  zipCode?: string;
  city?: string;
  socialSecurityNumber?: string;
  franceTravailId?: string;
  status?: 'new' | 'contacted' | 'not_interested';
  origin?: string;
  message?: string;
};

type Membership = {
    id: string;
    userId: string;
    agencyId: string;
    role: 'admin' | 'dpo' | 'conseiller' | 'membre';
}


const baseUserFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().min(1, "Le téléphone est requis."),
});

const passwordFields = {
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
};

const passwordRefine = {
  refine: (data: {password?: string, confirmPassword?: string}) => {
    if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
    }
    return true;
  },
  params: {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  }
};


const adminFormSchema = baseUserFormSchema.extend({
  role: z.enum(['admin', 'dpo'], { required_error: "Le rôle est requis." }),
  ...passwordFields
}).refine(passwordRefine.refine, passwordRefine.params);


const conseillerFormSchema = baseUserFormSchema.extend({
  ...passwordFields
}).refine(passwordRefine.refine, passwordRefine.params);

const membreFormSchema = baseUserFormSchema.extend({
    address: z.string().min(1, "L'adresse est requise."),
    zipCode: z.string().min(1, "Le code postal est requis."),
    city: z.string().min(1, "La ville est requise."),
    socialSecurityNumber: z.string().optional(),
    franceTravailId: z.string().optional(),
    ...passwordFields
}).refine(passwordRefine.refine, passwordRefine.params);


const prospectStatusVariant: Record<NonNullable<User['status']>, 'default' | 'secondary' | 'destructive'> = {
  new: 'secondary',
  contacted: 'default',
  not_interested: 'destructive',
};

const prospectStatusText: Record<NonNullable<User['status']>, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  not_interested: 'Non intéressé',
};

// Component to render the user table
const UserTable = ({ users, memberships, onEdit, onDelete, onStatusChange, onView }: {
    users: (User & { membershipRole?: string })[],
    memberships: Membership[],
    onEdit?: (user: User) => void,
    onDelete: (user: User) => void,
    onStatusChange?: (user: User, status: User['status']) => void,
    onView?: (user: User) => void,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rôle dans l'agence</TableHead>
          <TableHead>Date d'inscription</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {user.membershipRole && <Badge variant={user.membershipRole === 'admin' ? 'default' : 'secondary'}>
                {user.membershipRole}
              </Badge>}
            </TableCell>
            <TableCell>
              {user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && <DropdownMenuItem onClick={() => onView(user)}><Info className="mr-2 h-4 w-4" /> Voir</DropdownMenuItem>}
                  {onEdit && <DropdownMenuItem onClick={() => onEdit(user)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>}
                  {onStatusChange && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Changer le statut</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => onStatusChange(user, 'new')}>Nouveau</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStatusChange(user, 'contacted')}>Contacté</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStatusChange(user, 'not_interested')}>Non intéressé</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  )}
                  <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};


export default function UsersPage() {
  const { agency, isLoading: isAgencyLoading } = useAgency();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: firebaseAuthUser, isUserLoading: isAuthLoading } = useFirebaseUser();
  const { toast } = useToast();

  const [searchTerms, setSearchTerms] = useState({ admins: '', conseillers: '', membres: '', prospects: '' });
  const [isFormOpen, setIsFormOpen] = useState<{ [key: string]: boolean }>({ admin: false, conseiller: false, membre: false });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToView, setUserToView] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  const membershipsQuery = useMemoFirebase(() => {
      if (!agency) return null;
      return query(collection(firestore, 'memberships'), where('agencyId', '==', agency.id));
  }, [firestore, agency]);
  const { data: memberships, isLoading: areMembershipsLoading } = useCollection<Membership>(membershipsQuery);

  const isLoading = isAgencyLoading || isAuthLoading || areUsersLoading || areMembershipsLoading;

  const usersInAgency = useMemo(() => {
    if (!allUsers || !memberships) return [];
    const userIdsInAgency = new Set(memberships.map(m => m.userId));
    return allUsers.filter(u => userIdsInAgency.has(u.id));
  }, [allUsers, memberships]);

  const adminForm = useForm<z.infer<typeof adminFormSchema>>({ resolver: zodResolver(adminFormSchema) });
  const conseillerForm = useForm<z.infer<typeof conseillerFormSchema>>({ resolver: zodResolver(conseillerFormSchema) });
  const membreForm = useForm<z.infer<typeof membreFormSchema>>({ resolver: zodResolver(membreFormSchema) });
  
  const handleView = (user: User) => setUserToView(user);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    const membership = memberships?.find(m => m.userId === user.id);
    setEditingMembership(membership || null);

    if (membership?.role === 'admin' || membership?.role === 'dpo') {
        adminForm.reset({ ...user, role: membership.role, password: '', confirmPassword: '' });
        setIsFormOpen({ ...isFormOpen, admin: true });
    } else if (membership?.role === 'conseiller') {
        conseillerForm.reset({ ...user, password: '', confirmPassword: '' });
        setIsFormOpen({ ...isFormOpen, conseiller: true });
    } else if (membership?.role === 'membre') {
        membreForm.reset({ ...user, password: '', confirmPassword: '' });
        setIsFormOpen({ ...isFormOpen, membre: true });
    }
  };

  const handleCloseForm = (type: string) => {
    setIsFormOpen({ ...isFormOpen, [type]: false });
    setEditingUser(null);
    setEditingMembership(null);
    adminForm.reset();
    conseillerForm.reset();
    membreForm.reset();
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete || !agency) return;
    try {
        const userDocRef = doc(firestore, "users", userToDelete.id);
        const userMembershipsQuery = query(collection(firestore, 'memberships'), where('userId', '==', userToDelete.id));
        const userMembershipsSnap = await getDocs(userMembershipsQuery);
        
        // If user is in multiple agencies, just remove from this one
        if (userMembershipsSnap.docs.length > 1) {
            const agencyMembership = userMembershipsSnap.docs.find(doc => doc.data().agencyId === agency.id);
            if(agencyMembership) {
                await deleteDocumentNonBlocking(agencyMembership.ref);
            }
            toast({ title: "Membre supprimé de l'agence", description: "L'utilisateur a été retiré de cette agence." });
        } else { // Otherwise, delete the user entirely
            await deleteDocumentNonBlocking(userDocRef);
            if(!userMembershipsSnap.empty) {
                await deleteDocumentNonBlocking(userMembershipsSnap.docs[0].ref);
            }
            toast({ title: "Utilisateur supprimé", description: "L'utilisateur a été supprimé de la plateforme." });
        }
    } catch (error) {
        console.error("Error deleting user:", error);
        toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur.", variant: "destructive" });
    } finally {
        setUserToDelete(null);
    }
  };

  async function handleFormSubmit(values: any, membershipRole: 'admin' | 'dpo' | 'conseiller' | 'membre') {
    if (!agency) return;

    setIsSubmitting(true);
    
    try {
        let userId = editingUser?.id;
        
        if (!editingUser) { // Creating a new user
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            userId = userCredential.user.uid;
            
            const userDocRef = doc(firestore, "users", userId);
            const userDocData = {
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                phone: values.phone,
                role: 'membre', // Global role is always 'membre' unless they are superadmin
                dateJoined: new Date().toISOString(),
                ...('address' in values && { address: values.address, zipCode: values.zipCode, city: values.city, socialSecurityNumber: values.socialSecurityNumber, franceTravailId: values.franceTravailId }),
            };
            await setDocumentNonBlocking(userDocRef, userDocData, {});

        } else { // Updating an existing user
            const userDocRef = doc(firestore, "users", userId!);
            const userDocData = {
                firstName: values.firstName,
                lastName: values.lastName,
                phone: values.phone,
                ...('address' in values && { address: values.address, zipCode: values.zipCode, city: values.city, socialSecurityNumber: values.socialSecurityNumber, franceTravailId: values.franceTravailId }),
            };
            await setDocumentNonBlocking(userDocRef, userDocData, { merge: true });
        }

        // Create or update membership
        const membershipId = editingMembership ? editingMembership.id : `${userId}_${agency.id}`;
        const membershipRef = doc(firestore, 'memberships', membershipId);
        const membershipData = {
            userId,
            agencyId: agency.id,
            role: membershipRole === 'admin' ? values.role : membershipRole, // Get role from form for admins/dpo
        };
        await setDocumentNonBlocking(membershipRef, membershipData, { merge: true });

        toast({ title: "Succès", description: `L'utilisateur a été ${editingUser ? 'modifié' : 'créé'}.` });
        handleCloseForm(membershipRole);
        
    } catch (error: any) {
        console.error("Error saving user:", error);
        toast({ title: `Erreur`, description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const filterUsers = (role: string, searchTerm: string) => {
    if (!usersInAgency || !memberships) return [];
    return usersInAgency
      .map(user => {
        const membership = memberships.find(m => m.userId === user.id);
        return { ...user, membershipRole: membership?.role };
      })
      .filter(user => 
        user.membershipRole === role &&
        (user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };
  
  const admins = useMemo(() => filterUsers('admin', searchTerms.admins).concat(filterUsers('dpo', searchTerms.admins)), [usersInAgency, memberships, searchTerms.admins]);
  const conseillers = useMemo(() => filterUsers('conseiller', searchTerms.conseillers), [usersInAgency, memberships, searchTerms.conseillers]);
  const membres = useMemo(() => filterUsers('membre', searchTerms.membres), [usersInAgency, memberships, searchTerms.membres]);

  if (isLoading) {
      return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Utilisateurs</h1>
        <p className="text-muted-foreground">Gérez les utilisateurs et leurs permissions pour l'agence : **{agency?.name || '...'}**</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des utilisateurs de l'agence</CardTitle>
          <CardDescription>Invitez, modifiez ou supprimez des utilisateurs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admins">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admins">Admins &amp; DPO</TabsTrigger>
              <TabsTrigger value="conseillers">Conseillers</TabsTrigger>
              <TabsTrigger value="membres">Membres</TabsTrigger>
            </TabsList>

            <TabsContent value="admins" className="pt-4">
              <div className="flex justify-between items-center mb-4">
                  <Input placeholder="Rechercher..." value={searchTerms.admins} onChange={(e) => setSearchTerms({...searchTerms, admins: e.target.value})} className="max-w-sm" />
                  <Dialog open={isFormOpen.admin} onOpenChange={() => handleCloseForm('admin')}>
                      <DialogTrigger asChild><Button onClick={() => setIsFormOpen({...isFormOpen, admin: true})}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un Admin/DPO</DialogTitle></DialogHeader>
                        <Form {...adminForm}>
                            <form onSubmit={adminForm.handleSubmit(v => handleFormSubmit(v, 'admin'))} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={adminForm.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={adminForm.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                <FormField control={adminForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={adminForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={adminForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Mot de passe {editingUser && '(Laisser vide...)'}</FormLabel><FormControl><div className="relative"><Input type={showPassword ? 'text' : 'password'} {...field} /><Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff/> : <Eye/>}</Button></div></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={adminForm.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>Confirmer</FormLabel><FormControl><div className="relative"><Input type={showConfirmPassword ? 'text' : 'password'} {...field} /><Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff/> : <Eye/>}</Button></div></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={adminForm.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Rôle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="dpo">DPO</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editingUser ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
                            </form>
                        </Form>
                      </DialogContent>
                  </Dialog>
              </div>
              <UserTable users={admins} memberships={memberships || []} onEdit={handleEdit} onDelete={setUserToDelete} />
            </TabsContent>
            
            <TabsContent value="conseillers" className="pt-4">
              <div className="flex justify-between items-center mb-4">
                  <Input placeholder="Rechercher..." value={searchTerms.conseillers} onChange={(e) => setSearchTerms({...searchTerms, conseillers: e.target.value})} className="max-w-sm" />
                  <Dialog open={isFormOpen.conseiller} onOpenChange={() => handleCloseForm('conseiller')}>
                      <DialogTrigger asChild><Button onClick={() => setIsFormOpen({...isFormOpen, conseiller: true})}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un Conseiller</DialogTitle></DialogHeader>
                        <Form {...conseillerForm}>
                            <form onSubmit={conseillerForm.handleSubmit(v => handleFormSubmit(v, 'conseiller'))} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={conseillerForm.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={conseillerForm.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                <FormField control={conseillerForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={conseillerForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={conseillerForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Mot de passe {editingUser && '(Laisser vide...)'}</FormLabel><FormControl><div className="relative"><Input type={showPassword ? 'text' : 'password'} {...field} /><Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff/> : <Eye/>}</Button></div></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={conseillerForm.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>Confirmer</FormLabel><FormControl><div className="relative"><Input type={showConfirmPassword ? 'text' : 'password'} {...field} /><Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff/> : <Eye/>}</Button></div></FormControl><FormMessage /></FormItem> )} />
                                <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editingUser ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
                            </form>
                        </Form>
                      </DialogContent>
                  </Dialog>
              </div>
              <UserTable users={conseillers} memberships={memberships || []} onEdit={handleEdit} onDelete={setUserToDelete} />
            </TabsContent>
            
            <TabsContent value="membres" className="pt-4">
               <div className="flex justify-between items-center mb-4">
                  <Input placeholder="Rechercher..." value={searchTerms.membres} onChange={(e) => setSearchTerms({...searchTerms, membres: e.target.value})} className="max-w-sm" />
                  <Dialog open={isFormOpen.membre} onOpenChange={() => handleCloseForm('membre')}>
                      <DialogTrigger asChild><Button onClick={() => setIsFormOpen({...isFormOpen, membre: true})}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un Membre</DialogTitle></DialogHeader>
                         <Form {...membreForm}>
                            <form onSubmit={membreForm.handleSubmit(v => handleFormSubmit(v, 'membre'))} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={membreForm.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={membreForm.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                <FormField control={membreForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={membreForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={membreForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Mot de passe {editingUser && '(Laisser vide...)'}</FormLabel><FormControl><div className="relative"><Input type={showPassword ? 'text' : 'password'} {...field} /><Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff/> : <Eye/>}</Button></div></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={membreForm.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>Confirmer</FormLabel><FormControl><div className="relative"><Input type={showConfirmPassword ? 'text' : 'password'} {...field} /><Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff/> : <Eye/>}</Button></div></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={membreForm.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField control={membreForm.control} name="zipCode" render={({ field }) => ( <FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                  <FormField control={membreForm.control} name="city" render={({ field }) => ( <FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editingUser ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
                            </form>
                        </Form>
                      </DialogContent>
                  </Dialog>
              </div>
              <UserTable users={membres} memberships={memberships || []} onEdit={handleEdit} onDelete={setUserToDelete} onView={handleView} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action supprimera l'utilisateur de cette agence. S'il n'est dans aucune autre agence, son compte entier sera supprimé.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={!!userToView} onOpenChange={(open) => !open && setUserToView(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Informations de {userToView?.firstName} {userToView?.lastName}</DialogTitle>
                </DialogHeader>
                {userToView && (
                    <div className="space-y-4 py-4 text-sm">
                        <p><strong>Email:</strong> {userToView.email}</p>
                        <p><strong>Téléphone:</strong> {userToView.phone}</p>
                        <p><strong>Rôle global:</strong> {userToView.role}</p>
                        <p><strong>Date d'inscription:</strong> {new Date(userToView.dateJoined).toLocaleDateString('fr-FR')}</p>
                         {userToView.message && (
                            <div>
                                <p><strong>Message original:</strong></p>
                                <p className="text-muted-foreground p-2 border bg-muted rounded-md">{userToView.message}</p>
                            </div>
                         )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}

