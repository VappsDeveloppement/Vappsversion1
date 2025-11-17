
'use client';

import React from 'react';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';

type CounselorProfile = {
    miniSite?: {
        interestsSection?: {
            title?: string;
            features?: string[];
        }
    };
};

export function InterestsSection({ counselor }: { counselor: CounselorProfile }) {
    const interestsConfig = counselor.miniSite?.interestsSection || {};
    const title = interestsConfig.title || 'Mes centres d\'intérêt';
    const features = interestsConfig.features || [];

    if (!features || features.length === 0) {
        return null;
    }

    return (
        <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold mb-8">{title}</h2>
                <div className="flex flex-col items-center gap-3">
                    {features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-lg px-4 py-2 flex items-center gap-2">
                             <CheckCircle className="h-4 w-4" />
                            {feature}
                        </Badge>
                    ))}
                </div>
            </div>
        </section>
    );
}
