import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdminPassword } from "./authz";

export const testarPagamentosPrevistos = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { runPagamentosPrevistos } = await import("@/custo-influencer/lib/slack.server");
    return await runPagamentosPrevistos();
  });

export const testarNovosPrevistos = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { runNovosPrevistos } = await import("@/custo-influencer/lib/slack.server");
    return await runNovosPrevistos();
  });
