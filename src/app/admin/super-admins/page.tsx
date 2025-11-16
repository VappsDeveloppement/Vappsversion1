
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Loader2, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type SuperAdmin = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'superadmin';
  dateJoined: string;
};

const superAdminFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").optional().or(z.literal('')),
});

export default function SuperAdminsPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SuperAdmin | null>(null);
  const [editingUser, setEditingUser] = useState<SuperAdmin | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const superAdminsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'users'), where('role', '==', 'superadmin'));
  }, [firestore]);

  const { data: superAdmins, isLoading } = useCollection<SuperAdmin>(superAdminsQuery);

  const form = useForm<z.infer<typeof superAdminFormSchema>>({
    resolver: zodResolver(superAdminFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isDialogOpen && editingUser) {
      form.reset({
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        password: "",
      });
    } else if (isDialogOpen && !editingUser) {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
      });
    }
  }, [isDialogOpen, editingUser, form]);


  const onSubmit = async (values: z.infer<typeof superAdminFormSchema>) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Logic for updating an existing super admin
        const userDocRef = doc(firestore, 'users', editingUser.id);
        await setDocumentNonBlocking(userDocRef, {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            role: 'superadmin',
        }, { merge: true });
        
        if (values.password) {
            toast({ title: 'Mise à jour du mot de passe', description: "La fonctionnalité de mise à jour du mot de passe d'un autre utilisateur nécessite une configuration côté serveur (Admin SDK) qui n'est pas implémentée ici." });
        }
        toast({ title: 'Succès', description: 'Le Super Admin a été mis à jour.' });
        
      } else {
        // Logic for creating a new super admin
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
            role: 'superadmin', // Correctly assign the 'superadmin' role here.
            dateJoined: new Date().toISOString(),
        }, {});
        toast({ title: 'Succès', description: 'Le Super Admin a été créé avec succès.' });
      }
      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error("Error saving super admin:", error);
      let errorMessage = "Une erreur est survenue.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Cette adresse e-mail est déjà utilisée.";
      }
      toast({ title: 'Erreur', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (user: SuperAdmin) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      const userDocRef = doc(firestore, "users", userToDelete.id);
      await deleteDocumentNonBlocking(userDocRef);
      toast({ title: "Utilisateur supprimé", description: "Le Super Admin a été supprimé de Firestore. La suppression de l'authentification doit se faire manuellement." });
    } catch (error) {
      console.error("Error deleting super admin:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur.", variant: "destructive" });
    } finally {
      setUserToDelete(null);
    }
  };
  
  const handleOpenDialog = (open: boolean) => {
      setIsDialogOpen(open);
      if (!open) {
          setEditingUser(null);
      }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Gestion des Super Admins</h1>
          <p className="text-muted-foreground">Créez et gérez les administrateurs de la plateforme.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau Super Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Modifier le" : "Créer un"} Super Admin</DialogTitle>
              <DialogDescription>
                 {editingUser ? "Modifiez les informations ci-dessous." : "Cet utilisateur aura un accès complet à toutes les fonctionnalités de la plateforme."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input 
                                type="email" 
                                placeholder="super.admin@vapps.com" 
                                {...field} 
                                disabled={!!editingUser}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mot de passe {editingUser ? '(Laisser vide pour ne pas changer)' : ''}</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input type={showPassword ? "text" : "password"} {...field} />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingUser ? "Sauvegarder" : "Créer l'utilisateur"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des Super Admins</CardTitle>
          <CardDescription>Utilisateurs avec les droits les plus élevés sur la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : superAdmins && superAdmins.length > 0 ? (
                superAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.firstName} {admin.lastName}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{new Date(admin.dateJoined).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(admin)} disabled={admin.id === currentUser?.uid}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setUserToDelete(admin)} disabled={admin.id === currentUser?.uid}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Aucun Super Admin trouvé.
                  </TableCell>
                </TableRow>
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
