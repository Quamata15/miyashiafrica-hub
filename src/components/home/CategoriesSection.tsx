import { 
  Smartphone, 
  ShirtIcon, 
  Home, 
  Car, 
  Utensils, 
  Palette,
  Wrench,
  GraduationCap
} from "lucide-react";

const categories = [
  { 
    name: "Électronique", 
    icon: Smartphone, 
    count: "2.5K+ produits",
    color: "bg-primary/10 text-primary"
  },
  { 
    name: "Mode & Beauté", 
    icon: ShirtIcon, 
    count: "5K+ produits",
    color: "bg-secondary/10 text-secondary"
  },
  { 
    name: "Maison & Déco", 
    icon: Home, 
    count: "1.8K+ produits",
    color: "bg-accent/10 text-accent"
  },
  { 
    name: "Automobile", 
    icon: Car, 
    count: "800+ produits",
    color: "bg-primary/10 text-primary"
  },
  { 
    name: "Alimentation", 
    icon: Utensils, 
    count: "3K+ produits",
    color: "bg-secondary/10 text-secondary"
  },
  { 
    name: "Art & Design", 
    icon: Palette, 
    count: "1.2K+ services",
    color: "bg-accent/10 text-accent"
  },
  { 
    name: "Services Pro", 
    icon: Wrench, 
    count: "2K+ prestataires",
    color: "bg-primary/10 text-primary"
  },
  { 
    name: "Formation", 
    icon: GraduationCap, 
    count: "500+ cours",
    color: "bg-secondary/10 text-secondary"
  },
];

const CategoriesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Catégories populaires
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Explorez notre large sélection de produits et services dans toutes les catégories
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((category, index) => (
            <a
              key={category.name}
              href="#"
              className="group flex flex-col items-center p-4 rounded-2xl bg-background hover:bg-muted border border-transparent hover:border-border transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={`w-14 h-14 rounded-xl ${category.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <category.icon className="w-6 h-6" />
              </div>
              <span className="font-semibold text-sm text-foreground text-center mb-1">
                {category.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {category.count}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
