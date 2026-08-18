import { useQuery } from "@tanstack/react-query";
import { listarHistorico } from "@/custo-influencer/actions/historico.actions";

export function useHistorico(password: string) {
  return useQuery({
    queryKey: ["custos-historico"],
    queryFn: async () => listarHistorico({ data: { password } }),
  });
}
