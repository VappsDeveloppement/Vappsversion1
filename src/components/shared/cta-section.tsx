
import { Button } from "@/components/ui/button";
import { useAgency } from "@/context/agency-provider";
import Image from "next/image";
import Link from "next/link";

export function CtaSection() {
    const { personalization } = useAgency();
    const {
        title = "Prêt à tester le futur ?",
        text = "Rejoignez notre communauté de bêta-testeurs et découvrez des applications innovantes avant tout le monde.",
        buttonText = "Devenir bêta-testeur",
        buttonLink = "#",
        bgColor = "#f0fdf4", // bg-green-50/50
        bgImageUrl = null
    } = personalization?.ctaSection || {};

    const sectionStyle = {
        backgroundColor: bgImageUrl ? 'transparent' : bgColor,
    };

    return (
        <section className="relative py-16 sm:py-24 text-center" style={sectionStyle}>
            {bgImageUrl && (
                <Image
                    src={bgImageUrl}
                    alt="Image de fond CTA"
                    layout="fill"
                    objectFit="cover"
                    className="z-0"
                    data-ai-hint="background call to action"
                />
            )}
            <div className={`relative z-10 container mx-auto px-4 ${bgImageUrl ? 'text-white bg-black/50 py-10 rounded-lg' : 'text-foreground'}`}>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">{title}</h2>
                <p className="max-w-2xl mx-auto mb-8">
                    {text}
                </p>
                <Button size="lg" className="font-bold" asChild>
                    <Link href={buttonLink}>{buttonText}</Link>
                </Button>
            </div>
        </section>
    );
}
