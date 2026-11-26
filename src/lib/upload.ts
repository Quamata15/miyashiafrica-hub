import { supabase } from "@/integrations/supabase/client";

/** Uploads a file to a bucket under the user's folder and returns its public URL (or the path for private buckets). */
export async function uploadFile(bucket: string, userFolder: string, file: File, opts: { publicUrl?: boolean } = { publicUrl: true }) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return opts.publicUrl === false ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
