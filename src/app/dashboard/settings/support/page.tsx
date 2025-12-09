
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, where, addDoc } from 'firebase/firestore';
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, MessageSquare, Loader2, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type FaqItem = {
  id: string;
  category: string;
  question: string;
  content: string;
};

const supportFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email('L\'email est invalide.'),
  subject: z.string().min(1, 'Le sujet est requis.'),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères.'),
});
type SupportFormData = z.infer<typeof supportFormSchema>;

function GeneralFaqViewer({ scope }: { scope: 'conseiller' | 'membre' }) {
  const firestore = useFirestore();

  const faqQuery = useMemoFirebase(() => {
    return query(
      collection(firestore, 'faq_items'),
      where('scope', '==', scope)
    );
  }, [firestore, scope]);

  const { data: faqItems, isLoading: areFaqsLoading } = useCollection<FaqItem>(faqQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>FAQ pour {scope === 'conseiller' ? 'Conseillers' : 'Membres'}</CardTitle>
        <CardDescription>Retrouvez les réponses aux questions les plus fréquentes.</CardDescription>
      </CardHeader>
      <CardContent>
          {areFaqsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : faqItems && faqItems.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem value={item.id} key={item.id}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: item.content }} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Aucune question dans la FAQ</h3>
                <p className="mt-2 text-sm text-muted-foreground">La section d'aide est en cours de construction.</p>
            </div>
          )}
      </CardContent>
    </Card>
  )
}

export default function SupportPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const userDocRef = useMemoFirebase(() => (user?.uid ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    const supportForm = useForm<SupportFormData>({ 
      resolver: zodResolver(supportFormSchema), 
      defaultValues: { name: '', email: '', subject: '', message: '' }
    });

    useEffect(() => {
        if(user) {
            supportForm.reset({
                name: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : user.displayName || '',
                email: user.email || '',
                subject: '',
                message: ''
            })
        }
    }, [user, userData, supportForm]);
    
     const handleSupportSubmit = async (data: SupportFormData) => {
        setIsSubmitting(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'support_requests'), {
                ...data, status: 'new', createdAt: new Date().toISOString(),
            });
            toast({ title: 'Demande envoyée', description: 'Votre demande de support a été envoyée.' });
            setIsDialogOpen(false);
            supportForm.reset();
        } catch (error) {
            toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isUserLoading || isUserDataLoading;
    
    if (isLoading) {
       return <div className="space-y-8"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
    }
    
    const userRole = userData?.role;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Support</h1>
                    <p className="text-muted-foreground">Accédez à la FAQ et contactez le support si besoin.</p>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button><Send className="mr-2 h-4 w-4" />Contacter le support</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Soumettre une demande de support</DialogTitle><DialogDescription>Décrivez votre problème ou votre question.</DialogDescription></DialogHeader>
                        <Form {...supportForm}>
                            <form onSubmit={supportForm.handleSubmit(handleSupportSubmit)} className="space-y-4 py-4">
                                <FormField control={supportForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Votre Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={supportForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Votre Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={supportForm.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Sujet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={supportForm.control} name="message" render={({ field }) => (<FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Envoyer</Button></DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {userRole === 'conseiller' && (
                <GeneralFaqViewer scope="conseiller" />
            )}
            {userRole === 'membre' && (
                <GeneralFaqViewer scope="membre" />
            )}
        </div>
    );
}
