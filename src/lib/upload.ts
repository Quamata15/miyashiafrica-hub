import { supabase } from "@/integrations/supabase/client";

/** Uploads a file to a bucket under the user's folder and returns its public URL (or the path for private buckets). */
export async function uploadFile(bucket: string, userFolder: string, input: File, opts: { publicUrl?: boolean } = { publicUrl: true }) {
  const file = await compressImage(input);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return opts.publicUrl === false ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Resizes a photo (longest side <= max px) and re-encodes it as WebP (JPEG fallback). Videos and PDFs pass through. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
    const blob = (await toBlob("image/webp")) ?? (await toBlob("image/jpeg"));
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
  } catch {
    return file;
  }
}
