
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useCollection, useMemoFirebase, useUser, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Trash2, MoreHorizontal, PlusCircle, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Partner = {
    id: string;
    counselorId: string;
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    specialties: string[];
    sectors: string[];
    postalCode?: string;
    department?: string;
};

const partnerSchema = z.object({
    name: z.string().min(1, "Le nom est requis."),
    email: z.string().email("L'email est invalide.").optional().or(z.literal('')),
    phone: z.string().optional(),
    website: z.string().url("L'URL du site web est invalide.").optional().or(z.literal('')),
    specialties: z.array(z.string()).optional(),
    sectors: z.array(z.string()).optional(),
    postalCode: z.string().optional(),
    department: z.string().optional(),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

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
                            <span className="sr-only">Remove {tag}</span>
                            <span className="h-4 w-4 flex items-center justify-center">&times;</span>
                        </button>
                    </Badge>
                ))}
            </div>
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={addTag} placeholder={placeholder} className="border-none shadow-none focus-visible:ring-0 h-8" />
        </div>
    );
};

export default function PartnersPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
    const [sectorFilter, setSectorFilter] = useState<string>('all');

    const partnersQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/partners`));
    }, [user, firestore]);
    const { data: partners, isLoading: arePartnersLoading } = useCollection<Partner>(partnersQuery);

    const form = useForm<PartnerFormData>({
        resolver: zodResolver(partnerSchema),
    });

    useEffect(() => {
        if (isSheetOpen) {
            if (editingPartner) {
                form.reset(editingPartner);
            } else {
                form.reset({
                    name: '', email: '', phone: '', website: '', specialties: [], sectors: [], postalCode: '', department: ''
                });
            }
        }
    }, [isSheetOpen, editingPartner, form]);
    
    const onSubmit = (data: PartnerFormData) => {
        if (!user) return;
        const partnerData = { counselorId: user.uid, ...data };
        if (editingPartner) {
            setDocumentNonBlocking(doc(firestore, `users/${user.uid}/partners`, editingPartner.id), partnerData, { merge: true });
            toast({ title: 'Partenaire mis à jour' });
        } else {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/partners`), partnerData);
            toast({ title: 'Partenaire ajouté' });
        }
        setIsSheetOpen(false);
    };

    const handleEdit = (partner: Partner) => {
        setEditingPartner(partner);
        setIsSheetOpen(true);
    };
    
    const handleDelete = (partnerId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/partners`, partnerId));
        toast({ title: 'Partenaire supprimé' });
    };

    const allSpecialties = useMemo(() => {
        if (!partners) return [];
        const specialties = new Set<string>();
        partners.forEach(p => p.specialties?.forEach(s => specialties.add(s)));
        return Array.from(specialties).sort();
    }, [partners]);

    const allSectors = useMemo(() => {
        if (!partners) return [];
        const sectors = new Set<string>();
        partners.forEach(p => p.sectors?.forEach(s => sectors.add(s)));
        return Array.from(sectors).sort();
    }, [partners]);

    const filteredPartners = useMemo(() => {
        if (!partners) return [];
        return partners.filter(p => {
            const specialtyMatch = specialtyFilter === 'all' || p.specialties?.includes(specialtyFilter);
            const sectorMatch = sectorFilter === 'all' || p.sectors?.includes(sectorFilter);
            return specialtyMatch && sectorMatch;
        });
    }, [partners, specialtyFilter, sectorFilter]);

    const isLoading = isUserLoading || arePartnersLoading;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestion des partenaires</h1>
                    <p className="text-muted-foreground">Consultez et gérez votre réseau de partenaires.</p>
                </div>
                 <Button onClick={() => { setEditingPartner(null); setIsSheetOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouveau Partenaire
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex gap-4 pt-4">
                        <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                            <SelectTrigger className="flex-grow"><SelectValue placeholder="Filtrer par spécialité" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes les spécialités</SelectItem>
                                {allSpecialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={sectorFilter} onValueChange={setSectorFilter}>
                            <SelectTrigger className="flex-grow"><SelectValue placeholder="Filtrer par secteur" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les secteurs</SelectItem>
                                {allSectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Coordonnées</TableHead>
                                <TableHead>Spécialités</TableHead>
                                <TableHead>Secteurs</TableHead>
                                <TableHead>Localisation</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                                ))
                            ) : filteredPartners.length > 0 ? ( 
                                filteredPartners.map((partner) => (
                                   <TableRow key={partner.id}>
                                       <TableCell>
                                           <div className="font-medium">{partner.name}</div>
                                           <div className="text-sm text-muted-foreground">{partner.email}</div>
                                           <div className="text-sm text-muted-foreground">{partner.phone}</div>
                                           {partner.website && (
                                                <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                                                   <LinkIcon className="h-3 w-3" /> {partner.website}
                                                </a>
                                           )}
                                       </TableCell>
                                       <TableCell><div className="flex flex-wrap gap-1">{partner.specialties?.map(s => <Badge key={s} variant="outline">{s}</Badge>)}</div></TableCell>
                                       <TableCell><div className="flex flex-wrap gap-1">{partner.sectors?.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}</div></TableCell>
                                       <TableCell>
                                           <div>{partner.postalCode}</div>
                                           <div className="text-sm text-muted-foreground">{partner.department}</div>
                                       </TableCell>
                                       <TableCell className="text-right">
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(partner)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(partner.id)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                       </TableCell>
                                   </TableRow>
                               ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Aucun partenaire trouvé.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-lg w-full flex flex-col">
                    <SheetHeader>
                        <SheetTitle>{editingPartner ? "Modifier le" : "Nouveau"} partenaire</SheetTitle>
                        <SheetDescription>Ajoutez ou modifiez les informations de votre partenaire.</SheetDescription>
                    </SheetHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                            <ScrollArea className="flex-1 pr-6 py-4 -mr-6">
                                <div className="space-y-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Site Web</FormLabel><FormControl><Input type="url" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="specialties" render={({ field }) => (<FormItem><FormLabel>Spécialités</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter une spécialité..." /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="sectors" render={({ field }) => (<FormItem><FormLabel>Secteurs</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un secteur..." /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Département</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </ScrollArea>
                            <SheetFooter className="pt-4 border-t mt-auto">
                                <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                <Button type="submit">{editingPartner ? 'Sauvegarder' : 'Créer'}</Button>
                            </SheetFooter>
                        </form>
                    </Form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
