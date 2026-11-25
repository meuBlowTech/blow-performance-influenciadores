import { createClient } from "@supabase/supabase-js";

// Projeto Supabase "Blow" (jwnrbqgnhktjcjdmmglp). Valores vêm do .env.local.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Variáveis ausentes: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Configure no .env.local.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type ConsumoCupom = {
  estabelecimento: string | null;
  data_hora_atendimento: string | null;
  cliente_hash: string | null;
  comanda: string | null;
  categoria_item: string | null;
  item: string | null;
  valor_item: number | null;
  valor_desconto: number | null;
  valor_liquido: number | null;
  fechamento_conta: string | null;
  quem_fechou_conta: string | null;
  comentario_fechamento: string | null;
  nome_cupom: string | null;
  codigo_cupom: string | null;
  tipo_item: string | null;
  data_extracao: string | null;
};

export type Unidade = {
  nome: string;
};

export type CupomEmitido = {
  id?: number | string | null;
  nome_influenciador: string | null;
  unidade: string | null;
  codigo_cupom: string | null;
  formato_parceria: string | null;
  status_parceria: string | null;
  data_inicio: string | null;
  data_validade: string | null;
};
