import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, Image, FileText, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChatAttachmentMenuProps {
  onSendImage: (file: File) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  onSendLocation: (lat: number, lng: number, label?: string) => Promise<void>;
  uploading: boolean;
}

const ChatAttachmentMenu = ({ onSendImage, onSendFile, onSendLocation, uploading }: ChatAttachmentMenuProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo");
      return;
    }
    onSendImage(file);
    e.target.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 20 Mo");
      return;
    }
    onSendFile(file);
    e.target.value = '';
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSendLocation(position.coords.latitude, position.coords.longitude, locationLabel || undefined);
        setLocationDialogOpen(false);
        setLocationLabel("");
        setGettingLocation(false);
      },
      () => {
        toast.error("Impossible d'obtenir votre position");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        className="hidden"
        onChange={handleFileSelect}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0" disabled={uploading}>
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <Image className="mr-2 h-4 w-4 text-primary" />
            Photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <FileText className="mr-2 h-4 w-4 text-secondary" />
            Fichier
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocationDialogOpen(true)}>
            <MapPin className="mr-2 h-4 w-4 text-destructive" />
            Position GPS
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-destructive" />
              Partager ma position
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location-label">Nom du lieu (optionnel)</Label>
              <Input
                id="location-label"
                placeholder="Ex: Mon bureau, Marché de Lomé..."
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Votre position GPS actuelle sera partagée avec votre interlocuteur.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleShareLocation} disabled={gettingLocation}>
              {gettingLocation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Localisation...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Partager
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatAttachmentMenu;
