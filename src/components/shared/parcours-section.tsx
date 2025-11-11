import { CheckCircle2 } from "lucide-react";

const steps = [
    {
        title: "Étape 1: Bilan & Intention",
        description: "Faire le point sur votre situation, vos besoins et poser une intention claire."
    },
    {
        title: "Étape 2: Exploration",
        description: "Séances personnalisées alliant coaching et outils de développement personnel."
    },
    {
        title: "Étape 3: Intégration",
        description: "Nous consolidons vos acquis et mettons en place un plan d'action durable."
    },
    {
        title: "Étape 4: Épanouissement",
        description: "Vous repartez avec les clés pour poursuivre votre chemin en toute autonomie."
    }
];

export function ParcoursSection() {
    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Votre parcours de transformation</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
                        Un cheminement structuré et bienveillant pour vous guider à chaque étape de votre évolution.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2" style={{top: '24px'}}></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center relative">
                        {steps.map((step, index) => (
                            <div key={index} className="flex flex-col items-center">
                                <div className="relative bg-background p-1 z-10">
                                    <CheckCircle2 className="h-12 w-12 text-primary" />
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
