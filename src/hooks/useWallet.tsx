import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get or create wallet
    let { data } = await (supabase.from("wallets") as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      const { data: newWallet } = await (supabase.from("wallets") as any)
        .insert({ user_id: user.id })
        .select()
        .single();
      data = newWallet;
    }

    if (data) setWallet(data);

    // Fetch transactions
    const { data: txns } = await (supabase.from("wallet_transactions") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (txns) setTransactions(txns);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const requestWithdrawal = useCallback(async (amount: number, paymentMethod: string, phone: string) => {
    if (!user || !wallet || amount > wallet.balance) return false;

    // Debit wallet and create transaction record via secure server-side function
    const { error: debitError } = await supabase.rpc("debit_wallet" as any, {
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_phone: phone,
    });
    if (debitError) {
      console.error("Debit failed:", debitError.message);
      return false;
    }
    await fetchWallet();
    return true;
  }, [user, wallet, fetchWallet]);

  return { wallet, transactions, loading, fetchWallet, requestWithdrawal };
};
