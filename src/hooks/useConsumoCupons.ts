import { useQuery } from "@tanstack/react-query";
import { supabase, type ConsumoCupom } from "@/lib/supabase";
import { parseCodes } from "@/lib/coupons";

async function fetchConsumoCupons() {
  const { data: influData } = await supabase
    .from("clube_influenciadoras")
    .select("nome, codigo_cupom");
  const influencerMap = new Map<string, string>();
  for (const i of (influData || []) as { nome: string | null; codigo_cupom: string | null }[]) {
    for (const c of parseCodes(i.codigo_cupom)) {
      if (!influencerMap.has(c)) influencerMap.set(c, (i.nome || "").trim());
    }
  }

  const rows: ConsumoCupom[] = [];
  const pageSize = 1000;
  let from = 0;
  let done = false;
  while (!done) {
    const { data, error } = await supabase
      .from("consumo_cupons")
      .select("*")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as ConsumoCupom[]));
    if (data.length < pageSize) done = true;
    else from += pageSize;
    if (rows.length > 200_000) done = true; // safety cap
  }

  return { rows, influencerMap };
}

/**
 * Carrega todas as vendas de `consumo_cupons` (paginado) e monta o mapa
 * `codigo_cupom → nome_influenciador` a partir de `clube_influenciadoras`.
 * Usa react-query pra cachear e deduplicar entre as diferentes telas que
 * montam esse hook (Inauguração, Cupons sem dono etc.) em vez de refazer o
 * scan completo da tabela em cada uma.
 */
export function useConsumoCupons() {
  const { data, isLoading } = useQuery({
    queryKey: ["consumo-cupons"],
    queryFn: fetchConsumoCupons,
    staleTime: 5 * 60 * 1000,
  });

  return {
    rows: data?.rows ?? [],
    influencerMap: data?.influencerMap ?? new Map<string, string>(),
    loading: isLoading,
  };
}
