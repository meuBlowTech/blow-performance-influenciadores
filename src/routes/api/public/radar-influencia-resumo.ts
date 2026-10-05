import { createFileRoute } from "@tanstack/react-router";

// Rota pública SOMENTE LEITURA (GET) com resumo enxuto dos alertas do Radar.

const DAY = 86_400_000;
const norm = (s: string | null | undefined) => (s ?? "").trim();
const codes = (s: string | null) =>
  norm(s).split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
const handle = (s: string | null) => {
  const v = norm(s)
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "");
  return v ? `@${v}` : null;
};

type Infl = {
  unidade: string | null;
  unidades_inclusas: string[] | null;
  status_parceria: string | null;
  codigo_cupom: string | null;
  data_validade: string | null;
  data_encerramento_parceria: string | null;
  instagram: string | null;
};

export const Route = createFileRoute("/api/public/radar-influencia-resumo")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabase } = await import("@/lib/supabase");
          const [master, infl, inaug, fat] = await Promise.all([
            supabase.from("unidades").select("nome"),
            supabase
              .from("clube_influenciadoras")
              .select("unidade, unidades_inclusas, status_parceria, codigo_cupom, data_validade, data_encerramento_parceria, instagram"),
            supabase.from("inauguracoes").select("estabelecimento"),
            supabase
              .from("clube_faturamento_por_influenciadora")
              .select("codigo_cupom, atendimentos_ultimos_30_dias"),
          ]);
          const err = master.error || infl.error || inaug.error || fat.error;
          if (err) throw new Error(err.message);

          const uso = new Map<string, number>();
          for (const f of (fat.data ?? []) as { codigo_cupom: string | null; atendimentos_ultimos_30_dias: number | null }[]) {
            for (const c of codes(f.codigo_cupom)) uso.set(c, (uso.get(c) ?? 0) + Number(f.atendimentos_ultimos_30_dias ?? 0));
          }

          const now = Date.now();
          const today = new Date(now).toISOString().slice(0, 10);
          const in30 = new Date(now + 30 * DAY).toISOString().slice(0, 10);
          const todayMs = Date.parse(today);

          const unidades = new Set<string>();
          for (const u of (master.data ?? []) as { nome: string | null }[]) if (norm(u.nome)) unidades.add(norm(u.nome));
          for (const r of (inaug.data ?? []) as { estabelecimento: string | null }[]) if (norm(r.estabelecimento)) unidades.add(norm(r.estabelecimento));

          const comAtiva = new Set<string>();
          const vencendo: { unidade: string; instagram: string | null; data_termino: string; dias_restantes: number }[] = [];
          const semCupom: { unidade: string; instagram: string | null }[] = [];

          for (const i of (infl.data ?? []) as Infl[]) {
            const unids = [norm(i.unidade), ...(i.unidades_inclusas ?? []).map(norm)].filter(
              (u, idx, arr) => u && arr.indexOf(u) === idx,
            );
            unids.forEach((u) => unidades.add(u));
            if (norm(i.status_parceria).toLowerCase() !== "ativa") continue;
            unids.forEach((u) => comAtiva.add(u));
            const ig = handle(i.instagram);
            const termino = (i.data_encerramento_parceria ?? i.data_validade)?.slice(0, 10) ?? null;
            const uso30 = codes(i.codigo_cupom).reduce((s, c) => s + (uso.get(c) ?? 0), 0);
            for (const u of unids) {
              if (termino && termino >= today && termino <= in30) {
                vencendo.push({ unidade: u, instagram: ig, data_termino: termino, dias_restantes: Math.round((Date.parse(termino) - todayMs) / DAY) });
              }
              if (uso30 === 0) semCupom.push({ unidade: u, instagram: ig });
            }
          }

          const sem = Array.from(unidades).filter((u) => !comAtiva.has(u)).sort((a, b) => a.localeCompare(b, "pt-BR"));
          vencendo.sort((a, b) => a.dias_restantes - b.dias_restantes);
          semCupom.sort((a, b) => a.unidade.localeCompare(b.unidade, "pt-BR"));

          return Response.json(
            {
              gerado_em: new Date(now).toISOString(),
              resumo: { sem_influenciadora: sem.length, vencendo_30_dias: vencendo.length, sem_cupom_30_dias: semCupom.length },
              sem_influenciadora: sem,
              vencendo_30_dias: vencendo,
              sem_cupom_30_dias: semCupom,
            },
            { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
          );
        } catch (e) {
          console.error("radar-influencia-resumo", e instanceof Error ? e.message : e);
          return Response.json({ error: "Falha ao carregar dados" }, { status: 500 });
        }
      },
    },
  },
});
