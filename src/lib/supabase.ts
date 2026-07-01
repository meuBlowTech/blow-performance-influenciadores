import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vcmahlxowiddwxvehkna.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbWFobHhvd2lkZHd4dmVoa25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjA4ODIsImV4cCI6MjA5ODQ5Njg4Mn0.Bd58E5D7OfjcMb2PaULDAcdsQ0okChy29zquZuGRwDQ";

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
