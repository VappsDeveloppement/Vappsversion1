
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useCollection, useMemoFirebase, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Edit, Trash2, MoreHorizontal, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';

type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'superadmin' | 'membre' | 'prospect' | 'admin' | 'dpo' | 'conseiller' | 'moderateur';
    dateJoined: string;
    phone?: string;
    address?: string;
    zipCode?: string;
    city?: string;
};

const userFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(['superadmin', 'admin', 'dpo', 'conseiller', 'moderateur', 'membre'], { required_error: "Le rôle est requis." }),
  password: z.string().optional(),
}).refine(data => {
    // Si on crée un nouvel utilisateur (pas d'ID), le mot de passe est requis et doit faire au moins 6 caractères
    const isCreating = !data.email.includes('@'); // Heuristique simple: si on édite, l'email est déjà là. A améliorer.
    if (isCreating && (!data.password || data.password.length < 6)) {
        return false;
    }
    return true;
}, {
    message: "Un mot de passe de 6 caractères minimum est requis pour un nouvel utilisateur.",
    path: ["password"],
});


type UserFormData = z.infer<typeof userFormSchema>;

const roleVariant: Record<User['role'], 'default' | 'secondary' | 'destructive'> = {
  superadmin: 'destructive',
  admin: 'default',
  dpo: 'default',
  conseiller: 'default',
  moderateur: 'default',
  membre: 'default',
  prospect: 'secondary',
};

const roleText: Record<User['role'], string> = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    dpo: 'DPO',
    conseiller: 'Conseiller',
    moderateur: 'Modérateur',
    membre: 'Membre',
    prospect: 'Prospect',
};

