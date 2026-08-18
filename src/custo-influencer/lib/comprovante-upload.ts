// Validação client-side do comprovante de pagamento. O upload em si, a
// remoção e a geração de link assinado acontecem no servidor (ver
// server/arquivos.actions.ts), já que não há mais sessão de usuário
// autenticado neste módulo.
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
