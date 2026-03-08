import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

interface CartItem {
  id: string;
  quantity: number;
  product?: { title?: string; price?: number; images?: string[] | null } | null;
  service?: { title?: string; price?: number; images?: string[] | null } | null;
}

interface CheckoutOrderSummaryProps {
  items: CartItem[];
}

const CheckoutOrderSummary = ({ items }: CheckoutOrderSummaryProps) => {
  if (items.length === 0) return null;

  return (
    <Card className="border-0 shadow-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" /> Récapitulatif ({items.length} articles)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const data = item.product || item.service;
          if (!data) return null;
          return (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                  {data.images?.[0] ? (
                    <img src={data.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium line-clamp-1">{data.title}</p>
                  <p className="text-muted-foreground">x{item.quantity}</p>
                </div>
              </div>
              <span className="font-semibold">{((data.price || 0) * item.quantity).toLocaleString()} F</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default CheckoutOrderSummary;
