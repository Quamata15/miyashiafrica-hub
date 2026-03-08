import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Gift, Copy, CheckCircle, Users, Wallet } from "lucide-react";
import { toast } from "sonner";

const ReferralCard = () => {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [usesCount, setUsesCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;

    // Get or create referral code
    const { data: codeData } = await supabase.rpc("get_or_create_referral_code" as any);
    if (codeData) setCode(codeData as string);

    // Get stats
    const { data: codeRow } = await supabase
      .from("referral_codes" as any)
      .select("uses_count")
      .eq("user_id", user.id)
      .single();
    if (codeRow) setUsesCount((codeRow as any).uses_count || 0);

    const { data: rewards } = await supabase
      .from("referral_rewards" as any)
      .select("referrer_reward")
      .eq("referrer_id", user.id);
    if (rewards) {
      setTotalEarned((rewards as any[]).reduce((sum, r) => sum + Number(r.referrer_reward || 0), 0));
    }

    setLoading(false);
  };

  const handleCopy = async () => {
    if (!code) return;
    const shareText = `Rejoins MIYASHI avec mon code ${code} et reçois 500 FCFA de bonus ! 🎁\nhttps://miyashi-hub.lovable.app/auth?ref=${code}`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success("Code copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!code) return;
    const shareData = {
      title: "MIYASHI - Parrainage",
      text: `Rejoins MIYASHI avec mon code ${code} et reçois 500 FCFA de bonus ! 🎁`,
      url: `https://miyashi-hub.lovable.app/auth?ref=${code}`,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      handleCopy();
    }
  };

  if (loading) return null;

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-primary" />
          Parrainage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Partagez votre code et gagnez <strong>500 FCFA</strong> pour chaque filleul inscrit. Votre filleul reçoit aussi <strong>500 FCFA</strong> !
        </p>

        {/* Code display */}
        <div className="flex items-center gap-2">
          <Input
            value={code || ""}
            readOnly
            className="font-mono font-bold text-center text-lg tracking-wider"
          />
          <Button size="icon" variant="outline" onClick={handleCopy}>
            {copied ? <CheckCircle className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{usesCount}</p>
            <p className="text-[10px] text-muted-foreground">Filleul(s)</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <Wallet className="w-5 h-5 mx-auto mb-1 text-accent" />
            <p className="text-xl font-bold">{totalEarned.toLocaleString()}F</p>
            <p className="text-[10px] text-muted-foreground">Gagné</p>
          </div>
        </div>

        <Button onClick={handleShare} className="w-full gap-2">
          <Gift className="w-4 h-4" />
          Partager mon code
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
