import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Retorna a lista unificada de unidades, combinando:
 * - `unidade` e `unidades_inclusas` de `clube_influenciadoras`
 * - `estabelecimento` de `inauguracoes`
 * Sem duplicatas, ordenada em pt-BR.
 */
export function useUnidadesUnificadas() {
  const [unidades, setUnidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: infl }, { data: inaug }] = await Promise.all([
        supabase
          .from("clube_influenciadoras")
          .select("unidade, unidades_inclusas"),
        supabase.from("inauguracoes").select("estabelecimento"),
      ]);
      if (!alive) return;
      const s = new Set<string>();
      for (const i of (infl ?? []) as { unidade: string | null; unidades_inclusas: string[] | null }[]) {
        if (i.unidade) s.add(i.unidade.trim());
        if (Array.isArray(i.unidades_inclusas)) {
          for (const u of i.unidades_inclusas) if (u) s.add(u.trim());
        }
      }
      for (const r of (inaug ?? []) as { estabelecimento: string | null }[]) {
        if (r.estabelecimento) s.add(r.estabelecimento.trim());
      }
      setUnidades(
        Array.from(s)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "pt-BR")),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { unidades, loading };
}
