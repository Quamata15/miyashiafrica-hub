// Which spaces (roles) the signed-in user holds, what each one unlocks, and how to open or close
// one. The rules themselves live in the database (get_space_options, assign_own_role,
// deactivate_own_role); this only mirrors them so the interface shows what the user may use.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "buyer" | "seller" | "provider" | "freelance" | "employer" | "driver";
export type ProRole = Exclude<AppRole, "buyer">;
export type SpaceOption = {
  role: ProRole; label: string; active: boolean; available: boolean; reason: string | null;
  conflict_with: AppRole | null; available_from: string | null; needs_registration: boolean;
};

export const ROLE_LABEL: Record<AppRole, string> = { buyer: "Acheteur", seller: "Vendeur", provider: "Prestataire", freelance: "Freelance", employer: "Recruteur", driver: "Livreur" };
export const SPACE_KEY: Record<AppRole, string> = { buyer: "acheteur", seller: "vendeur", provider: "prestataire", freelance: "freelance", employer: "recruteur", driver: "livreur" };

/** What each feature needs. The buyer space (everyone) needs nothing. */
export const FEATURE_ROLES = {
  sell: ["seller"],                                        // products, stock, shop, shipping labels
  provide: ["provider"],                                   // services, packs, quotes sent, invoices, agenda
  recruit: ["employer"],                                   // job offers and missions, candidates, interviews
  apply: ["freelance"],                                    // applying, CV, recommended offers
  deliver: ["driver"],                                     // courses, delivery proofs, earnings
  promote: ["seller", "provider"],                         // promotions and promo codes
  boost: ["seller", "provider", "employer", "freelance"],  // paid visibility and campaigns
  publish: ["seller", "provider", "employer"],             // the "Publier" button
} as const satisfies Record<string, readonly ProRole[]>;
export type Feature = keyof typeof FEATURE_ROLES;

export const FEATURE_LABEL: Record<Feature, string> = {
  sell: "la vente de produits", provide: "la vente de services", recruit: "le recrutement", apply: "les candidatures",
  deliver: "la livraison", promote: "les promotions", boost: "la mise en avant", publish: "la publication d'annonces",
};

type SpacesValue = {
  loading: boolean; isAdmin: boolean; roles: AppRole[]; limit: number; used: number; options: SpaceOption[];
  has: (r: AppRole) => boolean; can: (f: Feature) => boolean; option: (r: ProRole) => SpaceOption | undefined;
  refresh: () => Promise<void>;
  /** Opens a space. Returns "registration" when the driver form must be filled first. */
  activate: (r: ProRole) => Promise<boolean | "registration">;
  deactivate: (r: ProRole) => Promise<boolean>;
};

const SpacesContext = createContext<SpacesValue | null>(null);
const clean = (m: string) => m.replace(/^.*?ERROR:\s*/i, "").replace(/\s*CONTEXT:.*$/s, "");

export function SpacesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<{ loading: boolean; isAdmin: boolean; roles: AppRole[]; limit: number; used: number; options: SpaceOption[] }>(
    { loading: true, isAdmin: false, roles: [], limit: 3, used: 0, options: [] });

  const refresh = useCallback(async () => {
    if (!user) { setState({ loading: false, isAdmin: false, roles: [], limit: 3, used: 0, options: [] }); return; }
    const [{ data: opts, error }, { data: rows }] = await Promise.all([
      supabase.rpc("get_space_options"),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    const o = (error ? null : opts) as { is_admin: boolean; limit: number; used: number; roles: SpaceOption[] } | null;
    const roles = (rows ?? []).map((r) => r.role as AppRole);
    setState({ loading: false, isAdmin: o?.is_admin ?? roles.includes("admin" as AppRole), roles: roles.includes("buyer") ? roles : ["buyer", ...roles],
      limit: o?.limit ?? 3, used: o?.used ?? 0, options: o?.roles ?? [] });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setState((s) => ({ ...s, loading: true })); refresh(); }, [refresh]);

  const value = useMemo<SpacesValue>(() => {
    const has = (r: AppRole) => state.isAdmin || state.roles.includes(r);
    return {
      ...state, has,
      can: (f) => state.isAdmin || FEATURE_ROLES[f].some((r) => state.roles.includes(r)),
      option: (r) => state.options.find((o) => o.role === r),
      refresh,
      activate: async (r) => {
        const o = state.options.find((x) => x.role === r);
        if (r === "driver" && (o?.needs_registration ?? true) && !state.roles.includes("driver")) return "registration";
        const { error } = await supabase.rpc("assign_own_role", { p_role: r });
        if (error) { toast.error(clean(error.message)); return false; }
        toast.success(`Espace ${ROLE_LABEL[r]} activé`);
        await refresh();
        return true;
      },
      deactivate: async (r) => {
        const { error } = await supabase.rpc("deactivate_own_role", { p_role: r });
        if (error) { toast.error(clean(error.message)); return false; }
        toast.success(`Espace ${ROLE_LABEL[r]} fermé`);
        await refresh();
        return true;
      },
    };
  }, [state, refresh]);

  return <SpacesContext.Provider value={value}>{children}</SpacesContext.Provider>;
}

export function useSpaces() {
  const ctx = useContext(SpacesContext);
  if (!ctx) throw new Error("useSpaces must be used within SpacesProvider");
  return ctx;
}
