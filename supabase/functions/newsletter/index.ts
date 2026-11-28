// Newsletter confirmation e-mail (double opt-in). Called by the database (subscribe_newsletter).
//   Needs RESEND_API_KEY + EMAIL_FROM; without them the subscription waits, unconfirmed.
import { adminClient, json, isInternal } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "Unauthorized" }, 401);
  const { subscriber_id } = await req.json().catch(() => ({}));
  if (typeof subscriber_id !== "string") return json({ error: "bad request" }, 400);
  const db = adminClient();
  const { data: s } = await db.from("newsletter_subscribers").select("email, token, confirmed_at").eq("id", subscriber_id).maybeSingle();
  if (!s || s.confirmed_at) return json({ skipped: true });
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) return json({ skipped: "not_configured" });
  const site = (Deno.env.get("SITE_URL") ?? "https://miyashiafrica-hub.vercel.app").replace(/\/$/, "");
  const confirm = `${site}/newsletter?confirmer=${s.token}`, stop = `${site}/newsletter?desinscrire=${s.token}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f3ee;font-family:Arial,Helvetica,sans-serif;color:#17151f">
<table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:14px">
<tr><td style="background:#0d0c14;padding:18px 24px;color:#ffc21a;font-weight:bold;font-size:20px">MIYASHI</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">Confirmez votre inscription</h1>
<p style="font-size:15px;line-height:1.5">Cliquez pour recevoir les meilleures offres et nouveautés de MIYASHI.</p>
<a href="${confirm}" style="display:inline-block;background:#ffc21a;color:#0d0c14;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Je confirme</a>
<p style="font-size:12px;color:#6b6878;margin-top:24px">Vous n'avez rien demandé ? Ignorez cet e-mail. <a href="${stop}">Se désinscrire</a></p></td></tr></table></td></tr></table></body></html>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [s.email], subject: "Confirmez votre inscription — MIYASHI", html, text: `Confirmez : ${confirm}\nSe désinscrire : ${stop}`,
      headers: { "List-Unsubscribe": `<${stop}>` } }),
  });
  return json({ sent: r.ok });
});
