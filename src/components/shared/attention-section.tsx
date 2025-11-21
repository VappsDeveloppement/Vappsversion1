
'use client';

import React from 'react';

type CounselorProfile = {
    publicBio?: string;
    miniSite?: {
        attentionSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            text?: string;
        }
    };
};

export function AttentionSection({ counselor }: { counselor: CounselorProfile }) {
    const attentionConfig = counselor.miniSite?.attentionSection || {};

    if (!attentionConfig.enabled) {
        return null;
    }
    
    const titleToDisplay = attentionConfig.title || 'Attention';
    const subtitleToDisplay = attentionConfig.subtitle;
    const textToDisplay = attentionConfig.text || 'Contenu de la section attention à venir.';

    return (
        <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold mb-4">{titleToDisplay}</h2>
                {subtitleToDisplay && <p className="text-lg text-primary mb-6">{subtitleToDisplay}</p>}
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg max-w-3xl mx-auto">
                    {textToDisplay}
                </p>
            </div>
        </section>
    );
};
