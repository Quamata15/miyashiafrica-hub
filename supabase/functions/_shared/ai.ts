// Thin wrapper over the Anthropic SDK for MIYASHI's AI features.
// Every feature degrades gracefully when ANTHROPIC_API_KEY is not set.
import Anthropic from "npm:@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";
export const aiConfigured = () => !!Deno.env.get("ANTHROPIC_API_KEY");

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

type Effort = "low" | "medium" | "high";
type Content = Anthropic.Beta.BetaContentBlockParam[] | string;

/** One call that must return JSON matching `schema`. Returns null on refusal or invalid output. */
export async function askJSON<T>(system: string, content: Content, schema: Record<string, unknown>,
  opts: { effort?: Effort; maxTokens?: number } = {}): Promise<T | null> {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "low", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content }],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming);
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try { return JSON.parse(text) as T; } catch { return null; }
}

/** Free-text answer for a conversation. Returns null on refusal. */
export async function askText(system: string, messages: Anthropic.Beta.BetaMessageParam[],
  opts: { effort?: Effort; maxTokens?: number } = {}): Promise<string | null> {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "low" },
    system,
    messages,
  } as Anthropic.Beta.MessageCreateParamsNonStreaming);
  if (res.stop_reason === "refusal") return null;
  return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim() || null;
}
