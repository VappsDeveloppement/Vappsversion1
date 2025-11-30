

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ShoppingBag, Beaker, ClipboardList, PlusCircle, Edit, Trash2, Loader2, Image as ImageIcon, X, Star, Search, UserPlus, Eye, EyeOff, User, Mail, Phone, Info, HeartPulse, BrainCircuit } from "lucide-react";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, useWatch, Control, UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, getDocs, arrayUnion } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, SheetDescription } from "@/components/ui/sheet";
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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAgency } from "@/context/agency-provider";
import { sendGdprEmail as sendEmail } from '@/app/actions/gdpr';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";


const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});


// Product Management Section

const productSchema = z.object({
  title: z.string().min(1, "Le titre du produit est requis."),
  description: z.string().optional(),
  isFeatured: z.boolean().default(false),
  imageUrl: z.string().nullable().optional(),
  price: z.coerce.number().optional(),
  characteristics: z.array(z.string()).optional(),
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
    imageUrl?: string | null;
    price?: number;
    characteristics?: string[];
    contraindications?: string[];
    holisticProfile?: string[];
    pathologies?: string[];
    ctaLink?: string;
    versions?: any[];
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

function ProductManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const productsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'products'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (!searchTerm) return products;
        const lowercasedTerm = searchTerm.toLowerCase();
        return products.filter(product => product.title.toLowerCase().includes(lowercasedTerm));
    }, [products, searchTerm]);

    const form = useForm<ProductFormData>({ 
        resolver: zodResolver(productSchema),
        defaultValues: {
            title: '',
            description: '',
            isFeatured: false,
            imageUrl: null,
            price: 0,
            characteristics: [],
            contraindications: [],
            holisticProfile: [],
            pathologies: [],
            ctaLink: '',
        }
    });

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
                    characteristics: editingProduct.characteristics || []
                });
                setImagePreview(editingProduct.imageUrl || null);
            } else {
                form.reset({ title: '', description: '', isFeatured: false, imageUrl: null, price: 0, characteristics: [], contraindications: [], holisticProfile: [], pathologies: [], ctaLink: '' });
                setImagePreview(null);
            }
        }
    }, [isSheetOpen, editingProduct, form]);

    const handleNew = () => { setEditingProduct(null); setIsSheetOpen(true); };
    const handleEdit = (product: Product) => { setEditingProduct(product); setIsSheetOpen(true); };
    
    const onSubmit = (data: ProductFormData) => {
        if (!user) return;
        const productData = {
            ...data,
            price: data.price === undefined || isNaN(data.price) ? null : data.price,
            counselorId: user.uid,
            imageUrl: imagePreview,
            characteristics: data.characteristics || [],
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
    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            setImagePreview(base64);
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div><CardTitle>Catalogue Produits</CardTitle><CardDescription>Ajoutez les produits de votre catalogue.</CardDescription></div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" />Nouveau Produit</Button>
                </div>
                 <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
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
                    <SheetContent className="sm:max-w-2xl w-full">
                        <SheetHeader><SheetTitle>{editingProduct ? 'Modifier le' : 'Nouveau'} produit</SheetTitle></SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <ScrollArea className="h-[calc(100vh-8rem)]">
                                    <div className="space-y-6 py-4 pr-6">
                                        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (publique)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="ctaLink" render={({ field }) => (<FormItem><FormLabel>Lien externe (optionnel)</FormLabel><FormControl><Input {...field} placeholder="https://..." value={field.value || ''}/></FormControl><FormDescription>Si rempli, le bouton "Voir le produit" pointera vers ce lien.</FormDescription><FormMessage /></FormItem>)} />
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
                                             <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                             <div>
                                                <Label>Image</Label>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <Image src={imagePreview || '/placeholder.svg'} alt="Aperçu" width={80} height={80} className="rounded-md object-cover border" />
                                                    <input type="file" id="product-image-upload" onChange={handleImageUpload} className="hidden" />
                                                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('product-image-upload')?.click()}>Uploader</Button>
                                                </div>
                                            </div>
                                            <FormField control={form.control} name="characteristics" render={({ field }) => (<FormItem><FormLabel>Caractéristiques</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une caractéristique..." /></FormControl></FormItem>)} />
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

const protocoleSchema = z.object({
  name: z.string().min(1, "Le nom du protocole est requis."),
  contraindications: z.array(z.string()).optional(),
  pathologies: z.array(z.string()).optional(),
  holisticProfile: z.array(z.string()).optional(),
  steps: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, "Le titre de l'étape est requis."),
    description: z.string().optional(),
    imageUrl: z.string().nullable().optional(),
  })).optional(),
});
type ProtocoleFormData = z.infer<typeof protocoleSchema>;

