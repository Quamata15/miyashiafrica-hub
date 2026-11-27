import { useState, useRef } from "react";
import { compressImage } from "@/lib/upload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, Video, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductMediaUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxFiles?: number;
}

const ProductMediaUpload = ({ images, onImagesChange, maxFiles = 8 }: ProductMediaUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    if (images.length + files.length > maxFiles) {
      toast({ title: "Limite atteinte", description: `Maximum ${maxFiles} fichiers`, variant: "destructive" });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const original of Array.from(files)) {
      const file = await compressImage(original);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from("product-media").upload(path, file, { contentType: file.type || undefined });
      if (error) {
        toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("product-media").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    onImagesChange([...images, ...newUrls]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 lg:grid-cols-3 gap-2">
        <AnimatePresence>
          {images.map((url, i) => (
            <motion.div
              key={url}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-square rounded-lg overflow-hidden border border-border group"
            >
              {isVideo(url) ? (
                <video src={url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-all" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                type="button"
                aria-label="Retirer ce fichier"
                onClick={() => removeImage(i)}
              >
                <X className="h-3 w-3" />
              </Button>
              {isVideo(url) && (
                <div className="absolute bottom-1 left-1">
                  <Video className="h-4 w-4 text-background" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {images.length < maxFiles && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-all"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">
        {images.length}/{maxFiles} · photos JPEG, PNG, WebP ou vidéos MP4, WebM
      </p>
    </div>
  );
};

export default ProductMediaUpload;
