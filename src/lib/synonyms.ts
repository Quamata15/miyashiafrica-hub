// Local-language words (Éwé, Fon, Wolof, Dioula…) mapped to the French word used in listings.
// "ceeb" finds rice, "avɔ" finds pagnes. The list lives in the database (admin can add words).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
let cache: Map<string, string[]> | null = null;
let pending: Promise<Map<string, string[]>> | null = null;

export function loadSynonyms() {
  if (cache) return Promise.resolve(cache);
  pending ??= Promise.resolve(supabase.from("search_synonyms").select("term, means")).then(({ data }) => {
    const m = new Map<string, string[]>();
    for (const r of data ?? []) m.set(norm(r.term), [...(m.get(norm(r.term)) ?? []), r.means]);
    cache = m;
    return m;
  });
  return pending;
}

/** The query plus the French words its local-language words mean. */
export function expandTerms(q: string, map: Map<string, string[]> | null): string[] {
  const base = q.trim();
  if (!base || !map) return base ? [base] : [];
  const extra = new Set<string>();
  for (const w of [norm(base), ...norm(base).split(/\s+/)]) for (const m of map.get(w) ?? []) extra.add(m);
  return [base, ...extra];
}

export function useSynonyms() {
  const [map, setMap] = useState<Map<string, string[]> | null>(cache);
  useEffect(() => { if (!map) loadSynonyms().then(setMap); }, [map]);
  return map;
}
