
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Check, X, AlertTriangle, Edit, Trash2, Save, Folder, UserCheck, Upload, Video, Image as ImageIcon } from "lucide-react";
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type TestCaseStatus = 'passed' | 'failed' | 'blocked' | 'pending';

interface TestCase {
  id: string;
  title: string;
  description: string;
  status: TestCaseStatus;
  note?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

interface Role {
  id: string;
  name: string;
  testCases: TestCase[];
}

interface Scenario {
  id: string;
  name: string;
  roles: Role[];
}

const testCaseSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.'),
  description: z.string().min(1, 'La description est requise.'),
  note: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
});

const scenarioSchema = z.object({
  name: z.string().min(1, 'Le nom de la fonctionnalité est requis.'),
});

const roleSchema = z.object({
  name: z.string().min(1, 'Le nom du rôle est requis.'),
});

const initialScenarios: Scenario[] = [
  {
    id: 'scenario-1',
    name: 'Connexion',
    roles: [
      {
        id: 'role-1-1',
        name: 'Testeur',
        testCases: [
          { id: 'case-1-1-1', title: 'Connexion avec email/mot de passe valide', description: "Vérifier que l'utilisateur peut se connecter avec des identifiants corrects.", status: 'pending' },
          { id: 'case-1-1-2', title: 'Connexion avec mot de passe invalide', description: "Vérifier qu'un message d'erreur s'affiche en cas de mot de passe incorrect.", status: 'pending' },
        ],
      },
    ],
  },
];

