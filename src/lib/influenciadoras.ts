import type { ClubeInfluenciadora } from "@/hooks/useInfluenciadoras";

// Opções de "Formato de parceria" — valores gravados como slug em texto livre.
export const FORMATO_PARCERIA_OPTIONS: { value: string; label: string }[] = [
  { value: "clube_franqueadora", label: "Clube (gestão franqueadora)" },
  { value: "clube_franquia", label: "Clube (gestão franquia)" },
  { value: "pontual", label: "Pontual" },
  { value: "inauguracao", label: "Inauguração" },
];
const FORMATO_LABELS: Record<string, string> = Object.fromEntries(
  FORMATO_PARCERIA_OPTIONS.map((o) => [o.value, o.label]),
);
export const formatoLabel = (v: string | null) => (v ? FORMATO_LABELS[v] ?? v : "—");

export const unidadesDe = (i: ClubeInfluenciadora): string[] => {
  const arr: string[] = [];
  if (i.unidade) arr.push(i.unidade);
  if (Array.isArray(i.unidades_inclusas)) {
    for (const u of i.unidades_inclusas) if (u && !arr.includes(u)) arr.push(u);
  }
  return arr;
};

export const computeAllUnidades = (
  influenciadoras: ClubeInfluenciadora[],
  unidadesUnificadas: string[],
): string[] => {
  const s = new Set<string>(unidadesUnificadas);
  for (const i of influenciadoras) for (const u of unidadesDe(i)) s.add(u);
  return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
};
