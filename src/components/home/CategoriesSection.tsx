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
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const categories = [
  { 
    name: "Électronique", 
    icon: Smartphone, 
    count: "2.5K+ produits",
    color: "bg-primary/10 text-primary",
    href: "/marketplace"
  },
  { 
    name: "Mode & Beauté", 
    icon: ShirtIcon, 
    count: "5K+ produits",
    color: "bg-secondary/10 text-secondary",
    href: "/marketplace"
  },
  { 
    name: "Maison & Déco", 
    icon: Home, 
    count: "1.8K+ produits",
    color: "bg-accent/10 text-accent",
    href: "/marketplace"
  },
  { 
    name: "Automobile", 
    icon: Car, 
    count: "800+ produits",
    color: "bg-primary/10 text-primary",
    href: "/marketplace"
  },
  { 
    name: "Alimentation", 
    icon: Utensils, 
    count: "3K+ produits",
    color: "bg-secondary/10 text-secondary",
    href: "/marketplace"
  },
  { 
    name: "Art & Design", 
    icon: Palette, 
    count: "1.2K+ services",
    color: "bg-accent/10 text-accent",
    href: "/services"
  },
  { 
    name: "Services Pro", 
    icon: Wrench, 
    count: "2K+ prestataires",
    color: "bg-primary/10 text-primary",
    href: "/services"
  },
  { 
    name: "Formation", 
    icon: GraduationCap, 
    count: "500+ cours",
    color: "bg-secondary/10 text-secondary",
    href: "/services"
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const CategoriesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-card relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="container relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Catégories populaires
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Explorez notre large sélection de produits et services dans toutes les catégories
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4"
        >
          {categories.map((category) => (
            <motion.div key={category.name} variants={itemVariants}>
              <Link
                to={category.href}
                className="group flex flex-col items-center p-4 rounded-2xl bg-background hover:bg-muted border border-transparent hover:border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <motion.div 
                  className={`w-14 h-14 rounded-xl ${category.color} flex items-center justify-center mb-3`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <category.icon className="w-6 h-6" />
                </motion.div>
                <span className="font-semibold text-sm text-foreground text-center mb-1">
                  {category.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {category.count}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CategoriesSection;
