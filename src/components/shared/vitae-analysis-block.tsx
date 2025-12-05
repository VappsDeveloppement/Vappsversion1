
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Briefcase, FlaskConical, Search, Inbox, PlusCircle, Trash2, Edit, X, Download, MoreHorizontal, Upload, ChevronsUpDown, Check, BookCopy, Eye, User, FileSymlink, Users, Link as LinkIcon, Building, Percent, CheckCircle, XCircle, Save, BookOpen } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs, documentId } from 'firebase/firestore';
import { useFirestore, useStorage } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// These types must be self-contained or imported from a shared location.
// For now, let's redefine them here to make the component standalone.
type JobOffer = { id: string; title: string, contractType?: string | string[], location?: string | string[], infoMatching?: any };
type FicheMetier = { id: string; name: string, expectedSoftSkills?: string[], associatedRomeCode?: string[], associatedRncp?: string[], entryLevel?: string[], associatedTraining?: string[], associatedTrainings?: string[], competences?: any[] };
type CvProfile = { id: string; clientName: string, clientId: string, formations?: any[], softSkills?: string[], experiences?: any[], contractTypes?: string[], mobility?: string[] };
type Training = { id: string; title: string, description?: string };

interface VitaeAnalysisBlockProps {
    savedAnalysis: any | null;
    onSaveAnalysis: (result: any) => void;
    clientId?: string;
    onSaveBlock: () => Promise<void>;
}

