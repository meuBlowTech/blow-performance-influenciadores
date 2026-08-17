import { supabase } from "@/custo-influencer/integrations/supabase/client";

export async function logHistorico(params: {
  registro_id: string | null;
  usuario: string;
  acao_realizada: string;
  detalhe?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("historico" as never).insert({
      registro_id: params.registro_id,
      usuario: params.usuario,
      acao_realizada: params.acao_realizada,
      detalhe: params.detalhe ?? null,
    } as never);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "erro" };
  }
}
