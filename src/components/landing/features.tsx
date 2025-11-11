import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, Mail, MessageSquareQuote, Users, BarChart, ShieldCheck, LucideProps } from "lucide-react";
import * as LucideIcons from "lucide-react";

// Map des icônes pour un rendu dynamique
const iconMap: { [key: string]: React.FC<LucideProps> } = {
  CalendarClock,
  Mail,
  MessageSquareQuote,
  Users,
  BarChart,
  ShieldCheck,
};

type Feature = {
  icon: keyof typeof iconMap;
  title: string;
  description: string;
};

interface FeaturesProps {
  features: Feature[];
}

export function Features({ features }: FeaturesProps) {
  return (
    <section id="features" className="py-16 md:py-24 bg-card">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">A Hub for Your Success</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our platform is an all-in-one solution designed to streamline your business and empower your clients' growth.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <Card key={feature.title} className="flex flex-col items-center text-center p-6 transition-transform transform hover:-translate-y-2 hover:shadow-xl">
                <CardHeader>
                  <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                    {Icon && <Icon className="w-8 h-8 text-primary" />}
                  </div>
                  <CardTitle className="font-headline">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}