// Middleware client-side: anexa o Bearer token da sessão de "Custos de
// Influência" em toda chamada de server function que o usar. Precisa estar
// registrado como `functionMiddleware` global em src/start.ts, senão o
// browser nunca manda o token nas RPCs de serverFn.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
