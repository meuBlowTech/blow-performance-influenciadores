import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/custo-influencer/integrations/supabase/client";
import type { HistoricoRow } from "@/custo-influencer/lib/db-types";

export function useHistorico() {
  return useQuery({
    queryKey: ["historico"],
    queryFn: async (): Promise<HistoricoRow[]> => {
      const { data, error } = await supabase
        .from("historico" as never)
        .select("*")
        .order("data_hora", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as HistoricoRow[];
    },
  });
}
