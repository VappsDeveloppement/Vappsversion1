
'use client';

import React, { useState, useEffect } from 'react';
import { useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Edit, Trash2, Loader2, Newspaper } from 'lucide-react';

type BlogCategory = {
  id: string;
  name: string;
};

const categorySchema = z.object({
  name: z.string().min(1, 'Le nom de la catégorie est requis.'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

function CategoryManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<BlogCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoriesQuery = useMemoFirebase(() => collection(firestore, 'blog_categories'), [firestore]);
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<BlogCategory>(categoriesQuery);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (isCategoryDialogOpen) {
      if (editingCategory) {
        form.reset({ name: editingCategory.name });
      } else {
        form.reset({ name: '' });
      }
    }
  }, [editingCategory, isCategoryDialogOpen, form]);

  const handleOpenCategoryDialog = (category: BlogCategory | null = null) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const categoryRef = doc(firestore, 'blog_categories', editingCategory.id);
        await setDocumentNonBlocking(categoryRef, data, { merge: true });
        toast({ title: 'Catégorie modifiée', description: `La catégorie "${data.name}" a été mise à jour.` });
      } else {
        await addDocumentNonBlocking(collection(firestore, 'blog_categories'), data);
        toast({ title: 'Catégorie créée', description: `La catégorie "${data.name}" a été ajoutée.` });
      }
      setIsCategoryDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const categoryRef = doc(firestore, 'blog_categories', categoryToDelete.id);
      await deleteDocumentNonBlocking(categoryRef);
      toast({ title: 'Catégorie supprimée', description: `La catégorie "${categoryToDelete.name}" a été supprimée.` });
    } catch (error) {
       toast({ title: 'Erreur', description: 'Impossible de supprimer la catégorie.', variant: 'destructive' });
    } finally {
        setCategoryToDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Gestion des Catégories</CardTitle>
                <CardDescription>Ajoutez, modifiez ou supprimez des catégories pour les articles de blog.</CardDescription>
            </div>
            <Button onClick={() => handleOpenCategoryDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Catégorie
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nom de la catégorie</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {areCategoriesLoading ? (
                    [...Array(3)].map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={2}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ))
                ) : categories && categories.length > 0 ? (
                    categories.map(category => (
                        <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenCategoryDialog(category)}><Edit className="mr-2 h-4 w-4" /> Modifier</Button>
                                <Button variant="destructive" size="sm" onClick={() => setCategoryToDelete(category)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center">Aucune catégorie trouvée.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </CardContent>

      {/* Dialog for Creating/Editing Category */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Modifier la' : 'Nouvelle'} catégorie</DialogTitle>
                  <DialogDescription>Entrez le nom de la catégorie.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCategorySubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom</FormLabel>
                                    <FormControl><Input {...field} placeholder="Ex: Développement Personnel" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingCategory ? 'Sauvegarder' : 'Créer'}
                            </Button>
                        </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      
      {/* Alert Dialog for Deleting Category */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible et supprimera la catégorie "{categoryToDelete?.name}". Les articles associés ne seront pas supprimés mais devront être réassignés à une autre catégorie.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}


export default function AdminBlogManagementPage() {

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Gestion du Blog</h1>
                <p className="text-muted-foreground">Gérez les catégories et modérez les articles soumis par les conseillers.</p>
            </div>
            
            <CategoryManager />

            <Card>
                <CardHeader>
                    <CardTitle>Modération des Articles</CardTitle>
                    <CardDescription>Consultez, approuvez ou rejetez les articles en attente de publication.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center">
                        <Newspaper className="h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun article en attente</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Les articles soumis par les conseillers apparaîtront ici pour modération.</p>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
