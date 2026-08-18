import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdminPassword } from "./authz";
import { bloqueioParaPago } from "@/custo-influencer/lib/pagamento-rules";
import { todayISO } from "@/custo-influencer/lib/format";
import type { Registro } from "@/custo-influencer/lib/db-types";

// Rótulo genérico usado no histórico — este módulo não tem mais login
// individual, então não há "quem" além de "alguém com a senha do Admin".
const USUARIO = "Franqueadora bLOw";

const registroInputSchema = z.object({
  frente: z.string(),
  influenciador: z.string(),
  handle: z.string().nullable().optional(),
  acao: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  forma_pagamento: z.string().nullable().optional(),
  valor_dinheiro: z.number(),
  valor_permuta: z.number(),
  descricao_permuta: z.string().nullable().optional(),
  status: z.string(),
  data_prevista: z.string().nullable().optional(),
  data_pagamento: z.string().nullable().optional(),
  responsavel: z.string().nullable().optional(),
  obs: z.string().nullable().optional(),
  nf_url: z.string().nullable().optional(),
  comprovante_url: z.string().nullable().optional(),
});

const DIFF_KEYS = [
  "frente", "influenciador", "handle", "acao", "cidade", "forma_pagamento",
  "valor_dinheiro", "valor_permuta", "status", "data_prevista", "responsavel",
] as const;

function diffString(oldR: Record<string, unknown>, newR: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const k of DIFF_KEYS) {
    const a = oldR[k];
    const b = newR[k];
    if (b === undefined) continue;
    if (String(a ?? "") !== String(b ?? "")) parts.push(`${k}: ${a ?? "—"} → ${b ?? "—"}`);
  }
  return parts.join(" | ");
}

export const listarRegistros = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("registros")
      .select("*")
      .order("data_prevista", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as Registro[];
  });

export const criarRegistro = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string(), input: registroInputSchema }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("registros")
      .insert(data.input as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const created = row as unknown as Registro;
    await supabaseAdmin.from("historico").insert({
      registro_id: created.id,
      usuario: USUARIO,
      acao_realizada: "criou registro",
      detalhe: `${data.input.frente} · ${data.input.influenciador}`,
    } as never);
    return created;
  });

export const atualizarRegistro = createServerFn({ method: "POST" })
  .validator(z.object({
    password: z.string(),
    id: z.string(),
    patch: registroInputSchema.partial(),
  }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("registros")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { data: row, error } = await supabaseAdmin
      .from("registros")
      .update(data.patch as never)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const updated = row as unknown as Registro;
    const detalhe = before
      ? (diffString(before as unknown as Record<string, unknown>, data.patch) || "sem mudanças relevantes")
      : "atualização";
    await supabaseAdmin.from("historico").insert({
      registro_id: updated.id,
      usuario: USUARIO,
      acao_realizada: "editou registro",
      detalhe,
    } as never);
    return updated;
  });

export const excluirRegistro = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("registros")
      .select("frente, influenciador")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("registros").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const info = row as unknown as { frente: string; influenciador: string } | null;
    await supabaseAdmin.from("historico").insert({
      registro_id: null,
      usuario: USUARIO,
      acao_realizada: "excluiu registro",
      detalhe: info ? `${info.frente} · ${info.influenciador}` : null,
    } as never);
  });

// Alterna Pago <-> Previsto. Bloqueia marcar como Pago sem comprovante
// (quando há valor em dinheiro), registra o histórico e dispara o Slack.
export const alternarStatusPagamento = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    const { data: row, error: selErr } = await supabaseAdmin
      .from("registros")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) throw new Error("Registro não encontrado");
    const current = row as unknown as Registro;
    const novo = current.status === "Pago" ? "Previsto" : "Pago";
    if (novo === "Pago") {
      const bloqueio = bloqueioParaPago(current);
      if (bloqueio) throw new Error(bloqueio);
    }
    const patch = { status: novo, data_pagamento: novo === "Pago" ? todayISO() : null };
    const { data: updatedRow, error } = await supabaseAdmin
      .from("registros")
      .update(patch as never)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const updated = updatedRow as unknown as Registro;
    await supabaseAdmin.from("historico").insert({
      registro_id: data.id,
      usuario: USUARIO,
      acao_realizada: `marcou como ${novo}`,
      detalhe: `Status: ${current.status} → ${novo}`,
    } as never);

    if (novo === "Pago") {
      try {
        const { sendSlack, buildPagamentoEfetuadoMessage } = await import("@/custo-influencer/lib/slack.server");
        await sendSlack(buildPagamentoEfetuadoMessage(updated));
        await supabaseAdmin.from("historico").insert({
          registro_id: data.id,
          usuario: USUARIO,
          acao_realizada: "notificação Slack: pagamento efetuado",
          detalhe: "enviada com sucesso",
        } as never);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabaseAdmin.from("historico").insert({
          registro_id: data.id,
          usuario: USUARIO,
          acao_realizada: "falha na notificação Slack: pagamento efetuado",
          detalhe: msg,
        } as never);
      }
    }
    return updated;
  });
