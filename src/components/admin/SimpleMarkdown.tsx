import { Fragment } from "react";

// Minimal, safe Markdown renderer (headings, lists, bold) — no HTML injection.
const inline = (s: string) =>
  s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>,
  );

const SimpleMarkdown = ({ text }: { text: string }) => (
  <div className="space-y-1.5">
    {text.split("\n").map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-1" />;
      const h = t.match(/^(#{1,4})\s+(.*)$/);
      if (h) return <p key={i} className="font-display font-semibold text-foreground mt-2">{inline(h[2])}</p>;
      const li = t.match(/^([-*]|\d+\.)\s+(.*)$/);
      if (li) return <p key={i} className="pl-4">• {inline(li[2])}</p>;
      return <p key={i}>{inline(t)}</p>;
    })}
  </div>
);

export default SimpleMarkdown;
