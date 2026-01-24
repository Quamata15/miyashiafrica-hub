import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Favorite {
  id: string;
  product_id: string | null;
  service_id: string | null;
  product?: {
    id: string;
    title: string;
    price: number;
    images: string[] | null;
    seller_id: string;
  };
  service?: {
    id: string;
    title: string;
    price: number | null;
    images: string[] | null;
    provider_id: string;
  };
}

interface FavoritesContextType {
  favorites: Favorite[];
  loading: boolean;
  addFavorite: (productId?: string, serviceId?: string) => Promise<void>;
  removeFavorite: (favoriteId: string) => Promise<void>;
  isFavorite: (productId?: string, serviceId?: string) => boolean;
  toggleFavorite: (productId?: string, serviceId?: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites([]);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from('favorites')
      .select(`
        id,
        product_id,
        service_id,
        products:product_id (id, title, price, images, seller_id),
        services:service_id (id, title, price, images, provider_id)
      `)
      .eq('user_id', user.id);

    if (!error && data) {
      const formattedFavorites = data.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        service_id: item.service_id,
        product: item.products,
        service: item.services
      }));
      setFavorites(formattedFavorites);
    }
    setLoading(false);
  };

  const addFavorite = async (productId?: string, serviceId?: string) => {
    if (!user) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }

    const { error } = await (supabase as any).from('favorites').insert({
      user_id: user.id,
      product_id: productId || null,
      service_id: serviceId || null
    });

    if (error) {
      toast.error('Erreur lors de l\'ajout aux favoris');
    } else {
      toast.success('Ajouté aux favoris');
      fetchFavorites();
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    const { error } = await (supabase as any)
      .from('favorites')
      .delete()
      .eq('id', favoriteId);

    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      setFavorites(favorites.filter(f => f.id !== favoriteId));
      toast.success('Retiré des favoris');
    }
  };

  const isFavorite = (productId?: string, serviceId?: string) => {
    return favorites.some(
      f => (productId && f.product_id === productId) || (serviceId && f.service_id === serviceId)
    );
  };

  const toggleFavorite = async (productId?: string, serviceId?: string) => {
    const existing = favorites.find(
      f => (productId && f.product_id === productId) || (serviceId && f.service_id === serviceId)
    );

    if (existing) {
      await removeFavorite(existing.id);
    } else {
      await addFavorite(productId, serviceId);
    }
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      loading,
      addFavorite,
      removeFavorite,
      isFavorite,
      toggleFavorite
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
