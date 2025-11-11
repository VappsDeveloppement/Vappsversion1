import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Percent, Star, Users } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function WhiteLabelSection() {
    const licenseImage = PlaceHolderImages.find(p => p.id === 'white-label-license');

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Notre Plateforme en Marque Blanche</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
                        Offrez une expérience de coaching et d'accompagnement de premier ordre, entièrement personnalisée à votre image de marque.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column */}
                    <div className="space-y-8">
                        <div className="aspect-video w-full">
                            <iframe
                                className="w-full h-full rounded-lg shadow-xl"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen>
                            </iframe>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Évaluation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                    <div className="flex flex-col items-center">
                                        <Users className="h-8 w-8 text-green-500 mb-2" />
                                        <p className="text-2xl font-bold">1,200+</p>
                                        <p className="text-sm text-muted-foreground">Bêta-testeurs</p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <Percent className="h-8 w-8 text-green-500 mb-2" />
                                        <p className="text-2xl font-bold">98%</p>
                                        <p className="text-sm text-muted-foreground">Réussite aux tests</p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <Star className="h-8 w-8 text-green-500 mb-2" />
                                        <p className="text-2xl font-bold">4.9/5</p>
                                        <p className="text-sm text-muted-foreground">Note Globale</p>
                                    </div>
                                </div>
                                <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
                                    Évaluer l'application
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div>
                        <Card className="overflow-hidden">
                            {licenseImage && (
                                <div className="relative h-48 w-full">
                                    <Image
                                        src={licenseImage.imageUrl}
                                        alt={licenseImage.description}
                                        fill
                                        className="object-cover"
                                        data-ai-hint={licenseImage.imageHint}
                                    />
                                </div>
                            )}
                            <CardContent className="p-6">
                                <h3 className="text-xl font-bold mb-2">Licence V-Apps Pro</h3>
                                <p className="text-muted-foreground mb-4">
                                    Accès complet à notre suite d'outils, personnalisable avec votre logo et vos couleurs.
                                </p>
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Aucun plan disponible</AlertTitle>
                                    <AlertDescription>
                                        Aucun plan exclusif n'est actuellement assigné à cette offre.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    );
}
