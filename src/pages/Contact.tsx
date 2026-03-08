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
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-4xl font-display font-bold mb-3">Nous Contacter</h1>
            <p className="text-muted-foreground">Notre équipe est là pour vous aider</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              {[
                { icon: Mail, title: "Email", value: "contact@miyashi.africa" },
                { icon: Phone, title: "Téléphone", value: "+228 97 09 56 85" },
                { icon: MapPin, title: "Adresse", value: "Lomé, Togo" },
              ].map(info => (
                <Card key={info.title} className="border-0 shadow-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <info.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{info.title}</p>
                      <p className="font-medium">{info.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="md:col-span-2 border-0 shadow-elevated">
              <CardHeader>
                <CardTitle>Envoyer un message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <div className="space-y-2">
                    <Label>Sujet</Label>
                    <Input placeholder="Sujet de votre message" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea placeholder="Décrivez votre problème..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={5} required />
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
