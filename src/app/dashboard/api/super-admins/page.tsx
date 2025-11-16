
'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Loader2, Trash2 } from 'lucide-react';
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
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

export default function SuperAdminsPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SuperAdmin | null>(null);

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

  const onSubmit = async (values: z.infer<typeof superAdminFormSchema>) => {
    setIsSubmitting(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Create user document in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDocumentNonBlocking(userDocRef, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: 'superadmin',
        dateJoined: new Date().toISOString(),
      }, {});

      toast({ title: 'Succès', description: 'Le Super Admin a été créé avec succès.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error creating super admin:", error);
      let errorMessage = "Une erreur est survenue.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Cette adresse e-mail est déjà utilisée.";
      }
      toast({ title: 'Erreur', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      const userDocRef = doc(firestore, "users", userToDelete.id);
      await deleteDocumentNonBlocking(userDocRef);
      // Note: Deleting from Firebase Auth should be done via a backend function for security.
      // This client-side action only removes the Firestore document.
      toast({ title: "Utilisateur supprimé", description: "Le Super Admin a été supprimé de Firestore." });
    } catch (error) {
      console.error("Error deleting super admin:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur.", variant: "destructive" });
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Gestion des Super Admins</h1>
          <p className="text-muted-foreground">Créez et gérez les administrateurs de la plateforme.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau Super Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un Super Admin</DialogTitle>
              <DialogDescription>
                Cet utilisateur aura un accès complet à toutes les fonctionnalités de la plateforme.
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
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="super.admin@vapps.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Mot de passe</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer l'utilisateur
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
                      <Button variant="ghost" size="icon" onClick={() => setUserToDelete(admin)}>
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
              Cette action supprimera l'utilisateur <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>. Cette action est irréversible.
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
