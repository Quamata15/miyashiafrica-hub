// Text embeddings with the built-in gte-small model of the Supabase Edge Runtime (384 dims, no API key).
// deno-lint-ignore no-explicit-any
const session = new (globalThis as any).Supabase.ai.Session("gte-small");

export async function embed(text: string): Promise<number[]> {
  const out = await session.run(text.slice(0, 2000), { mean_pool: true, normalize: true });
  return Array.from(out as number[]);
}
