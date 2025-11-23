'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
import { PlusCircle, Edit, Trash2, Loader2, Newspaper, Upload, MoreHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Types
type BlogCategory = {
  id: string;
  name: string;
};

type Article = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  authorId: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  createdAt: any;
};

// Schemas
const articleSchema = z.object({
  title: z.string().min(3, "Le titre doit comporter au moins 3 caractères."),
  content: z.string().min(50, "Le contenu doit comporter au moins 50 caractères."),
  imageUrl: z.string().url().optional().nullable(),
  categoryId: z.string({ required_error: "Veuillez sélectionner une catégorie." }),
});

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


export default function CounselorBlogPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

    const categoriesQuery = useMemoFirebase(() => collection(firestore, 'blog_categories'), [firestore]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<BlogCategory>(categoriesQuery);

    const articlesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'articles'), where('authorId', '==', user.uid));
    }, [firestore, user]);
    const { data: userArticles, isLoading: areArticlesLoading } = useCollection<Article>(articlesQuery);
    
    const articleForm = useForm<ArticleFormData>({
        resolver: zodResolver(articleSchema),
    });
    
    useEffect(() => {
        if (isSheetOpen) {
            if (editingArticle) {
                articleForm.reset({
                    title: editingArticle.title,
                    content: editingArticle.content,
                    imageUrl: editingArticle.imageUrl,
                    categoryId: editingArticle.categoryId,
                });
                setImagePreview(editingArticle.imageUrl || null);
            } else {
                articleForm.reset({ title: '', content: '', imageUrl: null, categoryId: '' });
                setImagePreview(null);
            }
        }
    }, [isSheetOpen, editingArticle, articleForm]);

    const articlesWithCategory = useMemo(() => {
        if (!userArticles || !categories) return [];
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        return userArticles.map(article => ({
            ...article,
            categoryName: categoryMap.get(article.categoryId) || 'Non classé',
        }));
    }, [userArticles, categories]);

    const handleNewArticle = () => {
        setEditingArticle(null);
        setIsSheetOpen(true);
    };

    const handleEditArticle = (article: Article) => {
        setEditingArticle(article);
        setIsSheetOpen(true);
    };

    const handleArticleSubmit = async (data: ArticleFormData) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            if (editingArticle) {
                 const articleRef = doc(firestore, 'articles', editingArticle.id);
                 await setDocumentNonBlocking(articleRef, data, { merge: true });
                 toast({ title: 'Article modifié', description: 'Vos modifications ont été enregistrées.' });
            } else {
                const articleData = {
                    ...data,
                    authorId: user.uid,
                    authorName: user.displayName || `${user.email}`,
                    authorPhotoUrl: user.photoURL || null,
                    status: 'draft' as const,
                    createdAt: serverTimestamp(),
                };
                await addDocumentNonBlocking(collection(firestore, 'articles'), articleData);
                toast({ title: 'Article créé', description: "Votre article a été enregistré comme brouillon." });
            }
            setIsSheetOpen(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
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

    const handleSubmitForReview = async (articleId: string) => {
        const articleRef = doc(firestore, 'articles', articleId);
        try {
            await updateDoc(articleRef, { status: 'pending' });
            toast({ title: 'Soumis pour relecture', description: "Votre article a été envoyé pour approbation."});
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de soumettre l\'article.', variant: 'destructive'});
        }
    };

    const handleDeleteArticle = async () => {
        if (!articleToDelete) return;
        const articleRef = doc(firestore, 'articles', articleToDelete.id);
        try {
            await deleteDocumentNonBlocking(articleRef);
            toast({ title: 'Article supprimé' });
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de supprimer l\'article.', variant: 'destructive'});
        } finally {
            setArticleToDelete(null);
        }
    };

    const isLoading = isUserLoading || areArticlesLoading;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Mes Articles de Blog</h1>
                    <p className="text-muted-foreground">Rédigez, gérez et soumettez vos articles pour publication.</p>
                </div>
                <Button onClick={handleNewArticle}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouvel Article
                </Button>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>Mes Articles</CardTitle>
                    <CardDescription>Liste de tous vos articles de blog.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Titre</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                            ) : articlesWithCategory.length > 0 ? (
                                articlesWithCategory.map(article => (
                                    <TableRow key={article.id}>
                                        <TableCell className="font-medium">{article.title}</TableCell>
                                        <TableCell>{article.categoryName}</TableCell>
                                        <TableCell><Badge variant={statusVariant[article.status]}>{statusText[article.status]}</Badge></TableCell>
                                        <TableCell className="text-right">
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEditArticle(article)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                                    </DropdownMenuItem>
                                                     {article.status === 'draft' && (
                                                         <DropdownMenuItem onClick={() => handleSubmitForReview(article.id)}>
                                                            Soumettre pour relecture
                                                        </DropdownMenuItem>
                                                     )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setArticleToDelete(article)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                               <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center">
                                        <Newspaper className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-4 text-lg font-semibold">Aucun article</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">Cliquez sur "Nouvel Article" pour commencer à écrire.</p>
                                    </TableCell>
                               </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-3xl w-full">
                    <Form {...articleForm}>
                        <form onSubmit={articleForm.handleSubmit(handleArticleSubmit)} className="flex flex-col h-full">
                            <SheetHeader>
                                <SheetTitle>{editingArticle ? "Modifier l'article" : "Créer un nouvel article"}</SheetTitle>
                                <SheetDescription>{editingArticle ? "Modifiez les détails de l'article ci-dessous." : "Rédigez votre article. Il sera enregistré comme brouillon."}</SheetDescription>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto pr-6 py-4 space-y-6">
                                <FormField control={articleForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre de l'article</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={articleForm.control} name="categoryId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Catégorie</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                                        <input type="file" id="counselor-article-image" onChange={handleImageUpload} className="hidden" accept="image/*" />
                                        <div className="flex flex-col gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('counselor-article-image')?.click()}><Upload className="mr-2 h-4 w-4" /> Uploader</Button>
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
                                    {editingArticle ? "Enregistrer les modifications" : "Enregistrer le brouillon"}
                                </Button>
                            </SheetFooter>
                        </form>
                    </Form>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible. L'article "{articleToDelete?.title}" sera définitivement supprimé.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteArticle} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
