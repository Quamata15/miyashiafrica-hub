import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[72px] w-full text-sm disabled:cursor-not-allowed disabled:opacity-50 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-3.5 py-2 ring-offset-background placeholder:text-muted-foreground/80 transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
