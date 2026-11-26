// FedaPay webhook (configure in FedaPay dashboard → Webhooks):
//   https://<project>.supabase.co/functions/v1/fedapay-webhook
// Also callable by the app with {"transaction_id": "<our uuid>"} to re-check a
// pending top-up after the user returns from the payment page.
// In both cases the status is re-read from the FedaPay API before crediting.
import { createClient } from "npm:@supabase/supabase-js@2";
import { fedapay, unwrapTransaction, verifyFedapaySignature } from "../_shared/fedapay.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fedapay-signature",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const raw = await req.text();
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(raw); } catch { return json({ error: "invalid json" }, 400); }

  let fedapayId: number | null = null;
  const signature = req.headers.get("x-fedapay-signature");

  if (signature) {
    const secret = Deno.env.get("FEDAPAY_WEBHOOK_SECRET");
    if (!secret || !(await verifyFedapaySignature(raw, signature, secret))) {
      return json({ error: "invalid signature" }, 401);
    }
    const entity = (payload.entity ?? payload.object ?? {}) as Record<string, unknown>;
    fedapayId = Number(entity.id) || null;
  } else if (typeof payload.transaction_id === "string") {
    // App re-check: only the owner may trigger it.
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Connexion requise" }, 401);
    const { data } = await admin.from("fedapay_transactions").select("fedapay_id, user_id")
      .eq("id", payload.transaction_id).maybeSingle();
    if (!data || data.user_id !== user.id) return json({ error: "introuvable" }, 404);
    fedapayId = data.fedapay_id;
  }

  if (!fedapayId) return json({ ok: true, ignored: true });

  try {
    const tx = unwrapTransaction(await fedapay(`/transactions/${fedapayId}`));
    const status = String(tx.status ?? "pending");
    if (status === "pending") return json({ ok: true, status });
    const { data, error } = await admin.rpc("credit_wallet_from_fedapay", {
      p_fedapay_id: fedapayId,
      p_status: status,
      p_mode: tx.mode ? String(tx.mode) : null,
    });
    if (error) throw error;
    return json({ ok: true, status, result: data });
  } catch (e) {
    console.error("fedapay-webhook", fedapayId, e);
    return json({ error: "processing failed" }, 500);
  }
});
