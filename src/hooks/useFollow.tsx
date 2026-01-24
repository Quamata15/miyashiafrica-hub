import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useFollow = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkFollowStatus = useCallback(async () => {
    if (!user || !targetUserId) return;

    const { data } = await (supabase as any)
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('followed_id', targetUserId)
      .single();

    setIsFollowing(!!data);
  }, [user, targetUserId]);

  const fetchFollowCounts = useCallback(async (userId: string) => {
    const [followers, following] = await Promise.all([
      (supabase as any).from('follows').select('id', { count: 'exact' }).eq('followed_id', userId),
      (supabase as any).from('follows').select('id', { count: 'exact' }).eq('follower_id', userId)
    ]);

    setFollowersCount(followers.count || 0);
    setFollowingCount(following.count || 0);
  }, []);

  useEffect(() => {
    if (targetUserId) {
      checkFollowStatus();
      fetchFollowCounts(targetUserId);
    }
  }, [targetUserId, checkFollowStatus, fetchFollowCounts]);

  const follow = async () => {
    if (!user) {
      toast.error('Connectez-vous pour suivre');
      return;
    }
    if (!targetUserId) return;

    setLoading(true);
    const { error } = await (supabase as any).from('follows').insert({
      follower_id: user.id,
      followed_id: targetUserId
    });

    if (error) {
      toast.error('Erreur lors de l\'abonnement');
    } else {
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      toast.success('Abonnement réussi');

      // Create notification for the followed user
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'follow',
        title: 'Nouvel abonné',
        message: 'Un utilisateur s\'est abonné à votre profil'
      });
    }
    setLoading(false);
  };

  const unfollow = async () => {
    if (!user || !targetUserId) return;

    setLoading(true);
    const { error } = await (supabase as any)
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', targetUserId);

    if (error) {
      toast.error('Erreur lors du désabonnement');
    } else {
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
      toast.success('Désabonnement réussi');
    }
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  };

  return {
    isFollowing,
    followersCount,
    followingCount,
    loading,
    follow,
    unfollow,
    toggleFollow
  };
};
