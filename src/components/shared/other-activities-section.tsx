import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Send } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const activities = [
    {
        id: "activity-team-coaching",
        title: "Coaching d'équipe",
        description: "Améliorez la cohésion et la performance.",
    },
    {
        id: "activity-manager-training",
        title: "Formation pour managers",
        description: "Devenez des managers outillés de leadership.",
    },
];

const events = [
    {
        title: "Webinaire : Oser la reconversion",
        date: "25 Juillet 2024",
    },
    {
        title: "Atelier : Définir ses valeurs",
        date: "12 Août 2024",
    },
];

export function OtherActivitiesSection() {
    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                    <div className="lg:col-span-3">
                        <div className="mb-8">
                            <h2 className="text-3xl lg:text-4xl font-bold">Nos autres activités</h2>
                            <p className="text-muted-foreground mt-2">
                                Nous accompagnons également les entreprises dans leur transformation.
                            </p>
                        </div>
                        <div className="space-y-8">
                            {activities.map((activity) => {
                                const image = PlaceHolderImages.find(p => p.id === activity.id);
                                return (
                                    <Card key={activity.id} className="overflow-hidden group">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="sm:w-1/3 relative h-48 sm:h-auto overflow-hidden">
                                                {image && (
                                                    <Image
                                                        src={image.imageUrl}
                                                        alt={image.description}
                                                        fill
                                                        className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                        data-ai-hint={image.imageHint}
                                                    />
                                                )}
                                            </div>
                                            <CardContent className="p-6 sm:w-2/3 flex flex-col justify-center">
                                                <h3 className="font-bold text-xl mb-2">{activity.title}</h3>
                                                <p className="text-muted-foreground mb-3">{activity.description}</p>
                                                <Link href="#" className="text-secondary font-semibold text-sm hover:underline">
                                                    En savoir plus
                                                </Link>
                                            </CardContent>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Calendar className="h-6 w-6 text-primary" />
                                    <h3 className="font-bold text-xl">Prochains Événements</h3>
                                </div>
                                <div className="space-y-3">
                                    {events.map((event, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm">
                                            <p className="font-medium">{event.title}</p>
                                            <p className="text-primary font-semibold">{event.date}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="mb-4">
                                    <h3 className="font-bold text-xl">Contactez-nous</h3>
                                    <p className="text-muted-foreground text-sm">Une question ? Un projet ? Nous sommes à votre écoute.</p>
                                </div>
                                <form className="space-y-4">
                                    <Input placeholder="Prénom et Nom" />
                                    <Input type="email" placeholder="votre.email@example.com" />
                                    <Textarea placeholder="Quelques mots sur votre situation..." />
                                    <Button className="w-full font-bold">
                                        <Send className="mr-2 h-4 w-4 transform -rotate-45" />
                                        Envoyer ma demande
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    );
}
