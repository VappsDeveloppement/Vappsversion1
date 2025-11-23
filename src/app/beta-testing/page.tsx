
'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, CheckCircle, Loader2, Star, ThumbsUp, X, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

// Types
type TestCaseStatus = 'passed' | 'failed' | 'blocked' | 'pending';
type TestCaseResult = { testCaseId: string; note: string; status: TestCaseStatus };
interface TestCase {
  id: string;
  title: string;
  description: string;
  note?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  status: TestCaseStatus;
}
interface Role { id: string; name: string; testCases: TestCase[] }
interface Scenario { id: string; name: string; roles: Role[] }

const testerInfoSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis.'),
  lastName: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email("L'adresse e-mail est invalide."),
});
type TesterInfo = z.infer<typeof testerInfoSchema>;

const statusConfig: Record<TestCaseStatus, { text: string; icon: React.ReactNode; className: string }> = {
  passed: { text: "Réussi", icon: <Check className="h-4 w-4" />, className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
  failed: { text: "Échoué", icon: <X className="h-4 w-4" />, className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200" },
  blocked: { text: "Bloqué", icon: <AlertCircle className="h-4 w-4" />, className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200" },
  pending: { text: "En attente", icon: null, className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200" },
};


export default function PublicBetaTestingPage() {
  const [testerInfo, setTesterInfo] = useState<TesterInfo | null>(null);
  const [testResults, setTestResults] = useState<Map<string, TestCaseResult>>(new Map());
  const [globalRating, setGlobalRating] = useState(0);
  const [isInterested, setIsInterested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  React.useEffect(() => {
    try {
      const savedScenarios = localStorage.getItem('beta-test-scenarios');
      if (savedScenarios) {
        setScenarios(JSON.parse(savedScenarios));
      }
    } catch (error) {
      console.error("Could not load scenarios from localStorage", error);
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  const form = useForm<TesterInfo>({
    resolver: zodResolver(testerInfoSchema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  });

  const handleStartTesting = (values: TesterInfo) => {
    setTesterInfo(values);
  };
  
  const updateTestResult = (testCaseId: string, newResult: Partial<TestCaseResult>) => {
    setTestResults(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(testCaseId) || { testCaseId, note: '', status: 'pending' };
        newMap.set(testCaseId, { ...existing, ...newResult });
        return newMap;
    });
  };
  
  const handleSubmitTest = async () => {
    if (globalRating === 0) {
        toast({ title: 'Notation requise', description: 'Veuillez donner une note globale.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    try {
        await addDocumentNonBlocking(collection(firestore, 'beta_tests_results'), {
            tester: testerInfo,
            results: Array.from(testResults.values()),
            globalRating,
            isInterested,
            submittedAt: new Date().toISOString(),
        });
        toast({ title: 'Merci !', description: 'Vos retours ont été enregistrés avec succès.' });
        setTesterInfo(null);
    } catch (error) {
        toast({ title: 'Erreur', description: 'Impossible de soumettre vos résultats.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!testerInfo) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Participer au Bêta-Test</CardTitle>
            <CardDescription>Entrez vos informations pour commencer à tester l'application.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleStartTesting)} className="space-y-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="submit" className="w-full">Commencer le test</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
        <div className="mb-8">
            <h1 className="text-3xl font-bold">Scénarios de Test</h1>
            <p className="text-muted-foreground">Merci, {testerInfo.firstName}. Veuillez suivre les scénarios ci-dessous.</p>
        </div>

        {isLoadingScenarios ? (
            <Skeleton className="h-64 w-full" />
        ) : (
            <Accordion type="multiple" className="w-full space-y-4">
                {scenarios?.map(scenario => (
                    <AccordionItem key={scenario.id} value={scenario.id} className="border rounded-lg bg-background">
                         <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">{scenario.name}</AccordionTrigger>
                         <AccordionContent className="p-4 border-t">
                            <Accordion type="multiple" className="w-full space-y-2">
                                {scenario.roles.map(role => (
                                    <AccordionItem key={role.id} value={role.id} className="border-none">
                                        <AccordionTrigger className="font-medium bg-muted p-3 rounded-md hover:no-underline">{role.name}</AccordionTrigger>
                                        <AccordionContent className="pt-4 space-y-4">
                                            {role.testCases.map(testCase => (
                                                <Card key={testCase.id}>
                                                    <CardHeader>
                                                        <CardTitle>{testCase.title}</CardTitle>
                                                        <CardDescription>{testCase.description}</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {testCase.mediaUrl && (
                                                            testCase.mediaType === 'image' ? (
                                                                <Image src={testCase.mediaUrl} alt="Média" width={300} height={200} className="rounded-md border"/>
                                                            ) : (
                                                                <video src={testCase.mediaUrl} controls className="rounded-md border w-full max-w-sm"></video>
                                                            )
                                                        )}
                                                         {testCase.note && <p className="text-sm bg-yellow-50 border border-yellow-200 p-3 rounded-md text-yellow-800">{testCase.note}</p>}
                                                        <Textarea 
                                                            placeholder="Vos commentaires sur ce cas de test..."
                                                            value={testResults.get(testCase.id)?.note || ''}
                                                            onChange={e => updateTestResult(testCase.id, { note: e.target.value })}
                                                        />
                                                    </CardContent>
                                                    <CardFooter>
                                                        <div className="flex gap-2">
                                                          {Object.keys(statusConfig).map(statusKey => {
                                                            const status = statusKey as TestCaseStatus;
                                                            return (
                                                              <Button key={status} variant="outline" size="sm" onClick={() => updateTestResult(testCase.id, { status })} className={cn(statusConfig[status].className, testResults.get(testCase.id)?.status === status && "ring-2 ring-primary")}>
                                                                {statusConfig[status].icon}
                                                                {statusConfig[status].text}
                                                              </Button>
                                                            );
                                                          })}
                                                        </div>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                         </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )}

        <Card className="mt-12">
            <CardHeader>
                <CardTitle>Finaliser le Test</CardTitle>
                <CardDescription>Veuillez répondre à ces dernières questions pour nous aider à nous améliorer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label className="font-semibold">Note globale de l'application</Label>
                    <div className="flex gap-1">
                        {[1,2,3,4,5].map(star => (
                            <Star 
                                key={star}
                                className={cn("h-8 w-8 cursor-pointer transition-colors", star <= globalRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")}
                                onClick={() => setGlobalRating(star)}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                     <Checkbox id="is-interested" checked={isInterested} onCheckedChange={checked => setIsInterested(checked as boolean)} />
                    <Label htmlFor="is-interested">Êtes-vous intéressé par l'utilisation de cette application à l'avenir ?</Label>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSubmitTest} disabled={isSubmitting} size="lg">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Soumettre mes retours
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
