// Viewer preferences shared across the app: display currency (#5), data saver mode (#50)
// and feature flags (#46). Stored in localStorage for everyone and in user_preferences
// for signed-in users.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TablesUpdate } from "@/integrations/supabase/types";

export type Currency = { code: string; name: string; symbol: string; xof_per_unit: number; decimals: number; is_pegged: boolean };
type Flag = { key: string; enabled: boolean; rollout_percent: number };

type PrefsCtx = {
  currency: string;
  currencies: Currency[];
  setCurrency: (c: string) => void;
  dataSaver: boolean;
  setDataSaver: (v: boolean) => void;
  flag: (key: string) => boolean;
  /** "12 500 FCFA" — and "≈ 250 GH₵" appended when another currency is chosen. */
  money: (xof: number | null | undefined, opts?: { withEquivalent?: boolean }) => string;
  equivalent: (xof: number | null | undefined) => string | null;
};

const Ctx = createContext<PrefsCtx | null>(null);
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

export const fcfa = (n: number | null | undefined) =>
  `${Math.round(Number(n ?? 0)).toLocaleString("fr-FR")} FCFA`;

// Stable 0-99 bucket per viewer for gradual rollouts.
const bucket = (seed: string) => { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100; };

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [currency, setCurrencyState] = useState(read("miyashi_currency") || "XOF");
  const [dataSaver, setDataSaverState] = useState(() => {
    const saved = read("miyashi_data_saver");
    if (saved !== null) return saved === "1";
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    return !!conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g";
  });

  useEffect(() => {
    supabase.from("currencies").select("code, name, symbol, xof_per_unit, decimals, is_pegged").order("code")
      .then(({ data }) => data && setCurrencies(data as Currency[]));
    supabase.from("feature_flags").select("key, enabled, rollout_percent")
      .then(({ data }) => setFlags((data as Flag[]) ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_preferences").select("currency, data_saver").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.currency && !read("miyashi_currency")) setCurrencyState(data.currency);
      if (typeof data?.data_saver === "boolean" && read("miyashi_data_saver") === null) setDataSaverState(data.data_saver);
    });
  }, [user]);

  useEffect(() => { document.documentElement.toggleAttribute("data-saver", dataSaver); }, [dataSaver]);

  const persist = useCallback(async (patch: TablesUpdate<"user_preferences">) => {
    if (!user) return;
    const { data } = await supabase.from("user_preferences").update(patch).eq("user_id", user.id).select("id");
    if (!data?.length) await supabase.from("user_preferences").insert({ user_id: user.id, ...patch });
  }, [user]);

  const setCurrency = useCallback((c: string) => { setCurrencyState(c); write("miyashi_currency", c); persist({ currency: c }); }, [persist]);
  const setDataSaver = useCallback((v: boolean) => { setDataSaverState(v); write("miyashi_data_saver", v ? "1" : "0"); persist({ data_saver: v }); }, [persist]);

  const value = useMemo<PrefsCtx>(() => {
    const cur = currencies.find((c) => c.code === currency);
    const equivalent = (xof: number | null | undefined) => {
      if (!cur || cur.code === "XOF" || cur.code === "XAF" || xof == null) return null;
      const v = Number(xof) / Number(cur.xof_per_unit);
      return `≈ ${v.toLocaleString("fr-FR", { maximumFractionDigits: cur.decimals, minimumFractionDigits: 0 })} ${cur.symbol}`;
    };
    const seed = user?.id ?? read("miyashi_session") ?? "anon";
    return {
      currency, currencies, setCurrency, dataSaver, setDataSaver, equivalent,
      money: (xof, opts) => {
        const eq = opts?.withEquivalent === false ? null : equivalent(xof);
        return eq ? `${fcfa(xof)} (${eq})` : fcfa(xof);
      },
      flag: (key) => {
        if (flags === null) return true;               // until loaded, don't hide features
        const f = flags.find((x) => x.key === key);
        if (!f) return true;
        return f.enabled && bucket(`${key}:${seed}`) < f.rollout_percent;
      },
    };
  }, [currencies, currency, setCurrency, dataSaver, setDataSaver, flags, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrefs must be used inside PrefsProvider");
  return v;
}

/** Anonymous id for view tracking and rollouts (not personal data). */
export function sessionId() {
  let s = read("miyashi_session");
  if (!s) { s = crypto.randomUUID(); write("miyashi_session", s); }
  return s;
}
