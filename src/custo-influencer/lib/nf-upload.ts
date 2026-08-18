// Validação client-side do arquivo de Nota Fiscal. O upload em si e a
// geração de link assinado acontecem no servidor (ver server/arquivos.actions.ts),
// já que não há mais sessão de usuário autenticado neste módulo.
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
