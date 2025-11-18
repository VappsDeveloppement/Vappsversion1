
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useCollection, useMemoFirebase, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
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
import { createUser } from '@/app/actions/user';

type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'superadmin' | 'membre' | 'conseiller';
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
  role: z.enum(['superadmin', 'conseiller', 'membre'], { required_error: "Le rôle est requis." }),
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

const roleVariant: Record<User['role'], 'default' | 'secondary' | 'destructive'> = {
  superadmin: 'destructive',
  conseiller: 'default',
  membre: 'secondary',
};

const roleText: Record<User['role'], string> = {
    superadmin: 'Super Admin',
    conseiller: 'Conseiller',
    membre: 'Membre',
};

export default function UserManagementPage() {
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);
    
    const userDocRef = useMemoFirebase(() => {
        if (!currentUser) return null;
        return doc(firestore, 'users', currentUser.uid);
    }, [firestore, currentUser]);
    const { data: currentUserData, isLoading: isCurrentUserDataLoading } = useDoc(userDocRef);


    const filteredUsers = useMemo(() => {
        if (!allUsers) return [];
        let users = allUsers;
        if (roleFilter !== 'all') {
            users = users.filter(user => user.role === roleFilter);
        }
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            users = users.filter(user => 
                (user.firstName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (user.lastName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (user.email?.toLowerCase() || '').includes(lowercasedTerm)
            );
        }
        return users;
    }, [allUsers, searchTerm, roleFilter]);
    
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
                    password: ''
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
                if (!values.password || values.password.length < 6) {
                    form.setError("password", { type: "manual", message: "Un mot de passe de 6 caractères minimum est requis."});
                    setIsSubmitting(false);
                    return;
                }
                const result = await createUser(values);
                if (result.success) {
                    toast({ title: 'Succès', description: 'L\'utilisateur a été créé.' });
                } else {
                    throw new Error(result.error);
                }
            }
            setIsDialogOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            let errorMessage = "Une erreur inconnue est survenue.";
            if (typeof error.message === 'string') {
                if (error.message.includes('auth/email-already-in-use') || error.message.includes('auth/email-already-exists')) {
                    errorMessage = "Cette adresse e-mail est déjà utilisée par un autre compte.";
                } else if (error.message.includes('auth/weak-password')) {
                    errorMessage = "Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.";
                } else {
                    errorMessage = error.message;
                }
            }
            toast({ title: 'Erreur de création', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete || !currentUser) return;
        if (userToDelete.id === currentUser.uid) {
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
            toast({ title: "Utilisateur supprimé", description: "L'utilisateur a été supprimé de Firestore. La suppression de l'authentification doit se faire manuellement." });
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur.", variant: "destructive" });
        } finally {
            setUserToDelete(null);
        }
    };
    
    const isLoading = areUsersLoading || isCurrentUserDataLoading;

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestion des Utilisateurs</h1>
                    <p className="text-muted-foreground">Liste de tous les utilisateurs de la plateforme.</p>
                </div>
                <Card>
                    <CardHeader>
                        <div className="flex gap-4 pt-4">
                            <Skeleton className="h-10 flex-grow" />
                            <Skeleton className="h-10 w-[180px]" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (currentUserData?.role !== 'superadmin') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Accès refusé</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestion des Utilisateurs</h1>
                    <p className="text-muted-foreground">Liste de tous les utilisateurs de la plateforme.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
                    <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Nouvel Utilisateur</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingUser ? 'Modifier' : 'Créer un'} utilisateur</DialogTitle></DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="zipCode" render={({ field }) => ( <FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="city" render={({ field }) => ( <FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                <FormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rôle</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="superadmin">Super Admin</SelectItem><SelectItem value="conseiller">Conseiller</SelectItem><SelectItem value="membre">Membre</SelectItem></SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
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
                                )}/>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => handleOpenDialog(false)}>Annuler</Button>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editingUser ? 'Sauvegarder' : 'Créer'}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex gap-4 pt-4">
                        <Input placeholder="Rechercher par nom ou email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow"/>
                         <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrer par rôle" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Tous les rôles</SelectItem><SelectItem value="superadmin">Super Admin</SelectItem><SelectItem value="conseiller">Conseiller</SelectItem><SelectItem value="membre">Membre</SelectItem></SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Date d'inscription</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? ( [...Array(5)].map((_, i) => ( <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
                            ) : filteredUsers.length > 0 ? ( filteredUsers.map((user) => (
                               <TableRow key={user.id}>
                                   <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                                   <TableCell>{user.email}</TableCell>
                                   <TableCell><Badge variant={roleVariant[user.role] || 'secondary'}>{roleText[user.role] || user.role}</Badge></TableCell>
                                   <TableCell>{user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : 'N/A'}</TableCell>
                                   <TableCell className="text-right">
                                       <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(user)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(user)} disabled={user.id === currentUser?.uid || user.role === 'superadmin'}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                   </TableCell>
                               </TableRow>
                           ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Aucun utilisateur trouvé.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action supprimera l'utilisateur <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> de Firestore. La suppression du compte d'authentification doit être effectuée manuellement. Cette action est irréversible.</AlertDialogDescription>
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
