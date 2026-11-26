// Shared helpers for the SEO functions (Vercel serverless, Node runtime).
// The publishable key is public by design (same one the website ships).
export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://decycxufopbagjdpejul.supabase.co";
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_I1MOzStz4UxUF1QpodfRvQ_PgQiiR_f";
export const SITE = (process.env.SITE_URL || "https://miyashiafrica-hub.vercel.app").replace(/\/$/, "");

export async function rest(path) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;   // never fail the page because the database is slow
  }
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