const statusConfig: Record<TestCaseStatus, { text: string; icon: React.ReactNode; className: string }> = {
  passed: { text: "Réussi", icon: <Check className="h-4 w-4" />, className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
  failed: { text: "Échoué", icon: <X className="h-4 w-4" />, className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200" },
  blocked: { text: "Bloqué", icon: <AlertTriangle className="h-4 w-4" />, className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200" },
  pending: { text: "En attente", icon: null, className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200" },
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export default function BetaTestPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  
  const [isTestCaseDialogOpen, setIsTestCaseDialogOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  
  const [isScenarioDialogOpen, setIsScenarioDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  
  const testCaseForm = useForm<z.infer<typeof testCaseSchema>>({
    resolver: zodResolver(testCaseSchema),
    defaultValues: { title: '', description: '', note: '', mediaUrl: '', mediaType: 'image' },
  });

  const scenarioForm = useForm<z.infer<typeof scenarioSchema>>({
    resolver: zodResolver(scenarioSchema),
    defaultValues: { name: '' },
  });

  const roleForm = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '' },
  });
  
  useEffect(() => {
    try {
      const savedScenarios = localStorage.getItem('beta-test-scenarios');
      if (savedScenarios) {
        const parsedScenarios = JSON.parse(savedScenarios);
        setScenarios(parsedScenarios);
        if (parsedScenarios.length > 0) {
            setSelectedScenarioId(parsedScenarios[0].id);
            if (parsedScenarios[0].roles.length > 0) {
                setSelectedRoleId(parsedScenarios[0].roles[0].id);
            }
        }
      } else {
        setScenarios(initialScenarios);
         if (initialScenarios.length > 0) {
            setSelectedScenarioId(initialScenarios[0].id);
             if (initialScenarios[0].roles.length > 0) {
                setSelectedRoleId(initialScenarios[0].roles[0].id);
            }
        }
      }
    } catch (error) {
        console.error("Could not load scenarios from localStorage", error);
        setScenarios(initialScenarios);
    }
  }, []);

  useEffect(() => {
    try {
        if(scenarios.length > 0) {
            localStorage.setItem('beta-test-scenarios', JSON.stringify(scenarios));
        }
    } catch (error) {
        console.error("Could not save scenarios to localStorage", error);
    }
  }, [scenarios]);
  
  useEffect(() => {
    if (isTestCaseDialogOpen) {
      if (editingTestCase) {
        testCaseForm.reset(editingTestCase);
        setMediaPreview(editingTestCase.mediaUrl || null);
      } else {
        testCaseForm.reset({ title: '', description: '', note: '', mediaUrl: '', mediaType: 'image' });
        setMediaPreview(null);
      }
    }
  }, [editingTestCase, isTestCaseDialogOpen, testCaseForm]);


  const handleScenarioFormSubmit = (data: z.infer<typeof scenarioSchema>) => {
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: data.name,
      roles: []
    };
    setScenarios(current => [...current, newScenario]);
    setIsScenarioDialogOpen(false);
    scenarioForm.reset();
  };

  const deleteScenario = (scenarioId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette fonctionnalité et tous ses rôles/cas de test ?")) {
      const newScenarios = scenarios.filter(s => s.id !== scenarioId);
      setScenarios(newScenarios);
      if (selectedScenarioId === scenarioId) {
        setSelectedScenarioId(newScenarios[0]?.id || null);
        setSelectedRoleId(newScenarios[0]?.roles[0]?.id || null);
      }
    }
  };

  const handleRoleFormSubmit = (data: z.infer<typeof roleSchema>) => {
    if (!selectedScenarioId) return;

    const newRole: Role = { id: `role-${Date.now()}`, name: data.name, testCases: [] };
    setScenarios(currentScenarios => currentScenarios.map(s => 
      s.id === selectedScenarioId 
      ? { ...s, roles: [...s.roles, newRole] } 
      : s
    ));
    setIsRoleDialogOpen(false);
    roleForm.reset();
  };
  
  const deleteRoleFromScenario = (scenarioId: string, roleId: string) => {
     if (window.confirm("Êtes-vous sûr de vouloir supprimer ce rôle ?")) {
        setScenarios(scenarios.map(s => 
            s.id === scenarioId 
            ? { ...s, roles: s.roles.filter(r => r.id !== roleId) } 
            : s
        ));
        if (selectedRoleId === roleId) {
            setSelectedRoleId(null);
        }
     }
  };

  const handleOpenTestCaseDialog = (testCase: TestCase | null = null) => {
    setEditingTestCase(testCase);
    setIsTestCaseDialogOpen(true);
  };
  
  const handleTestCaseFormSubmit = (data: z.infer<typeof testCaseSchema>) => {
    if (!selectedScenarioId || !selectedRoleId) return;
    
    const finalData = { ...data, mediaUrl: mediaPreview };

    setScenarios(scenarios.map(scenario => {
        if (scenario.id !== selectedScenarioId) return scenario;
        return {
            ...scenario,
            roles: scenario.roles.map(role => {
                if (role.id !== selectedRoleId) return role;
                let newTestCases: TestCase[];
                if (editingTestCase) {
                    newTestCases = role.testCases.map(tc => tc.id === editingTestCase.id ? { ...tc, ...finalData } : tc);
                } else {
                    const newTestCase: TestCase = { id: `case-${Date.now()}`, ...finalData, status: 'pending' };
                    newTestCases = [newTestCase, ...role.testCases];
                }
                return { ...role, testCases: newTestCases };
            })
        };
    }));

    setIsTestCaseDialogOpen(false);
  };

  const deleteTestCase = (testCaseId: string) => {
    if (!selectedScenarioId || !selectedRoleId || !window.confirm("Supprimer ce cas de test ?")) return;
    setScenarios(scenarios.map(scenario => 
        scenario.id === selectedScenarioId ? {
            ...scenario,
            roles: scenario.roles.map(role => 
                role.id === selectedRoleId ? {
                    ...role,
                    testCases: role.testCases.filter(tc => tc.id !== testCaseId)
                } : role
            )
        } : scenario
    ));
  };

  const setTestStatus = (testCaseId: string, status: TestCaseStatus) => {
     if (!selectedScenarioId || !selectedRoleId) return;
     setScenarios(scenarios.map(scenario => 
        scenario.id === selectedScenarioId ? {
            ...scenario,
            roles: scenario.roles.map(role => 
                role.id === selectedRoleId ? {
                    ...role,
                    testCases: role.testCases.map(tc => tc.id === testCaseId ? {...tc, status} : tc)
                } : role
            )
        } : scenario
    ));
  };
  
   const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      setMediaPreview(base64);
    }
  };


  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
  const selectedRole = selectedScenario?.roles.find(r => r.id === selectedRoleId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Recette de test</h1>
          <p className="text-muted-foreground">Gérez les scénarios de test pour l'application.</p>
        </div>
        <Button onClick={() => setIsScenarioDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle Fonctionnalité
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-15rem)]">
        <Card className="md:col-span-3 lg:col-span-2 flex flex-col">
          <CardHeader className='p-3 border-b'>
            <CardTitle className='text-base'>Fonctionnalités</CardTitle>
          </CardHeader>
          <CardContent className="p-1 flex-1 overflow-y-auto">
            {scenarios.map(scenario => (
              <div key={scenario.id} data-active={selectedScenarioId === scenario.id} onClick={() => { setSelectedScenarioId(scenario.id); setSelectedRoleId(scenario.roles[0]?.id || null); }} className="group flex items-center justify-between rounded-md text-sm p-2 hover:bg-muted cursor-pointer" >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="h-4 w-4 text-primary" />
                  <span className="truncate">{scenario.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteScenario(scenario.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-9 lg:col-span-10 flex flex-col">
          <CardHeader className='p-3 border-b'>
            <CardTitle className='text-base'>{selectedScenario?.name || "Sélectionnez une fonctionnalité"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 grid grid-cols-12 overflow-hidden">
            <div className="col-span-12 lg:col-span-3 border-r h-full overflow-y-auto">
              <div className="p-3 border-b flex justify-between items-center">
                <h4 className="text-sm font-semibold">Rôles</h4>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsRoleDialogOpen(true)} disabled={!selectedScenarioId}>
                    <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className='p-1'>
                {selectedScenario?.roles.map(role => (
                  <div key={role.id} data-active={selectedRoleId === role.id} onClick={() => setSelectedRoleId(role.id)} className="group flex items-center justify-between rounded-md text-sm p-2 hover:bg-muted cursor-pointer">
                    <div className="flex items-center gap-2 truncate">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{role.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => {e.stopPropagation(); selectedScenario && deleteRoleFromScenario(selectedScenario.id, role.id)}}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-9 h-full overflow-y-auto">
              <div className="p-3 border-b flex justify-between items-center">
                <h4 className="text-sm font-semibold">{selectedRole?.name ? `Cas de test pour: ${selectedRole.name}` : "Sélectionnez un rôle"}</h4>
                <Button onClick={() => handleOpenTestCaseDialog()} disabled={!selectedRole}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un cas
                </Button>
              </div>
              <div className='p-3'>
                {selectedRole ? (
                  selectedRole.testCases.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4">
                      {selectedRole.testCases.map((testCase) => (
                        <AccordionItem key={testCase.id} value={testCase.id} className="border rounded-lg bg-background">
                          <AccordionTrigger className="p-4 hover:no-underline text-left">
                            <div className="flex-1 flex items-center gap-4">
                              <div className={cn("w-4 h-4 rounded-full shrink-0", statusConfig[testCase.status].className.split(' ')[0])} />
                              <span className="font-semibold">{testCase.title}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 border-t space-y-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Description / Étapes</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap">{testCase.description}</p>
                            </div>

                             {testCase.note && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Note explicative</h4>
                                    <p className="text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-md p-3 whitespace-pre-wrap">{testCase.note}</p>
                                </div>
                             )}
                             
                             {testCase.mediaUrl && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Média</h4>
                                    {testCase.mediaType === 'image' ? (
                                        <Image src={testCase.mediaUrl} alt="Média du cas de test" width={400} height={300} className="rounded-md border object-cover"/>
                                    ) : (
                                        <video src={testCase.mediaUrl} controls className="rounded-md border w-full max-w-md"></video>
                                    )}
                                </div>
                             )}

                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-6 border-t">
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
                                        className={cn("gap-2", config.className, testCase.status === status && "ring-2 ring-offset-2 ring-primary")}
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
                                <Button variant="ghost" size="sm" onClick={() => handleOpenTestCaseDialog(testCase)}><Edit className="mr-2 h-4 w-4" />Modifier</Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteTestCase(testCase.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      <p>Aucun cas de test pour ce rôle.</p>
                      <p className="text-sm">Cliquez sur "Ajouter un cas" pour commencer.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <p>Veuillez sélectionner une fonctionnalité et un rôle pour voir les cas de test.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

       <Dialog open={isScenarioDialogOpen} onOpenChange={setIsScenarioDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nouvelle Fonctionnalité</DialogTitle>
            <DialogDescription>
              Entrez le nom de la nouvelle fonctionnalité à tester.
            </DialogDescription>
          </DialogHeader>
          <Form {...scenarioForm}>
            <form onSubmit={scenarioForm.handleSubmit(handleScenarioFormSubmit)} className="space-y-4 py-4">
              <FormField control={scenarioForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la fonctionnalité</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Gestion de profil" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsScenarioDialogOpen(false)}>Annuler</Button>
                <Button type="submit"><Save className="mr-2 h-4 w-4" />Créer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nouveau Rôle</DialogTitle>
            <DialogDescription>
              Ajouter un nouveau rôle à la fonctionnalité "{selectedScenario?.name}".
            </DialogDescription>
          </DialogHeader>
          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit(handleRoleFormSubmit)} className="space-y-4 py-4">
              <FormField control={roleForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du rôle</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Administrateur" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Annuler</Button>
                <Button type="submit"><Save className="mr-2 h-4 w-4" />Créer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTestCaseDialogOpen} onOpenChange={setIsTestCaseDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{editingTestCase ? 'Modifier le cas de test' : 'Nouveau cas de test'}</DialogTitle>
            <DialogDescription>
              Décrivez le titre et les étapes pour ce cas de test. Vous pouvez également ajouter une note ou un média.
            </DialogDescription>
          </DialogHeader>
          <Form {...testCaseForm}>
            <form onSubmit={testCaseForm.handleSubmit(handleTestCaseFormSubmit)} className="space-y-6 py-4">
              <FormField control={testCaseForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} placeholder="Ex: Vérifier la connexion utilisateur" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={testCaseForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description / Étapes</FormLabel><FormControl><Textarea {...field} placeholder="1. Aller à la page de connexion.\n2. Entrer un email valide...\n3. Vérifier que l'utilisateur est redirigé vers le tableau de bord." rows={5} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={testCaseForm.control} name="note" render={({ field }) => (
                <FormItem><FormLabel>Note explicative (Optionnel)</FormLabel><FormControl><Textarea {...field} placeholder="Information supplémentaire pour le testeur..." rows={3} /></FormControl><FormMessage /></FormItem>
              )}/>

              <div>
                <FormLabel>Média (Optionnel)</FormLabel>
                <div className="mt-2 space-y-4">
                  <FormField
                    control={testCaseForm.control}
                    name="mediaType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex items-center space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="image" /></FormControl>
                              <FormLabel className="font-normal">Image</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="video" /></FormControl>
                              <FormLabel className="font-normal">Vidéo</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-4">
                     {mediaPreview ? (
                        testCaseForm.getValues('mediaType') === 'image' ? (
                            <Image src={mediaPreview} alt="Aperçu" width={120} height={90} className="rounded-md border object-cover" />
                        ) : (
                            <video src={mediaPreview} controls className="rounded-md border w-40"></video>
                        )
                     ) : (
                        <div className="h-24 w-32 bg-muted rounded-md flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground"/>
                        </div>
                     )}
                    <input type="file" ref={mediaInputRef} onChange={handleMediaUpload} className="hidden" accept="image/*,video/*" />
                     <div className="flex flex-col gap-2">
                        <Button type="button" variant="outline" onClick={() => mediaInputRef.current?.click()}><Upload className="mr-2 h-4 w-4"/>Uploader</Button>
                        {mediaPreview && (
                            <Button type="button" variant="destructive" size="sm" onClick={() => setMediaPreview(null)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</Button>
                        )}
                     </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTestCaseDialogOpen(false)}>Annuler</Button>
                <Button type="submit"><Save className="mr-2 h-4 w-4" />{editingTestCase ? 'Sauvegarder' : 'Créer'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
