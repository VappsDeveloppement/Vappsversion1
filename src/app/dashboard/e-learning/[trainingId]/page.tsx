
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useDoc, useMemoFirebase, useCollection, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, GripVertical, FilePlus, X, Send, Download } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAgency } from '@/context/agency-provider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendTrainingProgram } from '@/app/actions/training';


const parcoursSchema = z.object({
  prerequisites: z.array(z.string()).optional(),
  entryLevel: z.array(z.string()).optional(),
  exitLevel: z.array(z.string()).optional(),
  moduleIds: z.array(z.string()).optional(),
});

type ParcoursFormData = z.infer<typeof parcoursSchema>;

type Training = {
    id: string;
    title: string;
    description?: string;
    prerequisites?: string[];
    entryLevel?: string[];
    exitLevel?: string[];
    moduleIds?: string[];
    authorId: string;
    price?: number;
    duration?: number;
};

type TrainingModule = {
    id: string;
    title: string;
    description?: string;
};

const TagInput = ({ value, onChange, placeholder }: { value: string[] | undefined; onChange: (value: string[]) => void, placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');
    const currentValues = value || [];

    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            const newTags = [...currentValues, inputValue.trim()];
            onChange(newTags);
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(currentValues.filter(tag => tag !== tagToRemove));
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2">
                {currentValues.map(tag => (
                    <Badge key={tag} variant="secondary">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={addTag}
                placeholder={placeholder}
            />
        </div>
    );
};

export default function TrainingCurriculumPage() {
    const params = useParams();
    const { trainingId } = params;
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendEmail, setSendEmail] = useState('');
    const { personalization } = useAgency();

    const trainingRef = useMemoFirebase(() => {
        if (!trainingId) return null;
        return doc(firestore, 'trainings', trainingId as string);
    }, [firestore, trainingId]);

    const { data: training, isLoading } = useDoc<Training>(trainingRef);

    const counselorDocRef = useMemoFirebase(() => training ? doc(firestore, 'users', training.authorId) : null, [firestore, training]);
    const { data: counselorData } = useDoc(counselorDocRef);
    
    const modulesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'training_modules'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: allModules, isLoading: areModulesLoading } = useCollection<TrainingModule>(modulesQuery);

    const form = useForm<ParcoursFormData>({
        resolver: zodResolver(parcoursSchema),
        defaultValues: { prerequisites: [], entryLevel: [], exitLevel: [], moduleIds: [] },
    });
    
    useEffect(() => {
        if (training) {
            form.reset({
                prerequisites: training.prerequisites || [],
                entryLevel: training.entryLevel || [],
                exitLevel: training.exitLevel || [],
                moduleIds: training.moduleIds || [],
            });
        }
    }, [training, form]);
    
    const onSubmit = (data: ParcoursFormData) => {
        if (!trainingRef) return;
        setDocumentNonBlocking(trainingRef, data, { merge: true });
        toast({ title: 'Parcours sauvegardé', description: 'Les modifications ont été enregistrées.' });
    };

    const modulesInParcours = useMemo(() => {
        const moduleIds = form.watch('moduleIds') || [];
        if (!allModules) return [];
        return moduleIds.map(id => allModules.find(m => m.id === id)).filter(Boolean) as TrainingModule[];
    }, [form.watch('moduleIds'), allModules]);
    
    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(modulesInParcours);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        form.setValue('moduleIds', items.map(item => item.id), { shouldDirty: true });
        form.handleSubmit(onSubmit)();
    };
    
    const handleModuleSelection = (moduleId: string) => {
        const currentModuleIds = form.getValues('moduleIds') || [];
        const newModuleIds = currentModuleIds.includes(moduleId)
            ? currentModuleIds.filter(id => id !== moduleId)
            : [...currentModuleIds, moduleId];
        form.setValue('moduleIds', newModuleIds, { shouldDirty: true });
    };
    
    const handleAddModules = () => {
      setIsSheetOpen(false);
      form.handleSubmit(onSubmit)();
    }
    
     const generatePdfDataUri = async (): Promise<string> => {
        const doc = new jsPDF();
        const counselorName = counselorData?.commercialName || `${counselorData?.firstName} ${counselorData?.lastName}` || "Conseiller";
        const trainingTitle = training?.title || "Programme de Formation";
        const fullAddress = [counselorData?.address, counselorData?.zipCode, counselorData?.city].filter(Boolean).join(', ');
        
        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(trainingTitle, 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Proposé par ${counselorName}`, 15, 28);
        if (fullAddress) doc.text(fullAddress, 15, 33);
        if (counselorData?.email) doc.text(counselorData.email, 15, 38);
        if (counselorData?.phone) doc.text(counselorData.phone, 15, 43);

        let y = 50;

        doc.setDrawColor(230);
        doc.line(15, y, 195, y);
        y += 10;
        
        const addInfoLine = (label: string, value: string) => {
            if (value) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(label, 15, y);
                doc.setFont('helvetica', 'normal');
                doc.text(value, 45, y);
                y += 7;
            }
        };

        addInfoLine("Durée :", training?.duration ? `${training.duration} heures` : '');
        addInfoLine("Prix :", training?.price ? `${training.price} €` : '');

        y += 5;

        const addTagsSection = (title: string, tags: string[] | undefined) => {
            if (tags && tags.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(title, 15, y);
                y += 7;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(tags.join(' • '), 15, y, { maxWidth: 180 });
                y += tags.length > 3 ? 15 : 10;
            }
        };

        addTagsSection("Prérequis", training?.prerequisites);
        addTagsSection("Niveau d'entrée", training?.entryLevel);
        addTagsSection("Niveau de sortie", training?.exitLevel);
        
        y += 5;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Programme Détaillé", 15, y);
        y += 10;
        
        modulesInParcours.forEach((module, index) => {
            if (y > 260) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${index + 1}. ${module.title}`, 15, y);
            y += 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const descriptionLines = doc.splitTextToSize(module.description || 'Aucune description.', 180);
            doc.text(descriptionLines, 15, y);
            y += descriptionLines.length * 5 + 8;
        });

        return doc.output('datauristring');
    };

    const handleSendProgram = async () => {
        if (!sendEmail) {
            toast({ title: "Email manquant", description: "Veuillez saisir une adresse e-mail.", variant: "destructive" });
            return;
        }

        const emailSettingsToUse = (counselorData as any)?.emailSettings?.fromEmail ? (counselorData as any).emailSettings : personalization?.emailSettings;
        if (!emailSettingsToUse?.fromEmail) {
             toast({ title: "Configuration requise", description: "Les paramètres d'envoi d'e-mails ne sont pas configurés.", variant: "destructive" });
            return;
        }
        
        setIsSending(true);

        try {
            const pdfDataUri = await generatePdfDataUri();
            const result = await sendTrainingProgram({
                recipientEmail: sendEmail,
                subject: `Programme de la formation : ${training?.title}`,
                htmlBody: `<p>Bonjour,</p><p>Veuillez trouver ci-joint le programme détaillé de la formation "${training?.title}".</p><p>Cordialement,<br/>${emailSettingsToUse.fromName}</p>`,
                pdfDataUri,
                fileName: `Programme-${training?.title?.replace(/\s/g, '_')}.pdf`,
                emailSettings: emailSettingsToUse,
            });

            if (result.success) {
                toast({ title: "Programme envoyé", description: `Le PDF a été envoyé à ${sendEmail}` });
                setSendEmail('');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Erreur d'envoi", description: error.message || "Une erreur est survenue.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };


    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
        );
    }
    
    if (!training) {
        return (
             <div className="space-y-4">
                <Link href="/dashboard/e-learning" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la liste des formations
                </Link>
                <h1 className="text-2xl font-bold">Formation non trouvée</h1>
                <p className="text-muted-foreground">Impossible de charger les détails de cette formation.</p>
            </div>
        )
    }

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Link href="/dashboard/e-learning" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste des formations
            </Link>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Parcours de la formation : {training.title}</h1>
                    <p className="text-muted-foreground">
                       Gérez les prérequis, niveaux et modules de cette formation.
                    </p>
                </div>
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary"><Send className="mr-2 h-4 w-4" /> Exporter & Envoyer</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Envoyer le programme de formation</DialogTitle>
                            <DialogDescription>
                                Saisissez l'adresse e-mail du destinataire. Le programme sera généré en PDF et envoyé en pièce jointe.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email-recipient" className="text-right">Email</Label>
                                <Input id="email-recipient" type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSendProgram} disabled={isSending}>
                                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Envoyer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card>
                <CardHeader><CardTitle>Informations Clés</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="prerequisites" render={({ field }) => (<FormItem><FormLabel>Prérequis</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un prérequis..." /></FormControl></FormItem>)}/>
                        <FormField control={form.control} name="entryLevel" render={({ field }) => (<FormItem><FormLabel>Niveau d'entrée</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau..." /></FormControl></FormItem>)}/>
                        <FormField control={form.control} name="exitLevel" render={({ field }) => (<FormItem><FormLabel>Niveau de sortie</FormLabel><FormControl><TagInput {...field} placeholder="Ajouter un niveau..." /></FormControl></FormItem>)}/>
                    </div>
                     <div className="flex justify-end"><Button type="submit">Enregistrer les informations</Button></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Modules du Parcours</CardTitle>
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline"><FilePlus className="mr-2 h-4 w-4"/>Ajouter des modules</Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Ajouter des modules au parcours</SheetTitle>
                                </SheetHeader>
                                <ScrollArea className="h-[calc(100vh-10rem)] pr-4 mt-6">
                                     <div className="space-y-2">
                                        {areModulesLoading ? <Skeleton className="h-20 w-full" /> : (allModules || []).map(module => (
                                            <div key={module.id} className="flex items-center gap-4 p-2 border rounded-md">
                                                <Checkbox
                                                    id={`module-${module.id}`}
                                                    checked={(form.watch('moduleIds') || []).includes(module.id)}
                                                    onCheckedChange={() => handleModuleSelection(module.id)}
                                                />
                                                <label htmlFor={`module-${module.id}`} className="flex-1 cursor-pointer">
                                                    <p className="font-medium">{module.title}</p>
                                                    <p className="text-sm text-muted-foreground line-clamp-1">{module.description}</p>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                 <div className="absolute bottom-6 right-6">
                                    <Button onClick={handleAddModules}>Terminé</Button>
                                 </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </CardHeader>
                <CardContent>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="modules">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                    {modulesInParcours.length > 0 ? modulesInParcours.map((module, index) => (
                                        <Draggable key={module.id} draggableId={module.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className="flex items-center gap-4 p-4 border rounded-lg bg-background shadow-sm"
                                                >
                                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                    <div className="flex-1">
                                                        <p className="font-semibold">{module.title}</p>
                                                        <p className="text-sm text-muted-foreground">{module.description}</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        const newModuleIds = form.getValues('moduleIds')?.filter(id => id !== module.id);
                                                        form.setValue('moduleIds', newModuleIds, { shouldDirty: true });
                                                        form.handleSubmit(onSubmit)();
                                                    }}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            )}
                                        </Draggable>
                                    )) : (
                                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                            <p>Aucun module dans ce parcours.</p>
                                            <p className="text-sm">Cliquez sur "Ajouter des modules" pour commencer.</p>
                                        </div>
                                    )}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </CardContent>
            </Card>
        </form>
        </Form>
    );
}
