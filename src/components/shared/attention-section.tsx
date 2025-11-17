
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

type CounselorProfile = {
    publicBio?: string;
    miniSite?: {
        attentionSection?: {
            enabled?: boolean;
            title?: string;
            text?: string;
        }
    };
};

export function AttentionSection({ counselor }: { counselor: CounselorProfile }) {
    const attentionConfig = counselor.miniSite?.attentionSection || {};

    if (!attentionConfig.enabled) {
        return null;
    }
    
    // Use personalized text, fallback to publicBio, then a default message
    const textToDisplay = attentionConfig.text || counselor.publicBio || 'Ce conseiller n\'a pas encore rédigé de biographie.';
    const titleToDisplay = attentionConfig.title || 'Attention';

    // Don't render if there's no text to show at all (and title is default)
    if (!attentionConfig.text && !counselor.publicBio && attentionConfig.title === 'Attention') {
        // This case is arguable, but avoids showing an empty "Attention" block
        // return null;
    }

    return (
        <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
                 <Card>
                    <CardContent className="p-6 md:p-10 text-center">
                        <h2 className="text-3xl font-bold mb-6">{titleToDisplay}</h2>
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg max-w-3xl mx-auto">
                            {textToDisplay}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
};
