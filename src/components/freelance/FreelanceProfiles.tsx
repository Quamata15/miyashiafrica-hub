import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Clock, Star, Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type FreelanceProfile = Tables<"freelance_profiles">;
type Profile = Tables<"profiles">;

interface FreelanceWithProfile extends FreelanceProfile {
  profile?: Profile;
}

const FreelanceProfiles = () => {
  const [freelancers, setFreelancers] = useState<FreelanceWithProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFreelancers();
  }, []);

  const fetchFreelancers = async () => {
    const { data: freelanceData, error: freelanceError } = await (supabase
      .from("freelance_profiles_public" as any)
      .select("*")
      .eq("availability", "available")) as any;

    if (freelanceError || !freelanceData) {
      setLoading(false);
      return;
    }

    // Fetch profiles for each freelancer
    const userIds = freelanceData.map(f => f.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", userIds);

    const freelancersWithProfiles = freelanceData.map(freelance => ({
      ...freelance,
      profile: profilesData?.find(p => p.user_id === freelance.user_id)
    }));

    setFreelancers(freelancersWithProfiles);
    setLoading(false);
  };

  const filteredFreelancers = freelancers.filter((freelancer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      freelancer.title?.toLowerCase().includes(searchLower) ||
      freelancer.skills?.some(skill => skill.toLowerCase().includes(searchLower)) ||
      freelancer.profile?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement des profils...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Rechercher par nom, compétence ou titre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Freelancers Grid */}
      {filteredFreelancers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun freelance trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFreelancers.map((freelancer) => (
            <Card key={freelancer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={freelancer.profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {freelancer.profile?.full_name?.charAt(0) || "F"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {freelancer.profile?.full_name || "Freelance"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{freelancer.title}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {freelancer.profile?.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {freelancer.profile.location}
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm">
                  {freelancer.hourly_rate && (
                    <span className="font-semibold text-primary">
                      {freelancer.hourly_rate.toLocaleString()} FCFA/h
                    </span>
                  )}
                  {freelancer.experience_years && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {freelancer.experience_years} ans
                    </div>
                  )}
                </div>

                {freelancer.skills && freelancer.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {freelancer.skills.slice(0, 5).map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                    {freelancer.skills.length > 5 && (
                      <Badge variant="outline">+{freelancer.skills.length - 5}</Badge>
                    )}
                  </div>
                )}

                <Badge 
                  variant="default" 
                  className="bg-green-500/10 text-green-600 hover:bg-green-500/20"
                >
                  Disponible
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FreelanceProfiles;
