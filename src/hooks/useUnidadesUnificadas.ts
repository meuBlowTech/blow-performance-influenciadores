import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Retorna a lista mestre de unidades, combinando:
 * - `nome` da tabela `unidades` (curada, independente de inaugurações)
 * - `unidade`/`unidades_inclusas` de `clube_influenciadoras`
 * - `estabelecimento` de `inauguracoes` (histórico, pra unidades antigas
 *   que nunca foram cadastradas na tabela mestre)
 * Sem duplicatas, ordenada em pt-BR.
 */
export function useUnidadesUnificadas() {
  const [unidades, setUnidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Unidades da Trinks (mesma fonte da aba Geral), paginado.
      const fetchConsumoUnidades = async () => {
        const out: string[] = [];
        let from = 0;
        for (;;) {
          const { data, error } = await supabase
            .from("consumo_cupons")
            .select("estabelecimento")
            .range(from, from + 999);
          if (error || !data) break;
          for (const r of data as { estabelecimento: string | null }[]) {
            if (r.estabelecimento) out.push(r.estabelecimento);
          }
          if (data.length < 1000) break;
          from += 1000;
        }
        return out;
      };
      const [{ data: master }, { data: infl }, { data: inaug }, consumo] = await Promise.all([
        supabase.from("unidades").select("nome"),
        supabase.from("clube_influenciadoras").select("unidade, unidades_inclusas"),
        supabase.from("inauguracoes").select("estabelecimento"),
        fetchConsumoUnidades(),
      ]);
      if (!alive) return;
      const s = new Set<string>();
      for (const u of consumo) if (u.trim()) s.add(u.trim());
      for (const u of (master ?? []) as { nome: string | null }[]) {
        if (u.nome) s.add(u.nome.trim());
      }
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
