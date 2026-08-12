import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type ClubeInfluenciadora = {
  id: string;
  nome: string;
  unidade: string | null;
  unidades_inclusas: string[] | null;
  formato_parceria: string | null;
  status_parceria: "ativa" | "encerrada" | string | null;
  codigo_cupom: string | null;
  status_cupom: "ativa" | "encerrada" | string | null;
  data_inicio: string | null;
  data_validade: string | null;
  instagram: string | null;
  contato: string | null;
};

async function fetchInfluenciadoras(): Promise<ClubeInfluenciadora[]> {
  const { data, error } = await supabase
    .from("clube_influenciadoras")
    .select("*")
    .order("nome", { ascending: true });
  if (error) {
    toast.error(error.message);
    return [];
  }
  return (data ?? []) as ClubeInfluenciadora[];
}

/**
 * Lista de influenciadoras do clube — compartilhada entre a área pública
 * (Influenciadores ativos) e a área administrativa (Editar Influenciadoras),
 * que hoje vivem em componentes/rotas separadas. Usa react-query pra que
 * aprovar/editar em um espaço invalide o cache e o outro reflita sem refetch
 * manual.
 */
export function useInfluenciadoras() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["clube-influenciadoras"],
    queryFn: fetchInfluenciadoras,
  });

  return {
    influenciadoras: data ?? [],
    loading: isLoading,
    reload: () => queryClient.invalidateQueries({ queryKey: ["clube-influenciadoras"] }),
  };
}
