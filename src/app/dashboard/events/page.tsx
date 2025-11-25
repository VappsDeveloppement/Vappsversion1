
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, Loader2, Calendar, MoreHorizontal, User as UserIcon, X, Eye, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  meetLink: string;
  counselorId: string;
  isPublic: boolean;
  imageUrl?: string | null;
  maxAttendees?: number;
};

type Registration = {
    id: string;
    userName: string;
    userEmail: string;
    registeredAt: string;
}

const eventSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.'),
  description: z.string().optional(),
  date: z.string().min(1, 'La date est requise.'),
  location: z.string().optional(),
  meetLink: z.string().url('Veuillez entrer une URL valide.').optional().or(z.literal('')),
  isPublic: z.boolean().default(false),
  imageUrl: z.string().nullable().optional(),
  maxAttendees: z.coerce.number().min(0, "Le nombre doit être positif.").optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

function RegistrationsSheet({ eventId, maxAttendees }: { eventId: string, maxAttendees?: number }) {
    const firestore = useFirestore();
    const registrationsQuery = useMemoFirebase(() => collection(firestore, `events/${eventId}/registrations`), [eventId, firestore]);
    const { data: registrations, isLoading } = useCollection<Registration>(registrationsQuery);
    
    const spotsLeft = maxAttendees ? maxAttendees - (registrations?.length || 0) : 'illimitées';

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <Users className="mr-2 h-4 w-4" /> 
                    ({registrations?.length || 0}{maxAttendees ? `/${maxAttendees}` : ''})
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Inscrits à l'événement</SheetTitle>
                    <SheetDescription>
                        {registrations?.length || 0} participant(s) inscrit(s). 
                        {maxAttendees && ` Places restantes: ${spotsLeft}.`}
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
                    {isLoading ? <Skeleton className="h-24 w-full" />
                    : registrations && registrations.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Email</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registrations.map(reg => (
                                    <TableRow key={reg.id}>
                                        <TableCell>{reg.userName}</TableCell>
                                        <TableCell>{reg.userEmail}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground py-10 text-center">Aucun inscrit pour le moment.</p>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

export default function EventsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const eventsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'events'), where('counselorId', '==', user.uid));
  }, [user, firestore]);
  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  useEffect(() => {
    if (isSheetOpen) {
      if (editingEvent) {
        form.reset({
          ...editingEvent,
          date: new Date(editingEvent.date).toISOString().slice(0, 16)
        });
        setImagePreview(editingEvent.imageUrl || null);
      } else {
        form.reset({
          title: '',
          description: '',
          date: '',
          location: '',
          meetLink: '',
          isPublic: false,
          imageUrl: null,
          maxAttendees: 0,
        });
        setImagePreview(null);
      }
    }
  }, [isSheetOpen, editingEvent, form]);

  const handleNewEvent = () => {
    setEditingEvent(null);
    setIsSheetOpen(true);
  };
  
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsSheetOpen(true);
  };
  
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    const eventRef = doc(firestore, 'events', eventToDelete.id);
    await deleteDocumentNonBlocking(eventRef);
    setEventToDelete(null);
    toast({ title: "Événement supprimé" });
  };

  const onSubmit = async (data: EventFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    const eventData = {
      ...data,
      counselorId: user.uid,
      imageUrl: imagePreview,
    };
    
    try {
      if (editingEvent) {
        const eventRef = doc(firestore, 'events', editingEvent.id);
        await setDocumentNonBlocking(eventRef, eventData, { merge: true });
        toast({ title: "Événement mis à jour" });
      } else {
        await addDocumentNonBlocking(collection(firestore, 'events'), eventData);
        toast({ title: "Événement créé" });
      }
      setIsSheetOpen(false);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder l'événement.", variant: 'destructive'});
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      setImagePreview(base64);
    }
  };

  const isLoading = isUserLoading || areEventsLoading;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Mes Événements</h1>
          <p className="text-muted-foreground">Créez et gérez vos ateliers, webinaires et autres événements.</p>
        </div>
        <Button onClick={handleNewEvent}><PlusCircle className="mr-2 h-4 w-4" />Nouvel Événement</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <Card key={event.id} className="flex flex-col">
              <CardHeader>
                {event.imageUrl && <div className="relative h-40 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg"><Image src={event.imageUrl} alt={event.title} fill className="object-cover" /></div>}
                <CardTitle>{event.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4"/>{new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <RegistrationsSheet eventId={event.id} maxAttendees={event.maxAttendees} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleEditEvent(event)}><Edit className="mr-2 h-4 w-4"/>Modifier</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEventToDelete(event)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Vous n'avez pas encore créé d'événement.</p>
        </div>
      )}
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <SheetHeader>
                <SheetTitle>{editingEvent ? "Modifier l'" : "Nouvel "}événement</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 pr-6 py-4 -mr-6">
                <div className="space-y-6">
                  <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date et Heure</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Lieu (si physique)</FormLabel><FormControl><Input placeholder="Ex: 123 Rue de Paris, Paris" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="meetLink" render={({ field }) => (<FormItem><FormLabel>Lien de visioconférence (Google Meet, etc.)</FormLabel><FormControl><Input type="url" placeholder="https://meet.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="maxAttendees" render={({ field }) => (<FormItem><FormLabel>Nombre de places maximum</FormLabel><FormControl><Input type="number" min="0" placeholder="0 pour illimité" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="imageUrl" render={() => (
                    <FormItem>
                      <FormLabel>Image de l'événement</FormLabel>
                      <div className="flex items-center gap-4">
                        {imagePreview ? <Image src={imagePreview} alt="Aperçu" width={120} height={67} className="rounded-md object-cover border" /> : <div className="h-[67px] w-[120px] bg-muted rounded-md border" />}
                        <input type="file" id="event-image" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('event-image')?.click()}>Choisir une image</Button>
                      </div>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="isPublic" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Événement public</FormLabel><p className="text-sm text-muted-foreground">Rendre cet événement visible sur votre page publique.</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </div>
              </ScrollArea>
              <SheetFooter className="pt-4 border-t mt-auto">
                <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Sauvegarder</Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      
       <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible. L'événement "{eventToDelete?.title}" sera définitivement supprimé.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
