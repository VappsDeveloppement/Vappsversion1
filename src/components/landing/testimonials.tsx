import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const testimonials = [
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
];

export function Testimonials() {
  const getImage = (id: string) => PlaceHolderImages.find(p => p.id === id);

  return (
    <section id="testimonials" className="py-16 md:py-24 bg-card">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">Trusted by Professionals Worldwide</h2>
          <p className="text-lg text-muted-foreground">
            Hear what our clients have to say about their journey with VApps.
          </p>
        </div>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-4xl mx-auto"
        >
          <CarouselContent>
            {testimonials.map((testimonial, index) => {
              const avatarImage = getImage(testimonial.avatarId);
              return (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1 h-full">
                    <Card className="h-full flex flex-col justify-between">
                      <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                        <div className="flex flex-col items-center pt-4">
                          {avatarImage && (
                            <Avatar className="w-16 h-16 mb-2">
                              <AvatarImage src={avatarImage.imageUrl} alt={testimonial.name} data-ai-hint={avatarImage.imageHint} />
                              <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
}
