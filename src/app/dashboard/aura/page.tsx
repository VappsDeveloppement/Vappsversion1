
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ShoppingBag, Beaker, ClipboardList, PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";


const categorySchema = z.object({
  name: z.string().min(1, "Le nom de la catégorie est requis."),
});

type CategoryFormData = z.infer<typeof categorySchema>;

type ProductCategory = {
    id: string;
    counselorId: string;
    name: string;
};

function ProductCategoryManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

    const categoriesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'product_categories'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: categories, isLoading } = useCollection<ProductCategory>(categoriesQuery);
    
    const form = useForm<CategoryFormData>({ resolver: zodResolver(categorySchema) });

    useEffect(() => {
        if (isSheetOpen) {
            form.reset(editingCategory || { name: '' });
        }
    }, [isSheetOpen, editingCategory, form]);
    
    const handleNew = () => {
        setEditingCategory(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (category: ProductCategory) => {
        setEditingCategory(category);
        setIsSheetOpen(true);
    };
    
    const onSubmit = (data: CategoryFormData) => {
        if (!user) return;
        const categoryData = { counselorId: user.uid, ...data };
        if (editingCategory) {
            setDocumentNonBlocking(doc(firestore, 'product_categories', editingCategory.id), categoryData, { merge: true });
            toast({ title: 'Catégorie mise à jour' });
        } else {
            addDocumentNonBlocking(collection(firestore, 'product_categories'), categoryData);
            toast({ title: 'Catégorie créée' });
        }
        setIsSheetOpen(false);
    };

    const handleDelete = () => {
        if (!categoryToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'product_categories', categoryToDelete.id));
        toast({ title: 'Catégorie supprimée' });
        setCategoryToDelete(null);
    };


    return (
         <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Catégories de Produits</CardTitle>
                        <CardDescription>Organisez vos produits en différentes catégories.</CardDescription>
                    </div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" />Nouvelle Catégorie</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Nom de la catégorie</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            : categories && categories.length > 0 ? (
                                categories.map(cat => (
                                    <TableRow key={cat.id}>
                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setCategoryToDelete(cat)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={2} className="h-24 text-center">Aucune catégorie créée.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-lg w-full">
                        <SheetHeader>
                            <SheetTitle>{editingCategory ? 'Modifier la' : 'Nouvelle'} catégorie</SheetTitle>
                        </SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <SheetFooter className="pt-6">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit">Sauvegarder</Button>
                                </SheetFooter>
                            </form>
                        </Form>
                    </SheetContent>
                </Sheet>
                 <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}


export default function AuraPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Aura</h1>
                <p className="text-muted-foreground">Votre outil de création de contenu par IA.</p>
            </div>

            <Tabs defaultValue="fiche-bien-etre" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="fiche-bien-etre">
                        <FileText className="mr-2 h-4 w-4" />
                        Fiche bien-être
                    </TabsTrigger>
                    <TabsTrigger value="catalogue-produits">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Catalogue Produits
                    </TabsTrigger>
                    <TabsTrigger value="protocoles">
                        <Beaker className="mr-2 h-4 w-4" />
                        Protocoles
                    </TabsTrigger>
                    <TabsTrigger value="test">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Test
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="fiche-bien-etre">
                    <Card>
                        <CardHeader>
                            <CardTitle>Générateur de Fiche Bien-être</CardTitle>
                            <CardDescription>Créez des fiches de bien-être personnalisées pour vos clients.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Contenu à venir</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">L'outil de génération de fiches bien-être sera bientôt disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="catalogue-produits">
                   <ProductCategoryManager />
                </TabsContent>

                <TabsContent value="protocoles">
                    <Card>
                        <CardHeader>
                            <CardTitle>Générateur de Protocoles</CardTitle>
                            <CardDescription>Élaborez des protocoles de soin ou d'accompagnement sur mesure.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <Beaker className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Contenu à venir</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">L'outil de génération de protocoles sera bientôt disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="test">
                    <Card>
                        <CardHeader>
                            <CardTitle>Zone de Test</CardTitle>
                            <CardDescription>Utilisez cet espace pour expérimenter librement avec les fonctionnalités d'Aura.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Contenu à venir</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">La zone de test pour Aura sera bientôt disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
