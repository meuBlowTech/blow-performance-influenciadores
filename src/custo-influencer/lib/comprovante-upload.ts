import { supabase } from "@/custo-influencer/integrations/supabase/client";

export const COMP_BUCKET = "comprovantes-pagamento";
export const COMP_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const COMP_ACCEPT = "application/pdf,image/jpeg,image/png,image/jpg";
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

export function validateComprovanteFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Tipo inválido. Use PDF, JPG ou PNG.";
  if (file.size > COMP_MAX_BYTES) return "Arquivo muito grande (máx 10 MB).";
  return null;
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadComprovante(registroId: string, file: File): Promise<string> {
  const err = validateComprovanteFile(file);
  if (err) throw new Error(err);
  const path = `${registroId}/${Date.now()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage
    .from(COMP_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeComprovante(path: string): Promise<void> {
  const { error } = await supabase.storage.from(COMP_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export async function getComprovanteSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(COMP_BUCKET)
    .createSignedUrl(path, 60);
  if (error || !data) throw new Error(error?.message ?? "Falha ao gerar link");
  return data.signedUrl;
}

export async function openComprovante(path: string) {
  const url = await getComprovanteSignedUrl(path);
  window.open(url, "_blank", "noopener,noreferrer");
}
