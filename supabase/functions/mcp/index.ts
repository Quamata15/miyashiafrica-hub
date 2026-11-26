// MIYASHI MCP server (Model Context Protocol, Streamable HTTP, stateless JSON).
// Auth: OAuth 2.1 through Supabase Auth's OAuth server. Clients discover it via
// /functions/v1/mcp/.well-known/oauth-protected-resource, then send the access
// token as a Bearer header; every tool runs with that user's row-level security.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const PUBLIC_URL = (Deno.env.get("MCP_PUBLIC_URL") ?? `${SUPABASE_URL}/functions/v1/mcp`).replace(/\/$/, "");
const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const SERVER_INFO = { name: "miyashi-march-africaine", title: "MIYASHI  Marché Africaine", version: "1.0.0" };
const INSTRUCTIONS =
  "Tools for MIYASHI, a West African marketplace. Search products, and read the signed-in user's orders, wallet and notifications.";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, accept, mcp-protocol-version, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

type Ctx = { db: SupabaseClient; userId: string };
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>, ctx: Ctx) => Promise<unknown>;
};

const readOnly = { readOnlyHint: true, openWorldHint: false };
const noArgs = { type: "object", properties: {}, additionalProperties: false };

const TOOLS: Tool[] = [
  {
    name: "search_products",
    title: "Rechercher des produits",
    description: "Search active MIYASHI marketplace products by keyword and optional price range.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 200, description: "Keywords to search for." },
        min_price: { type: "number", minimum: 0, description: "Minimum price in FCFA." },
        max_price: { type: "number", minimum: 0, description: "Maximum price in FCFA." },
      },
      additionalProperties: false,
    },
    run: async (a, { db }) => {
      const { data, error } = await db.rpc("search_products", {
        p_query: typeof a.query === "string" ? a.query.slice(0, 200) : null,
        p_category_id: null,
        p_min_price: typeof a.min_price === "number" ? a.min_price : null,
        p_max_price: typeof a.max_price === "number" ? a.max_price : null,
        p_location: null,
        p_sort_by: "relevance",
        p_page: 1,
        p_per_page: 20,
      });
      if (error) throw new Error(error.message);
      const products = (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id, title: p.title, price: Number(p.price), location: p.location ?? null, stock: p.stock ?? null,
      }));
      return { products };
    },
  },
  {
    name: "list_my_orders",
    title: "Mes commandes",
    description: "List the signed-in user's 50 most recent orders (as buyer or seller) with status.",
    inputSchema: noArgs,
    run: async (_a, { db, userId }) => {
      const { data, error } = await db.from("orders")
        .select("id, buyer_id, total_price, quantity, status, payment_status, delivery_status, created_at")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      const orders = (data ?? []).map((o) => ({
        id: o.id, role: o.buyer_id === userId ? "buyer" : "seller", total_price: Number(o.total_price),
        quantity: o.quantity, status: o.status, payment_status: o.payment_status ?? null,
        delivery_status: o.delivery_status ?? null, created_at: o.created_at,
      }));
      return { orders };
    },
  },
  {
    name: "get_wallet",
    title: "Mon portefeuille",
    description: "Get the signed-in user's wallet balance and their 20 latest wallet transactions.",
    inputSchema: noArgs,
    run: async (_a, { db }) => {
      const [w, t] = await Promise.all([
        db.from("wallets").select("balance, total_earned, total_withdrawn").maybeSingle(),
        db.from("wallet_transactions").select("type, amount, description, status, created_at")
          .order("created_at", { ascending: false }).limit(20),
      ]);
      if (w.error || t.error) throw new Error((w.error ?? t.error)!.message);
      const wallet = w.data
        ? { balance: Number(w.data.balance), total_earned: Number(w.data.total_earned), total_withdrawn: Number(w.data.total_withdrawn) }
        : null;
      const transactions = (t.data ?? []).map((x) => ({
        type: x.type, amount: Number(x.amount), description: x.description ?? null, status: x.status, created_at: x.created_at,
      }));
      return { wallet, transactions };
    },
  },
  {
    name: "list_my_notifications",
    title: "Mes notifications",
    description: "List the signed-in user's 30 most recent notifications.",
    inputSchema: noArgs,
    run: async (_a, { db }) => {
      const { data, error } = await db.from("notifications")
        .select("id, type, title, message, is_read, created_at")
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw new Error(error.message);
      const notifications = (data ?? []).map((n) => ({
        id: n.id, type: n.type, title: n.title, message: n.message ?? null, is_read: n.is_read ?? false, created_at: n.created_at,
      }));
      return { notifications };
    },
  },
];

function unauthorized() {
  return json({ error: "unauthorized" }, 401, {
    "WWW-Authenticate": `Bearer realm="mcp", resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource"`,
  });
}

async function authenticate(req: Request): Promise<Ctx | null> {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const db = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { db, userId: data.user.id };
}

type RpcMessage = { jsonrpc: "2.0"; id?: string | number | null; method?: string; params?: Record<string, unknown> };

async function handle(msg: RpcMessage, ctx: Ctx): Promise<Record<string, unknown> | null> {
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });
  if (msg.id === undefined) return null; // notification (e.g. notifications/initialized)

  switch (msg.method) {
    case "initialize": {
      const requested = String(msg.params?.protocolVersion ?? "");
      return reply({
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({
        tools: TOOLS.map(({ name, title, description, inputSchema }) => ({
          name, title, description, inputSchema, annotations: readOnly,
        })),
      });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return fail(-32602, `Unknown tool: ${String(msg.params?.name)}`);
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const out = await tool.run(args, ctx);
        return reply({ content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out });
      } catch (e) {
        return reply({ content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }], isError: true });
      }
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const path = new URL(req.url).pathname;

  if (path.endsWith("/.well-known/oauth-protected-resource")) {
    return json({
      resource: PUBLIC_URL,
      authorization_servers: [`${SUPABASE_URL}/auth/v1`],
      bearer_methods_supported: ["header"],
      resource_name: SERVER_INFO.title,
    });
  }

  if (req.method === "GET") return new Response("Method Not Allowed", { status: 405, headers: { ...cors, Allow: "POST" } });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const ctx = await authenticate(req);
  if (!ctx) return unauthorized();

  let body: RpcMessage | RpcMessage[];
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handle(m, ctx)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202, headers: cors });
  }
  const out = await handle(body, ctx);
  return out ? json(out) : new Response(null, { status: 202, headers: cors });
});