export function VitaeAnalysisBlock({ savedAnalysis, onSaveAnalysis, clientId, onSaveBlock }: VitaeAnalysisBlockProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
    const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null);
    const [comparisonType, setComparisonType] = useState<'offer' | 'fiche'>('offer');
    const [matchResult, setMatchResult] = useState<any | null>(savedAnalysis);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

     useEffect(() => {
        setMatchResult(savedAnalysis);
    }, [savedAnalysis]);

    const cvProfilesQuery = useMemoFirebase(() => {
        if (!user) return null;
        const baseQuery = collection(firestore, `users/${user.uid}/cv_profiles`);
        if (clientId) {
            return query(baseQuery, where('clientId', '==', clientId));
        }
        return baseQuery;
    }, [user, firestore, clientId]);
    
    const { data: cvProfiles, isLoading: areCvProfilesLoading } = useCollection<CvProfile>(cvProfilesQuery);
    
    const jobOffersQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/job_offers`)) : null, [user, firestore]);
    const { data: jobOffers, isLoading: areJobOffersLoading } = useCollection<JobOffer>(jobOffersQuery);
    
    const fichesMetiersQuery = useMemoFirebase(() => user ? query(collection(firestore, `users/${user.uid}/fiches_metiers`)) : null, [user, firestore]);
    const { data: fichesMetiers, isLoading: areFichesMetiersLoading } = useCollection<FicheMetier>(fichesMetiersQuery);
    
    useEffect(() => {
        if (clientId && cvProfiles && cvProfiles.length > 0) {
            setSelectedCvId(cvProfiles[0].id);
        }
    }, [clientId, cvProfiles]);


    const runAnalysis = (cv: CvProfile, target: any, targetType: 'offer' | 'fiche') => {
        let score = 0;
        const matchingDetails: string[] = [];
        const missingDetails: string[] = [];
        let totalChecks = 0;

        const checkMatch = (cvItems: Set<string>, offerItems: Set<string>, matchText: string, mismatchText: string) => {
            if (offerItems.size > 0) {
                totalChecks++;
                const matches = [...cvItems].filter(item => offerItems.has(item));
                const misses = [...offerItems].filter(item => !cvItems.has(item));
                if (matches.length > 0) {
                    score++;
                    matchingDetails.push(`${matchText}: ${matches.join(', ')}.`);
                }
                if (misses.length > 0) {
                    missingDetails.push(`${mismatchText}: ${misses.join(', ')}.`);
                }
            }
        };

        const cvFormations = cv.formations || [];
        const cvLevels = new Set(cvFormations.flatMap(f => f.level || []));
        const cvRncpCodes = new Set(cvFormations.flatMap(f => f.rncpCode || []));
        const cvFormationTitles = new Set(cvFormations.flatMap(f => f.title || []));
        const offerLevels = new Set(target.infoMatching?.trainingLevels || target.entryLevel || []);
        const offerRncpCodes = new Set(target.infoMatching?.trainingRncps || target.associatedRncp || []);
        const offerFormationTitles = new Set(target.infoMatching?.trainingTitles || target.associatedTraining || []);
        
        checkMatch(cvLevels, offerLevels, "Niveaux de formation correspondants", "Niveaux de formation manquants");
        checkMatch(cvRncpCodes, offerRncpCodes, "Certifications RNCP correspondantes", "Certifications RNCP requises");
        checkMatch(cvFormationTitles, offerFormationTitles, "Intitulés de formation correspondants", "Formations spécifiques manquantes");

        const cvSoftSkills = new Set(cv.softSkills || []);
        const offerSoftSkills = new Set(target.infoMatching?.softSkills || target.expectedSoftSkills || []);
        checkMatch(cvSoftSkills, offerSoftSkills, "Soft skills communs", "Soft skills manquants");
        
        const cvExperiences = cv.experiences || [];
        const cvRomeCodes = new Set(cvExperiences.flatMap(e => e.romeCode || []));
        const offerRomeCodes = new Set(target.infoMatching?.jobRomeCodes || target.associatedRomeCode || []);
        checkMatch(cvRomeCodes, offerRomeCodes, "Codes ROME correspondants", "Codes ROME requis");
        
        const cvJobTitles = new Set(cvExperiences.flatMap(e => e.title || []));
        const offerJobTitles = new Set(target.infoMatching?.jobTitles || target.associatedJobs || []);
        checkMatch(cvJobTitles, offerJobTitles, "Intitulés de poste correspondants", "Intitulés de poste requis");
        
        const cvCompetences = new Set(cvExperiences.flatMap(e => e.skills || []));
        const offerCompetencesRaw = target.infoMatching?.competences || target.competences || [];
        const offerCompetences = new Set(offerCompetencesRaw.map((c: any) => c.name || c.competence));
        checkMatch(cvCompetences, offerCompetences, "Compétences techniques correspondantes", "Compétences techniques manquantes");
        
        const cvActivities = new Set(cvExperiences.flatMap(e => e.activities || []));
        const offerActivities = new Set(offerCompetencesRaw.flatMap((c: any) => c.activities || []));
        checkMatch(cvActivities, offerActivities, "Activités correspondantes", "Activités manquantes");

        if (targetType === 'offer') {
            const cvContractTypes = new Set(cv.contractTypes?.map(ct => ct.toLowerCase()));
            const offerContractTypes = new Set(Array.isArray(target.contractType) ? target.contractType.map((ct:string) => ct.toLowerCase()) : (target.contractType ? [target.contractType.toLowerCase()] : []));
            checkMatch(cvContractTypes, offerContractTypes, "Type de contrat compatible", "Type de contrat non spécifié");
            
            const cvMobility = new Set(cv.mobility?.map(m => m.toLowerCase()));
            const offerLocation = new Set(Array.isArray(target.location) ? target.location.map((l: string) => l.toLowerCase()) : (target.location ? [target.location.toLowerCase()] : []));
            checkMatch(cvMobility, offerLocation, "Localisation compatible", "Mobilité requise");
        }

        const finalScore = totalChecks > 0 ? (score / totalChecks) * 100 : 0;
        return { score: Math.round(finalScore), matching: matchingDetails, missing: missingDetails };
    };

    const handleRunMatch = async () => {
        if (!selectedCvId || !selectedComparisonId || !cvProfiles) return;
        setIsLoading(true);

        const cv = cvProfiles.find(p => p.id === selectedCvId);
        if (!cv) { setIsLoading(false); return; }

        let target: any = null;
        let suggestedTrainingIds: string[] = [];
        let otherMatchingOffers: (JobOffer & { score: number })[] | undefined = undefined;
        let otherMatchingFiches: (FicheMetier & { score: number })[] | undefined = undefined;

        if (comparisonType === 'offer') {
            target = jobOffers?.find(o => o.id === selectedComparisonId);
             if (jobOffers && cv) {
                otherMatchingOffers = jobOffers
                    .filter(o => o.id !== selectedComparisonId)
                    .map(offer => ({ ...offer, score: runAnalysis(cv, offer, 'offer').score }))
                    .filter(offer => offer.score >= 50)
                    .sort((a, b) => b.score - a.score);
            }
        } else {
            const fiche = fichesMetiers?.find(f => f.id === selectedComparisonId);
            if(fiche) {
                target = fiche;
                suggestedTrainingIds = fiche.associatedTrainings || [];
            }
            if (fichesMetiers && cv) {
                otherMatchingFiches = fichesMetiers
                    .filter(f => f.id !== selectedComparisonId)
                    .map(fiche => ({ ...fiche, score: runAnalysis(cv, fiche, 'fiche').score }))
                    .filter(fiche => fiche.score >= 50)
                    .sort((a, b) => b.score - a.score);
            }
        }
        
        if (!target) { setIsLoading(false); return; }
        
        const { score, matching, missing } = runAnalysis(cv, target, comparisonType);

        let suggestedTrainingsData: Training[] = [];
        if (suggestedTrainingIds.length > 0) {
            const trainingsCollection = collection(firestore, 'trainings');
            const trainingsQuery = query(trainingsCollection, where(documentId(), 'in', suggestedTrainingIds));
            const trainingsSnapshot = await getDocs(trainingsQuery);
            suggestedTrainingsData = trainingsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Training));
        }

        const result = { score, matching, missing, suggestedTrainings: suggestedTrainingsData, otherMatchingOffers, otherMatchingFiches };
        setMatchResult(result);
        onSaveAnalysis(result); // Save to parent form state
        setIsLoading(false);
    };

    const handleSaveAndPersist = async () => {
        if (matchResult) {
            onSaveAnalysis(matchResult);
            await onSaveBlock();
            toast({ title: "Analyse sauvegardée", description: "Les résultats actuels ont été sauvegardés dans le suivi." });
        }
    }

    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Profil CV</Label>
                    <Select onValueChange={setSelectedCvId} disabled={areCvProfilesLoading} value={selectedCvId || undefined}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un profil..." /></SelectTrigger>
                        <SelectContent>
                            {cvProfiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.clientName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Comparer avec</Label>
                     <Tabs value={comparisonType} onValueChange={(val) => {setComparisonType(val as any); setSelectedComparisonId(null); setMatchResult(null);}}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="offer">Offre d'emploi</TabsTrigger>
                            <TabsTrigger value="fiche">Fiche Métier</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {comparisonType === 'offer' ? (
                         <Select onValueChange={setSelectedComparisonId} disabled={areJobOffersLoading}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner une offre..." /></SelectTrigger>
                            <SelectContent>
                                {jobOffers?.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Select onValueChange={setSelectedComparisonId} disabled={areFichesMetiersLoading}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner une fiche..." /></SelectTrigger>
                            <SelectContent>
                                {fichesMetiers?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>
            <Button onClick={handleRunMatch} disabled={!selectedCvId || !selectedComparisonId || isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                Lancer l'analyse
            </Button>

            {matchResult && (
                    <div className="pt-6 border-t space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold">Résultat de l'analyse</h3>
                            <Button variant="outline" size="sm" onClick={handleSaveAndPersist}>
                                <Save className="mr-2 h-4 w-4" /> Enregistrer l'analyse dans le suivi
                            </Button>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                             <div className="relative h-24 w-24">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${matchResult.score}, 100`} />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">{matchResult.score}%</div>
                            </div>
                            <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
                                <div className='space-y-2'>
                                    <h4 className='font-semibold'>Points de correspondance</h4>
                                    {matchResult.matching.length > 0 ? matchResult.matching.map((detail: string, index: number) => (
                                        <div key={index} className="flex items-start gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                            <span>{detail}</span>
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">Aucun point de correspondance direct trouvé.</p>}
                                </div>
                                <div className='space-y-2'>
                                     <h4 className='font-semibold'>Axes d'amélioration</h4>
                                     {matchResult.missing.length > 0 ? matchResult.missing.map((detail: string, index: number) => (
                                        <div key={index} className="flex items-start gap-2 text-sm">
                                            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                            <span>{detail}</span>
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">Aucun axe d'amélioration identifié.</p>}
                                </div>
                            </div>
                        </div>
                        {matchResult.suggestedTrainings && matchResult.suggestedTrainings.length > 0 && (
                            <div className="pt-6 border-t">
                                <h4 className="font-semibold text-lg mb-4">Formations suggérées</h4>
                                <div className="space-y-2">
                                    {matchResult.suggestedTrainings.map((training: Training) => (
                                         <Link href={`/dashboard/e-learning/path/${training.id}`} key={training.id} className="block p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                            <p className="font-semibold">{training.title}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{training.description}</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(matchResult.otherMatchingOffers && matchResult.otherMatchingOffers.length > 0) && (
                            <div className="pt-6 border-t">
                                <h4 className="font-semibold text-lg mb-4">Autres offres correspondantes</h4>
                                <div className="space-y-2">
                                    {matchResult.otherMatchingOffers.map((offer: JobOffer & { score: number }) => (
                                        <div key={offer.id} className="p-3 border rounded-md">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{offer.title}</p>
                                                <Badge>{offer.score}%</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(matchResult.otherMatchingFiches && matchResult.otherMatchingFiches.length > 0) && (
                            <div className="pt-6 border-t">
                                <h4 className="font-semibold text-lg mb-4">Autres fiches métiers correspondantes</h4>
                                <div className="space-y-2">
                                    {matchResult.otherMatchingFiches.map((fiche: FicheMetier & { score: number }) => (
                                        <div key={fiche.id} className="p-3 border rounded-md">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{fiche.name}</p>
                                                <Badge>{fiche.score}%</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
}
