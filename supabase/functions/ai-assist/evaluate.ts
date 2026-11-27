// Rules-based evaluation of one recorded interview answer, from its transcript and a few
// measurements taken in the browser. Pure function: no imports, unit-tested in src/lib/__tests__.
type Json = Record<string, any>;
const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const FILLERS = ["euh", "heu", "hum", "ben", "bah", "genre", "en fait", "du coup", "voila", "tu vois", "um", "uh", "like", "you know"];

/** Answer quality from the transcript alone: coverage of expected keywords, concrete example, structure, length, fluency. */
export function evaluateAnswer(transcript: string, keywords: string[], seconds: number, metrics: Json = {}) {
  const t = strip(transcript ?? "");
  const words = t.split(/[^a-z0-9']+/).filter(Boolean);
  const n = words.length;
  const duration = Number(metrics.duration_s ?? metrics.speaking_s ?? 0) || seconds * 0.6;
  // Speech rate only when the transcript comes from the recording itself and the timing is plausible;
  // a typed summary or a short clip with a long text would give a meaningless number.
  const typed = metrics.transcript_source === "saisie";
  const rawWpm = !typed && n && duration >= 3 ? Math.round((n / duration) * 60) : 0;
  const wpm = rawWpm > 0 && rawWpm <= 260 ? rawWpm : 0;
  const kw = keywords.map(strip).filter(Boolean);
  const hit = kw.filter((k) => t.includes(k));
  const coverage = kw.length ? hit.length / kw.length : 0.6;
  const fillers = FILLERS.reduce((s, f) => s + (t.match(new RegExp(`(?<![a-z0-9])${f}(?![a-z0-9])`, "g"))?.length ?? 0), 0);
  const hasExample = /par exemple|exemple|j'ai (?:realise|cree|gere|mis en place|developpe|livre|organise|aide|travaille)|nous avons|projet/.test(t);
  const hasResult = /resultat|ainsi|grace a|ce qui a|au final|finalement|\d+ ?%|\d+ (?:clients|projets|ans|mois|personnes|fcfa)/.test(t);
  const hasContext = /quand|lorsque|chez|dans mon (?:ancien|dernier)|au sein|a l'epoque/.test(t);
  const structure = (Number(hasContext) + Number(hasExample) + Number(hasResult)) / 3;
  const lengthOk = n < 15 ? 0.1 : n < 40 ? 0.5 : n > 450 ? 0.7 : 1;
  const fluency = n ? clamp(1 - fillers / Math.max(n / 12, 1) * 0.5, 0, 1) : 0;
  const score = n ? Math.round(clamp(coverage * 4 + structure * 3 + lengthOk * 2 + fluency, 0, 10) * 10) / 10 : 0;
  const tips: string[] = [];
  if (n < 40) tips.push("Réponse courte : peu d'éléments pour juger.");
  if (!hasExample) tips.push("Pas d'exemple concret cité.");
  if (!hasResult) tips.push("Pas de résultat ou de chiffre mentionné.");
  if (kw.length && coverage < 0.4) tips.push(`Points attendus peu abordés (${kw.filter((k) => !hit.includes(k)).slice(0, 3).join(", ")}).`);
  if (wpm > 190) tips.push("Débit très rapide.");
  return {
    score, source: "regles", keywords_hit: hit, coverage: Math.round(coverage * 100),
    structure: { context: hasContext, example: hasExample, result: hasResult },
    communication: { words: n, words_per_minute: wpm || null, hesitations: fillers, latency_s: metrics.latency_s ?? null, pauses: metrics.pauses ?? null, longest_pause_s: metrics.longest_pause_s ?? null, speaking_ratio: metrics.speaking_ratio ?? null },
    feedback: tips.join(" ") || "Réponse structurée et en lien avec la question.",
  };
}

