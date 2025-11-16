
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
import { Textarea } from "@/components/ui/textarea";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'superadmin' | 'membre'; // Global role
  dateJoined: string;
  phone?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  socialSecurityNumber?: string;
  franceTravailId?: string;
  message?: string;
};

type Membership = {
    id: string;
    userId: string;
    agencyId: string;
    role: 'admin' | 'dpo' | 'conseiller' | 'membre' | 'moderateur';
}

const baseUserSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().min(1, "Le téléphone est requis."),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(['admin', 'dpo', 'conseiller', 'moderateur', 'membre'], { required_error: "Le rôle dans l'agence est requis." }),
  password: z.string().optional(),
}).refine(data => {
    if (!data.id && (!data.password || data.password.length < 6)) {
        return false;
    }
    return true;
}, {
    message: "Un mot de passe de 6 caractères minimum est requis pour un nouvel utilisateur.",
    path: ["password"],
});


export default function UsersPage() {
  const { agency, isLoading: isAgencyLoading } = useAgency();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: firebaseAuthUser, isUserLoading: isAuthLoading } = useFirebaseUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(User & { membership?: Membership }) | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const membershipsQuery = useMemoFirebase(() => {
    if (!agency) return null;
    return query(collection(firestore, 'memberships'), where('agencyId', '==', agency.id));
  }, [agency, firestore]);

  const { data: memberships, isLoading: areMembershipsLoading } = useCollection<Membership>(membershipsQuery);

  const agencyUserIds = useMemo(() => memberships?.map(m => m.userId) || [], [memberships]);

  const usersQuery = useMemoFirebase(() => {
    if (agencyUserIds.length === 0) return null;
    return query(collection(firestore, 'users'), where('id', 'in', agencyUserIds.slice(0, 30)));
  }, [agencyUserIds]);

  const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  const isLoading = isAgencyLoading || isAuthLoading || areMembershipsLoading || areUsersLoading;

  const usersWithRoles = useMemo(() => {
    if (!users || !memberships) return [];
    return users.map(user => {
        const membership = memberships.find(m => m.userId === user.id);
        return { ...user, membership };
    }).filter(user => {
        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return (
            user.firstName.toLowerCase().includes(lowerSearch) ||
            user.lastName.toLowerCase().includes(lowerSearch) ||
            user.email.toLowerCase().includes(lowerSearch)
        );
    });
  }, [users, memberships, searchTerm]);
  
  const form = useForm<z.infer<typeof baseUserSchema>>({
    resolver: zodResolver(baseUserSchema),
    defaultValues: {
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        zipCode: '',
        city: '',
        role: 'membre',
        password: '',
    }
  });

  const handleEdit = (user: User & { membership?: Membership }) => {
    setEditingUser(user);
    form.reset({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        zipCode: user.zipCode || '',
        city: user.city || '',
        role: user.membership?.role || 'membre',
        password: '',
    });
    setIsFormOpen(true);
  };
  
  const handleOpenDialog = (open: boolean) => {
    setIsFormOpen(open);
    if(!open) {
      setEditingUser(null);
      form.reset();
    }
  }

  const handleNew = () => {
    setEditingUser(null);
    form.reset({
      id: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      zipCode: '',
      city: '',
      role: 'membre',
      password: '',
    });
    setIsFormOpen(true);
  };
  
  const onSubmit = async (values: z.infer<typeof baseUserSchema>) => {
    if (!agency) return;
    setIsSubmitting(true);

    try {
        let userId = editingUser?.id;

        if (editingUser) { // Updating
            const userDocRef = doc(firestore, "users", userId!);
            await setDocumentNonBlocking(userDocRef, {
                firstName: values.firstName,
                lastName: values.lastName,
                phone: values.phone,
                address: values.address,
                zipCode: values.zipCode,
                city: values.city,
            }, { merge: true });

        } else { // Creating
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password!);
            userId = userCredential.user.uid;

            const userDocRef = doc(firestore, "users", userId);
            await setDocumentNonBlocking(userDocRef, {
                id: userId,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                phone: values.phone,
                address: values.address,
                zipCode: values.zipCode,
                city: values.city,
                role: 'membre', // Global role is always 'membre'
                dateJoined: new Date().toISOString(),
            }, {});
        }

        const membershipRef = doc(firestore, 'memberships', `${userId}_${agency.id}`);
        await setDocumentNonBlocking(membershipRef, {
            userId,
            agencyId: agency.id,
            role: values.role,
        }, { merge: true });

        toast({ title: "Succès", description: `Utilisateur ${editingUser ? 'modifié' : 'créé'} avec succès.` });
        setIsFormOpen(false);

    } catch (error: any) {
        console.error("Error saving user:", error);
        const message = error.code === 'auth/email-already-in-use' ? "Cet email est déjà utilisé." : "Une erreur est survenue lors de la sauvegarde.";
        toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDeleteConfirm = async () => {
    if (!userToDelete || !agency) return;
    try {
        const membershipToDelete = memberships?.find(m => m.userId === userToDelete.id);
        if (membershipToDelete) {
            const membershipRef = doc(firestore, 'memberships', membershipToDelete.id);
            await deleteDocumentNonBlocking(membershipRef);
        }
        
        const allMembershipsQuery = query(collection(firestore, 'memberships'), where('userId', '==', userToDelete.id));
        const allMembershipsSnap = await getDocs(allMembershipsQuery);
        
        if (allMembershipsSnap.size <= 1) { 
            const userRef = doc(firestore, 'users', userToDelete.id);
            await deleteDocumentNonBlocking(userRef);
            toast({ title: "Utilisateur supprimé", description: "L'utilisateur et son adhésion à l'agence ont été supprimés." });
        } else {
            toast({ title: "Adhésion supprimée", description: "L'utilisateur a été retiré de votre agence." });
        }
        
    } catch (error) {
        console.error("Error deleting user membership:", error);
        toast({ title: "Erreur", description: "Impossible de supprimer l'adhésion de l'utilisateur.", variant: "destructive" });
    } finally {
        setUserToDelete(null);
    }
  };

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
          <div className="flex justify-between items-center pt-4">
              <Input 
                placeholder="Rechercher par nom ou email..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="max-w-sm" 
              />
              <Dialog open={isFormOpen} onOpenChange={handleOpenDialog}>
                  <DialogTrigger asChild>
                      <Button onClick={handleNew}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un utilisateur
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingUser ? "Modifier l'utilisateur" : "Créer un nouvel utilisateur"}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-2">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={!!editingUser} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Adresse</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="zipCode" render={({ field }) => ( <FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="city" render={({ field }) => ( <FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Rôle dans l'agence</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="dpo">DPO</SelectItem><SelectItem value="conseiller">Conseiller</SelectItem><SelectItem value="moderateur">Modérateur</SelectItem><SelectItem value="membre">Membre</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mot de passe {editingUser ? '(Laisser vide pour ne pas changer)' : ''}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input type={showPassword ? 'text' : 'password'} {...field} />
                                  <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => handleOpenDialog(false)}>Annuler</Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingUser ? 'Sauvegarder les modifications' : "Créer l'utilisateur"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
              </Dialog>
          </div>
        </CardHeader>
        <CardContent>
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
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : usersWithRoles.length > 0 ? (
                usersWithRoles.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.membership && <Badge>{user.membership.role}</Badge>}</TableCell>
                    <TableCell>{user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Aucun utilisateur trouvé pour cette agence.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action supprimera l'utilisateur de cette agence. S'il n'est rattaché à aucune autre agence, son compte entier sera supprimé. Cette action est irréversible.
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
