import { Button } from "@/components/ui/button";

export function CtaSection() {
    return (
        <section className="bg-green-50/50 py-16 sm:py-24">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">Prêt à tester le futur ?</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                    Rejoignez notre communauté de bêta-testeurs et découvrez des applications innovantes avant tout le monde.
                </p>
                <Button size="lg" className="font-bold">
                    Devenir bêta-testeur
                </Button>
            </div>
        </section>
    );
}
