import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, Loader2, X } from "lucide-react";

export interface AppliedPromo {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  seller_id: string;
}

interface CheckoutPromoCodeProps {
  promoInput: string;
  setPromoInput: (v: string) => void;
  promoLoading: boolean;
  appliedPromo: AppliedPromo | null;
  onApply: () => void;
  onRemove: () => void;
}

const CheckoutPromoCode = ({
  promoInput, setPromoInput, promoLoading, appliedPromo, onApply, onRemove,
}: CheckoutPromoCodeProps) => (
  <Card className="border-0 shadow-card mb-6">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Code promo</span>
      </div>
      {appliedPromo ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-accent/10 border border-accent/20">
          <div className="flex items-center gap-2">
            <Badge className="bg-accent text-accent-foreground font-mono">{appliedPromo.code}</Badge>
            <span className="text-sm text-accent-foreground font-medium">
              -{appliedPromo.discount_type === "percentage"
                ? `${appliedPromo.discount_value}%`
                : `${Number(appliedPromo.discount_value).toLocaleString()}F`}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input placeholder="Entrez votre code promo" value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && onApply()}
            className="h-10 font-mono uppercase" />
          <Button variant="outline" onClick={onApply} disabled={promoLoading || !promoInput.trim()} className="shrink-0">
            {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);

export default CheckoutPromoCode;
