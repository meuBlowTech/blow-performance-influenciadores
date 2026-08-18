import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  listarRegistros,
  criarRegistro,
  atualizarRegistro,
  excluirRegistro,
  alternarStatusPagamento,
} from "@/custo-influencer/actions/registros.actions";
import type { Registro } from "@/custo-influencer/lib/db-types";

export type RegistroInput = Omit<Registro, "id" | "criado_em" | "atualizado_em">;

export function useRegistros(password: string) {
  const qc = useQueryClient();
  const queryKey = ["custos-registros"];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Registro[]> => listarRegistros({ data: { password } }),
  });

  const create = useMutation({
    mutationFn: async (input: RegistroInput) =>
      criarRegistro({ data: { password, input } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RegistroInput> }) =>
      atualizarRegistro({ data: { password, id, patch } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => excluirRegistro({ data: { password, id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const togglePay = useMutation({
    mutationFn: async (id: string) => alternarStatusPagamento({ data: { password, id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return { ...query, create, update, remove, togglePay };
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
