import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_wallet",
  title: "Mon portefeuille",
  description: "Get the signed-in user's wallet balance and their 20 latest wallet transactions.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const [w, t] = await Promise.all([
      supabase.from("wallets").select("balance, total_earned, total_withdrawn").maybeSingle(),
      supabase.from("wallet_transactions").select("type, amount, description, status, created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    if (w.error || t.error) return { content: [{ type: "text", text: (w.error ?? t.error)!.message }], isError: true };
    const wallet = w.data
      ? { balance: Number(w.data.balance), total_earned: Number(w.data.total_earned), total_withdrawn: Number(w.data.total_withdrawn) }
      : null;
    const transactions = (t.data ?? []).map((x) => ({
      type: x.type, amount: Number(x.amount), description: x.description ?? null, status: x.status, created_at: x.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify({ wallet, transactions }) }], structuredContent: { wallet, transactions } };
  },
});
