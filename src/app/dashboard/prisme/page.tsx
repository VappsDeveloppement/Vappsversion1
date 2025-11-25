'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

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
                <CardTitle>Cartomancie</CardTitle>
                <CardDescription>Gestion des modèles de tirages de cartes (tarots, oracles, etc.).</CardDescription>
            </div>
            <Button onClick={handleNewModel}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Modèle
            </Button>
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
                    <CartomancieManager />
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
