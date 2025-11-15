

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAgency } from "@/context/agency-provider";
import { useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import React, { useMemo, useState } from "react";
import { collection, query, where, doc, deleteDoc } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase/provider";
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
import { PlusCircle, Loader2, Eye, EyeOff, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { validateUser } from "@/app/actions/user";
import { Textarea } from "@/components/ui/textarea";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { randomBytes } from "crypto";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'superadmin' | 'conseiller' | 'membre' | 'prospect' | 'dpo';
  dateJoined: string;
  phone: string;
  address?: string;
  zipCode?: string;
  city?: string;
  socialSecurityNumber?: string;
  franceTravailId?: string;
};

const passwordMatchRefine = (data: any) => data.password === data.confirmPassword;
const passwordMatchMessage = {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
};

const baseUserFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().min(1, "Le téléphone est requis."),
});

const adminFormSchema = baseUserFormSchema.extend({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
  role: z.enum(['admin', 'superadmin', 'dpo'], { required_error: "Le rôle est requis." }),
}).refine(data => {
    if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
    }
    return true;
}, passwordMatchMessage);

const conseillerFormSchema = baseUserFormSchema.extend({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
  role: z.literal('conseiller'),
}).refine(data => {
    if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
    }
    return true;
}, passwordMatchMessage);

const membreFormSchema = baseUserFormSchema.extend({
    address: z.string().min(1, "L'adresse est requise."),
    zipCode: z.string().min(1, "Le code postal est requis."),
    city: z.string().min(1, "La ville est requise."),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").optional().or(z.literal('')),
    confirmPassword: z.string().optional(),
    socialSecurityNumber: z.string().optional(),
    franceTravailId: z.string().optional(),
    role: z.literal('membre'),
}).refine(data => {
    if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
});


