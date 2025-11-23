
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Star, ThumbsUp, ThumbsDown, Users, CheckCircle, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type TestCaseResult = {
  testCaseId: string;
  note: string;
  status: 'passed' | 'failed' | 'blocked' | 'pending';
};

type BetaTestResult = {
  id: string;
  tester: { firstName: string; lastName: string; email: string; };
  results: TestCaseResult[];
  globalRating: number;
  isInterested: boolean;
  submittedAt: string;
};

// Types from the test creation page
interface TestCase {
  id: string;
  title: string;
  description: string;
}
interface Role { id: string; name: string; testCases: TestCase[] }
interface Scenario { id: string; name: string; roles: Role[] }


const statusVariant: Record<TestCaseResult['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  passed: 'default',
  failed: 'destructive',
  blocked: 'secondary',
  pending: 'outline',
};

const statusText: Record<TestCaseResult['status'], string> = {
  passed: 'Réussi',
  failed: 'Échoué',
  blocked: 'Bloqué',
  pending: 'En attente',
};


export default function BetaTestResultsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [resultToDelete, setResultToDelete] = useState<BetaTestResult | null>(null);
    const [scenarios, setScenarios] = useState<Scenario[]>([]);

    const scenariosQuery = useMemoFirebase(() => query(collection(firestore, 'beta_scenarios')), [firestore]);
    const { data: scenariosData, isLoading: areScenariosLoading } = useCollection<Scenario>(scenariosQuery);
    
    useEffect(() => {
        if (scenariosData) {
            setScenarios(scenariosData);
        }
    }, [scenariosData]);

    const testCaseMap = useMemo(() => {
        const map = new Map<string, { title: string; roleName: string; scenarioName: string }>();
        scenarios.forEach(scenario => {
            scenario.roles.forEach(role => {
                role.testCases.forEach(testCase => {
                    map.set(testCase.id, {
                        title: testCase.title,
                        roleName: role.name,
                        scenarioName: scenario.name,
                    });
                });
            });
        });
        return map;
    }, [scenarios]);


    const resultsQuery = useMemoFirebase(() => query(collection(firestore, 'beta_tests_results')), [firestore]);
    const { data: results, isLoading: areResultsLoading } = useCollection<BetaTestResult>(resultsQuery);

    const stats = useMemo(() => {
        if (!results || results.length === 0) {
            return {
                totalTests: 0,
                averageRating: 0,
                successPercentage: 0,
            };
        }

        const totalTests = results.length;
        const averageRating = results.reduce((sum, r) => sum + r.globalRating, 0) / totalTests;
        
        const allTestCases = results.flatMap(r => r.results);
        const passedCases = allTestCases.filter(tc => tc.status === 'passed').length;
        const totalCases = allTestCases.length;
        const successPercentage = totalCases > 0 ? (passedCases / totalCases) * 100 : 0;

        return {
            totalTests,
            averageRating: parseFloat(averageRating.toFixed(1)),
            successPercentage: parseFloat(successPercentage.toFixed(1)),
        };

    }, [results]);
    
    const handleDeleteConfirm = async () => {
        if (!resultToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'beta_tests_results', resultToDelete.id));
            toast({ title: 'Succès', description: 'Le résultat du test a été supprimé.' });
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de supprimer le résultat du test.', variant: 'destructive' });
        } finally {
            setResultToDelete(null);
        }
    };
    
    const isLoading = areResultsLoading || areScenariosLoading;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Résultats des Tests Publics</h1>
                <p className="text-muted-foreground">Consultez les retours des testeurs externes.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total des Tests</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalTests}</div>
                        <p className="text-xs text-muted-foreground">testeurs ont soumis leurs retours.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : `${stats.averageRating} / 5`}</div>
                         <p className="text-xs text-muted-foreground">Note globale moyenne attribuée.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taux de Réussite</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : `${stats.successPercentage}%`}</div>
                        <p className="text-xs text-muted-foreground">Pourcentage de cas de test "Réussi".</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Retours Détaillés</CardTitle>
                    <CardDescription>Liste de tous les retours soumis par les testeurs.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4 p-6">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : results && results.length > 0 ? (
                         <Accordion type="multiple" className="w-full">
                            {results.map(result => (
                                <AccordionItem key={result.id} value={result.id}>
                                    <div className="flex items-center p-4">
                                        <AccordionTrigger className="flex-1">
                                            <div className="flex justify-between w-full pr-4">
                                                <div className='text-left'>
                                                    <p className="font-semibold">{result.tester.firstName} {result.tester.lastName}</p>
                                                    <p className="text-sm text-muted-foreground">{result.tester.email}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={cn("h-5 w-5", i < result.globalRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                                        ))}
                                                    </div>
                                                    {result.isInterested ? <ThumbsUp className="h-5 w-5 text-green-500"/> : <ThumbsDown className="h-5 w-5 text-red-500" />}
                                                    <p className="text-sm text-muted-foreground">{new Date(result.submittedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="text-destructive" onClick={() => setResultToDelete(result)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <AccordionContent className="p-4 border-t">
                                        <h4 className="font-semibold mb-2">Détails des cas de test :</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Cas de Test</TableHead>
                                                    <TableHead>Statut</TableHead>
                                                    <TableHead>Commentaire</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {result.results.map((testCaseResult, index) => {
                                                    const testCaseInfo = testCaseMap.get(testCaseResult.testCaseId);
                                                    return (
                                                        <TableRow key={index}>
                                                            <TableCell>
                                                                <p className="font-medium">{testCaseInfo?.title || 'Titre non trouvé'}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {testCaseInfo ? `${testCaseInfo.scenarioName} > ${testCaseInfo.roleName}` : testCaseResult.testCaseId}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={statusVariant[testCaseResult.status]}>{statusText[testCaseResult.status]}</Badge>
                                                            </TableCell>
                                                            <TableCell>{testCaseResult.note || '-'}</TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                         </Accordion>
                    ) : (
                        <div className="text-center p-12 text-muted-foreground">
                            <p>Aucun résultat de test pour le moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!resultToDelete} onOpenChange={(open) => !open && setResultToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action supprimera définitivement le résultat du test de <strong>{resultToDelete?.tester.firstName} {resultToDelete?.tester.lastName}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                           Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
