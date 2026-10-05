import { createFileRoute } from "@tanstack/react-router";

// Rota pública SOMENTE LEITURA (apenas GET) para o Radar. Retorna só campos
// não sensíveis: sem nomes, contatos, receita, IDs ou tokens.

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

export const Route = createFileRoute("/api/public/radar-influencia-alertas")({
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
              .select("codigo_cupom, ultima_utilizacao, atendimentos_ultimos_30_dias"),
          ]);
          const err = master.error || infl.error || inaug.error || fat.error;
          if (err) throw new Error(err.message);

          const fatByCode = new Map<string, { ultima: string | null; uso30: number }>();
          for (const f of (fat.data ?? []) as { codigo_cupom: string | null; ultima_utilizacao: string | null; atendimentos_ultimos_30_dias: number | null }[]) {
            for (const c of codes(f.codigo_cupom)) {
              const p = fatByCode.get(c);
              const u = f.ultima_utilizacao;
              fatByCode.set(c, {
                ultima: p?.ultima && u ? (p.ultima > u ? p.ultima : u) : p?.ultima ?? u,
                uso30: (p?.uso30 ?? 0) + Number(f.atendimentos_ultimos_30_dias ?? 0),
              });
            }
          }

          const now = Date.now();
          const today = new Date(now).toISOString().slice(0, 10);
          const in30 = new Date(now + 30 * DAY).toISOString().slice(0, 10);

          const unidadesSet = new Set<string>();
          for (const u of (master.data ?? []) as { nome: string | null }[]) if (norm(u.nome)) unidadesSet.add(norm(u.nome));
          for (const r of (inaug.data ?? []) as { estabelecimento: string | null }[]) if (norm(r.estabelecimento)) unidadesSet.add(norm(r.estabelecimento));

          type Item = {
            instagram: string | null;
            status_parceria: string | null;
            data_termino: string | null;
            ultima_utilizacao_cupom: string | null;
            utilizacoes_ultimos_30_dias: number;
            vencendo_proximos_30_dias: boolean;
            sem_utilizacao_ultimos_30_dias: boolean;
            _ativa: boolean;
          };
          const porUnidade = new Map<string, Item[]>();

          for (const i of (infl.data ?? []) as Infl[]) {
            let ultima: string | null = null;
            let uso30 = 0;
            for (const c of codes(i.codigo_cupom)) {
              const f = fatByCode.get(c);
              if (!f) continue;
              uso30 += f.uso30;
              if (f.ultima && (!ultima || f.ultima > ultima)) ultima = f.ultima;
            }
            const ativa = norm(i.status_parceria).toLowerCase() === "ativa";
            const termino = i.data_encerramento_parceria ?? i.data_validade;
            const item: Item = {
              instagram: handle(i.instagram),
              status_parceria: i.status_parceria,
              data_termino: termino,
              ultima_utilizacao_cupom: ultima,
              utilizacoes_ultimos_30_dias: uso30,
              vencendo_proximos_30_dias: ativa && !!termino && termino >= today && termino <= in30,
              sem_utilizacao_ultimos_30_dias: ativa && uso30 === 0,
              _ativa: ativa,
            };
            const unids = [norm(i.unidade), ...(i.unidades_inclusas ?? []).map(norm)].filter(
              (u, idx, arr) => u && arr.indexOf(u) === idx,
            );
            for (const u of unids) {
              unidadesSet.add(u);
              if (!porUnidade.has(u)) porUnidade.set(u, []);
              porUnidade.get(u)!.push(item);
            }
          }

          const unidades = Array.from(unidadesSet)
            .sort((a, b) => a.localeCompare(b, "pt-BR"))
            .map((unidade) => {
              const lista = porUnidade.get(unidade) ?? [];
              return {
                unidade,
                sem_influenciadora_ativa: !lista.some((x) => x._ativa),
                influenciadoras: lista.map(({ _ativa, ...rest }) => rest),
              };
            });

          return Response.json(
            { gerado_em: new Date(now).toISOString(), unidades },
            { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
          );
        } catch (e) {
          console.error("radar-influencia-alertas", e instanceof Error ? e.message : e);
          return Response.json({ error: "Falha ao carregar dados" }, { status: 500 });
        }
      },
    },
  },
});
