import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdminPassword } from "./authz";
import type { Registro } from "@/custo-influencer/lib/db-types";

const USUARIO = "Franqueadora bLOw";

const BUCKETS = { nf: "notas-fiscais", comp: "comprovantes-pagamento" } as const;
const kindSchema = z.enum(["nf", "comp"]);

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const uploadArquivo = createServerFn({ method: "POST" })
  .validator(z.object({
    password: z.string(),
    registroId: z.string(),
    kind: kindSchema,
    fileName: z.string(),
    contentType: z.string(),
    base64: z.string(),
  }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    const bucket = BUCKETS[data.kind];
    const path = `${data.registroId}/${Date.now()}-${sanitize(data.fileName)}`;
    const bytes = Buffer.from(data.base64, "base64");

    const { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const column = data.kind === "nf" ? "nf_url" : "comprovante_url";
    const { data: before } = await supabaseAdmin
      .from("registros")
      .select("*")
      .eq("id", data.registroId)
      .maybeSingle();
    const beforeRow = before as unknown as Registro | null;
    const had = data.kind === "nf" ? !!beforeRow?.nf_url : !!beforeRow?.comprovante_url;

    const { data: updatedRow, error: updErr } = await supabaseAdmin
      .from("registros")
      .update({ [column]: path } as never)
      .eq("id", data.registroId)
      .select()
      .single();
    if (updErr) throw new Error(updErr.message);
    const updated = updatedRow as unknown as Registro;

    const label = data.kind === "nf" ? "NF" : "comprovante de pagamento";
    await supabaseAdmin.from("historico").insert({
      registro_id: data.registroId,
      usuario: USUARIO,
      acao_realizada: had ? `substituiu ${label}` : `anexou ${label}`,
      detalhe: data.fileName,
    } as never);

    if (data.kind === "nf") {
      try {
        const { sendSlack, buildNFMessage } = await import("@/custo-influencer/lib/slack.server");
        await sendSlack(buildNFMessage(updated));
        await supabaseAdmin.from("historico").insert({
          registro_id: data.registroId,
          usuario: USUARIO,
          acao_realizada: "notificação Slack: NF anexada",
          detalhe: "enviada com sucesso",
        } as never);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabaseAdmin.from("historico").insert({
          registro_id: data.registroId,
          usuario: USUARIO,
          acao_realizada: "falha na notificação Slack: NF anexada",
          detalhe: msg,
        } as never);
      }
    }

    return { path };
  });

export const removerComprovante = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string(), registroId: z.string(), path: z.string() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(BUCKETS.comp).remove([data.path]);
    const { error } = await supabaseAdmin
      .from("registros")
      .update({ comprovante_url: null } as never)
      .eq("id", data.registroId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("historico").insert({
      registro_id: data.registroId,
      usuario: USUARIO,
      acao_realizada: "removeu comprovante de pagamento",
      detalhe: null,
    } as never);
  });

export const abrirArquivo = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string(), kind: kindSchema, path: z.string() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    const bucket = BUCKETS[data.kind];
    const { data: signed, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(data.path, 60);
    if (error || !signed) throw new Error(error?.message ?? "Falha ao gerar link");
    return { url: signed.signedUrl };
  });
