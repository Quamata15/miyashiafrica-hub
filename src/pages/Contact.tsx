import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const Contact = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", category: "general" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "Connexion requise", variant: "destructive" }); return; }
    setLoading(true);

    const { error } = await (supabase.from("support_tickets") as any).insert({
      user_id: user.id,
      subject: form.subject,
      message: form.message,
      category: form.category,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer", variant: "destructive" });
    } else {
      toast({ title: "Message envoyé!", description: "Nous vous répondrons rapidement." });
      setForm({ subject: "", message: "", category: "general" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title="Contact" description="Contactez l'équipe MIYASHI pour toute question ou assistance." canonical="/contact" />
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <h1 className="text-2xl md:text-3xl font-display font-bold">Nous contacter</h1>
            <p className="text-sm text-muted-foreground">Notre équipe est là pour vous aider</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-3 md:content-start">
              {[
                { icon: Mail, title: "Email", value: "contact@miyashi.africa", href: "mailto:contact@miyashi.africa" },
                { icon: Phone, title: "Téléphone", value: "+228 97 09 56 85", href: "tel:+22897095685" },
                { icon: MapPin, title: "Adresse", value: "Lomé, Togo" },
              ].map(info => {
                const body = (
                  <>
                    <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <info.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 text-center md:text-left">
                      <p className="text-xs text-muted-foreground">{info.title}</p>
                      <p className="hidden md:block font-medium text-sm break-words">{info.value}</p>
                    </div>
                  </>
                );
                const cls = "flex flex-col md:flex-row items-center gap-1.5 md:gap-3 rounded-xl border border-foreground/10 bg-card/80 p-2.5 md:p-3 shadow-card hover:border-primary/40 transition-colors min-w-0";
                return info.href
                  ? <a key={info.title} href={info.href} className={cls} aria-label={`${info.title} : ${info.value}`}>{body}</a>
                  : <div key={info.title} className={cls} aria-label={`${info.title} : ${info.value}`}>{body}</div>;
              })}
            </div>

            <Card className="md:col-span-2 border-0 shadow-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Envoyer un message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-category">Catégorie</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger id="contact-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Général</SelectItem>
                        <SelectItem value="order">Commande</SelectItem>
                        <SelectItem value="delivery">Livraison</SelectItem>
                        <SelectItem value="payment">Paiement</SelectItem>
                        <SelectItem value="account">Compte</SelectItem>
                        <SelectItem value="technical">Technique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-subject">Sujet</Label>
                    <Input id="contact-subject" placeholder="Sujet de votre message" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
                  </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea id="contact-message" placeholder="Décrivez votre problème..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} required />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-hero" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Envoyer
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
