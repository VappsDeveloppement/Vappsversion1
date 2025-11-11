import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "Who is VApps for?",
    answer: "VApps is designed for ambitious individuals, professionals, and teams who are committed to personal and professional growth. Whether you're looking to advance your career, improve your skills, or lead your team more effectively, our platform provides the tools and coaching you need.",
  },
  {
    question: "How does the coaching work?",
    answer: "Our coaching is personalized to your unique goals. You'll be matched with an expert coach and connect through secure video and messaging. Together, you'll create a development plan, set milestones, and track your progress.",
  },
  {
    question: "Can I change my plan later?",
    answer: "Absolutely. You can upgrade, downgrade, or cancel your plan at any time from your account settings. We believe in flexibility to support your evolving needs.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes, data security and privacy are our top priorities. All communications are end-to-end encrypted, and we are fully GDPR compliant. You have complete control over your data.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="py-16 md:py-24 bg-card">
      <div className="container max-w-3xl mx-auto">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground">
            Have questions? We have answers. If you can't find what you're looking for, feel free to contact us.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-lg font-semibold text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
