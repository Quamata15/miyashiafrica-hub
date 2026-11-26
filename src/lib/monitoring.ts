// Self-hosted error monitoring: browser errors go to the client_errors table (Admin → Exploitation).
import { supabase } from "@/integrations/supabase/client";
import { sessionId } from "@/lib/prefs";

const RELEASE = import.meta.env.VITE_RELEASE ?? "web";
let sent = 0;
const seen = new Set<string>();

export function reportError(err: unknown, context?: string) {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
    const key = `${e.message}|${(e.stack ?? "").split("\n")[1] ?? ""}`;
    if (seen.has(key) || sent >= 15) return;
    seen.add(key); sent++;
    if (/ResizeObserver loop|Loading chunk|Failed to fetch dynamically imported module|NetworkError/i.test(e.message)) return;
    supabase.rpc("log_client_error", {
      p_message: (context ? `[${context}] ` : "") + e.message, p_stack: e.stack ?? undefined, p_url: location.pathname + location.search,
      p_user_agent: navigator.userAgent, p_session: sessionId(), p_release: RELEASE,
    }).then(() => undefined, () => undefined);
  } catch { /* never throw from the reporter */ }
}

export function installGlobalErrorHandlers() {
  window.addEventListener("error", (ev) => reportError(ev.error ?? ev.message, "window"));
  window.addEventListener("unhandledrejection", (ev) => reportError(ev.reason, "promise"));
}
