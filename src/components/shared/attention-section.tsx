

'use client';

import React from 'react';

type CounselorProfile = {
    publicBio?: string;
    dashboardTheme?: {
        primaryColor?: string;
    };
    miniSite?: {
        attentionSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            text?: string;
            titleColor?: string;
            subtitleColor?: string;
            bgColor?: string;
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
    
    const sectionStyle = {
        backgroundColor: attentionConfig.bgColor || '#FFFFFF',
    };
    const titleStyle = {
        color: attentionConfig.titleColor || '#000000',
    };
    const subtitleStyle = {
        color: attentionConfig.subtitleColor || counselor.dashboardTheme?.primaryColor || '#10B981',
    };

    return (
        <section className="py-16 sm:py-24" style={sectionStyle}>
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold mb-4" style={titleStyle}>{titleToDisplay}</h2>
                {subtitleToDisplay && <p className="text-lg mb-6 font-semibold" style={subtitleStyle}>{subtitleToDisplay}</p>}
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg max-w-3xl mx-auto">
                    {textToDisplay}
                </p>
            </div>
        </section>
    );
};
