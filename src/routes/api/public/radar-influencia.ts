import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

// Endpoint somente leitura para integração externa (máquina a máquina).
// Autenticação: header "Authorization: Bearer <RADAR_INFLUENCIA_TOKEN>".
// Usa as mesmas fontes de dados do dashboard (sem alterar nada).

const DAY = 86_400_000;

function authorized(request: Request): boolean {
  const expected = process.env["RADAR_INFLUENCIA_TOKEN"];
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : request.headers.get("x-api-key") ?? "";
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Infl = {
  id: string;
  nome: string;
  unidade: string | null;
  unidades_inclusas: string[] | null;
  status_parceria: string | null;
  codigo_cupom: string | null;
  data_inicio: string | null;
  data_validade: string | null;
  data_encerramento_parceria: string | null;
  instagram: string | null;
};
type Fat = {
  codigo_cupom: string | null;
  ultima_utilizacao: string | null;
  atendimentos_ultimos_30_dias: number | null;
};

const norm = (s: string | null | undefined) => (s ?? "").trim();
const codes = (s: string | null) =>
  norm(s).split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
const handle = (s: string | null) => {
  const v = norm(s).replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "").replace(/^@/, "");
  return v ? `@${v}` : null;
};

export const Route = createFileRoute("/api/public/radar-influencia")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) {
          return Response.json({ error: "Não autorizado" }, { status: 401 });
        }
        try {
          const { supabase } = await import("@/lib/supabase");
          const [master, infl, inaug, fat] = await Promise.all([
            supabase.from("unidades").select("nome"),
            supabase.from("clube_influenciadoras").select("*"),
            supabase.from("inauguracoes").select("estabelecimento"),
            supabase
              .from("clube_faturamento_por_influenciadora")
              .select("codigo_cupom, ultima_utilizacao, atendimentos_ultimos_30_dias"),
          ]);
          const err = master.error || infl.error || inaug.error || fat.error;
          if (err) throw new Error(err.message);

          const fatByCode = new Map<string, { ultima: string | null; uso30: number }>();
          for (const f of (fat.data ?? []) as Fat[]) {
            for (const c of codes(f.codigo_cupom)) {
              const prev = fatByCode.get(c);
              const ultima =
                prev?.ultima && f.ultima_utilizacao
                  ? (prev.ultima > f.ultima_utilizacao ? prev.ultima : f.ultima_utilizacao)
                  : prev?.ultima ?? f.ultima_utilizacao;
              fatByCode.set(c, { ultima, uso30: (prev?.uso30 ?? 0) + Number(f.atendimentos_ultimos_30_dias ?? 0) });
            }
          }

          const now = Date.now();
          const today = new Date(now).toISOString().slice(0, 10);
          const in30 = new Date(now + 30 * DAY).toISOString().slice(0, 10);

          const unidadesSet = new Set<string>();
          for (const u of (master.data ?? []) as { nome: string | null }[]) if (norm(u.nome)) unidadesSet.add(norm(u.nome));
          for (const r of (inaug.data ?? []) as { estabelecimento: string | null }[]) if (norm(r.estabelecimento)) unidadesSet.add(norm(r.estabelecimento));

          const porUnidade = new Map<string, unknown[]>();
          const vencendo: unknown[] = [];
          const semUso: unknown[] = [];

          for (const i of (infl.data ?? []) as Infl[]) {
            const cs = codes(i.codigo_cupom);
            let ultima: string | null = null;
            let uso30 = 0;
            for (const c of cs) {
              const f = fatByCode.get(c);
              if (!f) continue;
              uso30 += f.uso30;
              if (f.ultima && (!ultima || f.ultima > ultima)) ultima = f.ultima;
            }
            const ativa = norm(i.status_parceria).toLowerCase() === "ativa";
            const termino = i.data_encerramento_parceria ?? i.data_validade;
            const unids = [norm(i.unidade), ...(i.unidades_inclusas ?? []).map(norm)].filter(
              (u, idx, arr) => u && arr.indexOf(u) === idx,
            );
            const item = {
              id: i.id,
              nome: i.nome,
              instagram: handle(i.instagram),
              status_parceria: i.status_parceria,
              ativa,
              data_inicio: i.data_inicio,
              data_termino: termino,
              cupom: i.codigo_cupom,
              ultima_utilizacao_cupom: ultima,
              utilizacoes_ultimos_30_dias: uso30,
              vencendo_proximos_30_dias: ativa && !!termino && termino >= today && termino <= in30,
              sem_utilizacao_ultimos_30_dias: ativa && uso30 === 0,
              unidades: unids,
            };
            for (const u of unids) {
              unidadesSet.add(u);
              if (!porUnidade.has(u)) porUnidade.set(u, []);
              porUnidade.get(u)!.push(item);
            }
            if (item.vencendo_proximos_30_dias) vencendo.push(item);
            if (item.sem_utilizacao_ultimos_30_dias) semUso.push(item);
          }

          const unidades = Array.from(unidadesSet)
            .sort((a, b) => a.localeCompare(b, "pt-BR"))
            .map((nome) => {
              const lista = (porUnidade.get(nome) ?? []) as { ativa: boolean }[];
              const ativas = lista.filter((x) => x.ativa).length;
              return {
                unidade: nome,
                total_influenciadoras: lista.length,
                influenciadoras_ativas: ativas,
                sem_influenciadora_ativa: ativas === 0,
                influenciadoras: lista,
              };
            });

          return Response.json(
            {
              gerado_em: new Date(now).toISOString(),
              resumo: {
                total_unidades: unidades.length,
                unidades_sem_influenciadora_ativa: unidades.filter((u) => u.sem_influenciadora_ativa).length,
                ativas_vencendo_proximos_30_dias: vencendo.length,
                ativas_sem_utilizacao_ultimos_30_dias: semUso.length,
              },
              alertas: {
                unidades_sem_influenciadora_ativa: unidades.filter((u) => u.sem_influenciadora_ativa).map((u) => u.unidade),
                ativas_vencendo_proximos_30_dias: vencendo,
                ativas_sem_utilizacao_ultimos_30_dias: semUso,
              },
              unidades,
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (e) {
          console.error("radar-influencia", e instanceof Error ? e.message : e);
          return Response.json({ error: "Falha ao carregar dados" }, { status: 500 });
        }
      },
    },
  },
});
