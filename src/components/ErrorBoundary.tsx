import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { reportError } from "@/lib/monitoring";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    reportError(error, `boundary${errorInfo.componentStack ? ":" + errorInfo.componentStack.split("\n")[1]?.trim() : ""}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Oups ! Une erreur est survenue</h1>
            <p className="text-muted-foreground mb-6">
              Quelque chose s'est mal passé. Veuillez rafraîchir la page ou revenir à l'accueil.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
              >
                <RefreshCw className="h-4 w-4" />
                Rafraîchir
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition"
              >
                <Home className="h-4 w-4" />
                Accueil
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
