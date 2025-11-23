
'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlusCircle, Check, X, AlertTriangle, Edit, Sparkles } from "lucide-react";
import { cn } from '@/lib/utils';

type TestCaseStatus = 'passed' | 'failed' | 'blocked' | 'pending';

interface TestCase {
  id: string;
  title: string;
  description: string;
  status: TestCaseStatus;
}

const initialTestCases: TestCase[] = [
  {
    id: 'case-1',
    title: "Vérifier que l'ajout d'une nouvelle dépense fonctionne correctement.",
    description: "Vérifier que l'ajout d'une nouvelle dépense fonctionne correctement.",
    status: 'pending',
  },
  {
    id: 'case-2',
    title: "Vérifier que la modification d'un profil utilisateur est bien prise en compte.",
    description: "Se connecter avec un compte utilisateur, modifier les informations du profil (nom, avatar), et vérifier que les modifications sont sauvegardées et affichées correctement.",
    status: 'pending',
  },
];

export default function BetaTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases);
  const [scenarios, setScenarios] = useState(['Connexion', 'Profil']);
  const [roles, setRoles] = useState(['Testeur', 'Administrateur']);

  const setTestStatus = (id: string, status: TestCaseStatus) => {
    setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, status } : tc));
  };

  const addTag = (type: 'scenario' | 'role') => {
    const newTag = window.prompt(`Entrez le nom du nouveau ${type === 'scenario' ? 'scénario' : 'rôle'}:`);
    if (newTag) {
      if (type === 'scenario') {
        setScenarios(prev => [...prev, newTag]);
      } else {
        setRoles(prev => [...prev, newTag]);
      }
    }
  };

  const removeTag = (type: 'scenario' | 'role', index: number) => {
    if (type === 'scenario') {
      setScenarios(prev => prev.filter((_, i) => i !== index));
    } else {
      setRoles(prev => prev.filter((_, i) => i !== index));
    }
  };


  const statusConfig: Record<TestCaseStatus, { text: string; icon: React.ReactNode; className: string }> = {
    passed: { text: "Réussi", icon: <Check />, className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
    failed: { text: "Échoué", icon: <X />, className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200" },
    blocked: { text: "Bloqué", icon: <AlertTriangle />, className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200" },
    pending: { text: "En attente", icon: null, className: ""},
  };

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold font-headline">Recette de test</h1>
        </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="scenario">
            <TabsList className="mb-4">
              <TabsTrigger value="scenario">Scénarios</TabsTrigger>
              <TabsTrigger value="results">Résultats</TabsTrigger>
            </TabsList>
            <TabsContent value="scenario" className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {scenarios.map((scenario, index) => (
                      <div key={index} className="group relative">
                        <Badge variant="secondary">{scenario}</Badge>
                         <button onClick={() => removeTag('scenario', index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3"/>
                        </button>
                      </div>
                    ))}
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addTag('scenario')}>
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    {roles.map((role, index) => (
                      <div key={index} className="group relative">
                        <Badge variant="outline">{role}</Badge>
                        <button onClick={() => removeTag('role', index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3"/>
                        </button>
                      </div>
                    ))}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addTag('role')}>
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </div>
            </TabsContent>
            <TabsContent value="results">
                 <p className="text-sm text-muted-foreground">Les résultats des tests s'afficheront ici.</p>
            </TabsContent>
          </Tabs>

          <Accordion type="multiple" className="w-full space-y-4 mt-6">
            {testCases.map((testCase, index) => (
              <AccordionItem key={testCase.id} value={testCase.id} className="border rounded-lg bg-background">
                <AccordionTrigger className="p-4 hover:no-underline text-left">
                  <span className="font-semibold">Cas de test #{index + 1}:</span>&nbsp;{testCase.title}
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t">
                  <p className="text-muted-foreground mb-4">{testCase.description}</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="font-medium text-sm">Résultat du test:</span>
                    <div className="flex gap-2">
                      {Object.keys(statusConfig).filter(s => s !== 'pending').map(statusKey => {
                        const status = statusKey as Exclude<TestCaseStatus, 'pending'>;
                        const config = statusConfig[status];
                        return (
                          <Button
                            key={status}
                            variant="outline"
                            size="sm"
                            className={cn(
                                "gap-2",
                                config.className,
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
                   <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Modifier</Button>
                        <Button variant="secondary" size="sm"><Sparkles className="mr-2 h-4 w-4" />Améliorer</Button>
                    </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
 