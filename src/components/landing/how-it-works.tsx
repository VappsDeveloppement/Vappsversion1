import { Award, CalendarCheck, UserCheck } from "lucide-react";

const steps = [
  {
    icon: <CalendarCheck className="w-10 h-10 text-accent" />,
    title: "1. Book a Session",
    description: "Choose a time that works for you with our easy-to-use scheduling tool.",
  },
  {
    icon: <UserCheck className="w-10 h-10 text-accent" />,
    title: "2. Meet Your Coach",
    description: "Connect with your dedicated coach through our secure messaging and video platform.",
  },
  {
    icon: <Award className="w-10 h-10 text-accent" />,
    title: "3. Achieve Your Goals",
    description: "Follow your personalized development plan and track your progress towards success.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">Get Started in Three Simple Steps</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your journey to personal and professional mastery is just a few clicks away.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="p-5 bg-accent/10 rounded-full">
                  {step.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold font-headline">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
