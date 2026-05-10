import { supabase } from "@/integrations/supabase/client";

export async function uploadFile(bucket: string, userId: string, file: File, prefix = ""): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${prefix}${prefix ? "_" : ""}${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error(error); return null; }
  const isPublic = ["qr-codes", "products", "vehicles"].includes(bucket);
  if (isPublic) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}
