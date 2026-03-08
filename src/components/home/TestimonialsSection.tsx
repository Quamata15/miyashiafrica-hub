import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    id: 1,
    name: "Kofi Mensah",
    role: "Vendeur",
    location: "Accra, Ghana",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&q=75&fm=webp",
    rating: 5,
    content: "MIYASHI a transformé mon petit commerce en une entreprise prospère. Les outils de gestion sont excellents et le support est toujours disponible.",
  },
  {
    id: 2,
    name: "Aminata Diallo",
    role: "Freelance Designer",
    location: "Dakar, Sénégal",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&q=75&fm=webp",
    rating: 5,
    content: "Grâce à MIYASHI, j'ai pu trouver des clients à travers toute l'Afrique de l'Ouest. La plateforme est intuitive et les paiements sont sécurisés.",
  },
  {
    id: 3,
    name: "Emmanuel Kodjo",
    role: "Acheteur régulier",
    location: "Lomé, Togo",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&q=75&fm=webp",
    rating: 5,
    content: "Je fais tous mes achats sur MIYASHI. Les produits sont de qualité, les prix sont justes et la livraison est rapide. Je recommande !",
  },
  {
    id: 4,
    name: "Fatou Bamba",
    role: "Prestataire de services",
    location: "Abidjan, Côte d'Ivoire",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    rating: 5,
    content: "En tant que coiffeuse, MIYASHI m'a permis de développer ma clientèle. Le système de réservation est pratique et je reçois des avis positifs.",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Témoignages
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ce que disent nos utilisateurs
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Découvrez les expériences de notre communauté grandissante
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
                <CardContent className="p-6">
                  <Quote className="w-8 h-8 text-primary/20 mb-4 group-hover:text-primary/40 transition-colors" />
                  
                  <p className="text-foreground/80 text-sm mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>

                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-primary/20">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role} • {testimonial.location}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
