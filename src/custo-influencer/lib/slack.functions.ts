import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/custo-influencer/integrations/supabase/auth-middleware";

export const notificarNFSlack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ registroId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { sendSlack, buildNFMessage } = await import("@/custo-influencer/lib/slack.server");
    const { data: reg, error } = await context.supabase
      .from("registros")
      .select(
        "influenciador, frente, acao, cidade, valor_dinheiro, valor_permuta, data_prevista, status, responsavel",
      )
      .eq("id", data.registroId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reg) throw new Error("Registro não encontrado");
    await sendSlack(buildNFMessage(reg as never));
    return { ok: true as const };
  });

export const dispararPagamentosPrevistos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isMarketing } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "Marketing",
    });
    if (!isMarketing) throw new Error("Acesso restrito ao perfil Marketing");
    const { runPagamentosPrevistos } = await import("@/custo-influencer/lib/slack.server");
    return await runPagamentosPrevistos();
  });

export const notificarPagamentoSlack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ registroId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { sendSlack, buildPagamentoEfetuadoMessage } = await import("@/custo-influencer/lib/slack.server");
    const { data: reg, error } = await context.supabase
      .from("registros")
      .select(
        "influenciador, frente, valor_dinheiro, valor_permuta, forma_pagamento, data_pagamento, responsavel",
      )
      .eq("id", data.registroId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reg) throw new Error("Registro não encontrado");
    await sendSlack(buildPagamentoEfetuadoMessage(reg as never));
    return { ok: true as const };
  });

export const dispararNovosPrevistos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isMarketing } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "Marketing",
    });
    if (!isMarketing) throw new Error("Acesso restrito ao perfil Marketing");
    const { runNovosPrevistos } = await import("@/custo-influencer/lib/slack.server");
    return await runNovosPrevistos();
  });
