
'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Testimonial = {
    id: string;
    authorName: string;
    authorTitle: string;
    text: string;
    photoUrl?: string | null;
};

type CounselorProfile = {
    miniSite?: {
        testimonialsSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            testimonials?: Testimonial[];
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
};

export function CounselorTestimonialsSection({ counselor }: { counselor: CounselorProfile }) {
    const testimonialsConfig = counselor.miniSite?.testimonialsSection;

    if (!testimonialsConfig?.enabled || !testimonialsConfig.testimonials || testimonialsConfig.testimonials.length === 0) {
        return null;
    }

    const { title, subtitle, testimonials } = testimonialsConfig;
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    return (
        <section className="py-16 sm:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title || "Ce qu'ils pensent de mon travail"}</h2>
                    {subtitle && <p className="text-lg mt-2" style={{ color: primaryColor }}>{subtitle}</p>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {testimonials.map((testimonial) => (
                        <Card key={testimonial.id} className="bg-background shadow-lg">
                            <CardContent className="p-8 flex flex-col items-center text-center">
                                <Avatar className="w-20 h-20 mb-4 border-2" style={{borderColor: primaryColor}}>
                                    <AvatarImage src={testimonial.photoUrl || undefined} alt={testimonial.authorName} />
                                    <AvatarFallback className="text-2xl bg-muted">{testimonial.authorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className="text-muted-foreground italic mb-4">"{testimonial.text}"</p>
                                <p className="font-bold">{testimonial.authorName}</p>
                                <p className="text-sm text-muted-foreground">{testimonial.authorTitle}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

    