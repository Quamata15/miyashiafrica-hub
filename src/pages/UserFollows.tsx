import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, UserCheck, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import FollowButton from "@/components/follow/FollowButton";
import { useAuth } from "@/hooks/useAuth";

interface FollowUser {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

const UserFollows = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "following" ? "following" : "followers";
  const { user: currentUser } = useAuth();

  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [profileName, setProfileName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);

    const [profileRes, followersRes, followingRes] = await Promise.all([
      supabase.from("profiles_public").select("full_name").eq("user_id", userId).maybeSingle(),
      supabase.from("follows").select("follower_id").eq("followed_id", userId),
      supabase.from("follows").select("followed_id").eq("follower_id", userId),
    ]);

    setProfileName(profileRes.data?.full_name || "Utilisateur");

    // Fetch follower profiles
    const followerIds: string[] = (followersRes.data || []).map((f: any) => f.follower_id);
    const followingIds: string[] = (followingRes.data || []).map((f: any) => f.followed_id);

    const [followerProfiles, followingProfiles] = await Promise.all([
      followerIds.length > 0
        ? supabase.from("profiles_public").select("user_id, full_name, username, avatar_url, is_verified").in("user_id", followerIds)
        : { data: [] },
      followingIds.length > 0
        ? supabase.from("profiles_public").select("user_id, full_name, username, avatar_url, is_verified").in("user_id", followingIds)
        : { data: [] },
    ]);

    setFollowers((followerProfiles.data || []) as FollowUser[]);
    setFollowing((followingProfiles.data || []) as FollowUser[]);
    setLoading(false);
  };

  const UserCard = ({ user }: { user: FollowUser }) => (
    <Card className="border-0 shadow-soft">
      <CardContent className="p-4 flex items-center gap-3">
        <Link to={`/user/${user.user_id}`}>
          <Avatar className="h-12 w-12 border-2 border-primary/10">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="bg-gradient-hero text-primary-foreground font-bold">
              {(user.username || user.full_name)?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/user/${user.user_id}`} className="hover:underline">
            <p className="font-medium text-sm truncate">{user.username || user.full_name || "Utilisateur"}</p>
          </Link>
          {user.is_verified && (
            <Badge variant="outline" className="text-[10px] mt-0.5">Vérifié</Badge>
          )}
        </div>
        {currentUser && currentUser.id !== user.user_id && (
          <FollowButton userId={user.user_id} size="sm" />
        )}
      </CardContent>
    </Card>
  );

  const EmptyList = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Users className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead
        title={`Abonnés de ${profileName} — MIYASHI`}
        description={`Liste des abonnés et abonnements de ${profileName} sur MIYASHI.`}
        canonical={`/user/${userId}/follows`}
      />
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/user/${userId}`}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-xl font-display font-bold">{profileName}</h1>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue={defaultTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="followers">
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Abonnés ({followers.length})
                  </TabsTrigger>
                  <TabsTrigger value="following">
                    <Users className="h-4 w-4 mr-1.5" />
                    Abonnements ({following.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="followers">
                  {followers.length === 0 ? (
                    <EmptyList text="Aucun abonné pour le moment" />
                  ) : (
                    <div className="space-y-3">
                      {followers.map((u) => <UserCard key={u.user_id} user={u} />)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="following">
                  {following.length === 0 ? (
                    <EmptyList text="Aucun abonnement pour le moment" />
                  ) : (
                    <div className="space-y-3">
                      {following.map((u) => <UserCard key={u.user_id} user={u} />)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserFollows;
