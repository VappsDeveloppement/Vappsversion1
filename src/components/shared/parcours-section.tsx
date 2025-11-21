
'use client';

import { CheckCircle2 } from "lucide-react";
import { useAgency } from "@/context/agency-provider";

type ParcoursStep = {
    id: string;
    title: string;
    description: string;
}

type CounselorProfile = {
    miniSite?: {
        parcoursSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            steps?: ParcoursStep[];
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    };
};

export function ParcoursSection({ counselor }: { counselor?: CounselorProfile }) {
    const agencyData = useAgency(); // Fallback to agency data if counselor is not provided
    
    // Determine which data source to use
    const source = counselor ? counselor.miniSite : agencyData.personalization;
    const primaryColor = counselor ? counselor.dashboardTheme?.primaryColor : agencyData.personalization.primaryColor;
    
    const parcoursConfig = source?.parcoursSection || {};
    
    if (!parcoursConfig.enabled) {
        return null;
    }
    
    const { title, subtitle, steps } = parcoursConfig;

    if (!steps || steps.length === 0) {
        return null;
    }

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    {subtitle && <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">{subtitle}</p>}
                </div>

                <div className="relative">
                    <div className="absolute top-6 left-0 w-full h-0.5 bg-border -translate-y-1/2"></div>
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${steps.length} gap-8 text-center relative`}>
                        {steps.map((step) => (
                            <div key={step.id} className="flex flex-col items-center">
                                <div className="relative bg-background p-1 z-10">
                                    <CheckCircle2 className="h-12 w-12 text-primary" style={{ color: primaryColor }}/>
                                </div>
                                <div className="pt-6">
                                    <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                                    <div className="w-16 h-px bg-border mx-auto my-4"></div>
                                    <p className="text-muted-foreground text-sm">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
