import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate cron requests via shared secret
  const cronSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { action } = await req.json();

    if (action === "check_price_drops") {
      // Find products in favorites where price dropped
      const { data: favorites } = await adminClient
        .from("favorites")
        .select("user_id, product_id")
        .not("product_id", "is", null);

      if (!favorites || favorites.length === 0) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get unique product IDs
      const productIds = [...new Set(favorites.map(f => f.product_id).filter(Boolean))];
      const { data: products } = await adminClient
        .from("products")
        .select("id, title, price")
        .in("id", productIds)
        .eq("is_active", true);

      // For now, we just send a notification about favorited items on sale
      // In production, you'd compare with a cached previous price
      const { data: activePromos } = await adminClient
        .from("promotions")
        .select("target_id, discount_value, discount_type, user_id")
        .eq("is_active", true)
        .gt("end_date", new Date().toISOString());

      const promoTargets = new Set((activePromos || []).map(p => p.target_id || p.user_id));

      let notified = 0;
      for (const fav of favorites) {
        if (!fav.product_id) continue;
        const product = products?.find(p => p.id === fav.product_id);
        if (!product) continue;

        // Check if this product's seller has an active promo
        const hasPromo = promoTargets.has(fav.product_id) || promoTargets.has(product.id);
        if (!hasPromo) continue;

        // Send notification
        await adminClient.from("notifications").insert({
          user_id: fav.user_id,
          type: "promotion",
          title: "🏷️ Promo sur un favori !",
          message: `"${product.title}" est en promotion. Ne manquez pas cette offre !`,
          data: { product_id: fav.product_id },
        });
        notified++;
      }

      return new Response(JSON.stringify({ processed: notified }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "weekly_summary") {
      // Get all users with activity in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recentOrders } = await adminClient
        .from("orders")
        .select("buyer_id, seller_id, total_price, status")
        .gte("created_at", sevenDaysAgo);

      if (!recentOrders || recentOrders.length === 0) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Aggregate per user
      const userStats = new Map<string, { bought: number; sold: number; revenue: number }>();
      for (const order of recentOrders) {
        // Buyer stats
        if (!userStats.has(order.buyer_id)) {
          userStats.set(order.buyer_id, { bought: 0, sold: 0, revenue: 0 });
        }
        userStats.get(order.buyer_id)!.bought++;

        // Seller stats
        if (!userStats.has(order.seller_id)) {
          userStats.set(order.seller_id, { bought: 0, sold: 0, revenue: 0 });
        }
        const sellerStat = userStats.get(order.seller_id)!;
        sellerStat.sold++;
        sellerStat.revenue += Number(order.total_price || 0);
      }

      let notified = 0;
      for (const [userId, stats] of userStats) {
        const parts: string[] = [];
        if (stats.bought > 0) parts.push(`${stats.bought} achat(s)`);
        if (stats.sold > 0) parts.push(`${stats.sold} vente(s) pour ${stats.revenue.toLocaleString()}F`);

        await adminClient.from("notifications").insert({
          user_id: userId,
          type: "system",
          title: "📊 Résumé hebdomadaire",
          message: `Cette semaine : ${parts.join(", ")}. Continuez sur MIYASHI !`,
          data: { period: "weekly", stats },
        });
        notified++;
      }

      return new Response(JSON.stringify({ processed: notified }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
