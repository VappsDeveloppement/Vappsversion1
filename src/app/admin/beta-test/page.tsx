
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Check, X, AlertTriangle, Edit, Trash2, Save, MoreVertical, ChevronDown, ChevronRight, Folder, UserCheck } from "lucide-react";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

type TestCaseStatus = 'passed' | 'failed' | 'blocked' | 'pending';

interface TestCase {
  id: string;
  title: string;
  description: string;
  status: TestCaseStatus;
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
      { id: 'role-1-2', name: 'Administrateur', testCases: [] },
    ],
  },
  {
    id: 'scenario-2',
    name: 'Profil',
    roles: [
        { id: 'role-2-1', name: 'Utilisateur', testCases: [] },
    ],
  },
];


const statusConfig: Record<TestCaseStatus, { text: string; icon: React.ReactNode; className: string }> = {
  passed: { text: "Réussi", icon: <Check className="h-4 w-4" />, className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
  failed: { text: "Échoué", icon: <X className="h-4 w-4" />, className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200" },
  blocked: { text: "Bloqué", icon: <AlertTriangle className="h-4 w-4" />, className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200" },
  pending: { text: "En attente", icon: null, className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200" },
};


export default function BetaTestPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(initialScenarios[0]?.id || null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialScenarios[0]?.roles[0]?.id || null);
  
  const [isTestCaseDialogOpen, setIsTestCaseDialogOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);

  const form = useForm<z.infer<typeof testCaseSchema>>({
    resolver: zodResolver(testCaseSchema),
  });
  
  useEffect(() => {
    if (editingTestCase) {
      form.reset(editingTestCase);
    } else {
      form.reset({ title: '', description: '' });
    }
  }, [editingTestCase, isTestCaseDialogOpen, form]);


  // Scenario Management
  const addScenario = () => {
    const name = window.prompt("Nom de la nouvelle fonctionnalité :");
    if (name) {
      const newScenario: Scenario = { id: `scenario-${Date.now()}`, name, roles: [] };
      setScenarios([...scenarios, newScenario]);
    }
  };

  const deleteScenario = (scenarioId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette fonctionnalité et tous ses rôles/cas de test ?")) {
      setScenarios(scenarios.filter(s => s.id !== scenarioId));
      if (selectedScenarioId === scenarioId) {
        setSelectedScenarioId(scenarios.length > 1 ? scenarios.find(s => s.id !== scenarioId)!.id : null);
        setSelectedRoleId(null);
      }
    }
  };

  // Role Management
  const addRoleToScenario = (scenarioId: string) => {
    const name = window.prompt("Nom du nouveau rôle pour cette fonctionnalité :");
    if (name) {
      const newRole: Role = { id: `role-${Date.now()}`, name, testCases: [] };
      setScenarios(scenarios.map(s => s.id === scenarioId ? { ...s, roles: [...s.roles, newRole] } : s));
    }
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


  // Test Case Management
  const handleOpenTestCaseDialog = (testCase: TestCase | null = null) => {
    setEditingTestCase(testCase);
    setIsTestCaseDialogOpen(true);
  };
  
  const handleTestCaseFormSubmit = (data: z.infer<typeof testCaseSchema>) => {
    if (!selectedScenarioId || !selectedRoleId) return;

    setScenarios(scenarios.map(scenario => {
        if (scenario.id !== selectedScenarioId) return scenario;
        return {
            ...scenario,
            roles: scenario.roles.map(role => {
                if (role.id !== selectedRoleId) return role;
                let newTestCases: TestCase[];
                if (editingTestCase) {
                    newTestCases = role.testCases.map(tc => tc.id === editingTestCase.id ? { ...editingTestCase, ...data } : tc);
                } else {
                    const newTestCase: TestCase = { id: `case-${Date.now()}`, ...data, status: 'pending' };
                    newTestCases = [newTestCase, ...role.testCases];
                }
                return { ...role, testCases: newTestCases };
            })
        };
    }));

    setIsTestCaseDialogOpen(false);
  };

  const deleteTestCase = (testCaseId: string) => {
    if (!selectedScenarioId || !selectedRoleId) return;
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


  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
  const selectedRole = selectedScenario?.roles.find(r => r.id === selectedRoleId);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Recette de test</h1>
          <p className="text-muted-foreground">Gérez les scénarios de test pour l'application.</p>
        </div>
        <Button onClick={() => addScenario()}>
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
                        <div key={scenario.id} className="group flex items-center justify-between rounded-md text-sm p-2 hover:bg-muted cursor-pointer" data-active={selectedScenarioId === scenario.id} onClick={() => { setSelectedScenarioId(scenario.id); setSelectedRoleId(scenario.roles[0]?.id || null); }}>
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
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => selectedScenarioId && addRoleToScenario(selectedScenarioId)} disabled={!selectedScenarioId}>
                                <PlusCircle className="h-4 w-4"/>
                            </Button>
                         </div>
                         <div className='p-1'>
                             {selectedScenario?.roles.map(role => (
                                <div key={role.id} className="group flex items-center justify-between rounded-md text-sm p-2 hover:bg-muted cursor-pointer" data-active={selectedRoleId === role.id} onClick={() => setSelectedRoleId(role.id)}>
                                    <div className="flex items-center gap-2 truncate">
                                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                                        <span className="truncate">{role.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => {e.stopPropagation(); deleteRoleFromScenario(selectedScenario.id, role.id)}}>
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
                                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTestCase(testCase.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <div className="text-center text-muted-foreground py-12">
                                        <p>Aucun cas de test pour ce rôle.</p>
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

        <Dialog open={isTestCaseDialogOpen} onOpenChange={setIsTestCaseDialogOpen}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{editingTestCase ? 'Modifier le cas de test' : 'Nouveau cas de test'}</DialogTitle>
              <DialogDescription>
                Décrivez le titre et les étapes pour ce cas de test.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleTestCaseFormSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} placeholder="Ex: Vérifier la connexion utilisateur" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description / Étapes</FormLabel><FormControl><Textarea {...field} placeholder="1. Aller à la page de connexion.\n2. Entrer un email valide...\n3. Vérifier que l'utilisateur est redirigé vers le tableau de bord." rows={5} /></FormControl><FormMessage /></FormItem>
                )}/>
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