type Protocole = {
    id: string;
    counselorId: string;
    name: string;
    contraindications?: string[];
    pathologies?: string[];
    holisticProfile?: string[];
    steps?: { id: string; title: string; description?: string; imageUrl?: string | null; }[];
}

function ProtocoleManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingProtocole, setEditingProtocole] = useState<Protocole | null>(null);
    const [protocoleToDelete, setProtocoleToDelete] = useState<Protocole | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const protocolesQuery = useMemoFirebase(() => user ? query(collection(firestore, 'protocols'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: protocoles, isLoading: areProtocolesLoading } = useCollection<Protocole>(protocolesQuery);

    const filteredProtocoles = useMemo(() => {
        if (!protocoles) return [];
        if (!searchTerm) return protocoles;
        const lowercasedTerm = searchTerm.toLowerCase();
        return protocoles.filter(p => p.name.toLowerCase().includes(lowercasedTerm));
    }, [protocoles, searchTerm]);

    const form = useForm<ProtocoleFormData>({
        resolver: zodResolver(protocoleSchema),
        defaultValues: { name: '', contraindications: [], pathologies: [], holisticProfile: [], steps: [] },
    });

    const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
        control: form.control,
        name: "steps"
    });
    
    // State to manage image previews for each step
    const [stepImagePreviews, setStepImagePreviews] = useState<Record<string, string | null>>({});

    useEffect(() => {
        if (isSheetOpen) {
            if (editingProtocole) {
                form.reset(editingProtocole);
                const previews: Record<string, string | null> = {};
                editingProtocole.steps?.forEach(step => {
                    previews[step.id] = step.imageUrl || null;
                });
                setStepImagePreviews(previews);
            } else {
                form.reset({ name: '', contraindications: [], pathologies: [], holisticProfile: [], steps: [] });
                setStepImagePreviews({});
            }
        }
    }, [isSheetOpen, editingProtocole, form]);

    const handleNew = () => { setEditingProtocole(null); setIsSheetOpen(true); };
    const handleEdit = (protocole: Protocole) => { setEditingProtocole(protocole); setIsSheetOpen(true); };

    const onSubmit = (data: ProtocoleFormData) => {
        if (!user) return;

        const stepsWithImages = data.steps?.map(step => ({
            ...step,
            imageUrl: stepImagePreviews[step.id] || null,
        }));

        const protocoleData = { ...data, counselorId: user.uid, steps: stepsWithImages };

        if (editingProtocole) {
            setDocumentNonBlocking(doc(firestore, 'protocols', editingProtocole.id), protocoleData, { merge: true });
            toast({ title: 'Protocole mis à jour' });
        } else {
            addDocumentNonBlocking(collection(firestore, 'protocols'), protocoleData);
            toast({ title: 'Protocole créé' });
        }
        setIsSheetOpen(false);
    };
    
    const handleStepImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, stepId: string) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            setStepImagePreviews(prev => ({ ...prev, [stepId]: base64 }));
        }
    };

    const handleDelete = () => {
        if (!protocoleToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'protocols', protocoleToDelete.id));
        toast({ title: 'Protocole supprimé' });
        setProtocoleToDelete(null);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div><CardTitle>Gestion des Protocoles</CardTitle><CardDescription>Créez et gérez vos protocoles de soin.</CardDescription></div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" />Nouveau Protocole</Button>
                </div>
                <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                    <Input
                        placeholder="Rechercher un protocole..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {areProtocolesLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            : filteredProtocoles && filteredProtocoles.length > 0 ? (
                                filteredProtocoles.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setProtocoleToDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : <TableRow><TableCell colSpan={2} className="h-24 text-center">Aucun protocole créé.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-2xl w-full">
                        <SheetHeader><SheetTitle>{editingProtocole ? 'Modifier le' : 'Nouveau'} protocole</SheetTitle></SheetHeader>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                               <ScrollArea className="h-[calc(100vh-8rem)]">
                                <div className="space-y-6 py-4 pr-6">
                                     <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du protocole</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)} />
                                     <div className="space-y-4">
                                        <FormField control={form.control} name="contraindications" render={({ field }) => (<FormItem><FormLabel>Contre-indications</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..." /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="pathologies" render={({ field }) => (<FormItem><FormLabel>Pathologies</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..." /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="holisticProfile" render={({ field }) => (<FormItem><FormLabel>Profil Holistique</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..." /></FormControl></FormItem>)} />
                                    </div>
                                    <div className="space-y-4 pt-4 border-t">
                                        <h4 className="font-medium">Étapes du protocole</h4>
                                        {stepFields.map((step, index) => (
                                            <Card key={step.id} className="p-4">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h5 className="font-semibold">Étape {index + 1}</h5>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </div>
                                                <div className="space-y-4">
                                                    <FormField control={form.control} name={`steps.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={form.control} name={`steps.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <div>
                                                        <Label>Image (optionnel)</Label>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <Image src={stepImagePreviews[step.id] || '/placeholder.svg'} alt="Aperçu" width={80} height={80} className="rounded-md object-cover border" />
                                                            <input type="file" id={`step-image-${step.id}`} onChange={(e) => handleStepImageUpload(e, step.id)} className="hidden" />
                                                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`step-image-${step.id}`)?.click()}>Uploader</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                         <Button type="button" variant="outline" size="sm" onClick={() => appendStep({ id: `step-${Date.now()}`, title: '', description: '', imageUrl: null })}><PlusCircle className="mr-2 h-4 w-4" />Ajouter une étape</Button>
                                    </div>
                                </div>
                               </ScrollArea>
                                <SheetFooter className="pt-6 border-t mt-auto">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit">Sauvegarder</Button>
                                </SheetFooter>
                            </form>
                         </Form>
                    </SheetContent>
                </Sheet>
                 <AlertDialog open={!!protocoleToDelete} onOpenChange={(open) => !open && setProtocoleToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer "{protocoleToDelete?.name}" ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </CardContent>
        </Card>
    );
}

const bmiRecordSchema = z.object({
    date: z.string(),
    weight: z.number(),
    height: z.number(),
    bmi: z.number(),
    interpretation: z.string(),
});

const wellnessSheetSchema = z.object({
    contraindications: z.array(z.string()).optional(),
    holisticProfile: z.array(z.string()).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    dob: z.string().optional(),
    foodHabits: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    bmiRecords: z.array(bmiRecordSchema).optional(),
});

type WellnessSheetFormData = z.infer<typeof wellnessSheetSchema>;

type WellnessSheet = {
    id: string;
    counselorId: string;
    clientId: string;
    clientName: string;
    gender?: 'male' | 'female' | 'other';
    dob?: string;
    foodHabits?: string[];
    allergies?: string[];
    bmiRecords?: z.infer<typeof bmiRecordSchema>[];
    contraindications: string[];
    holisticProfile: string[];
    createdAt: string;
    updatedAt: string;
};

type Client = { id: string; firstName: string; lastName: string; email: string; phone?: string; counselorIds?: string[] };

const newUserSchema = z.object({
    firstName: z.string().min(1, 'Le prénom est requis.'),
    lastName: z.string().min(1, 'Le nom est requis.'),
    email: z.string().email("Email invalide."),
    phone: z.string().optional(),
    address: z.string().optional(),
    zipCode: z.string().optional(),
    city: z.string().optional(),
    password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères."),
});
type NewUserFormData = z.infer<typeof newUserSchema>;


function WellnessSheetGenerator() {
    const { user } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const { personalization } = useAgency();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<Client | 'not-found' | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [editingSheet, setEditingSheet] = useState<WellnessSheet | null>(null);
    
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [bmiResult, setBmiResult] = useState<{ bmi: number; interpretation: string } | null>(null);

    const wellnessSheetsQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/wellness_sheets`)) : null, [user, firestore]);
    const { data: wellnessSheets, isLoading: areSheetsLoading } = useCollection<WellnessSheet>(wellnessSheetsQuery);


    const wellnessForm = useForm<WellnessSheetFormData>({
        resolver: zodResolver(wellnessSheetSchema),
        defaultValues: { 
            contraindications: [], 
            holisticProfile: [], 
            gender: undefined,
            dob: '',
            foodHabits: [],
            allergies: [],
            bmiRecords: [],
        },
    });
    
    const newUserForm = useForm<NewUserFormData>({
        resolver: zodResolver(newUserSchema),
    });
    
    useEffect(() => {
        if(isSheetOpen) {
            if(editingSheet) {
                setSelectedClient({ id: editingSheet.clientId, firstName: editingSheet.clientName.split(' ')[0], lastName: editingSheet.clientName.split(' ').slice(1).join(' '), email: '' });
                wellnessForm.reset({
                    contraindications: editingSheet.contraindications,
                    holisticProfile: editingSheet.holisticProfile,
                    gender: editingSheet.gender,
                    dob: editingSheet.dob,
                    foodHabits: editingSheet.foodHabits,
                    allergies: editingSheet.allergies,
                    bmiRecords: editingSheet.bmiRecords,
                });
            } else {
                 wellnessForm.reset({ 
                    contraindications: [], 
                    holisticProfile: [], 
                    gender: undefined,
                    dob: '',
                    foodHabits: [],
                    allergies: [],
                    bmiRecords: [],
                });
            }
        }
    }, [isSheetOpen, editingSheet, wellnessForm]);


    const resetAll = () => {
        setIsSheetOpen(false);
        setSearchEmail('');
        setSearchResult(null);
        setSelectedClient(null);
        setShowCreateForm(false);
        wellnessForm.reset();
        newUserForm.reset();
        setEditingSheet(null);
        setBmiResult(null);
        setHeight('');
        setWeight('');
    };

    const handleSearchUser = async () => {
        if (!searchEmail) return;
        setIsSearching(true);
        setSearchResult(null);
        setShowCreateForm(false);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', searchEmail.trim()));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setSearchResult('not-found');
                newUserForm.reset({ firstName: '', lastName: '', email: searchEmail, phone: '', address: '', zipCode: '', city: '', password: '' });
            } else {
                const foundUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Client;
                setSearchResult(foundUser);
            }
        } finally {
            setIsSearching(false);
        }
    };
    
    const onCreateNewUser = async (values: NewUserFormData) => {
        if (!user || !personalization?.emailSettings) {
            toast({title: "Erreur", description: "Impossible de créer le client sans configuration complète.", variant: "destructive"});
            return;
        }
        setIsSubmitting(true);
        try {
            const tempAuth = auth;
            const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, values.password);
            const newUser = userCredential.user;

            const userDocRef = doc(firestore, 'users', newUser.uid);
            const newUserData = {
                id: newUser.uid,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                phone: values.phone,
                address: values.address,
                zipCode: values.zipCode,
                city: values.city,
                role: 'membre',
                dateJoined: new Date().toISOString(),
                counselorIds: [user.uid],
            };
            await setDocumentNonBlocking(userDocRef, newUserData);

            if (personalization.emailSettings.fromEmail) {
                 await sendEmail({
                    emailSettings: personalization.emailSettings,
                    recipientEmail: values.email,
                    recipientName: `${values.firstName} ${values.lastName}`,
                    subject: `Bienvenue ! Vos accès à votre espace client`,
                    textBody: `Bonjour ${values.firstName},\n\nUn compte client a été créé pour vous. Vous pouvez vous connecter en utilisant les identifiants suivants:\nEmail: ${values.email}\nMot de passe: ${values.password}\n\nCordialement,\nL'équipe ${personalization.emailSettings.fromName}`,
                    htmlBody: `<p>Bonjour ${values.firstName},</p><p>Un compte client a été créé pour vous. Vous pouvez vous connecter à votre espace en utilisant les identifiants suivants :</p><ul><li><strong>Email :</strong> ${values.email}</li><li><strong>Mot de passe :</strong> ${values.password}</li></ul><p>Cordialement,<br/>L'équipe ${personalization.emailSettings.fromName}</p>`
                });
            }

            toast({ title: 'Client créé' });
            setSelectedClient(newUserData);
            setShowCreateForm(false);
        } catch(error: any) {
            let message = "Une erreur est survenue lors de la création du client.";
            if (error.code === 'auth/email-already-in-use') {
                message = "Cette adresse e-mail est déjà utilisée. Essayez de rechercher cet utilisateur pour l'ajouter.";
            }
            toast({ title: 'Erreur', description: message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAddClient = async (client: Client) => {
        if (!user) return;
        setIsSubmitting(true);
        const clientRef = doc(firestore, 'users', client.id);
        
        try {
            await setDocumentNonBlocking(clientRef, { counselorIds: arrayUnion(user.uid) }, { merge: true });
            toast({ title: "Client ajouté", description: `${client.firstName} ${client.lastName} a été ajouté à votre liste.` });
            setSelectedClient(client);
            setSearchResult(null);
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible d'ajouter le client.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectExistingClient = (client: Client) => {
        setSelectedClient(client);
        setSearchResult(null);
    };

    const handleCalculateBmi = () => {
        const h = parseFloat(height) / 100;
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            const bmi = w / (h * h);
            let interpretation = '';
            if (bmi < 18.5) interpretation = "Insuffisance pondérale";
            else if (bmi < 25) interpretation = "Poids normal";
            else if (bmi < 30) interpretation = "Surpoids";
            else if (bmi < 35) interpretation = "Obésité de classe I";
            else if (bmi < 40) interpretation = "Obésité de classe II";
            else interpretation = "Obésité de classe III";
            setBmiResult({ bmi: parseFloat(bmi.toFixed(2)), interpretation });
        }
    };
    
    const handleAddBmiRecord = () => {
        if (bmiResult) {
            const newRecord = {
                date: new Date().toISOString(),
                weight: parseFloat(weight),
                height: parseFloat(height),
                bmi: bmiResult.bmi,
                interpretation: bmiResult.interpretation,
            };
            const currentRecords = wellnessForm.getValues('bmiRecords') || [];
            const updatedRecords = [newRecord, ...currentRecords].slice(0, 5);
            wellnessForm.setValue('bmiRecords', updatedRecords, { shouldDirty: true });
            setBmiResult(null);
            setHeight('');
            setWeight('');
        }
    };


    const onWellnessSubmit = (data: WellnessSheetFormData) => {
        if (!user || !selectedClient) return;

        const sheetData: Omit<WellnessSheet, 'id'> = {
            counselorId: user.uid,
            clientId: selectedClient.id,
            clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
            createdAt: editingSheet ? editingSheet.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            contraindications: data.contraindications || [],
            holisticProfile: data.holisticProfile || [],
            gender: data.gender,
            dob: data.dob,
            foodHabits: data.foodHabits || [],
            allergies: data.allergies || [],
            bmiRecords: data.bmiRecords || [],
        };

        const sheetRef = editingSheet ? doc(firestore, `users/${user.uid}/wellness_sheets`, editingSheet.id) : doc(collection(firestore, `users/${user.uid}/wellness_sheets`));
        
        setDocumentNonBlocking(sheetRef, sheetData, { merge: true });
        
        toast({ title: editingSheet ? 'Fiche mise à jour' : 'Fiche bien-être enregistrée' });
        resetAll();
    };

    const handleEditSheet = (sheet: WellnessSheet) => {
        setEditingSheet(sheet);
        setIsSheetOpen(true);
    };
    
    const handleDeleteSheet = (sheetId: string) => {
        if (!user) return;
        const sheetRef = doc(firestore, `users/${user.uid}/wellness_sheets`, sheetId);
        deleteDocumentNonBlocking(sheetRef);
        toast({title: "Fiche supprimée"});
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Générateur de Fiche Bien-être</CardTitle>
                <CardDescription>Créez des fiches de bien-être personnalisées pour vos clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Sheet open={isSheetOpen} onOpenChange={(open) => {if (!open) resetAll(); setIsSheetOpen(open);}}>
                    <SheetTrigger asChild>
                        <Button className="w-full" onClick={() => { setEditingSheet(null); setIsSheetOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" />Créer une nouvelle fiche</Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-xl w-full flex flex-col">
                        <SheetHeader>
                            <SheetTitle>{editingSheet ? 'Modifier la' : 'Nouvelle'} Fiche Bien-être</SheetTitle>
                            <SheetDescription>
                                {selectedClient ? `Fiche pour ${selectedClient.firstName} ${selectedClient.lastName}` : "Commencez par sélectionner ou créer un client."}
                            </SheetDescription>
                        </SheetHeader>
                        {!selectedClient ? (
                            <div className="py-4 space-y-4">
                                {!showCreateForm && (
                                    <div className="flex gap-2">
                                        <Input placeholder="email@example.com" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                                        <Button onClick={handleSearchUser} disabled={isSearching || !searchEmail}>
                                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                )}
                                {searchResult === 'not-found' && !showCreateForm && (
                                    <Card className="p-4 bg-muted"><p className="text-sm text-center text-muted-foreground mb-4">Aucun utilisateur trouvé.</p><Button className="w-full" variant="secondary" onClick={() => setShowCreateForm(true)}><UserPlus className="mr-2 h-4 w-4" /> Créer une fiche client</Button></Card>
                                )}
                                {searchResult && searchResult !== 'not-found' && (
                                    <Card className="p-4">
                                        <p className="font-semibold">{searchResult.firstName} {searchResult.lastName}</p>
                                        <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                                        
                                        {searchResult.counselorIds?.includes(user?.uid || '') ? (
                                             <Button className="w-full mt-4" onClick={() => handleSelectExistingClient(searchResult)}>
                                                Déjà votre client
                                            </Button>
                                        ) : (
                                            <Button className="w-full mt-4" onClick={() => handleAddClient(searchResult)} disabled={isSubmitting}>
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                Ajouter comme client
                                            </Button>
                                        )}
                                    </Card>
                                )}
                                {showCreateForm && (
                                    <Card className="p-6">
                                        <div className="flex justify-between items-center mb-4"><h4 className="font-semibold">Nouveau client</h4><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreateForm(false)}><X className="h-4 w-4"/></Button></div>
                                        <Form {...newUserForm}><form onSubmit={newUserForm.handleSubmit(onCreateNewUser)} className="space-y-4">
                                             <div className="grid grid-cols-2 gap-4">
                                                <FormField control={newUserForm.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                <FormField control={newUserForm.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                            </div>
                                            <FormField control={newUserForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input value={searchEmail} disabled /></FormControl><FormMessage/></FormItem> )}/>
                                            <FormField control={newUserForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                            <FormField control={newUserForm.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                            <div className="grid grid-cols-2 gap-4">
                                                 <FormField control={newUserForm.control} name="zipCode" render={({ field }) => ( <FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                                <FormField control={newUserForm.control} name="city" render={({ field }) => ( <FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                            </div>
                                            <FormField control={newUserForm.control} name="password" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Mot de passe</FormLabel>
                                                     <div className="relative">
                                                        <FormControl><Input type={showPassword ? 'text' : 'password'} {...field}/></FormControl>
                                                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                    <FormMessage/>
                                                </FormItem> 
                                            )}/>
                                            <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Créer et sélectionner</Button>
                                        </form></Form>
                                    </Card>
                                )}
                            </div>
                        ) : (
                             <Form {...wellnessForm}>
                                <form onSubmit={wellnessForm.handleSubmit(onWellnessSubmit)} className="flex flex-col h-full overflow-hidden">
                                    <ScrollArea className="flex-grow pr-6 -mr-6">
                                        <div className="space-y-6 py-4">
                                            <FormField control={wellnessForm.control} name="dob" render={({ field }) => (<FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage/></FormItem>)}/>
                                            <FormField control={wellnessForm.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Genre</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel>Femme</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel>Homme</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="other" /></FormControl><FormLabel>Autre</FormLabel></FormItem></RadioGroup></FormControl><FormMessage/></FormItem>)}/>
                                            <FormField control={wellnessForm.control} name="foodHabits" render={({ field }) => (<FormItem><FormLabel>Habitudes alimentaires</FormLabel><FormControl><TagInput {...field} placeholder="Végétarien, sans gluten..." /></FormControl></FormItem>)} />
                                            <FormField control={wellnessForm.control} name="allergies" render={({ field }) => (<FormItem><FormLabel>Allergies</FormLabel><FormControl><TagInput {...field} placeholder="Arachides, lactose..." /></FormControl></FormItem>)} />
                                            <FormField control={wellnessForm.control} name="contraindications" render={({ field }) => (<FormItem><FormLabel>Antécédents / Contre-indications</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..." /></FormControl></FormItem>)} />
                                            <FormField control={wellnessForm.control} name="holisticProfile" render={({ field }) => (<FormItem><FormLabel>Profil Holistique</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un tag..." /></FormControl></FormItem>)} />

                                            <div className="space-y-4 pt-4 border-t">
                                                <h4 className="font-medium">Calculateur d'IMC</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2"><Label htmlFor="height">Taille (cm)</Label><Input id="height" type="number" value={height} onChange={e => setHeight(e.target.value)} /></div>
                                                    <div className="space-y-2"><Label htmlFor="weight">Poids (kg)</Label><Input id="weight" type="number" value={weight} onChange={e => setWeight(e.target.value)} /></div>
                                                </div>
                                                <Button type="button" variant="secondary" onClick={handleCalculateBmi} disabled={!height || !weight}>Calculer l'IMC</Button>
                                                {bmiResult && (
                                                    <Card className="bg-muted/50 p-4">
                                                        <p>IMC calculé : <span className="font-bold">{bmiResult.bmi}</span></p>
                                                        <p>Interprétation : <span className="font-bold">{bmiResult.interpretation}</span></p>
                                                        <Button type="button" size="sm" className="mt-2" onClick={handleAddBmiRecord}>Ajouter au suivi</Button>
                                                    </Card>
                                                )}
                                                <FormField control={wellnessForm.control} name="bmiRecords" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Historique IMC (5 derniers)</FormLabel>
                                                        <div className="space-y-2">
                                                            {field.value?.map(record => (
                                                                <div key={record.date} className="text-xs p-2 border rounded-md">
                                                                    <p><strong>{new Date(record.date).toLocaleDateString('fr-FR')}:</strong> IMC de {record.bmi} ({record.interpretation}) - {record.weight}kg pour {record.height}cm</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </FormItem>
                                                )}/>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                    <SheetFooter className="pt-4 border-t">
                                        <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                        <Button type="submit">Enregistrer la fiche</Button>
                                    </SheetFooter>
                                </form>
                            </Form>
                        )}
                    </SheetContent>
                </Sheet>
                 <div className="border rounded-lg mt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Date de création</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {areSheetsLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            : wellnessSheets && wellnessSheets.length > 0 ? (
                                wellnessSheets.map(sheet => (
                                    <TableRow key={sheet.id}>
                                        <TableCell className="font-medium">{sheet.clientName}</TableCell>
                                        <TableCell>{new Date(sheet.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditSheet(sheet)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSheet(sheet.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">Aucune fiche bien-être créée.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function AuraTestTool() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [pathologie, setPathologie] = useState<string[]>([]);
    const [emotion, setEmotion] = useState<string[]>([]);
    const [contraindication, setContraindication] = useState<string[]>([]);
    
    const [open, setOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<WellnessSheet | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const clientsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid)) : null, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

    const wellnessSheetQuery = useMemoFirebase(() => {
        if (!user || !selectedClientId) return null;
        return query(collection(firestore, `users/${user.uid}/wellness_sheets`), where('clientId', '==', selectedClientId));
    }, [user, firestore, selectedClientId]);
    const { data: sheets } = useCollection<WellnessSheet>(wellnessSheetQuery);
    
    const productsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'products'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: allProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

    const protocolsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'protocols'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: allProtocols, isLoading: areProtocolsLoading } = useCollection<Protocole>(protocolsQuery);


    useEffect(() => {
        if (sheets && sheets.length > 0) {
            setSelectedSheet(sheets[0]);
        } else {
            setSelectedSheet(null);
        }
    }, [sheets]);

    const handleClientSelect = (clientId: string) => {
        setSelectedClientId(clientId);
        const client = clients?.find(c => c.id === clientId);
        setSelectedClient(client || null);
        setOpen(false);
    };

    const selectedClientName = useMemo(() => {
        if (!selectedClientId || !clients) return "Sélectionner un client...";
        const client = clients.find(c => c.id === selectedClientId);
        return client ? `${client.firstName} ${client.lastName}` : "Sélectionner un client...";
    }, [selectedClientId, clients]);
    
    const recommendations = useMemo(() => {
        const clientContraindications = new Set([
            ...(selectedSheet?.contraindications || []),
            ...(selectedSheet?.allergies || []),
            ...contraindication,
        ]);

        const filterItems = (items: (Product | Protocole)[]) => {
            return items.filter(item => {
                const itemContraindications = new Set(item.contraindications || []);
                for (const clientContra of clientContraindications) {
                    if (itemContraindications.has(clientContra)) {
                        return false;
                    }
                }
                return true;
            });
        };

        const pathologyProducts = (allProducts || []).filter(p =>
            pathologie.some(tag => p.pathologies?.includes(tag))
        );
        const emotionProducts = (allProducts || []).filter(p =>
            emotion.some(tag => p.holisticProfile?.includes(tag))
        );

        const pathologyProtocols = (allProtocols || []).filter(p =>
            pathologie.some(tag => p.pathologies?.includes(tag))
        );
        const emotionProtocols = (allProtocols || []).filter(p =>
            emotion.some(tag => p.holisticProfile?.includes(tag))
        );
        
        return {
            pathology: {
                products: filterItems(pathologyProducts),
                protocols: filterItems(pathologyProtocols),
            },
            emotion: {
                products: filterItems(emotionProducts),
                protocols: filterItems(emotionProtocols),
            },
        };

    }, [pathologie, emotion, contraindication, selectedSheet, allProducts, allProtocols]);


    const InfoBlock = ({ title, tags }: { title: string; tags: string[] | undefined }) => {
        if (!tags || tags.length === 0) return null;
        return (
            <div className="text-sm">
                <h4 className="font-semibold text-foreground">{title}</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                    {tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
            </div>
        );
    };
    
    const RecommendationList = ({ title, products, protocols }: { title: string, products: (Product[] | undefined), protocols: (Protocole[] | undefined)}) => {
        if ((!products || products.length === 0) && (!protocols || protocols.length === 0)) {
            return null;
        }

        return (
            <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    {title === 'Pathologie' ? <HeartPulse className="h-6 w-6 text-primary"/> : <BrainCircuit className="h-6 w-6 text-primary"/>}
                    Recommandations: {title}
                </h3>
                {products && products.length > 0 && (
                    <div>
                        <h4 className="font-medium text-muted-foreground mb-2">Produits suggérés</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {products.map(p => <Card key={p.id} className="p-3"><p className="font-semibold">{p.title}</p></Card>)}
                        </div>
                    </div>
                )}
                 {protocols && protocols.length > 0 && (
                    <div>
                        <h4 className="font-medium text-muted-foreground mb-2">Protocoles suggérés</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {protocols.map(p => <Card key={p.id} className="p-3"><p className="font-semibold">{p.name}</p></Card>)}
                        </div>
                    </div>
                )}
            </div>
        )
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Outil de Test Aura</CardTitle>
                <CardDescription>Renseignez les informations pour obtenir des recommandations personnalisées.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Rechercher une fiche bien-être (Optionnel)</Label>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between" disabled={areClientsLoading}>
                                {areClientsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedClientName}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Rechercher un client..." />
                                <CommandList><CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                    <CommandGroup>
                                        {clients?.map((client) => (
                                            <CommandItem key={client.id} value={`${client.firstName} ${client.lastName} ${client.email}`} onSelect={() => handleClientSelect(client.id)}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")}/>
                                                {client.firstName} {client.lastName}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                
                {selectedClient && (
                    <Card className="bg-muted/50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                             <h3 className="font-semibold flex items-center gap-2"><User className="h-5 w-5 text-primary" />{selectedClient.firstName} {selectedClient.lastName}</h3>
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedClientId(null); setSelectedClient(null); setSelectedSheet(null); }}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {selectedClient.email}</p>
                            {selectedClient.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {selectedClient.phone}</p>}
                        </div>
                        {selectedSheet && (
                            <div className="border-t pt-4 space-y-3">
                               <InfoBlock title="Habitudes Alimentaires" tags={selectedSheet.foodHabits} />
                               <InfoBlock title="Allergies" tags={selectedSheet.allergies} />
                               <InfoBlock title="Contre-indications (Fiche)" tags={selectedSheet.contraindications} />
                               <InfoBlock title="Profil Holistique (Fiche)" tags={selectedSheet.holisticProfile} />
                            </div>
                        )}
                    </Card>
                )}

                <div className="space-y-2">
                    <Label>Pathologie à traiter</Label>
                    <TagInput value={pathologie} onChange={setPathologie} placeholder="Ajouter une pathologie (ex: Stress, Anxiété)..." />
                </div>
                <div className="space-y-2">
                    <Label>Émotion du moment</Label>
                    <TagInput value={emotion} onChange={setEmotion} placeholder="Ajouter une émotion (ex: Colère, Tristesse)..." />
                </div>
                <div className="space-y-2">
                    <Label>Contre-indication temporaire</Label>
                    <TagInput value={contraindication} onChange={setContraindication} placeholder="Ajouter une contre-indication (ex: Femme enceinte)..." />
                </div>

                {(pathologie.length > 0 || emotion.length > 0) && (
                    <div className="pt-6 mt-6 border-t space-y-8">
                        <RecommendationList title="Pathologie" products={recommendations.pathology.products} protocols={recommendations.pathology.protocols} />
                        <RecommendationList title="Émotion" products={recommendations.emotion.products} protocols={recommendations.emotion.protocols} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AuraPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Aura</h1>
                <p className="text-muted-foreground">Votre outils de gestion de votre activité bien-être.</p>
            </div>
            <Tabs defaultValue="fiche-bien-etre" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="fiche-bien-etre"><FileText className="mr-2 h-4 w-4" />Fiche bien-être</TabsTrigger>
                    <TabsTrigger value="catalogue-produits"><ShoppingBag className="mr-2 h-4 w-4" />Catalogue Produits</TabsTrigger>
                    <TabsTrigger value="protocoles"><Beaker className="mr-2 h-4 w-4" />Protocoles</TabsTrigger>
                    <TabsTrigger value="test"><ClipboardList className="mr-2 h-4 w-4" />Test</TabsTrigger>
                </TabsList>
                <TabsContent value="fiche-bien-etre">
                   <WellnessSheetGenerator />
                </TabsContent>
                <TabsContent value="catalogue-produits">
                   <div className="space-y-8">
                       <ProductManager />
                   </div>
                </TabsContent>
                <TabsContent value="protocoles">
                    <ProtocoleManager />
                </TabsContent>
                <TabsContent value="test">
                    <AuraTestTool />
                </TabsContent>
            </Tabs>
        </div>
    );
}
