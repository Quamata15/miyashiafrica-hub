// Provider agenda as an iCalendar feed: subscribe in Google Agenda (or any calendar) with
//   https://<project>.supabase.co/functions/v1/calendar?token=<calendar_token>
// The token is private to the provider (provider_profiles.calendar_token) and can be regenerated.
import { adminClient } from "../_shared/http.ts";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: string | Date) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const day = (d: string) => d.replace(/-/g, "");

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{32,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const db = adminClient();
  const { data: prof } = await db.from("provider_profiles").select("user_id").eq("calendar_token", token).maybeSingle();
  if (!prof) return new Response("Not found", { status: 404 });
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: bookings }, { data: quotes }] = await Promise.all([
    db.from("bookings").select("id, starts_at, ends_at, status, notes, service:services(title)").eq("provider_id", prof.user_id).gte("starts_at", since).neq("status", "cancelled").limit(500),
    db.from("quotes").select("id, title, start_date, duration_days, on_site, location, status").eq("provider_id", prof.user_id).eq("status", "accepted").not("start_date", "is", null).limit(500),
  ]);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MIYASHI//Agenda prestataire//FR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:MIYASHI – mes prestations", "X-WR-TIMEZONE:Africa/Lome"];
  for (const b of bookings ?? []) {
    lines.push("BEGIN:VEVENT", `UID:booking-${b.id}@miyashi`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(b.starts_at)}`, `DTEND:${stamp(b.ends_at ?? b.starts_at)}`,
      `SUMMARY:${esc(`RDV : ${(b.service as { title?: string } | null)?.title ?? "Prestation"}`)}`, `DESCRIPTION:${esc((b.notes ?? "") + " — réservé sur MIYASHI")}`, "END:VEVENT");
  }
  for (const q of quotes ?? []) {
    const start = q.start_date as string; const end = new Date(new Date(start).getTime() + Math.max(1, q.duration_days ?? 1) * 86400000).toISOString().slice(0, 10);
    lines.push("BEGIN:VEVENT", `UID:quote-${q.id}@miyashi`, `DTSTAMP:${stamp(new Date())}`, `DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${day(end)}`,
      `SUMMARY:${esc(`Prestation : ${q.title}`)}`, q.on_site && q.location ? `LOCATION:${esc(q.location)}` : "", "DESCRIPTION:Devis accepté et payé en séquestre sur MIYASHI", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.filter(Boolean).join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" } });
});
