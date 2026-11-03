import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_orders",
  title: "Mes commandes",
  description: "List the signed-in user's 50 most recent orders (as buyer or seller) with status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data, error } = await supabase
      .from("orders")
      .select("id, buyer_id, total_price, quantity, status, payment_status, delivery_status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((o) => ({
      id: o.id, role: o.buyer_id === uid ? "buyer" : "seller", total_price: Number(o.total_price),
      quantity: o.quantity, status: o.status, payment_status: o.payment_status ?? null,
      delivery_status: o.delivery_status ?? null, created_at: o.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { orders: rows } };
  },
});
