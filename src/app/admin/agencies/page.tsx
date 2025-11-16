
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Agency = {
    id: string;
    name: string;
    personalization: any;
};

const agencyFormSchema = z.object({
  name: z.string().min(1, "Le nom de l'agence est requis."),
});

type AgencyFormData = z.infer<typeof agencyFormSchema>;


export default function AgencyManagementPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
    const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
    

    const agenciesQuery = useMemoFirebase(() => query(collection(firestore, 'agencies')), [firestore]);
    const { data: agencies, isLoading } = useCollection<Agency>(agenciesQuery);

    const form = useForm<AgencyFormData>({
        resolver: zodResolver(agencyFormSchema),
        defaultValues: { name: '' },
    });

    const handleNew = () => {
        setEditingAgency(null);
        form.reset({ name: '' });
        setIsDialogOpen(true);
    };

    const handleEdit = (agency: Agency) => {
        setEditingAgency(agency);
        form.reset({ name: agency.name });
        setIsDialogOpen(true);
    };
    
    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setEditingAgency(null);
        }
    }
    
    const onSubmit = async (values: AgencyFormData) => {
        setIsSubmitting(true);
        try {
            if (editingAgency) {
                const agencyRef = doc(firestore, 'agencies', editingAgency.id);
                await setDocumentNonBlocking(agencyRef, { name: values.name }, { merge: true });
                toast({ title: 'Agence modifiée', description: `L'agence "${values.name}" a été mise à jour.` });
            } else {
                 const newAgencyRef = doc(collection(firestore, 'agencies'));
                // Note: The default personalization will be applied by the AgencyProvider logic
                // when this new agency is accessed. We only need to create it with a name.
                await setDocumentNonBlocking(newAgencyRef, { id: newAgencyRef.id, name: values.name, personalization: {} });
                toast({ title: 'Agence créée', description: `L'agence "${values.name}" a été créée avec succès.` });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving agency:", error);
            toast({ title: 'Erreur', description: "Impossible de sauvegarder l'agence.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteConfirm = async () => {
        if (!agencyToDelete) return;
        try {
            const agencyRef = doc(firestore, 'agencies', agencyToDelete.id);
            await deleteDocumentNonBlocking(agencyRef);
            toast({ title: 'Agence supprimée', description: `L'agence "${agencyToDelete.name}" a été supprimée.` });
        } catch (error) {
            console.error("Error deleting agency:", error);
            toast({ title: 'Erreur', description: "Impossible de supprimer l'agence.", variant: 'destructive' });
        } finally {
            setAgencyToDelete(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestion des Agences</h1>
                    <p className="text-muted-foreground">Créez, modifiez et gérez les agences de la plateforme.</p>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button onClick={handleNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nouvelle Agence
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingAgency ? 'Modifier' : 'Créer'} une agence</DialogTitle>
                            <DialogDescription>
                                {editingAgency ? `Modification de l'agence "${editingAgency.name}".` : "Entrez le nom de la nouvelle agence."}
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nom de l'agence</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Agence de Paris" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingAgency ? 'Sauvegarder' : 'Créer'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Liste des Agences</CardTitle>
                    <CardDescription>Vue d'ensemble de toutes les agences enregistrées.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : agencies && agencies.length > 0 ? (
                                agencies.map(agency => (
                                    <TableRow key={agency.id}>
                                        <TableCell className="font-medium">{agency.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{agency.id}</TableCell>
                                        <TableCell className="text-right">
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(agency)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Modifier
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setAgencyToDelete(agency)}
                                                        disabled={agency.id === 'vapps-agency'}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">Aucune agence trouvée.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!agencyToDelete} onOpenChange={(open) => !open && setAgencyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action supprimera l'agence <strong>{agencyToDelete?.name}</strong> et toutes ses données associées (utilisateurs, devis, etc.). Cette action est irréversible.
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
