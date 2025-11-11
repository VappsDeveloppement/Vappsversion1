import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, Mail, MessageSquareQuote, Users, BarChart, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: <CalendarClock className="w-8 h-8 text-primary" />,
    title: "Intelligent Scheduling",
    description: "Book appointments seamlessly with our smart calendar that manages time zones and prevents overbooking.",
  },
  {
    icon: <Mail className="w-8 h-8 text-primary" />,
    title: "Automated Email Marketing",
    description: "Engage your audience with automated email campaigns, triggered by user actions for maximum impact.",
  },
  {
    icon: <MessageSquareQuote className="w-8 h-8 text-primary" />,
    title: "Secure Messaging",
    description: "Communicate with clients confidently through our encrypted, private messaging platform.",
  },
  {
    icon: <Users className="w-8 h-8 text-primary" />,
    title: "User Management",
    description: "Effortlessly manage user roles, permissions, and access to secure areas of the platform.",
  },
  {
    icon: <BarChart className="w-8 h-8 text-primary" />,
    title: "Automated Invoicing",
    description: "Generate invoices, track payments, and export accounting reports with our streamlined billing system.",
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: "GDPR Compliance",
    description: "Stay compliant with built-in tools for data management, consent tracking, and user privacy.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-16 md:py-24 bg-card">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">A Hub for Your Success</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            VApps is an all-in-one platform designed to streamline your coaching business and empower your clients' growth.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="flex flex-col items-center text-center p-6 transition-transform transform hover:-translate-y-2 hover:shadow-xl">
              <CardHeader>
                <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                  {feature.icon}
                </div>
                <CardTitle className="font-headline">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
