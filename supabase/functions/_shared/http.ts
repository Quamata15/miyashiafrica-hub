import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const adminClient = (): SupabaseClient =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

export async function getUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data } = await client.auth.getUser();
  return data?.user ?? null;
}

/** True when the call comes from our database (pg_net) or cron with the shared internal secret. */
export async function isInternal(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-cron-secret");
  if (!provided) return false;
  const env = Deno.env.get("CRON_SECRET");
  if (env && provided === env) return true;
  const { data } = await adminClient().rpc("verify_cron_secret", { p_secret: provided });
  return data === true;
}

/** Fixed-window rate limit backed by the database. Returns true when the call is allowed. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await adminClient().rpc("hit_rate_limit", { p_key: key, p_max: max, p_window: windowSeconds });
  return error ? true : data === true;   // fail open: never block payments because the limiter is down
}

export const clientIp = (req: Request) =>
  (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown").split(",")[0].trim();
