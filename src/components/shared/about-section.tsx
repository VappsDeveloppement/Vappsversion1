import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";

const pillars = [
    {
        id: "pillar-method",
        title: "Notre Méthode",
        description: "Une approche structurée en 4 étapes pour garantir votre succès.",
    },
    {
        id: "pillar-tools",
        title: "Nos Outils",
        description: "Des supports et outils exclusifs pour guider votre réflexion.",
    },
    {
        id: "pillar-community",
        title: "Notre Communauté",
        description: "Rejoignez un réseau d'entraide pour partager et grandir ensemble.",
    },
];

const expertises = [
    {
        id: "expertise-tech",
        title: "Secteur Tech",
        description: "Conseils pour les métiers du numérique.",
    },
    {
        id: "expertise-health",
        title: "Secteur Santé",
        description: "Évoluer dans le domaine de la santé.",
    },
    {
        id: "expertise-entrepreneurship",
        title: "Entrepreneuriat",
        description: "Passer de l'idée à la création d'entreprise.",
    },
    {
        id: "expertise-management",
        title: "Management",
        description: "Devenir un manager bienveillant et efficace.",
    },
];

export function AboutSection() {
    const aboutImage = PlaceHolderImages.find(p => p.id === 'about-way');

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Trouver Votre Voie</h2>
                    <p className="text-lg text-primary mt-2">Une approche sur-mesure</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
                    <div className="w-full h-64 md:h-80 relative rounded-lg overflow-hidden shadow-lg">
                        {aboutImage && (
                            <Image
                                src={aboutImage.imageUrl}
                                alt={aboutImage.description}
                                fill
                                className="object-cover"
                                data-ai-hint={aboutImage.imageHint}
                            />
                        )}
                    </div>
                    <p className="text-muted-foreground text-lg">
                        Chez Vapps, nous croyons qu'il n'existe pas de chemin unique. C'est pourquoi nous proposons une approche holistique et inclusive, qui prend en compte votre personnalité, vos compétences, vos envies et vos contraintes.
                    </p>
                </div>

                <div className="text-center mb-12">
                    <h3 className="text-2xl lg:text-3xl font-bold">Les piliers de notre accompagnement</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                    {pillars.map((pillar) => {
                        const image = PlaceHolderImages.find(p => p.id === pillar.id);
                        return (
                            <Card key={pillar.id} className="overflow-hidden">
                                <div className="h-48 relative">
                                    {image && (
                                        <Image
                                            src={image.imageUrl}
                                            alt={image.description}
                                            fill
                                            className="object-cover"
                                            data-ai-hint={image.imageHint}
                                        />
                                    )}
                                </div>
                                <CardContent className="p-6">
                                    <h4 className="font-bold text-xl mb-2">{pillar.title}</h4>
                                    <p className="text-muted-foreground">{pillar.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="text-center mb-12">
                    <h3 className="text-2xl lg:text-3xl font-bold text-primary">Nos expertises sectorielles</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {expertises.map((expertise) => {
                         const image = PlaceHolderImages.find(p => p.id === expertise.id);
                        return (
                            <Card key={expertise.id} className="overflow-hidden">
                               <div className="h-48 relative">
                                    {image && (
                                        <Image
                                            src={image.imageUrl}
                                            alt={image.description}
                                            fill
                                            className="object-cover"
                                            data-ai-hint={image.imageHint}
                                        />
                                    )}
                                </div>
                                <CardContent className="p-6">
                                    <h4 className="font-bold text-xl mb-2">{expertise.title}</h4>
                                    <p className="text-muted-foreground">{expertise.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
