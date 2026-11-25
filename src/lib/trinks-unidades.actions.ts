import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdminPassword } from "@/custo-influencer/actions/authz";

// Botão "Sincronizar com a Trinks" da aba Unidades. aplicar=false só mostra o
// que mudaria; a mesma sincronização roda sozinha a cada 6h (src/server.ts).
export const sincronizarUnidadesTrinks = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string(), aplicar: z.boolean() }))
  .handler(async ({ data }) => {
    await assertAdminPassword(data.password);
    const { sincronizarUnidades } = await import("./trinks-sync.server");
    return sincronizarUnidades(data.aplicar);
  });
