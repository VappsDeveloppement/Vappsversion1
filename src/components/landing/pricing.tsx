import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const pricingTiers = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "For individuals getting started on their development journey.",
    features: [
      "1-on-1 Coaching (Bi-weekly)",
      "Personalized Action Plans",
      "Secure Messaging",
      "Basic Reporting",
    ],
    cta: "Choose Starter",
    isPopular: false,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For professionals seeking to accelerate their career growth.",
    features: [
      "1-on-1 Coaching (Weekly)",
      "Everything in Starter",
      "Advanced Reporting",
      "Email Marketing Tools",
      "Priority Support",
    ],
    cta: "Choose Professional",
    isPopular: true,
  },
  {
    name: "Business",
    price: "Contact Us",
    period: "",
    description: "For teams and organizations looking to upskill their workforce.",
    features: [
      "Team Coaching Sessions",
      "Everything in Professional",
      "User Management",
      "Custom Invoicing",
      "Dedicated Account Manager",
    ],
    cta: "Contact Sales",
    isPopular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">Find the Perfect Plan for You</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose a plan that aligns with your goals and budget. All plans are flexible and can be customized.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pricingTiers.map((tier) => (
            <Card key={tier.name} className={`flex flex-col ${tier.isPopular ? 'border-primary shadow-lg' : ''}`}>
              <CardHeader className="items-center text-center">
                {tier.isPopular && (
                  <div className="mb-2">
                    <span className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-primary text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardTitle className="font-headline">{tier.name}</CardTitle>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={tier.isPopular ? "default" : "outline"} asChild>
                  <Link href="/dashboard">{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
