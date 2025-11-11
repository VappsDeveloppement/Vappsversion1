import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const pricingTiers = [
    {
        name: "Essentiel",
        price: "29€",
        period: "/mois",
        description: "Idéal pour commencer et explorer les bases.",
        features: [
            "Accès aux ressources de base",
            "1 séance de coaching par mois",
            "Support par email",
        ],
        cta: "Choisir Essentiel",
    },
    {
        name: "Pro",
        price: "79€",
        period: "/mois",
        description: "Pour ceux qui veulent accélérer leur progression.",
        features: [
            "Accès complet aux ressources",
            "4 séances de coaching par mois",
            "Support prioritaire",
            "Accès à la communauté",
        ],
        cta: "Choisir Pro",
        featured: true,
    },
    {
        name: "Entreprise",
        price: "Sur devis",
        period: "",
        description: "Une solution sur-mesure pour votre équipe.",
        features: [
            "Accompagnement personnalisé",
            "Ateliers et formations d'équipe",
            "Suivi dédié",
            "Rapports de performance",
        ],
        cta: "Nous contacter",
    },
];

export function PricingSection() {
    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Nos Formules</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
                        Choisissez le plan qui correspond le mieux à vos ambitions et à vos besoins.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {pricingTiers.map((tier) => (
                        <Card key={tier.name} className={cn("flex flex-col h-full", tier.featured && "border-primary border-2 shadow-lg relative")}>
                            {tier.featured && (
                                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                        Le plus populaire
                                    </div>
                                </div>
                            )}
                            <CardHeader className="pt-10">
                                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                <CardDescription>{tier.description}</CardDescription>
                                <div>
                                    <span className="text-4xl font-bold text-primary">{tier.price}</span>
                                    <span className="text-muted-foreground">{tier.period}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3">
                                    {tier.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-green-500" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className={cn("w-full", !tier.featured && "variant-secondary")}>
                                    {tier.cta}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
