import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/novos-previstos")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { runNovosPrevistos } = await import("@/custo-influencer/lib/slack.server");
          const result = await runNovosPrevistos();
          return Response.json({ success: true, ...result, mensagem: undefined });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "erro";
          console.error("novos-previstos", msg);
          return Response.json({ success: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
