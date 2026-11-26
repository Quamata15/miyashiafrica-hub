import { supabase } from "@/integrations/supabase/client";

export class AiNotConfigured extends Error {}

/** Calls the ai-assist edge function. Throws AiNotConfigured when no API key is set on the server. */
export async function aiAssist<T = any>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-assist", { body: { action, ...payload } });
  if (error) {
    let body: { error?: string; code?: string } = {};
    try { body = await (error as { context?: Response }).context?.json(); } catch { /* ignore */ }
    if (body?.code === "ai_not_configured") throw new AiNotConfigured(body.error);
    throw new Error(body?.error || "L'assistant n'a pas pu répondre");
  }
  return data as T;
}

/** Reads a File as a data: URL, resized so the longest side is at most `max` px (keeps uploads small). */
export function fileToDataUrl(file: File, max = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export const errMsg = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e);
  if (m.includes("Insufficient wallet")) return "Solde du portefeuille insuffisant";
  if (m.includes("Insufficient stock")) return "Stock insuffisant";
  if (m.includes("Cannot buy your own")) return "Vous ne pouvez pas acheter votre propre article";
  return m.replace(/^.*?ERROR:\s*/, "");
};
