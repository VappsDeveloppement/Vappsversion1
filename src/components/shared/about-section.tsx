
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";
import { useAgency } from "@/context/agency-provider";

export function AboutSection() {
    const { personalization } = useAgency();
    const aboutSettings = personalization?.aboutSection;

    if (!aboutSettings) return null;

    const defaultAboutImage = PlaceHolderImages.find(p => p.id === 'about-way');
    const aboutImage = aboutSettings.mainImageUrl || defaultAboutImage?.imageUrl;
    const aboutImageHint = defaultAboutImage?.imageHint || 'woman bike';

    const pillars = aboutSettings.pillars || [];
    const expertises = aboutSettings.expertises || [];

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{aboutSettings.mainTitle}</h2>
                    <p className="text-lg text-primary mt-2">{aboutSettings.mainSubtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
                    <div className="w-full h-64 md:h-80 relative rounded-lg overflow-hidden shadow-lg">
                        {aboutImage && (
                            <Image
                                src={aboutImage}
                                alt="Image section A propos"
                                fill
                                className="object-cover transition-transform duration-300 ease-in-out hover:scale-105"
                                data-ai-hint={aboutImageHint}
                            />
                        )}
                    </div>
                    <p className="text-muted-foreground text-lg">
                        {aboutSettings.mainText}
                    </p>
                </div>

                <div className="text-center mb-12">
                    <h3 className="text-2xl lg:text-3xl font-bold">{aboutSettings.pillarsSectionTitle}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                    {pillars.map((pillar) => {
                        const placeholderImage = PlaceHolderImages.find(p => p.id === pillar.id);
                        const imageSrc = pillar.imageUrl || placeholderImage?.imageUrl;
                        const imageHint = placeholderImage?.imageHint;

                        return (
                            <Card key={pillar.id} className="overflow-hidden group">
                                <div className="h-48 relative overflow-hidden">
                                    {imageSrc && (
                                        <Image
                                            src={imageSrc}
                                            alt={pillar.title}
                                            fill
                                            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                            data-ai-hint={imageHint}
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

                {aboutSettings.showExpertises && (
                    <>
                        <div className="text-center mb-12">
                            <h3 className="text-2xl lg:text-3xl font-bold text-primary">{aboutSettings.expertisesSectionTitle}</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {expertises.map((expertise) => {
                                const placeholderImage = PlaceHolderImages.find(p => p.id === expertise.id);
                                const imageSrc = expertise.imageUrl || placeholderImage?.imageUrl;
                                const imageHint = placeholderImage?.imageHint;

                                return (
                                    <Card key={expertise.id} className="overflow-hidden group">
                                    <div className="h-48 relative overflow-hidden">
                                            {imageSrc && (
                                                <Image
                                                    src={imageSrc}
                                                    alt={expertise.title}
                                                    fill
                                                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                    data-ai-hint={imageHint}
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
                    </>
                )}
            </div>
        </section>
    );
}

    