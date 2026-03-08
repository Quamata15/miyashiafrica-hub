import { Loader2 } from "lucide-react";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
        <span className="font-bold text-2xl text-primary-foreground">M</span>
      </div>
      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
    </div>
  </div>
);

export default LoadingSpinner;
