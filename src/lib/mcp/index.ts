import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import listMyOrders from "./tools/list-my-orders";
import getWallet from "./tools/get-wallet";
import listMyNotifications from "./tools/list-my-notifications";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "miyashi-march-africaine",
  title: "MIYASHI  Marché Africaine",
  version: "0.1.0",
  instructions:
    "Tools for MIYASHI, a West African marketplace. Search products, and read the signed-in user's orders, wallet and notifications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, listMyOrders, getWallet, listMyNotifications],
});
