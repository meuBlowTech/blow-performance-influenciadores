import { createFileRoute } from "@tanstack/react-router";

// Página pública, somente leitura, HTML renderizado no servidor (sem JS).
// Reutiliza exatamente os dados/lógica de /api/public/radar-influencia-resumo.

type Resumo = {
  gerado_em: string;
  sem_influenciadora: string[];
  vencendo_30_dias: { unidade: string; instagram: string | null; data_termino: string; dias_restantes: number }[];
  sem_cupom_30_dias: { unidade: string; instagram: string | null }[];
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const ig = (s: string | null) => esc(s ?? "sem @");
const dataBR = (d: string) => d.split("-").reverse().join("/");
const lista = (items: string[]) =>
  items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "<p>Nenhuma ocorrência.</p>";

export const Route = createFileRoute("/radar-influencia-chatgpt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let body: string;
        try {
          const res = await fetch(new URL("/api/public/radar-influencia-resumo", request.url));
          if (!res.ok) throw new Error(`status ${res.status}`);
          const r = (await res.json()) as Resumo;
          const gerado = new Date(r.gerado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
          body = `<h1>RADAR DE INFLUÊNCIA BLOW</h1>
<p>Gerado em: ${esc(gerado)}</p>
<h2>UNIDADES SEM INFLUENCIADORA ATIVA</h2>
${lista(r.sem_influenciadora.map(esc))}
<h2>PARCERIAS VENCENDO EM ATÉ 30 DIAS</h2>
${lista(r.vencendo_30_dias.map((v) => `${esc(v.unidade)} | ${ig(v.instagram)} | ${esc(dataBR(v.data_termino))} | ${esc(v.dias_restantes)} dias`))}
<h2>INFLUENCIADORAS ATIVAS SEM USO DE CUPOM NOS ÚLTIMOS 30 DIAS</h2>
${lista(r.sem_cupom_30_dias.map((s) => `${esc(s.unidade)} | ${ig(s.instagram)}`))}`;
        } catch (e) {
          console.error("radar-influencia-chatgpt", e instanceof Error ? e.message : e);
          body = "<h1>RADAR DE INFLUÊNCIA BLOW</h1><p>Falha ao carregar dados.</p>";
        }
        const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Radar de Influência bLOw</title><meta name="description" content="Alertas do Radar de Influência bLOw."></head><body style="font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`;
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
      },
    },
  },
});
