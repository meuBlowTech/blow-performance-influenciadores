// Server-side Supabase client do projeto "Custos de Influência", com service
// role key - bypassa RLS. Use só em server functions/rotas server, nunca
// exponha ao client.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://nkigtgxpdtriwwqipomh.supabase.co";

function createSupabaseAdminClient() {
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_CUSTO;

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    const message =
      "Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY_CUSTO. Configure em .env.local (dev) ou nas Environment Variables do Lovable Cloud (produção).";
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// SECURITY: só use pra operações server-side confiáveis, nunca no client.
// Carregue dentro de handlers server: const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
