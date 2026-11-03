import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_notifications",
  title: "Mes notifications",
  description: "List the signed-in user's 30 most recent notifications.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("notifications").select("id, type, title, message, is_read, created_at")
      .order("created_at", { ascending: false }).limit(30);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((n) => ({
      id: n.id, type: n.type, title: n.title, message: n.message ?? null, is_read: n.is_read ?? false, created_at: n.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { notifications: rows } };
  },
});
