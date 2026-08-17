// Cliente Supabase do projeto "Custos de Influência" (nkigtgxpdtriwwqipomh) —
// projeto separado do Supabase principal deste dashboard. URL e publishable
// key são valores públicos por design, seguros de expor no bundle do cliente.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://nkigtgxpdtriwwqipomh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qddb2CK7C6DIzWfCcJSU2w_5ZtyDeyL";

function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "custo-influencer-auth",
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
