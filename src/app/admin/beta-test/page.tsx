
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Check, X, AlertTriangle, Edit, Sparkles, Trash2, Loader2, Save } from "lucide-react";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TestCaseStatus = 'passed' | 'failed' | 'blocked' | 'pending';

interface TestCase {
  id: string;
  title: string;
  description: string;
  scenario: string;
  role: string;
  status: TestCaseStatus;
}

const testCaseSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.'),
  description: z.string().min(1, 'La description est requise.'),
  scenario: z.string().min(1, 'Le scénario est requis.'),
  role: z.string().min(1, 'Le rôle est requis.'),
});

const initialScenarios = ['Connexion', 'Profil', 'Facturation'];
const initialRoles = ['Testeur', 'Administrateur', 'Client'];
const initialTestCases: TestCase[] = [
  {
    id: 'case-1',
    title: "Vérifier que l'ajout d'une nouvelle dépense fonctionne.",
    description: "Connectez-vous en tant qu'utilisateur, allez dans la section des dépenses, et ajoutez une nouvelle dépense avec un montant, une date et une catégorie. Vérifiez qu'elle apparaît dans la liste.",
    scenario: 'Facturation',
    role: 'Testeur',
    status: 'pending',
  },
  {
    id: 'case-2',
    title: "Modifier le profil utilisateur.",
    description: "Se connecter avec un compte utilisateur, modifier les informations du profil (nom, avatar), et vérifier que les modifications sont sauvegardées et affichées correctement.",
    scenario: 'Profil',
    role: 'Utilisateur',
    status: 'pending',
  },
];

const statusConfig: Record<TestCaseStatus, { text: string; icon: React.ReactNode; className: string }> = {
  passed: { text: "Réussi", icon: <Check className="h-4 w-4" />, className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
  failed: { text: "Échoué", icon: <X className="h-4 w-4" />, className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200" },
  blocked: { text: "Bloqué", icon: <AlertTriangle className="h-4 w-4" />, className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200" },
  pending: { text: "En attente", icon: null, className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200" },
};

function TagManager({ title, tags, onTagsChange }: { title: string, tags: string[], onTagsChange: (newTags: string[]) => void }) {
  const [newTag, setNewTag] = useState('');

  const handleAdd = () => {
    if (newTag && !tags.includes(newTag)) {
      onTagsChange([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="group relative pr-6">
              {tag}
              <button
                onClick={() => handleRemove(tag)}
                className="absolute top-1/2 right-1 -translate-y-1/2 w-4 h-4 rounded-full bg-muted-foreground/20 text-muted-foreground opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder={`Nouveau ${title.slice(0, -1).toLowerCase()}`}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BetaTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases);
  const [scenarios, setScenarios] = useState<string[]>(initialScenarios);
  const [roles, setRoles] = useState<string[]>(initialRoles);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);

  const form = useForm<z.infer<typeof testCaseSchema>>({
    resolver: zodResolver(testCaseSchema),
  });

  useEffect(() => {
    if (editingCase) {
      form.reset(editingCase);
    } else {
      form.reset({ title: '', description: '', scenario: '', role: '' });
    }
  }, [editingCase, isDialogOpen, form]);

  const setTestStatus = (id: string, status: TestCaseStatus) => {
    setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, status } : tc));
  };

  const handleFormSubmit = (data: z.infer<typeof testCaseSchema>) => {
    if (editingCase) {
      // Update existing case
      setTestCases(prev => prev.map(tc => tc.id === editingCase.id ? { ...editingCase, ...data } : tc));
    } else {
      // Add new case
      const newCase: TestCase = {
        id: `case-${Date.now()}`,
        ...data,
        status: 'pending',
      };
      setTestCases(prev => [newCase, ...prev]);
    }
    setIsDialogOpen(false);
  };
  
  const deleteTestCase = (id: string) => {
      setTestCases(prev => prev.filter(tc => tc.id !== id));
  };
  
  const handleOpenDialog = (testCase: TestCase | null = null) => {
      setEditingCase(testCase);
      setIsDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Recette de test</h1>
          <p className="text-muted-foreground">Gérez les scénarios de test pour l'application.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau cas de test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{editingCase ? 'Modifier le cas de test' : 'Nouveau cas de test'}</DialogTitle>
              <DialogDescription>
                Décrivez le cas de test, son scénario et le rôle associé.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} placeholder="Ex: Vérifier la connexion utilisateur" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} placeholder="Étapes détaillées pour reproduire le test..." /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="scenario" render={({ field }) => (
                    <FormItem><FormLabel>Scénario</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir un scénario" /></SelectTrigger></FormControl><SelectContent>{scenarios.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>Rôle</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir un rôle" /></SelectTrigger></FormControl><SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )}/>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                  <Button type="submit"><Save className="mr-2 h-4 w-4" />{editingCase ? 'Sauvegarder' : 'Créer'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TagManager title="Scénarios" tags={scenarios} onTagsChange={setScenarios} />
        <TagManager title="Rôles" tags={roles} onTagsChange={setRoles} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des cas de test</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full space-y-4">
            {testCases.map((testCase) => (
              <AccordionItem key={testCase.id} value={testCase.id} className="border rounded-lg bg-background">
                <AccordionTrigger className="p-4 hover:no-underline text-left">
                  <div className="flex-1 flex items-center gap-4">
                    <div className={cn("w-4 h-4 rounded-full shrink-0", statusConfig[testCase.status].className.split(' ')[0])} />
                    <span className="font-semibold">{testCase.title}</span>
                  </div>
                  <div className="flex gap-2 items-center text-sm text-muted-foreground mr-4">
                    <Badge variant="outline">{testCase.scenario}</Badge>
                    <Badge variant="outline">{testCase.role}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t">
                  <p className="text-muted-foreground mb-6 whitespace-pre-wrap">{testCase.description}</p>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                     <div className="flex flex-wrap items-center gap-4">
                        <span className="font-medium text-sm">Résultat du test:</span>
                        <div className="flex gap-2 flex-wrap">
                          {Object.keys(statusConfig).map(statusKey => {
                            const status = statusKey as TestCaseStatus;
                            const config = statusConfig[status];
                            return (
                              <Button
                                key={status}
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "gap-2", config.className,
                                    testCase.status === status && "ring-2 ring-offset-2 ring-primary"
                                )}
                                onClick={() => setTestStatus(testCase.id, status)}
                              >
                                {config.icon}
                                {config.text}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 w-full sm:w-auto">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(testCase)}><Edit className="mr-2 h-4 w-4" />Modifier</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTestCase(testCase.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>
                      </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
            {testCases.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                    <p>Aucun cas de test pour le moment.</p>
                    <Button variant="link" onClick={() => handleOpenDialog()}>Créer le premier cas de test</Button>
                </div>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
