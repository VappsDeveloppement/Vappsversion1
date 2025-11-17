
'use client';

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { ServiceItem } from "@/app/admin/settings/mini-site/page";

type CounselorProfile = {
    miniSite?: {
        hero?: {
            primaryColor?: string;
        }
        servicesSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            services?: ServiceItem[];
        }
    };
};

export function CounselorServicesSection({ counselor }: { counselor: CounselorProfile }) {
    const servicesConfig = counselor.miniSite?.servicesSection || {};
    const heroConfig = counselor.miniSite?.hero || {};

    const { enabled, title, subtitle, services } = servicesConfig;
    const primaryColor = heroConfig.primaryColor || '#10B981';

    if (!enabled || !services || services.length === 0) {
        return null;
    }

    return (
        <section className="bg-white py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title || "Mes Services"}</h2>
                    <p className="text-lg font-semibold mt-2" style={{ color: primaryColor }}>{subtitle}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {services.map((service) => (
                        <Card key={service.id} className="overflow-hidden group flex flex-col text-center shadow-md hover:shadow-xl transition-shadow duration-300">
                            {service.imageUrl && (
                                <div className="h-48 relative overflow-hidden">
                                    <Image
                                        src={service.imageUrl}
                                        alt={service.title}
                                        fill
                                        className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                    />
                                </div>
                            )}
                            <CardContent className="p-6 flex-1 flex flex-col items-center">
                                <h3 className="font-bold text-xl mb-2">{service.title}</h3>
                                <p className="text-muted-foreground">{service.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
