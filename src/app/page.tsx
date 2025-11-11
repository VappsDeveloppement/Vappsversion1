import { Header } from '@/components/landing/header';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Testimonials } from '@/components/landing/testimonials';
import { Pricing } from '@/components/landing/pricing';
import { Faq } from '@/components/landing/faq';
import { Footer } from '@/components/landing/footer';

// Simule les données d'une agence. Dans une application réelle,
// ces données proviendraient d'une API ou d'une base de données en fonction de l'agence visitée.
const agencyData = {
  name: "VApps Success Hub",
  logo: {
    icon: "Target",
    text: "VApps"
  },
  hero: {
    title: "Unlock Your Full Potential",
    subtitle: "VApps provides expert coaching and powerful tools to accelerate your personal and professional growth.",
    cta: "Start Your Journey Today"
  },
  features: [
    {
      icon: "CalendarClock",
      title: "Intelligent Scheduling",
      description: "Book appointments seamlessly with our smart calendar that manages time zones and prevents overbooking.",
    },
    {
      icon: "Mail",
      title: "Automated Email Marketing",
      description: "Engage your audience with automated email campaigns, triggered by user actions for maximum impact.",
    },
    {
      icon: "MessageSquareQuote",
      title: "Secure Messaging",
      description: "Communicate with clients confidently through our encrypted, private messaging platform.",
    },
    {
      icon: "Users",
      title: "User Management",
      description: "Effortlessly manage user roles, permissions, and access to secure areas of the platform.",
    },
    {
      icon: "BarChart",
      title: "Automated Invoicing",
      description: "Generate invoices, track payments, and export accounting reports with our streamlined billing system.",
    },
    {
      icon: "ShieldCheck",
      title: "GDPR Compliance",
      description: "Stay compliant with built-in tools for data management, consent tracking, and user privacy.",
    },
  ],
  testimonials: [
    {
      name: "Sarah L.",
      title: "Marketing Director",
      quote: "VApps has been a game-changer for my career. The coaching sessions are insightful, and the platform makes it so easy to stay organized and focused on my goals.",
      avatarId: "testimonial-avatar-1",
    },
    {
      name: "Michael B.",
      title: "Software Engineer",
      quote: "The personalized feedback and action plans helped me overcome major roadblocks in my professional development. I've seen a tangible improvement in my skills.",
      avatarId: "testimonial-avatar-2",
    },
    {
      name: "Jessica P.",
      title: "Freelance Designer",
      quote: "As a freelancer, managing my own growth is tough. VApps gave me the structure and accountability I needed to take my business to the next level. Highly recommended!",
      avatarId: "testimonial-avatar-3",
    },
  ]
  // ... autres données personnalisables pour le pricing, FAQ, etc.
};


export default function Home() {
  // Ici, vous pourriez utiliser des props dynamiques basées sur l'URL 
  // pour récupérer les données de l'agence spécifique, par exemple :
  // export default function Home({ params }: { params: { agencyId: string } }) {
  // const agencyData = await getAgencyData(params.agencyId);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header agencyName={agencyData.name} />
      <main className="flex-1">
        <Hero 
          title={agencyData.hero.title}
          subtitle={agencyData.hero.subtitle}
          cta={agencyData.hero.cta}
        />
        <Features features={agencyData.features} />
        <HowItWorks />
        <Testimonials testimonials={agencyData.testimonials} />
        <Pricing />
        <Faq />
      </main>
      <Footer agencyName={agencyData.name} />
    </div>
  );
}