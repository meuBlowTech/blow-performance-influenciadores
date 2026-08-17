import { supabase } from "@/custo-influencer/integrations/supabase/client";

export const NF_BUCKET = "notas-fiscais";
export const NF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const NF_ACCEPT = "application/pdf,image/jpeg,image/png,image/jpg";
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

export function validateNFFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Tipo inválido. Use PDF, JPG ou PNG.";
  if (file.size > NF_MAX_BYTES) return "Arquivo muito grande (máx 10 MB).";
  return null;
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadNF(registroId: string, file: File): Promise<string> {
  const err = validateNFFile(file);
  if (err) throw new Error(err);
  const path = `${registroId}/${Date.now()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage
    .from(NF_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function getNFSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(NF_BUCKET)
    .createSignedUrl(path, 60);
  if (error || !data) throw new Error(error?.message ?? "Falha ao gerar link");
  return data.signedUrl;
}

export async function openNF(path: string) {
  const url = await getNFSignedUrl(path);
  window.open(url, "_blank", "noopener,noreferrer");
}
