
'use client';

import React from 'react';

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
    const textToDisplay = attentionConfig.text || 'Contenu de la section attention à venir.';
    const titleToDisplay = attentionConfig.title || 'Attention';

    return (
        <section className="py-16 bg-background">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold mb-6">{titleToDisplay}</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg max-w-3xl mx-auto">
                    {textToDisplay}
                </p>
            </div>
        </section>
    );
};
