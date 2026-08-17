// Normalize Supabase/Postgrest errors so toasts/console show real cause.
export function describeSupaError(e: unknown): string {
  if (!e) return "Erro desconhecido";
  if (typeof e === "string") return e;
  const obj = e as { message?: string; code?: string; details?: string; hint?: string };
  const parts: string[] = [];
  if (obj.message) parts.push(obj.message);
  if (obj.code) parts.push(`[${obj.code}]`);
  if (obj.details) parts.push(`details: ${obj.details}`);
  if (obj.hint) parts.push(`hint: ${obj.hint}`);
  if (parts.length === 0) {
    try { return JSON.stringify(e); } catch { return String(e); }
  }
  return parts.join(" · ");
}

export function logSupaError(scope: string, e: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[${scope}]`, e, "→", describeSupaError(e));
}
