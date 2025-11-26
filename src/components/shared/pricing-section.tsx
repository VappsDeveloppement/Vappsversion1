
'use client';

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAgency } from "@/context/agency-provider";
import { Skeleton } from "../ui/skeleton";
import Link from 'next/link';
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { useDoc } from "@/firebase/firestore/use-doc";
import { doc } from "firebase/firestore";
import type { Plan } from '@/components/shared/plan-management';

type Contract = {
    id: string;
    title: string;
    content: string;
}

function ContractModal({ contractId, buttonText, primaryColor }: { contractId: string; buttonText: string, primaryColor: string }) {
    const firestore = useFirestore();
    const contractRef = useMemoFirebase(() => doc(firestore, 'contracts', contractId), [firestore, contractId]);
    const { data: contract, isLoading } = useDoc<Contract>(contractRef);

    return (
        <Dialog>
            <DialogTrigger asChild>
                 <Button className="w-full font-bold" style={{ backgroundColor: primaryColor }}>
                    {buttonText}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                 <DialogHeader>
                    <DialogTitle>{isLoading ? 'Chargement...' : contract?.title}</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <Skeleton className="h-64 w-full" />
                ) : contract ? (
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: contract.content }} />
                    </ScrollArea>
                ) : (
                    <p>Contrat non trouvé.</p>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function PricingSection() {
    const { personalization, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();

    const pricingConfig = personalization?.pricingSection;
    
    // Corrected query: fetch only public plans from the 'plans' collection
    const publicPlansQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'plans'), where('isPublic', '==', true));
    }, [firestore]);
    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(publicPlansQuery);

    const title = pricingConfig?.title || "Nos Formules";
    const description = pricingConfig?.description || "Choisissez le plan qui correspond le mieux à vos ambitions et à vos besoins.";
    
    const primaryColor = personalization?.primaryColor || '#10B981';
    
    const isLoading = isAgencyLoading || arePlansLoading;

    if (!pricingConfig?.enabled) {
        return null;
    }
    
    return (
        <section className="bg-background text-foreground py-16 sm:py-24" id="pricing">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
                        {description}
                    </p>
                </div>
                
                {isLoading ? (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i} className="flex flex-col h-full"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent className="flex-1"><Skeleton className="h-24 w-full" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
                        ))}
                    </div>
                ) : plans && plans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
                        {plans.map((tier) => (
                            <Card key={tier.id} className={cn("flex flex-col h-full shadow-lg", tier.isFeatured && "border-2 relative")} style={tier.isFeatured ? {borderColor: primaryColor} : {}}>
                                {tier.isFeatured && (
                                    <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                        <div className="text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: primaryColor }}>
                                            Recommandé
                                        </div>
                                    </div>
                                )}
                                <CardHeader className="pt-10 text-center">
                                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                    <CardDescription className="break-words">{tier.description}</CardDescription>
                                    <div className="py-4">
                                        <span className="text-4xl font-bold" style={{color: primaryColor}}>{tier.price}€</span>
                                        <span className="text-muted-foreground">{tier.period}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-3">
                                        {tier.features?.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                                                <span className="text-muted-foreground">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                     {tier.contractId ? (
                                        <ContractModal contractId={tier.contractId} buttonText={tier.cta || 'Choisir cette formule'} primaryColor={primaryColor} />
                                    ) : (
                                        <Button asChild className="w-full font-bold" style={{ backgroundColor: primaryColor }}>
                                            <Link href="/application">{tier.cta || 'Choisir cette formule'}</Link>
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <p>Aucune prestation publique n'est disponible pour le moment.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
