
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Loader2, Image as ImageIcon, Wand2 } from 'lucide-react';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, SheetDescription } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const positionSchema = z.object({
  positionNumber: z.coerce.number().min(1, "La position doit être au moins 1."),
  meaning: z.string().min(1, "La signification est requise."),
});

const tirageModelSchema = z.object({
  name: z.string().min(1, "Le nom du modèle est requis."),
  description: z.string().optional(),
  positions: z.array(positionSchema).min(1, "Un tirage doit avoir au moins une position."),
});

type TirageModelFormData = z.infer<typeof tirageModelSchema>;

type TirageModel = {
  id: string;
  counselorId: string;
  name: string;
  description?: string;
  positions: { positionNumber: number; meaning: string }[];
};

const cardSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom de la carte est requis."),
  description: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});
const deckSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom du jeu est requis."),
  description: z.string().optional(),
});
type CardFormData = z.infer<typeof cardSchema>;
type DeckFormData = z.infer<typeof deckSchema>;

type CardDeck = {
  id: string;
  counselorId: string;
  name: string;
  description?: string;
}
type CardData = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

function TirageSimulator({ models, decks }: { models: TirageModel[], decks: CardDeck[] }) {
    const firestore = useFirestore();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientDob, setClientDob] = useState('');
    const [question, setQuestion] = useState('');
    const [drawnCards, setDrawnCards] = useState<{ card: CardData; position: { positionNumber: number; meaning: string } }[]>([]);

    const selectedModel = models.find(m => m.id === selectedModelId);
    
    const cardsQuery = useMemoFirebase(() => {
        if (!selectedDeckId) return null;
        return collection(firestore, `cardDecks/${selectedDeckId}/cards`);
    }, [selectedDeckId, firestore]);
    const { data: cards, isLoading: areCardsLoading } = useCollection<CardData>(cardsQuery);
    
    const handleDraw = () => {
        if (!selectedModel || !cards || cards.length === 0) return;
        
        const numberOfCardsToDraw = selectedModel.positions.length;
        if (cards.length < numberOfCardsToDraw) {
            alert("Le jeu de cartes ne contient pas assez de cartes pour ce tirage.");
            return;
        }

        const shuffled = [...cards].sort(() => 0.5 - Math.random());
        const newDrawnCards = selectedModel.positions.map((pos, index) => ({
            card: shuffled[index],
            position: pos,
        }));
        setDrawnCards(newDrawnCards);
    };

    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
              <Button variant="outline"><Wand2 className="mr-2 h-4 w-4" /> Lancer un tirage de test</Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-2xl w-full">
              <SheetHeader>
                  <SheetTitle>Simulateur de Tirage</SheetTitle>
                  <SheetDescription>Testez vos modèles et jeux de cartes en conditions réelles.</SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-8rem)]">
                  <div className="space-y-6 py-4 pr-6">
                    <div className="space-y-2">
                        <Label>Modèle de tirage</Label>
                        <Select onValueChange={setSelectedModelId}><SelectTrigger><SelectValue placeholder="Choisir un modèle..." /></SelectTrigger><SelectContent>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Jeu de cartes</Label>
                        <Select onValueChange={setSelectedDeckId}><SelectTrigger><SelectValue placeholder="Choisir un jeu..." /></SelectTrigger><SelectContent>{decks.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nom du consultant" />
                    </div>
                     <div className="space-y-2">
                        <Label>Date de naissance</Label>
                        <Input type="date" value={clientDob} onChange={e => setClientDob(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Question posée</Label>
                        <Textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Quelle est la question ?" />
                    </div>
                     <Button onClick={handleDraw} disabled={!selectedModelId || !selectedDeckId || areCardsLoading}>
                        {areCardsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lancer le tirage
                    </Button>
                     {drawnCards.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                            <h3 className="text-xl font-semibold mb-4">Résultat du Tirage</h3>
                             <div className="space-y-6">
                                {drawnCards.map(({ card, position }, index) => (
                                    <div key={index} className="flex gap-4 p-4 border rounded-lg">
                                        <div className="flex-shrink-0">
                                            {card.imageUrl ? <Image src={card.imageUrl} alt={card.name} width={80} height={120} className="rounded-md object-cover" /> : <div className="w-20 h-[120px] bg-muted rounded-md" />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Position {position.positionNumber}: {position.meaning}</p>
                                            <h4 className="text-lg font-bold">{card.name}</h4>
                                            <p className="text-sm">{card.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                  </div>
              </ScrollArea>
          </SheetContent>
      </Sheet>
    )
}

function CartomancieManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<TirageModel | null>(null);

  const tirageModelsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'tirageModels'), where('counselorId', '==', user.uid));
  }, [user, firestore]);

  const { data: tirageModels, isLoading } = useCollection<TirageModel>(tirageModelsQuery);
  
  const decksQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'cardDecks'), where('counselorId', '==', user.uid));
  }, [user, firestore]);
  const { data: decks, isLoading: areDecksLoading } = useCollection<CardDeck>(decksQuery);

  const form = useForm<TirageModelFormData>({
    resolver: zodResolver(tirageModelSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "positions",
  });

  useEffect(() => {
    if (isSheetOpen) {
      if (editingModel) {
        form.reset(editingModel);
      } else {
        form.reset({
          name: '',
          description: '',
          positions: [{ positionNumber: 1, meaning: '' }],
        });
      }
    }
  }, [isSheetOpen, editingModel, form]);

  const handleNewModel = () => {
    setEditingModel(null);
    setIsSheetOpen(true);
  };

  const handleEditModel = (model: TirageModel) => {
    setEditingModel(model);
    setIsSheetOpen(true);
  };
  
  const handleDeleteModel = (modelId: string) => {
      if(!user) return;
      const modelRef = doc(firestore, 'tirageModels', modelId);
      deleteDocumentNonBlocking(modelRef);
      toast({ title: "Modèle supprimé" });
  };

  const onSubmit = (data: TirageModelFormData) => {
    if (!user) return;

    const modelData: Omit<TirageModel, 'id'> = {
      counselorId: user.uid,
      name: data.name,
      description: data.description,
      positions: data.positions,
    };

    if (editingModel) {
      const modelRef = doc(firestore, 'tirageModels', editingModel.id);
      setDocumentNonBlocking(modelRef, modelData, { merge: true });
      toast({ title: "Modèle mis à jour" });
    } else {
      addDocumentNonBlocking(collection(firestore, 'tirageModels'), modelData);
      toast({ title: "Modèle créé" });
    }
    setIsSheetOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Modèles de tirage</CardTitle>
                <CardDescription>Gestion des modèles de tirages de cartes (tarots, oracles, etc.).</CardDescription>
            </div>
            <div className="flex gap-2">
                <TirageSimulator models={tirageModels || []} decks={decks || []} />
                <Button onClick={handleNewModel}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouveau Modèle
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Nom du modèle</TableHead>
                      <TableHead>Nombre de cartes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {isLoading ? [...Array(3)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                  )) : tirageModels && tirageModels.length > 0 ? (
                      tirageModels.map(model => (
                          <TableRow key={model.id}>
                              <TableCell className="font-medium">{model.name}</TableCell>
                              <TableCell>{model.positions.length}</TableCell>
                              <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditModel(model)}>
                                      <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteModel(model.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                              </TableCell>
                          </TableRow>
                      ))
                  ) : (
                      <TableRow><TableCell colSpan={3} className="text-center h-24">Aucun modèle de tirage créé.</TableCell></TableRow>
                  )}
              </TableBody>
          </Table>

          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetContent className="sm:max-w-2xl w-full">
                  <SheetHeader>
                      <SheetTitle>{editingModel ? "Modifier le" : "Nouveau"} modèle de tirage</SheetTitle>
                  </SheetHeader>
                   <ScrollArea className="h-[calc(100vh-8rem)]">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du modèle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div>
                                    <h3 className="text-lg font-medium mb-4">Positions des cartes</h3>
                                    <div className="space-y-4">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="flex gap-4 items-end p-4 border rounded-md">
                                                <div className="w-20">
                                                    <FormField control={form.control} name={`positions.${index}.positionNumber`} render={({ field }) => (<FormItem><FormLabel>Pos.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                </div>
                                                <div className="flex-1">
                                                     <FormField control={form.control} name={`positions.${index}.meaning`} render={({ field }) => (<FormItem><FormLabel>Signification</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ positionNumber: fields.length + 1, meaning: '' })} className="mt-4">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une position
                                    </Button>
                                </div>
                                <SheetFooter className="pt-6">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit">Sauvegarder</Button>
                                </SheetFooter>
                            </form>
                        </Form>
                   </ScrollArea>
              </SheetContent>
          </Sheet>
      </CardContent>
    </Card>
  );
}



function DeckManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isDeckSheetOpen, setIsDeckSheetOpen] = useState(false);
    const [editingDeck, setEditingDeck] = useState<CardDeck | null>(null);
    const [deckToDelete, setDeckToDelete] = useState<CardDeck | null>(null);

    const [isCardSheetOpen, setIsCardSheetOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CardData | null>(null);
    const [selectedDeck, setSelectedDeck] = useState<CardDeck | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const decksQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'cardDecks'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: decks, isLoading: areDecksLoading } = useCollection<CardDeck>(decksQuery);

    const cardsQuery = useMemoFirebase(() => {
        if (!selectedDeck) return null;
        return collection(firestore, `cardDecks/${selectedDeck.id}/cards`);
    }, [selectedDeck, firestore]);
    const { data: cards, isLoading: areCardsLoading } = useCollection<CardData>(cardsQuery);
    
    const deckForm = useForm<DeckFormData>({ resolver: zodResolver(deckSchema) });
    const cardForm = useForm<CardFormData>({ resolver: zodResolver(cardSchema) });

    // Deck Management
    useEffect(() => {
        if (isDeckSheetOpen) {
            deckForm.reset(editingDeck || { name: '', description: '' });
        }
    }, [isDeckSheetOpen, editingDeck, deckForm]);

    const handleNewDeck = () => { setEditingDeck(null); setIsDeckSheetOpen(true); };
    const handleEditDeck = (deck: CardDeck) => { setEditingDeck(deck); setIsDeckSheetOpen(true); };
    const handleManageCards = (deck: CardDeck) => { setSelectedDeck(deck); };

    const onDeckSubmit = async (data: DeckFormData) => {
        if (!user) return;
        const deckData = { counselorId: user.uid, ...data };
        if (editingDeck) {
            await setDocumentNonBlocking(doc(firestore, 'cardDecks', editingDeck.id), deckData, { merge: true });
            toast({ title: "Jeu mis à jour" });
        } else {
            await addDocumentNonBlocking(collection(firestore, 'cardDecks'), deckData);
            toast({ title: "Jeu créé" });
        }
        setIsDeckSheetOpen(false);
    };
    
    const onDeleteDeck = async () => {
        if (!deckToDelete) return;
        // Also delete subcollection, though this should be a cloud function in production
        const cardsSnapshot = await getDocs(collection(firestore, `cardDecks/${deckToDelete.id}/cards`));
        cardsSnapshot.forEach(cardDoc => deleteDocumentNonBlocking(cardDoc.ref));
        await deleteDocumentNonBlocking(doc(firestore, 'cardDecks', deckToDelete.id));
        toast({ title: "Jeu supprimé" });
        setDeckToDelete(null);
        if(selectedDeck?.id === deckToDelete.id) setSelectedDeck(null);
    };

    // Card Management
    useEffect(() => {
        if (isCardSheetOpen) {
            cardForm.reset(editingCard || { name: '', description: '', imageUrl: null });
            setImagePreview(editingCard?.imageUrl || null);
        }
    }, [isCardSheetOpen, editingCard, cardForm]);
    
    const handleNewCard = () => { setEditingCard(null); setIsCardSheetOpen(true); };
    const handleEditCard = (card: CardData) => { setEditingCard(card); setIsCardSheetOpen(true); };
    
    const onDeleteCard = (cardId: string) => {
        if (!selectedDeck) return;
        deleteDocumentNonBlocking(doc(firestore, `cardDecks/${selectedDeck.id}/cards`, cardId));
        toast({ title: "Carte supprimée" });
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            setImagePreview(base64);
            cardForm.setValue('imageUrl', base64);
        }
    };
    
    const onCardSubmit = async (data: CardFormData) => {
        if (!selectedDeck) return;
        const cardData = { ...data, imageUrl: imagePreview };
        if (editingCard) {
            await setDocumentNonBlocking(doc(firestore, `cardDecks/${selectedDeck.id}/cards`, editingCard.id), cardData, { merge: true });
            toast({ title: "Carte mise à jour" });
        } else {
            await addDocumentNonBlocking(collection(firestore, `cardDecks/${selectedDeck.id}/cards`), cardData);
            toast({ title: "Carte ajoutée" });
        }
        setIsCardSheetOpen(false);
    };

    if (selectedDeck) {
      return (
        <Card>
          <CardHeader>
            <div className='flex justify-between items-start'>
                <div>
                    <Button variant="ghost" onClick={() => setSelectedDeck(null)} className="mb-2 pl-0 h-auto">
                        &larr; Retour à la liste des jeux
                    </Button>
                    <CardTitle>{selectedDeck.name}</CardTitle>
                    <CardDescription>Gérez les cartes de ce jeu.</CardDescription>
                </div>
                <Button onClick={handleNewCard}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une carte</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Carte</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {areCardsLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-8 w-full" /></TableCell></TableRow> 
                    : cards && cards.length > 0 ? cards.map(card => (
                        <TableRow key={card.id}>
                            <TableCell className="flex items-center gap-4">
                                {card.imageUrl ? <Image src={card.imageUrl} alt={card.name} width={40} height={60} className="rounded-md object-cover" /> : <div className="w-10 h-[60px] bg-muted rounded-md flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground"/></div>}
                                <span className="font-medium">{card.name}</span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleEditCard(card)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => onDeleteCard(card.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    )) : <TableRow><TableCell colSpan={2} className="h-24 text-center">Aucune carte dans ce jeu.</TableCell></TableRow>}
                </TableBody>
            </Table>

            <Sheet open={isCardSheetOpen} onOpenChange={setIsCardSheetOpen}>
                <SheetContent className="sm:max-w-xl w-full">
                  <SheetHeader>
                      <SheetTitle>{editingCard ? 'Modifier la' : 'Nouvelle'} carte</SheetTitle>
                  </SheetHeader>
                   <ScrollArea className="h-[calc(100vh-8rem)]">
                      <Form {...cardForm}>
                          <form onSubmit={cardForm.handleSubmit(onCardSubmit)} className="space-y-6 py-4 pr-6">
                              <FormField control={cardForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la carte</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={cardForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description / Mots-clés</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                               <div>
                                  <Label>Image</Label>
                                  <div className="mt-2 flex items-center gap-4">
                                      {imagePreview ? <Image src={imagePreview} alt="Aperçu" width={80} height={120} className="rounded-md object-cover"/> : <div className="w-20 h-[120px] bg-muted rounded-md" />}
                                      <div className="space-y-2">
                                          <input type="file" id="card-image-upload" onChange={handleImageUpload} className="hidden" accept="image/*" />
                                          <Button type="button" variant="outline" onClick={() => document.getElementById('card-image-upload')?.click()}><PlusCircle className="mr-2 h-4 w-4" /> Uploader</Button>
                                          {imagePreview && <Button type="button" variant="destructive" size="sm" onClick={() => {setImagePreview(null); cardForm.setValue('imageUrl', null)}}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</Button>}
                                      </div>
                                  </div>
                              </div>
                              <SheetFooter className="pt-6">
                                  <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                  <Button type="submit">Sauvegarder</Button>
                              </SheetFooter>
                          </form>
                      </Form>
                   </ScrollArea>
                </SheetContent>
            </Sheet>
          </CardContent>
        </Card>
      )
    }

    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Jeux de Cartes</CardTitle>
                        <CardDescription>Créez et gérez vos différents jeux de tarot, oracles, etc.</CardDescription>
                    </div>
                    <Button onClick={handleNewDeck}><PlusCircle className="mr-2 h-4 w-4" /> Nouveau Jeu</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nom du jeu</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {areDecksLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        : decks && decks.length > 0 ? decks.map(deck => (
                            <TableRow key={deck.id}>
                                <TableCell className="font-medium">{deck.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleManageCards(deck)}>Gérer les cartes</Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleEditDeck(deck)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setDeckToDelete(deck)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={2} className="h-24 text-center">Aucun jeu de cartes créé.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                <Sheet open={isDeckSheetOpen} onOpenChange={setIsDeckSheetOpen}>
                    <SheetContent className="sm:max-w-lg w-full">
                        <SheetHeader><SheetTitle>{editingDeck ? 'Modifier le' : 'Nouveau'} jeu de cartes</SheetTitle></SheetHeader>
                        <Form {...deckForm}>
                            <form onSubmit={deckForm.handleSubmit(onDeckSubmit)} className="space-y-6 py-4">
                                <FormField control={deckForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du jeu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={deckForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <SheetFooter className="pt-6">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit">Sauvegarder</Button>
                                </SheetFooter>
                            </form>
                        </Form>
                    </SheetContent>
                </Sheet>
                 <AlertDialog open={!!deckToDelete} onOpenChange={(open) => !open && setDeckToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer le jeu "{deckToDelete?.name}" ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est irréversible et supprimera également toutes les cartes associées à ce jeu.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={onDeleteDeck} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}

export default function PrismePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Prisme</h1>
                <p className="text-muted-foreground">
                    Créez et gérez vos modèles de triage : cartes de voyance, ressentis, pendule, etc.
                </p>
            </div>

            <Tabs defaultValue="cartomancie">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cartomancie">Cartomancie</TabsTrigger>
                    <TabsTrigger value="clairvoyance">Clairvoyance</TabsTrigger>
                    <TabsTrigger value="pendule">Pendule</TabsTrigger>
                </TabsList>
                <TabsContent value="cartomancie">
                    <div className="space-y-8">
                        <CartomancieManager />
                        <DeckManager />
                    </div>
                </TabsContent>
                <TabsContent value="clairvoyance">
                     <Card>
                        <CardHeader>
                            <CardTitle>Clairvoyance</CardTitle>
                            <CardDescription>Gestion des modèles pour les ressentis et les visions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">La gestion des modèles de clairvoyance est en cours de construction.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="pendule">
                     <Card>
                        <CardHeader>
                            <CardTitle>Pendule</CardTitle>
                            <CardDescription>Gestion des planches et des modèles pour le pendule.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">La gestion des modèles pour le pendule est en cours de construction.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
