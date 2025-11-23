
'use client';

import React from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

    const resultsQuery = useMemoFirebase(() => query(collection(firestore, 'beta_tests_results')), [firestore]);
    const { data: results, isLoading } = useCollection<BetaTestResult>(resultsQuery);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Résultats des Tests Publics</h1>
                <p className="text-muted-foreground">Consultez les retours des testeurs externes.</p>
            </div>
            <Card>
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
                                    <AccordionTrigger className="p-4">
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
                                    <AccordionContent className="p-4">
                                        <h4 className="font-semibold mb-2">Détails des cas de test :</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Cas de Test ID</TableHead>
                                                    <TableHead>Statut</TableHead>
                                                    <TableHead>Commentaire</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {result.results.map((testCaseResult, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-mono text-xs">{testCaseResult.testCaseId}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={statusVariant[testCaseResult.status]}>{statusText[testCaseResult.status]}</Badge>
                                                        </TableCell>
                                                        <TableCell>{testCaseResult.note || '-'}</TableCell>
                                                    </TableRow>
                                                ))}
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
        </div>
    );
}
