// Minimal FedaPay REST client (https://docs.fedapay.com).
// FEDAPAY_SECRET_KEY: sk_sandbox_... or sk_live_... (the prefix selects the environment)

export function fedapayBase(): string {
  const key = Deno.env.get("FEDAPAY_SECRET_KEY") ?? "";
  const env = Deno.env.get("FEDAPAY_ENV") ?? (key.startsWith("sk_live") ? "live" : "sandbox");
  return env === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";
}

export async function fedapay<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const key = Deno.env.get("FEDAPAY_SECRET_KEY");
  if (!key) throw new Error("FEDAPAY_SECRET_KEY n'est pas configurée");
  const res = await fetch(`${fedapayBase()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    console.error("FedaPay error", res.status, text.slice(0, 500));
    throw new Error(`FedaPay ${res.status}`);
  }
  return data as T;
}

/** FedaPay wraps single objects as {"v1/transaction": {...}}. */
export function unwrapTransaction(data: Record<string, unknown>): Record<string, unknown> {
  return (data["v1/transaction"] ?? data["transaction"] ?? data) as Record<string, unknown>;
}

/** Verifies the X-FEDAPAY-SIGNATURE header ("t=<ts>,s=<hex hmac>"). */
export async function verifyFedapaySignature(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const t = parts["t"], s = parts["s"];
  if (!t || !s) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false; // 10 min tolerance
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== s.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ s.charCodeAt(i);
  return diff === 0;
}
