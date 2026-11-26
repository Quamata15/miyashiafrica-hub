// Opening hours (#23): {"mon":[["08:00","18:00"]], ...}. Times are local West Africa time (GMT).
export const DAYS = [["mon", "Lundi"], ["tue", "Mardi"], ["wed", "Mercredi"], ["thu", "Jeudi"], ["fri", "Vendredi"], ["sat", "Samedi"], ["sun", "Dimanche"]] as const;
export type Hours = Partial<Record<(typeof DAYS)[number][0], [string, string][]>>;

export function openState(hours: Hours | null | undefined, now = new Date()) {
  if (!hours || !Object.keys(hours).length) return null;
  const key = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getUTCDay()] as keyof Hours;
  const hm = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const today = hours[key] ?? [];
  const open = today.some(([a, b]) => a <= hm && hm < b);
  return { open, today: today.map(([a, b]) => `${a}–${b}`).join(", ") || "fermé aujourd'hui" };
}