// Component to render the user table
const UserTable = ({ users, isLoading, emptyMessage, onEdit, onDelete }: { users: User[], isLoading: boolean, emptyMessage: string, onEdit: (user: User) => void, onDelete: (user: User) => void }) => {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Date d'inscription</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
              <TableCell><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rôle</TableHead>
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
              <Badge variant={user.role === 'admin' || user.role === 'superadmin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
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
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                        </DropdownMenuItem>
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
  const { toast } = useToast();

  const [adminSearch, setAdminSearch] = useState('');
  const [conseillerSearch, setConseillerSearch] = useState('');
  const [membreSearch, setMembreSearch] = useState('');
  const [prospectSearch, setProspectSearch] = useState('');
  
  const [isConseillerFormOpen, setIsConseillerFormOpen] = useState(false);
  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false);
  const [isMembreFormOpen, setIsMembreFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const usersQuery = useMemoFirebase(() => {
    if (!agency) return null;
    return query(collection(firestore, 'users'), where('agencyId', '==', agency.id));
  }, [agency, firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection(usersQuery);

  const isLoading = isAgencyLoading || areUsersLoading;

  const adminForm = useForm<z.infer<typeof adminFormSchema>>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "admin",
    },
  });

  const conseillerForm = useForm<z.infer<typeof conseillerFormSchema>>({
    resolver: zodResolver(conseillerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "conseiller",
    },
  });

  const membreForm = useForm<z.infer<typeof membreFormSchema>>({
    resolver: zodResolver(membreFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      zipCode: "",
      city: "",
      password: "",
      confirmPassword: "",
      socialSecurityNumber: "",
      franceTravailId: "",
      role: "membre",
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'dpo') {
        adminForm.reset({
            ...user,
            password: '',
            confirmPassword: '',
        });
        setIsAdminFormOpen(true);
    } else if (user.role === 'conseiller') {
        conseillerForm.reset({
            ...user,
            password: '',
            confirmPassword: '',
        });
        setIsConseillerFormOpen(true);
    } else if (user.role === 'membre' || user.role === 'prospect') {
        membreForm.reset({
            ...user,
            password: '',
            confirmPassword: '',
        });
        setIsMembreFormOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete || !agency) return;
    try {
        const userDocRef = doc(firestore, "users", userToDelete.id);
        await deleteDocumentNonBlocking(userDocRef);
        // Note: Deleting from Firebase Auth requires a backend function for security.
        // This part is omitted as it can't be done securely from the client.
        toast({ title: "Utilisateur supprimé", description: "L'utilisateur a été supprimé de Firestore." });
    } catch (error) {
        console.error("Error deleting user:", error);
        toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur.", variant: "destructive" });
    } finally {
        setUserToDelete(null);
    }
  };
  
  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
  };

  async function handleCreateUser(values: z.infer<typeof adminFormSchema> | z.infer<typeof conseillerFormSchema> | z.infer<typeof membreFormSchema>) {
    if (!agency) {
        toast({ title: "Erreur", description: "L'agence n'a pas été trouvée.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    
    // First, validate data on the server
    const validationResult = await validateUser({ ...values, agencyId: agency.id });

    if (!validationResult.success) {
        toast({ title: "Erreur de validation", description: validationResult.error, variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    // Now, create the user on the client side
    let finalPassword = 'password' in values ? values.password : '';
    
    if (values.role === 'membre' && (!finalPassword || finalPassword.length === 0)) {
        finalPassword = randomBytes(16).toString('hex');
    }

    if (!finalPassword && !editingUser) { // Password is required for new users
         toast({ title: "Erreur", description: "Impossible de créer un utilisateur sans mot de passe.", variant: "destructive" });
         setIsSubmitting(false);
         return;
    }

    try {
        let userId = editingUser?.id;
        if (!editingUser && auth && finalPassword) {
            // Step 1: Create user in Firebase Auth if it's a new user
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, finalPassword);
            userId = userCredential.user.uid;
        }

        if (!userId) {
            throw new Error("ID utilisateur manquant.");
        }

        // Step 2: Create or update user document in Firestore
        const { confirmPassword, ...firestoreData } = values;
        const userDocRef = doc(firestore, "users", userId);
        
        const dataToSave: any = {
            ...firestoreData,
            agencyId: agency.id,
        };

        if(!editingUser) {
          dataToSave.dateJoined = new Date().toISOString();
        }

        await setDocumentNonBlocking(userDocRef, dataToSave, { merge: true });

        toast({ title: "Succès", description: `L'utilisateur a été ${editingUser ? 'modifié' : 'ajouté'}.` });
        
        // Reset and close the correct form
        if (values.role === 'conseiller') setIsConseillerFormOpen(false);
        else if (values.role === 'membre') setIsMembreFormOpen(false);
        else setIsAdminFormOpen(false);

        setEditingUser(null);

    } catch (error: any) {
        console.error("Error saving user:", error);
        let errorMessage = "Une erreur inattendue est survenue.";
         if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Cette adresse email est déjà utilisée.";
        } else if (error.code === 'auth/invalid-password') {
            errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
        } else if (error.code) {
            errorMessage = error.message || error.code;
        }
        toast({ title: `Erreur de ${editingUser ? 'modification' : 'création'}`, description: errorMessage, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const filterUsers = (data: User[] | null, role: string[], searchTerm: string) => {
    if (!data) return [];
    return data.filter(user => 
      role.includes(user.role) &&
      (
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };
  
  const admins = useMemo(() => filterUsers(users, ['admin', 'superadmin', 'dpo'], adminSearch), [users, adminSearch]);
  const conseillers = useMemo(() => filterUsers(users, ['conseiller'], conseillerSearch), [users, conseillerSearch]);
  const membres = useMemo(() => filterUsers(users, ['membre'], membreSearch), [users, membreSearch]);
  const prospects = useMemo(() => filterUsers(users, ['prospect'], prospectSearch), [users, prospectSearch]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Utilisateurs</h1>
        <p className="text-muted-foreground">
          Gérez les utilisateurs et leurs permissions pour l'agence : **{agency?.name || '...'}**
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des utilisateurs</CardTitle>
          <CardDescription>Invitez, modifiez ou supprimez des utilisateurs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admins">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="admins">Admins & DPO</TabsTrigger>
              <TabsTrigger value="conseillers">Conseillers</TabsTrigger>
              <TabsTrigger value="membres">Membres</TabsTrigger>
              <TabsTrigger value="prospects">Prospects</TabsTrigger>
            </TabsList>

            <TabsContent value="admins">
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                    <Input 
                        placeholder="Rechercher un admin..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="max-w-sm"
                    />
                    <Dialog open={isAdminFormOpen} onOpenChange={(isOpen) => { setIsAdminFormOpen(isOpen); if (!isOpen) setEditingUser(null); }}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Ajouter un Admin / DPO
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un administrateur ou DPO</DialogTitle>
                                <DialogDescription>
                                    {editingUser ? 'Modifiez les informations ci-dessous.' : 'Créez un nouvel utilisateur avec un rôle d\\'administration.'}
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...adminForm}>
                                <form onSubmit={adminForm.handleSubmit(handleCreateUser)} className="space-y-4 px-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={adminForm.control} name="firstName" render={({ field }) => (
                                            <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={adminForm.control} name="lastName" render={({ field }) => (
                                            <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={adminForm.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jean.dupont@email.com" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={adminForm.control} name="phone" render={({ field }) => (
                                        <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="0612345678" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={adminForm.control} name="password" render={({ field }) => (
                                        <FormItem><FormLabel>Mot de passe {editingUser ? '(Laisser vide pour ne pas changer)' : ''}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                    <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={adminForm.control} name="confirmPassword" render={({ field }) => (
                                        <FormItem><FormLabel>Confirmer le mot de passe</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                    <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={adminForm.control} name="role" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rôle</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un rôle" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="superadmin">Super Admin</SelectItem>
                                                    <SelectItem value="dpo">DPO</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <DialogFooter className="pt-4">
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {editingUser ? 'Enregistrer' : 'Créer l\\'utilisateur'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
                <UserTable users={admins} isLoading={isLoading} emptyMessage="Aucun admin ou DPO trouvé." onEdit={handleEdit} onDelete={openDeleteDialog} />
              </div>
            </TabsContent>

            <TabsContent value="conseillers">
                <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                        <Input 
                            placeholder="Rechercher un conseiller..."
                            value={conseillerSearch}
                            onChange={(e) => setConseillerSearch(e.target.value)}
                            className="max-w-sm"
                        />
                         <Dialog open={isConseillerFormOpen} onOpenChange={(isOpen) => { setIsConseillerFormOpen(isOpen); if (!isOpen) setEditingUser(null); }}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter un Conseiller
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un conseiller</DialogTitle>
                                    <DialogDescription>
                                        {editingUser ? 'Modifiez les informations ci-dessous.' : 'Créez un nouvel utilisateur avec le rôle de conseiller.'}
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...conseillerForm}>
                                    <form onSubmit={conseillerForm.handleSubmit(handleCreateUser)} className="space-y-4 px-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={conseillerForm.control} name="firstName" render={({ field }) => (
                                                <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={conseillerForm.control} name="lastName" render={({ field }) => (
                                                <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={conseillerForm.control} name="email" render={({ field }) => (
                                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jean.dupont@email.com" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={conseillerForm.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="0612345678" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={conseillerForm.control} name="password" render={({ field }) => (
                                            <FormItem><FormLabel>Mot de passe {editingUser ? '(Laisser vide pour ne pas changer)' : ''}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={conseillerForm.control} name="confirmPassword" render={({ field }) => (
                                            <FormItem><FormLabel>Confirmer le mot de passe</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <DialogFooter className="pt-4">
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {editingUser ? 'Enregistrer' : 'Créer l\\'utilisateur'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <UserTable users={conseillers} isLoading={isLoading} emptyMessage="Aucun conseiller trouvé." onEdit={handleEdit} onDelete={openDeleteDialog} />
                </div>
            </TabsContent>

            <TabsContent value="membres">
                 <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                        <Input 
                            placeholder="Rechercher un membre..."
                            value={membreSearch}
                            onChange={(e) => setMembreSearch(e.target.value)}
                            className="max-w-sm"
                        />
                         <Dialog open={isMembreFormOpen} onOpenChange={(isOpen) => { setIsMembreFormOpen(isOpen); if (!isOpen) setEditingUser(null); }}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter un Membre
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un membre</DialogTitle>
                                    <DialogDescription>
                                        {editingUser ? 'Modifiez les informations ci-dessous.' : 'Créez un nouvel utilisateur avec le rôle de membre.'}
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...membreForm}>
                                    <form onSubmit={membreForm.handleSubmit(handleCreateUser)} className="space-y-4 px-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={membreForm.control} name="firstName" render={({ field }) => (
                                                <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={membreForm.control} name="lastName" render={({ field }) => (
                                                <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={membreForm.control} name="address" render={({ field }) => (
                                            <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea placeholder="123 Rue de Paris" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={membreForm.control} name="zipCode" render={({ field }) => (
                                                <FormItem><FormLabel>Code postal</FormLabel><FormControl><Input placeholder="75001" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={membreForm.control} name="city" render={({ field }) => (
                                                <FormItem><FormLabel>Ville</FormLabel><FormControl><Input placeholder="Paris" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={membreForm.control} name="email" render={({ field }) => (
                                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jean.dupont@email.com" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="0612345678" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="password" render={({ field }) => (
                                            <FormItem><FormLabel>Mot de passe (Optionnel {editingUser ? ' - Laisser vide pour ne pas changer' : ''})</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="confirmPassword" render={({ field }) => (
                                            <FormItem><FormLabel>Confirmer le mot de passe</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="socialSecurityNumber" render={({ field }) => (
                                            <FormItem><FormLabel>N° Sécurité Sociale (Optionnel)</FormLabel><FormControl><Input placeholder="1 23 45..." {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={membreForm.control} name="franceTravailId" render={({ field }) => (
                                            <FormItem><FormLabel>ID France Travail (Optionnel)</FormLabel><FormControl><Input placeholder="ID..." {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />

                                        <DialogFooter className="pt-4">
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {editingUser ? 'Enregistrer' : 'Créer le membre'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <UserTable users={membres} isLoading={isLoading} emptyMessage="Aucun membre trouvé." onEdit={handleEdit} onDelete={openDeleteDialog} />
                </div>
            </TabsContent>

            <TabsContent value="prospects">
                <div className="space-y-4 pt-4">
                    <Input 
                        placeholder="Rechercher un prospect..."
                        value={prospectSearch}
                        onChange={(e) => setProspectSearch(e.target.value)}
                    />
                    <UserTable users={prospects} isLoading={isLoading} emptyMessage="Aucun prospect trouvé." onEdit={handleEdit} onDelete={openDeleteDialog} />
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet utilisateur ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. L'utilisateur <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> sera définitivement supprimé.
                    La suppression du compte d'authentification doit être faite manuellement depuis la console Firebase pour des raisons de sécurité.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
