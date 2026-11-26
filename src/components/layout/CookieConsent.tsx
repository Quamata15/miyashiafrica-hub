// Cookie and storage consent (#48). Essential storage (session, cart, preferences) is always on;
// audience measurement (product views used for statistics and recommendations) needs consent.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const KEY = "miyashi_cookie_consent";
const EVT = "miyashi:cookie-consent";

export function hasAnalyticsConsent() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null")?.analytics === true; } catch { return false; }
}
export function resetCookieConsent() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT));
}

export default function CookieConsent() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const check = () => { try { setShow(!localStorage.getItem(KEY)); } catch { setShow(false); } };
    check();
    window.addEventListener(EVT, check);
    return () => window.removeEventListener(EVT, check);
  }, []);
  const choose = (analytics: boolean) => {
    const value = { analytics, at: new Date().toISOString(), version: 1 };
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* ignore */ }
    if (user) supabase.from("user_preferences").update({ cookie_consent: value }).eq("user_id", user.id).then(() => undefined);
    setShow(false);
  };
  if (!show) return null;
  return (
    <div role="dialog" aria-label="Cookies" className="no-print fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-foreground/10 bg-card/95 backdrop-blur-xl p-4 shadow-elevated">
      <p className="text-sm">MIYASHI utilise le stockage du navigateur pour votre session, votre panier et vos préférences. Avec votre accord, nous mesurons aussi les produits consultés pour améliorer les recommandations et les statistiques des vendeurs. <Link to="/terms" className="text-primary underline">En savoir plus</Link></p>
      <div className="flex flex-wrap gap-2 mt-3 justify-end">
        <Button variant="ghost" size="sm" onClick={() => choose(false)}>Refuser</Button>
        <Button size="sm" onClick={() => choose(true)}>Accepter</Button>
      </div>
    </div>
  );
}
