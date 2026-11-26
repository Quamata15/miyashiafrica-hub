// Sends an in-app notification by e-mail (#38) and WhatsApp (#36). Called by the database on insert.
//   E-mail   : RESEND_API_KEY + EMAIL_FROM (e.g. "MIYASHI <notifications@votre-domaine>")
//   WhatsApp : WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_TEMPLATE (approved template with one {{1}} body variable)
// A channel without its secrets is skipped and recorded as such.
import { adminClient, json, isInternal } from "../_shared/http.ts";

const LINKS: Record<string, (d: any) => string> = {
  order: (d) => (d?.order_id ? `/dashboard?order=${d.order_id}` : "/dashboard"),
  wallet: () => "/wallet", offer: () => "/offers", quote: () => "/quotes", booking: () => "/bookings",
  group_buy: (d) => (d?.order_id ? "/dashboard" : "/wallet"), stock: (d) => (d?.product_id ? `/product/${d.product_id}` : "/marketplace"),
  dispute: () => "/disputes", payout: () => "/wallet", shop_invite: () => "/shop/manage", security: () => "/profile",
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function emailHtml(title: string, message: string, href: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f3ee;font-family:Arial,Helvetica,sans-serif;color:#17151f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0d0c14;padding:18px 24px;color:#ffc21a;font-weight:bold;font-size:20px;letter-spacing:1px">MIYASHI</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 22px">${esc(message)}</p>
<a href="${esc(href)}" style="display:inline-block;background:#ffc21a;color:#0d0c14;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Ouvrir MIYASHI</a>
<p style="font-size:12px;color:#6b6878;margin:26px 0 0">Vous recevez cet e-mail car vous avez un compte MIYASHI. Gérez vos notifications dans Profil → Notifications.</p>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return json({ error: "Unauthorized" }, 401);
  const { notification_id } = await req.json().catch(() => ({}));
  if (typeof notification_id !== "string") return json({ error: "bad request" }, 400);

  const db = adminClient();
  const { data: n } = await db.from("notifications").select("*").eq("id", notification_id).maybeSingle();
  if (!n) return json({ skipped: "not_found" });
  const [{ data: prefs }, { data: u }] = await Promise.all([
    db.from("user_preferences").select("email_notifications, whatsapp_notifications, whatsapp_number").eq("user_id", n.user_id).maybeSingle(),
    db.auth.admin.getUserById(n.user_id),
  ]);
  const site = (Deno.env.get("SITE_URL") ?? "https://miyashiafrica-hub.vercel.app").replace(/\/$/, "");
  const href = site + (LINKS[n.type]?.(n.data) ?? "/");
  const log = (channel: string, status: string, detail?: string) =>
    db.from("notification_deliveries").insert({ notification_id: n.id, channel, status, detail: detail?.slice(0, 500) });
  const results: Record<string, string> = {};

  // E-mail
  const email = u?.user?.email;
  if (prefs?.email_notifications === false || !email) { results.email = "skipped"; }
  else if (!Deno.env.get("RESEND_API_KEY") || !Deno.env.get("EMAIL_FROM")) { results.email = "not_configured"; await log("email", "skipped", "not configured"); }
  else {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM"), to: [email], subject: `${n.title} — MIYASHI`, html: emailHtml(n.title, n.message, href), text: `${n.title}\n\n${n.message}\n\n${href}` }),
    });
    results.email = r.ok ? "sent" : "failed";
    await log("email", results.email, r.ok ? undefined : await r.text());
  }

  // WhatsApp (opt-in)
  const wa = String(prefs?.whatsapp_number ?? "").replace(/\D/g, "");
  if (!prefs?.whatsapp_notifications || wa.length < 8) { results.whatsapp = "skipped"; }
  else if (!Deno.env.get("WHATSAPP_TOKEN") || !Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || !Deno.env.get("WHATSAPP_TEMPLATE")) {
    results.whatsapp = "not_configured"; await log("whatsapp", "skipped", "not configured");
  } else {
    const r = await fetch(`https://graph.facebook.com/v21.0/${Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: wa, type: "template",
        template: { name: Deno.env.get("WHATSAPP_TEMPLATE"), language: { code: "fr" },
          components: [{ type: "body", parameters: [{ type: "text", text: `${n.title} : ${n.message}`.slice(0, 900) }] }] },
      }),
    });
    results.whatsapp = r.ok ? "sent" : "failed";
    await log("whatsapp", results.whatsapp, r.ok ? undefined : await r.text());
  }
  return json(results);
});
