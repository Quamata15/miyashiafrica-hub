import { test as base, type Page } from "@playwright/test";

export const UID = "11111111-1111-1111-1111-111111111111";
export const SELLER = "22222222-2222-2222-2222-222222222222";
export const PRODUCT = "33333333-3333-3333-3333-333333333333";

const product = { id: PRODUCT, seller_id: SELLER, title: "Pagne wax 6 yards", description: "Coton 100 %", price: 12000, stock: 10, images: [], location: "Lomé", is_active: true, min_order_qty: 1, country: "TG", created_at: "2026-11-01T00:00:00Z" };
const TABLES: Record<string, unknown> = {
  products: [product],
  product_variants: [{ id: "v1", label: "Rouge", options: {}, price: 12000, stock: 5, is_active: true }],
  product_price_tiers: [{ min_qty: 5, unit_price: 10500 }],
  shops: [{ id: "s1", owner_id: SELLER, slug: "pagnes-test", name: "Pagnes Test", accepts_cod: true, vacation_mode: false, opening_hours: {}, quick_replies: [], store_pickup_address: null }],
  reviews: [], group_buys: [], currencies: [{ code: "XOF", name: "Franc CFA", symbol: "FCFA", xof_per_unit: 1, decimals: 0, is_pegged: true }], feature_flags: [],
  wallets: { balance: 20000 }, addresses: [{ id: "a1", user_id: UID, label: "Maison", city: "Lomé", country: "TG", is_default: true }], pickup_points: [],
  user_roles: [{ role: "buyer", user_id: UID }], profiles: { user_id: UID, full_name: "Ama", phone: "+22890000000" }, profiles_public: { full_name: "Vendeur", is_verified: true },
  site_content: null, pickup_partner_applications: null,
};
const RPC: Record<string, unknown> = {
  quote_product_price: 12000, find_delivery_zone: { id: "z1", base_fee: 1000, eta_hours: 24, city: "Lomé" },
  estimate_customs: { cross_border: false }, get_recommendations: [], get_status_summary: [],
  place_order: { success: true, order_id: "44444444-4444-4444-4444-444444444444", total_price: 12000 },
};

export async function mockSupabase(page: Page, opts: { signedIn?: boolean; calls?: { rpc: string; body: unknown }[] } = {}) {
  await page.addInitScript(([signedIn, uid]) => {
    localStorage.setItem("miyashi_cookie_consent", '{"analytics":false}');
    localStorage.setItem("miyashi_ui_lang", "fr");
    if (signedIn) {
      const user = { id: uid, aud: "authenticated", role: "authenticated", email: "ama@test.local", email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: {}, user_metadata: {} };
      localStorage.setItem("sb-decycxufopbagjdpejul-auth-token", JSON.stringify({ access_token: "x.eyJzdWIiOiIxIn0.x", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }));
    }
  }, [!!opts.signedIn, UID] as const);
  await page.route(/supabase\.co/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const one = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const send = (v: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) });
    if (url.pathname.includes("/auth/v1/user")) return send({ id: UID, aud: "authenticated", role: "authenticated", email: "ama@test.local" });
    if (url.pathname.includes("/auth/v1/factors") || url.pathname.includes("/mfa")) return send({ all: [], totp: [] });
    const rpc = url.pathname.match(/\/rpc\/(\w+)/);
    if (rpc) { opts.calls?.push({ rpc: rpc[1], body: req.postDataJSON() }); return send(RPC[rpc[1]] ?? null); }
    const t = url.pathname.match(/\/rest\/v1\/(\w+)/)?.[1];
    if (t && t in TABLES) { const v = TABLES[t]; return send(one ? (Array.isArray(v) ? v[0] ?? null : v) : Array.isArray(v) ? v : v == null ? [] : [v]); }
    return send(one ? null : []);
  });
}

export const test = base;
export { expect } from "@playwright/test";
