
'use client';

import React, { useState, useEffect } from 'react';
import { useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Edit, Trash2, Loader2, Newspaper, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

// Types
type BlogCategory = {
  id: string;
  name: string;
};

type Article = {
  id: string;
  title: string;
  authorName: string;
  categoryName: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  createdAt: any;
};

// Schemas
const categorySchema = z.object({
  name: z.string().min(1, 'Le nom de la catégorie est requis.'),
});

const articleSchema = z.object({
  title: z.string().min(3, "Le titre doit comporter au moins 3 caractères."),
  content: z.string().min(50, "Le contenu doit comporter au moins 50 caractères."),
  imageUrl: z.string().url().optional().nullable(),
  categoryId: z.string({ required_error: "Veuillez sélectionner une catégorie." }),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type ArticleFormData = z.infer<typeof articleSchema>;

const statusVariant: Record<Article['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  pending: 'outline',
  published: 'default',
  rejected: 'destructive',
};

const statusText: Record<Article['status'], string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  published: 'Publié',
  rejected: 'Rejeté',
};


const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});


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

function ArticleManager() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const categoriesQuery = useMemoFirebase(() => collection(firestore, 'blog_categories'), [firestore]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<BlogCategory>(categoriesQuery);

    const articlesQuery = useMemoFirebase(() => collection(firestore, 'articles'), [firestore]);
    const { data: articles, isLoading: areArticlesLoading } = useCollection<Article>(articlesQuery);
    
    const articleForm = useForm<ArticleFormData>({
        resolver: zodResolver(articleSchema),
    });

    const handleNewArticle = () => {
        articleForm.reset({ title: '', content: '', imageUrl: null, categoryId: '' });
        setImagePreview(null);
        setIsSheetOpen(true);
    };

    const handleArticleSubmit = async (data: ArticleFormData) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const articleData = {
                ...data,
                authorId: user.uid,
                authorName: user.displayName || `${user.email}`,
                authorPhotoUrl: user.photoURL || null,
                status: 'draft',
                createdAt: serverTimestamp(),
            };
            await addDocumentNonBlocking(collection(firestore, 'articles'), articleData);
            toast({ title: 'Article créé', description: "Votre article a été enregistré comme brouillon." });
            setIsSheetOpen(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue lors de la création de l\'article.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            setImagePreview(base64);
            articleForm.setValue('imageUrl', base64);
        }
    };

    const articlesWithCategoryNames = useMemo(() => {
        if (!articles || !categories) return [];
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        return articles.map(article => ({
            ...article,
            categoryName: categoryMap.get((article as any).categoryId) || 'Non classé',
        }));
    }, [articles, categories]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Gestion des Articles</CardTitle>
                        <CardDescription>Consultez, approuvez ou rejetez les articles en attente de publication.</CardDescription>
                    </div>
                     <Button onClick={handleNewArticle}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nouvel Article
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Titre</TableHead>
                            <TableHead>Auteur</TableHead>
                            <TableHead>Catégorie</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {areArticlesLoading ? (
                            [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                        ) : articlesWithCategoryNames.length > 0 ? (
                             articlesWithCategoryNames.map(article => (
                                <TableRow key={article.id}>
                                    <TableCell className="font-medium">{article.title}</TableCell>
                                    <TableCell>{article.authorName}</TableCell>
                                    <TableCell>{article.categoryName}</TableCell>
                                    <TableCell><Badge variant={statusVariant[article.status]}>{statusText[article.status]}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">Gérer</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                           <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <Newspaper className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-semibold">Aucun article</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">Cliquez sur "Nouvel Article" pour commencer.</p>
                                </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>

             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-3xl w-full">
                    <Form {...articleForm}>
                        <form onSubmit={articleForm.handleSubmit(handleArticleSubmit)} className="flex flex-col h-full">
                            <SheetHeader>
                                <SheetTitle>Créer un nouvel article</SheetTitle>
                                <SheetDescription>Rédigez votre article. Il sera enregistré en tant que brouillon.</SheetDescription>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto pr-6 py-4 space-y-6">
                                <FormField control={articleForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre de l'article</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={articleForm.control} name="categoryId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Catégorie</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger disabled={areCategoriesLoading}>
                                                    <SelectValue placeholder="Sélectionnez une catégorie" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div>
                                    <FormLabel>Image de couverture (optionnel)</FormLabel>
                                    <div className="flex items-center gap-4 mt-2">
                                        {imagePreview ? <Image src={imagePreview} alt="Aperçu" width={120} height={67} className="rounded-md object-cover border" /> : <div className="h-16 w-32 bg-muted rounded-md" />}
                                        <input type="file" id="article-image-upload" onChange={handleImageUpload} className="hidden" accept="image/*" />
                                        <div className="flex flex-col gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('article-image-upload')?.click()}><Upload className="mr-2 h-4 w-4" /> Uploader</Button>
                                            {imagePreview && <Button type="button" variant="destructive" size="sm" onClick={() => { setImagePreview(null); articleForm.setValue('imageUrl', null);}}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</Button>}
                                        </div>
                                    </div>
                                </div>
                                <FormField control={articleForm.control} name="content" render={({ field }) => (<FormItem><FormLabel>Contenu</FormLabel><FormControl><RichTextEditor content={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <SheetFooter className="pt-4 border-t">
                                <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Enregistrer le brouillon
                                </Button>
                            </SheetFooter>
                        </form>
                    </Form>
                </SheetContent>
            </Sheet>

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
            
            <ArticleManager />

        </div>
    )
}
