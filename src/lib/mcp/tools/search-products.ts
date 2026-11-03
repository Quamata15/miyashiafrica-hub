import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_products",
  title: "Rechercher des produits",
  description: "Search active MIYASHI marketplace products by keyword and optional price range.",
  inputSchema: {
    query: z.string().max(200).optional().describe("Keywords to search for."),
    min_price: z.number().min(0).optional().describe("Minimum price in FCFA."),
    max_price: z.number().min(0).optional().describe("Maximum price in FCFA."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ query, min_price, max_price }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("search_products", {
      p_query: query ?? null, p_category_id: null, p_min_price: min_price ?? null, p_max_price: max_price ?? null,
      p_location: null, p_sort_by: "relevance", p_page: 1, p_per_page: 20,
    } as never);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = ((data ?? []) as Array<{ id: string; title: string; price: number; location: string | null; stock: number | null }>)
      .map((p) => ({ id: p.id, title: p.title, price: Number(p.price), location: p.location ?? null, stock: p.stock ?? null }));
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { products: rows } };
  },
});
