import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdminPassword } from "./authz";
import type { HistoricoRow } from "@/custo-influencer/lib/db-types";

export const listarHistorico = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("historico")
      .select("*")
      .order("data_hora", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as HistoricoRow[];
  });
