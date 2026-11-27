import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";

/** Standard page frame for the account pages. */
export default function PageShell({ title, description, children, actions, wide }: { title: string; description?: string; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <SEOHead title={title} description={description ?? title} />
      <Header />
      <main className="flex-1 pt-header pb-10">
        <div className={`container mx-auto px-4 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-4 md:mb-5">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-display font-bold">{title}</h1>
              {description && <p className="text-sm md:text-base text-muted-foreground mt-0.5">{description}</p>}
            </div>
            {actions}
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-foreground/15">
      <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-muted-foreground mt-1">{children}</div>}
    </div>
  );
}
