export const parseCodes = (raw: string | null): string[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(
      (s) => s && s !== "NÃO IDENTIFICADO" && s !== "NAO IDENTIFICADO",
    );
};
