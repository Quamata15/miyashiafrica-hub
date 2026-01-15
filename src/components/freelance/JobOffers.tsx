import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Calendar, DollarSign, Briefcase, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Job = Tables<"jobs">;

const JobOffers = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!user || !selectedJob) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour postuler",
        variant: "destructive",
      });
      return;
    }

    setApplying(true);

    const { error } = await supabase.from("applications").insert({
      job_id: selectedJob.id,
      freelance_id: user.id,
      cover_letter: coverLetter,
      proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Candidature envoyée",
        description: "Votre candidature a été soumise avec succès",
      });
      setCoverLetter("");
      setProposedRate("");
      setSelectedJob(null);
    }
    setApplying(false);
  };

  const filteredJobs = jobs.filter((job) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(searchLower) ||
      job.description?.toLowerCase().includes(searchLower) ||
      job.skills_required?.some(skill => skill.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement des offres...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Rechercher par titre, description ou compétence..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune offre trouvée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{job.title}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{job.job_type}</Badge>
                      {job.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(job.deadline), "dd MMM yyyy", { locale: fr })}
                        </div>
                      )}
                    </div>
                  </div>
                  {(job.budget_min || job.budget_max) && (
                    <div className="flex items-center gap-1 text-primary font-semibold">
                      <DollarSign className="h-4 w-4" />
                      {job.budget_min?.toLocaleString()} - {job.budget_max?.toLocaleString()} FCFA
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{job.description}</p>
                
                {job.skills_required && job.skills_required.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {job.skills_required.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedJob(job)}>
                      Postuler
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Postuler pour: {job.title}</DialogTitle>
                      <DialogDescription>
                        Envoyez votre candidature pour cette offre
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="coverLetter">Lettre de motivation</Label>
                        <Textarea
                          id="coverLetter"
                          placeholder="Présentez-vous et expliquez pourquoi vous êtes le candidat idéal..."
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          rows={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proposedRate">Tarif proposé (FCFA)</Label>
                        <Input
                          id="proposedRate"
                          type="number"
                          placeholder="Votre tarif pour ce projet"
                          value={proposedRate}
                          onChange={(e) => setProposedRate(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleApply} 
                        className="w-full"
                        disabled={applying || !user}
                      >
                        {applying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : !user ? (
                          "Connectez-vous pour postuler"
                        ) : (
                          "Envoyer ma candidature"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobOffers;
