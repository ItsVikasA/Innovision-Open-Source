"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Quote, Star, Users } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const testimonials = [
  {
    name: "Shree Vishnu",
    role: "Student",
    initials: "SV",
    content:
      "InnoVision helped me learn React in half the time it would have taken with traditional courses. The chapter-wise approach made complex concepts easy to understand.",
    rating: 5,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Karthik AN",
    role: "Student",
    initials: "KA",
    content:
      "I needed to quickly learn about SEO strategies for my new role. InnoVision created a perfect course that covered everything I needed to know.",
    rating: 5,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Amrutha Varshini",
    role: "Student",
    initials: "AV",
    content:
      "As a student, I use InnoVision to supplement my university courses. It breaks down difficult subjects into manageable chapters that are easy to follow.",
    rating: 5,
    gradient: "from-orange-500 to-red-500",
  },
];

const Testimonials = () => {
  return (
    <section className="relative w-full py-24 md:py-36 overflow-hidden bg-background">
      {/* soft background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-3xl rounded-full" />
      </div>

      <div className="container relative z-10 px-4 md:px-6 mx-auto">
        {/* Header */}
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-border/60 bg-background/60 backdrop-blur text-sm text-muted-foreground mb-5">
              <Users className="h-4 w-4 text-blue-500" />
              Testimonials
            </div>

            <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-5">
              What Our Users <span className="text-blue-500">Say</span>
            </h2>

            <p className="max-w-2xl mx-auto text-muted-foreground text-lg font-light leading-relaxed">
              Thousands of learners are building skills faster with structured,
              AI-powered learning paths designed for real-world growth.
            </p>
          </div>
        </ScrollReveal>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((t, index) => (
            <ScrollReveal key={t.name} delay={index * 120} direction="up">
              <Card className="relative group h-full overflow-hidden border border-border/60 bg-background/60 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10">
                
                {/* quote watermark */}
                <Quote className="absolute top-5 right-5 h-14 w-14 text-foreground/5 group-hover:text-blue-500/10 transition" />

                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className={`h-12 w-12 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-medium shadow-md`}
                    >
                      {t.initials}
                    </div>

                    <div>
                      <p className="font-medium text-foreground">
                        {t.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Rating */}
                  <div
                    className="flex gap-1"
                    aria-label={`${t.rating} star rating`}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 transition ${
                          i < t.rating
                            ? "text-blue-500 fill-blue-500 drop-shadow"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-muted-foreground leading-relaxed font-light">
                    “{t.content}”
                  </p>
                </CardContent>

                {/* hover accent line */}
                <div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500" />
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;