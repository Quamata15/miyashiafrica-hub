import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureGuestSession } from '@/lib/guest';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  product_id: string | null;
  service_id: string | null;
  variant_id: string | null;
  quantity: number;
  variant?: { id: string; label: string; price: number | null } | null;
  product?: {
    id: string;
    title: string;
    price: number;
    images: string[] | null;
    stock: number | null;
  };
  service?: {
    id: string;
    title: string;
    price: number | null;
    images: string[] | null;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId?: string, serviceId?: string, quantity?: number, variantId?: string | null) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCartItems();
    } else {
      setItems([]);
    }
  }, [user]);

  const fetchCartItems = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from('cart_items')
      .select(`
        id,
        product_id,
        service_id,
        variant_id,
        quantity,
        variant:variant_id (id, label, price),
        products:product_id (id, title, price, images, stock),
        services:service_id (id, title, price, images)
      `)
      .eq('user_id', user.id);

    if (!error && data) {
      const formattedItems = data.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        service_id: item.service_id,
        variant_id: item.variant_id,
        variant: item.variant,
        quantity: item.quantity,
        product: item.products,
        service: item.services
      }));
      setItems(formattedItems);
    }
    setLoading(false);
  };

  const addToCart = async (productId?: string, serviceId?: string, quantity = 1, variantId: string | null = null) => {
    // No account needed: a guest session is opened on the first add.
    const userId = user?.id ?? await ensureGuestSession();
    if (!userId) {
      toast.error("Impossible d'ouvrir le panier pour le moment, réessayez");
      return;
    }

    const existingItem = items.find(
      item => item.product_id === (productId ?? null) && item.service_id === (serviceId ?? null) && (item.variant_id ?? null) === variantId
    );

    if (existingItem) {
      await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      return;
    }

    const { error } = await (supabase as any).from('cart_items').insert({
      user_id: userId,
      product_id: productId || null,
      service_id: serviceId || null,
      variant_id: variantId,
      quantity
    });

    if (error) {
      toast.error('Erreur lors de l\'ajout au panier');
    } else {
      toast.success('Ajouté au panier');
      fetchCartItems();
    }
  };

  const removeFromCart = async (itemId: string) => {
    const { error } = await (supabase as any)
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      setItems(items.filter(item => item.id !== itemId));
      toast.success('Retiré du panier');
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(itemId);
      return;
    }

    const { error } = await (supabase as any)
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      setItems(items.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const clearCart = async () => {
    if (!user) return;

    const { error } = await (supabase as any)
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setItems([]);
      toast.success('Panier vidé');
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const price = item.variant?.price ?? item.product?.price ?? item.service?.price ?? 0;
    return sum + (price * item.quantity);
  }, 0);

  return (
    <CartContext.Provider value={{
      items,
      loading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
