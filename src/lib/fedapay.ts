import { supabase } from "@/integrations/supabase/client";

/**
 * Starts a FedaPay wallet top-up and redirects the browser to the FedaPay
 * payment page (mobile money or card). After payment FedaPay sends the user
 * back to /wallet?topup=<id>, where confirmFedapayTopup() credits the wallet.
 */
export async function startFedapayTopup(params: {
  amount: number;
  phone?: string;
  prefix?: string;
  returnPath?: string;
}): Promise<{ error?: string }> {
  const { data, error } = await supabase.functions.invoke("fedapay-checkout", {
    body: {
      amount: Math.round(params.amount),
      phone: params.phone,
      prefix: params.prefix,
      return_path: params.returnPath ?? "/wallet",
    },
  });
  if (error || !data?.payment_url) {
    return { error: data?.error ?? "Le paiement n'a pas pu démarrer. Réessayez." };
  }
  try {
    sessionStorage.setItem("miyashi_topup_return", params.returnPath ?? "/wallet");
  } catch { /* storage unavailable */ }
  window.location.assign(data.payment_url);
  return {};
}

/** Re-checks a top-up with FedaPay. Returns the FedaPay status. */
export async function confirmFedapayTopup(transactionId: string): Promise<string> {
  const { data } = await supabase.functions.invoke("fedapay-webhook", {
    body: { transaction_id: transactionId },
  });
  return data?.status ?? "pending";
}

export function popTopupReturnPath(): string | null {
  try {
    const p = sessionStorage.getItem("miyashi_topup_return");
    sessionStorage.removeItem("miyashi_topup_return");
    return p && p.startsWith("/") && !p.startsWith("//") ? p : null;
  } catch {
    return null;
  }
}