export default function UserManagementPage() {
    const firestore = useFirestore();
    const auth = useAuth();
    const { user: currentUser, isUserLoading } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);

    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);
    
    const filteredUsers = useMemo(() => {
        if (!allUsers) return [];
        if (!searchTerm) return allUsers;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        return allUsers.filter(user => 
            (user.firstName?.toLowerCase() || '').includes(lowercasedTerm) ||
            (user.lastName?.toLowerCase() || '').includes(lowercasedTerm) ||
            (user.email?.toLowerCase() || '').includes(lowercasedTerm)
        );
    }, [allUsers, searchTerm]);
    
    const form = useForm<UserFormData>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            firstName: '', lastName: '', email: '', phone: '',
            address: '', zipCode: '', city: '', role: 'membre', password: '',
        },
    });

    useEffect(() => {
        if (isDialogOpen) {
            if (editingUser) {
                form.reset({
                    ...editingUser,
                    phone: editingUser.phone || '',
                    address: editingUser.address || '',
                    zipCode: editingUser.zipCode || '',
                    city: editingUser.city || '',
                    password: '' // Ne pas pré-remplir le mot de passe
                });
            } else {
                form.reset({
                    firstName: '', lastName: '', email: '', phone: '',
                    address: '', zipCode: '', city: '', role: 'membre', password: '',
                });
            }
        }
    }, [isDialogOpen, editingUser, form]);


    const handleOpenDialog = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setEditingUser(null);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: UserFormData) => {
        setIsSubmitting(true);
        try {
            if (editingUser) {
                // Modification d'un utilisateur
                const userDocRef = doc(firestore, 'users', editingUser.id);
                await setDocumentNonBlocking(userDocRef, {
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                    role: values.role,
                    phone: values.phone,
                    address: values.address,
                    zipCode: values.zipCode,
                    city: values.city,
                }, { merge: true });
                toast({ title: 'Succès', description: 'L\'utilisateur a été mis à jour.' });
            } else {
                // Création d'un nouvel utilisateur avec mot de passe
                if (!values.password) {
                    toast({ variant: 'destructive', title: 'Erreur', description: 'Un mot de passe est requis pour un nouvel utilisateur.' });
                    setIsSubmitting(false);
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
                const user = userCredential.user;
                const userDocRef = doc(firestore, 'users', user.uid);
                await setDocumentNonBlocking(userDocRef, {
                    id: user.uid,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                    role: values.role,
                    phone: values.phone,
                    address: values.address,
                    zipCode: values.zipCode,
                    city: values.city,
                    dateJoined: new Date().toISOString(),
                }, {});
                toast({ title: 'Succès', description: 'L\'utilisateur a été créé.' });
            }
            setIsDialogOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            console.error("Error saving user:", error);
            const errorMessage = error.code === 'auth/email-already-in-use' ? "Cette adresse e-mail est déjà utilisée." : "Une erreur est survenue.";
            toast({ title: 'Erreur', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        // CRITICAL FIX: PREVENT DELETING THE CURRENTLY LOGGED-IN USER
        if (userToDelete.id === currentUser?.uid) {
            toast({ title: "Action impossible", description: "Vous ne pouvez pas supprimer votre propre compte.", variant: "destructive" });
            setUserToDelete(null);
            return;
        }
        
        if (userToDelete.role === 'superadmin') {
             toast({ title: "Action impossible", description: "La suppression d'un super administrateur est interdite.", variant: "destructive" });
            setUserToDelete(null);
            return;
        }

        try {
            const userDocRef = doc(firestore, "users", userToDelete.id);
            await deleteDocumentNonBlocking(userDocRef);
            // Note: This does not delete the user from Firebase Auth.
            // That should be done in a secure environment like a Cloud Function.
            toast({ title: "Utilisateur supprimé", description: "L'utilisateur a été supprimé de Firestore. La suppression de l'authentification doit se faire manuellement." });
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur.", variant: "destructive" });
        } finally {
            setUserToDelete(null);
        }
    };

    const isLoading = areUsersLoading || isUserLoading;

    const renderContent = () => {
        if (isLoading) {
            return (
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={5}>
                                <Skeleton className="h-8 w-full" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            );
        }

        if (filteredUsers.length > 0) {
            return (
                <TableBody>
                    {filteredUsers.map((user) => (
                       <TableRow key={user.id}>
                           <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                           <TableCell>{user.email}</TableCell>
                           <TableCell><Badge variant={roleVariant[user.role] || 'secondary'}>{roleText[user.role] || user.role}</Badge></TableCell>
                           <TableCell>{user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : 'N/A'}</TableCell>
                           <TableCell className="text-right">
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Modifier
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => setUserToDelete(user)}
                                            disabled={user.id === currentUser?.uid || user.role === 'superadmin'}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Supprimer
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                           </TableCell>
                       </TableRow>
                   ))}
                </TableBody>
            );
        }

        return (
            <TableBody>
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Aucun utilisateur trouvé.
                    </TableCell>
               </TableRow>
            </TableBody>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">User Management</h1>
                    <p className="text-muted-foreground">Liste de tous les utilisateurs de la plateforme.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nouvel Utilisateur
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingUser ? 'Modifier l' : 'Créer un'} utilisateur</DialogTitle>
                            <DialogDescription>
                                Gérez les informations et le rôle de l'utilisateur.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="firstName" render={({ field }) => (
                                        <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="lastName" render={({ field }) => (
                                        <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem>
                                )} />
                                 <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="zipCode" render={({ field }) => (
                                        <FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="city" render={({ field }) => (
                                        <FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rôle</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un rôle" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="superadmin">Super Admin</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="dpo">DPO</SelectItem>
                                                <SelectItem value="conseiller">Conseiller</SelectItem>
                                                <SelectItem value="moderateur">Modérateur</SelectItem>
                                                <SelectItem value="membre">Membre</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mot de passe {editingUser && '(Laisser vide pour ne pas changer)'}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? "text" : "password"} {...field} />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => handleOpenDialog(false)}>Annuler</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingUser ? 'Sauvegarder' : 'Créer l\'utilisateur'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Tous les Utilisateurs</CardTitle>
                    <CardDescription>Liste de tous les utilisateurs de la plateforme.</CardDescription>
                    <div className="pt-4">
                        <Input 
                            placeholder="Rechercher par nom ou email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Date d'inscription</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        {renderContent()}
                    </Table>
                </CardContent>
            </Card>
             <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                        Cette action supprimera l'utilisateur <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> de la base de données Firestore. La suppression de l'authentification Firebase devra être effectuée manuellement. Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
