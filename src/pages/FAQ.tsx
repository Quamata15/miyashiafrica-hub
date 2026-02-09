import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const FAQ = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      const { data } = await (supabase.from("faq_items") as any).select("*").order("sort_order");
      if (data) setFaqs(data);
    };
    fetchFaqs();
  }, []);

  const categories = [...new Set(faqs.map(f => f.category))];

  const filtered = faqs.filter(f => {
    const matchSearch = f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || f.category === selectedCat;
    return matchSearch && matchCat;
  });

  const catLabels: Record<string, string> = {
    general: "Général", livraison: "Livraison", vendeur: "Vendeur",
    freelance: "Freelance", paiement: "Paiement", securite: "Sécurité",
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-display font-bold mb-3">Questions Fréquentes</h1>
            <p className="text-muted-foreground">Trouvez rapidement des réponses à vos questions</p>
          </motion.div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 h-12 rounded-xl" />
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            <Badge variant={!selectedCat ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedCat(null)}>Tous</Badge>
            {categories.map(c => (
              <Badge key={c} variant={selectedCat === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedCat(c)}>
                {catLabels[c] || c}
              </Badge>
            ))}
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {filtered.map(faq => (
              <AccordionItem key={faq.id} value={faq.id} className="bg-card rounded-xl border-0 shadow-card px-4">
                <AccordionTrigger className="text-left font-medium hover:no-underline py-4">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune question trouvée</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
