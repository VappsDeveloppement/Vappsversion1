

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ShoppingBag, Beaker, ClipboardList, PlusCircle, Edit, Trash2, Loader2, Image as ImageIcon, X, Star, Search } from "lucide-react";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, useWatch, Control, UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});


// Product Management Section

const productVersionSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Le nom de la version est requis."),
    imageUrl: z.string().nullable().optional(),
    price: z.coerce.number().min(0, "Le prix doit être positif ou nul.").optional(),
    characteristics: z.array(z.object({ text: z.string() })).optional(),
});
type ProductVersionFormData = z.infer<typeof productVersionSchema>;

const productSchema = z.object({
  title: z.string().min(1, "Le titre du produit est requis."),
  description: z.string().optional(),
  isFeatured: z.boolean().default(false),
  versions: z.array(productVersionSchema).min(1, "Un produit doit avoir au moins une version."),
  contraindications: z.array(z.string()).optional(),
  holisticProfile: z.array(z.string()).optional(),
  pathologies: z.array(z.string()).optional(),
  ctaLink: z.string().url('URL invalide').optional().or(z.literal('')),
});
type ProductFormData = z.infer<typeof productSchema>;

export type Product = {
    id: string;
    counselorId: string;
    title: string;
    description?: string;
    isFeatured?: boolean;
    versions: ProductVersionFormData[];
    contraindications?: string[];
    holisticProfile?: string[];
    pathologies?: string[];
    ctaLink?: string;
}
const TagInput = ({ value, onChange, placeholder }: { value: string[] | undefined; onChange: (value: string[]) => void, placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');
    const currentValues = value || [];
    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!currentValues.includes(inputValue.trim())) {
                onChange([...currentValues, inputValue.trim()]);
            }
            setInputValue('');
        }
    };
    const removeTag = (tagToRemove: string) => onChange(currentValues.filter(tag => tag !== tagToRemove));
    return (
        <div className="border p-2 rounded-md">
            <div className="flex flex-wrap gap-1 mb-2">
                {currentValues.map(tag => (
                    <Badge key={tag} variant="secondary">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={addTag} placeholder={placeholder} className="border-none shadow-none focus-visible:ring-0 h-8" />
        </div>
    );
};

const ProductVersionCard = ({ control, index, removeVersion, setValue }: { control: Control<ProductFormData>, index: number, removeVersion: (index: number) => void, setValue: UseFormSetValue<ProductFormData> }) => {
    const { fields: charFields, append: appendChar, remove: removeChar } = useFieldArray({
        control,
        name: `versions.${index}.characteristics`,
    });
    
    const imageUrl = useWatch({ control, name: `versions.${index}.imageUrl` });

    const handleVersionImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            setValue(`versions.${index}.imageUrl`, base64);
        }
    };


    return (
        <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h5 className="font-semibold">Version {index + 1}</h5>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeVersion(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
            <div className="space-y-4">
                <FormField control={control} name={`versions.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={control} name={`versions.${index}.price`} render={({ field }) => (<FormItem><FormLabel>Prix (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div>
                    <Label>Image</Label>
                    <div className="flex items-center gap-4 mt-2">
                        <Image src={imageUrl || '/placeholder.svg'} alt="Aperçu" width={80} height={80} className="rounded-md object-cover border" />
                        <input type="file" id={`v-img-${index}`} onChange={handleVersionImageUpload} className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`v-img-${index}`)?.click()}>Uploader</Button>
                    </div>
                </div>
                <div>
                    <Label>Caractéristiques</Label>
                    <div className="space-y-2 mt-2">
                        {charFields.map((char, cIndex) => (
                            <div key={char.id} className="flex items-center gap-2">
                                <FormField control={control} name={`versions.${index}.characteristics.${cIndex}.text`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <Button type="button" size="icon" variant="ghost" onClick={() => removeChar(cIndex)}><X className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendChar({ text: '' })} className="mt-2 text-xs">Ajouter</Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

function ProductManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const productsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'products'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (!searchTerm) return products;
        const lowercasedTerm = searchTerm.toLowerCase();
        return products.filter(product => product.title.toLowerCase().includes(lowercasedTerm));
    }, [products, searchTerm]);

    const form = useForm<ProductFormData>({ resolver: zodResolver(productSchema) });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "versions" });

    useEffect(() => {
        if (isSheetOpen) {
            if (editingProduct) {
                form.reset({
                    ...editingProduct,
                    ctaLink: editingProduct.ctaLink || '',
                    description: editingProduct.description || '',
                    contraindications: editingProduct.contraindications || [],
                    holisticProfile: editingProduct.holisticProfile || [],
                    pathologies: editingProduct.pathologies || [],
                    versions: editingProduct.versions.map(v => ({ ...v, characteristics: (v.characteristics || []).map(c => ({ text: c as unknown as string })) }))
                });
            } else {
                form.reset({ title: '', description: '', isFeatured: false, versions: [{ id: `v-${Date.now()}`, name: 'Version par défaut', price: 0, imageUrl: null, characteristics: [] }], contraindications: [], holisticProfile: [], pathologies: [], ctaLink: '' });
            }
        }
    }, [isSheetOpen, editingProduct, form]);

    const handleNew = () => { setEditingProduct(null); setIsSheetOpen(true); };
    const handleEdit = (product: Product) => { setEditingProduct(product); setIsSheetOpen(true); };
    
    const onSubmit = (data: ProductFormData) => {
        if (!user) return;
        const productData = {
            ...data,
            counselorId: user.uid,
            versions: data.versions.map(v => ({ ...v, characteristics: v.characteristics?.map(c => c.text) })),
            contraindications: data.contraindications || [],
            holisticProfile: data.holisticProfile || [],
            pathologies: data.pathologies || [],
        };

        if (editingProduct) {
            setDocumentNonBlocking(doc(firestore, 'products', editingProduct.id), productData, { merge: true });
            toast({ title: 'Produit mis à jour' });
        } else {
            addDocumentNonBlocking(collection(firestore, 'products'), productData);
            toast({ title: 'Produit créé' });
        }
        setIsSheetOpen(false);
    };

    const handleDelete = () => {
        if (!productToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'products', productToDelete.id));
        toast({ title: 'Produit supprimé' });
        setProductToDelete(null);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div><CardTitle>Gestion des Produits</CardTitle><CardDescription>Ajoutez les produits de votre catalogue.</CardDescription></div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" />Nouveau Produit</Button>
                </div>
                 <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un produit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Vedette</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {areProductsLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            : filteredProducts && filteredProducts.length > 0 ? (
                                filteredProducts.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.title}</TableCell>
                                        <TableCell>{p.isFeatured && <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />}</TableCell>
                                        <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setProductToDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                ))
                            ) : <TableRow><TableCell colSpan={3} className="h-24 text-center">Aucun produit créé.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-4xl w-full">
                        <SheetHeader><SheetTitle>{editingProduct ? 'Modifier le' : 'Nouveau'} produit</SheetTitle></SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <ScrollArea className="h-[calc(100vh-8rem)]">
                                    <div className="space-y-6 py-4 pr-6">
                                        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (publique)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="ctaLink" render={({ field }) => (<FormItem><FormLabel>Lien externe (optionnel)</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormDescription>Si rempli, le bouton "Voir le produit" pointera vers ce lien.</FormDescription><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="isFeatured" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">Mettre en vedette</FormLabel>
                                                    <FormDescription>Ce produit apparaîtra sur la page d'accueil de votre mini-site.</FormDescription>
                                                </div>
                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            </FormItem>
                                        )}/>

                                        <div className="space-y-4 pt-4 border-t">
                                            <h4 className="font-medium">Versions du produit</h4>
                                            {fields.map((version, index) => (
                                                <ProductVersionCard key={version.id} control={form.control} index={index} removeVersion={remove} setValue={form.setValue} />
                                            ))}
                                            <Button type="button" variant="outline" onClick={() => append({ id: `v-${Date.now()}`, name: '', price: 0, imageUrl: null, characteristics: [] })}><PlusCircle className="mr-2 h-4 w-4" />Ajouter une version</Button>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t"><h4 className="font-medium">Informations Internes</h4>
                                            <FormField control={form.control} name="contraindications" render={({ field }) => (<FormItem><FormLabel>Contre-indications</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..." /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="holisticProfile" render={({ field }) => (<FormItem><FormLabel>Profil Holistique</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..." /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="pathologies" render={({ field }) => (<FormItem><FormLabel>Pathologies</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..." /></FormControl></FormItem>)} />
                                        </div>
                                    </div>
                                </ScrollArea>
                                <SheetFooter className="pt-6 border-t mt-auto"><SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose><Button type="submit">Sauvegarder</Button></SheetFooter>
                            </form>
                        </Form>
                    </SheetContent>
                </Sheet>
                <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer "{productToDelete?.title}" ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
            <Tabs defaultValue="catalogue-produits" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="fiche-bien-etre"><FileText className="mr-2 h-4 w-4" />Fiche bien-être</TabsTrigger>
                    <TabsTrigger value="catalogue-produits"><ShoppingBag className="mr-2 h-4 w-4" />Catalogue Produits</TabsTrigger>
                    <TabsTrigger value="protocoles"><Beaker className="mr-2 h-4 w-4" />Protocoles</TabsTrigger>
                    <TabsTrigger value="test"><ClipboardList className="mr-2 h-4 w-4" />Test</TabsTrigger>
                </TabsList>
                <TabsContent value="fiche-bien-etre">
                    <Card><CardHeader><CardTitle>Générateur de Fiche Bien-être</CardTitle><CardDescription>Créez des fiches de bien-être personnalisées pour vos clients.</CardDescription></CardHeader><CardContent><div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96"><FileText className="h-16 w-16 text-muted-foreground mb-4" /><h3 className="text-xl font-semibold">Contenu à venir</h3><p className="text-muted-foreground mt-2 max-w-2xl">L'outil de génération de fiches bien-être sera bientôt disponible ici.</p></div></CardContent></Card>
                </TabsContent>
                <TabsContent value="catalogue-produits">
                   <div className="space-y-8">
                       <ProductManager />
                   </div>
                </TabsContent>
                <TabsContent value="protocoles">
                    <Card><CardHeader><CardTitle>Générateur de Protocoles</CardTitle><CardDescription>Élaborez des protocoles de soin ou d'accompagnement sur mesure.</CardDescription></CardHeader><CardContent><div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96"><Beaker className="h-16 w-16 text-muted-foreground mb-4" /><h3 className="text-xl font-semibold">Contenu à venir</h3><p className="text-muted-foreground mt-2 max-w-2xl">L'outil de génération de protocoles sera bientôt disponible ici.</p></div></CardContent></Card>
                </TabsContent>
                <TabsContent value="test">
                    <Card><CardHeader><CardTitle>Zone de Test</CardTitle><CardDescription>Utilisez cet espace pour expérimenter librement avec les fonctionnalités d'Aura.</CardDescription></CardHeader><CardContent><div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96"><ClipboardList className="h-16 w-16 text-muted-foreground mb-4" /><h3 className="text-xl font-semibold">Contenu à venir</h3><p className="text-muted-foreground mt-2 max-w-2xl">La zone de test pour Aura sera bientôt disponible ici.</p></div></CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
