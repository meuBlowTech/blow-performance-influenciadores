import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type Inauguracao = {
  id: string;
  estabelecimento: string;
  data_inauguracao: string;
  uf: string | null;
  dias_desde_inauguracao: number | null;
  janela_completa: boolean;
  receita_30d: number | null;
  atendimentos_30d: number | null;
  cupons_utilizados_30d: number | null;
  influenciadoras_ativas_30d: number | null;
};

async function fetchInauguracoes(): Promise<Inauguracao[]> {
  const { data, error } = await supabase
    .from("clube_inauguracoes_30d")
    .select("*")
    .order("data_inauguracao", { ascending: true });
  if (error) {
    toast.error(error.message);
    return [];
  }
  return (data as Inauguracao[] | null) ?? [];
}

/**
 * Lista de inaugurações — compartilhada entre a área pública (Performance de
 * inaugurações) e a área administrativa (Gerenciar Inaugurações), que hoje
 * vivem em componentes/rotas separadas. Usa react-query pra que editar em um
 * espaço invalide o cache e o outro reflita sem refetch manual.
 */
export function useInauguracoes() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["clube-inauguracoes"],
    queryFn: fetchInauguracoes,
  });

  return {
    rows: data ?? [],
    loading: isLoading,
    reload: () => queryClient.invalidateQueries({ queryKey: ["clube-inauguracoes"] }),
  };
}
