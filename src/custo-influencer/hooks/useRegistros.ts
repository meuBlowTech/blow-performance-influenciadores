import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/custo-influencer/integrations/supabase/client";
import type { Registro } from "@/custo-influencer/lib/db-types";

export type RegistroInput = Omit<Registro, "id" | "criado_em" | "atualizado_em">;

export function useRegistros() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["registros"],
    queryFn: async (): Promise<Registro[]> => {
      const { data, error } = await supabase
        .from("registros" as never)
        .select("*")
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Registro[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: RegistroInput): Promise<Registro> => {
      const { data, error } = await supabase
        .from("registros" as never)
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Registro;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registros"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RegistroInput> }): Promise<Registro> => {
      const { data, error } = await supabase
        .from("registros" as never)
        .update(patch as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Registro;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registros"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registros" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registros"] }),
  });

  return { ...query, create, update, remove };
}

export interface Filters {
  frente: "all" | Registro["frente"];
  status: "all" | Registro["status"];
  forma: "all" | NonNullable<Registro["forma_pagamento"]>;
  start: string;
  end: string;
}

export const defaultFilters: Filters = {
  frente: "all",
  status: "all",
  forma: "all",
  start: "",
  end: "",
};

export function useFilteredRegistros(registros: Registro[] | undefined) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const filtered = useMemo(() => {
    if (!registros) return [];
    return registros.filter((r) => {
      if (filters.frente !== "all" && r.frente !== filters.frente) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.forma !== "all" && r.forma_pagamento !== filters.forma) return false;
      const ref = r.data_prevista ?? r.data_pagamento ?? "";
      if (filters.start && ref && ref < filters.start) return false;
      if (filters.end && ref && ref > filters.end) return false;
      return true;
    });
  }, [registros, filters]);
  return { filters, setFilters, filtered };
}
