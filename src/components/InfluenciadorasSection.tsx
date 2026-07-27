import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { brl, dateBR, num } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const C = {
  greenDark: "#3D5F4A",
  green: "#6B9A73",
  greenLight: "#A8CFA0",
  terracotta: "#C6421E",
  coral: "#D98B7A",
};

type ClubeInflu = {
  id: string;
  nome: string | null;
  unidade: string | null;
  unidades_inclusas: string[] | null;
  status_parceria: string | null;
  status_cupom: string | null;
  data_validade: string | null;
};

type Mensal = {
  mes: string; // ISO first day of month
  cupons_emitidos_acumulado: number | null;
  cupons_utilizados_distintos: number | null;
  atendimentos: number | null;
  receita: number | null;
};

type Faturamento = {
  id: string;
  nome: string | null;
  unidade: string | null;
  unidades_inclusas: string[] | null;
  codigo_cupom: string | null;
  status_parceria: string | null;
  status_cupom: string | null;
  data_validade: string | null;
  receita_total: number | null;
  atendimentos_total: number | null;
  receita_ultimos_30_dias: number | null;
  atendimentos_ultimos_30_dias: number | null;
  ultima_utilizacao: string | null;
};

type StatusCupons = {
  cupons_cadastrados: number | null;
  cupons_convertidos: number | null;
  cupons_nao_convertidos: number | null;
  taxa_conversao_pct: number | null;
  receita_total: number | null;
};

function monthLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${mes}/${d.getFullYear()}`;
}

export default function InfluenciadorasSection() {
  const [influs, setInflus] = useState<ClubeInflu[]>([]);
  const [mensal, setMensal] = useState<Mensal[]>([]);
  const [fatur, setFatur] = useState<Faturamento[]>([]);
  const [statusCupons, setStatusCupons] = useState<StatusCupons | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [activeCard, setActiveCard] = useState<
    "ativas" | "expirados" | "expirando" | null
  >(null);
  const [busca, setBusca] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("");
  const [expand, setExpand] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [
          { data: iData, error: iErr },
          { data: mData, error: mErr },
          { data: fData, error: fErr },
          { data: sData, error: sErr },
        ] = await Promise.all([
          supabase
            .from("clube_influenciadoras")
            .select(
              "id, nome, unidade, unidades_inclusas, status_parceria, status_cupom, data_validade",
            ),
          supabase.from("clube_cupons_mensal").select("*").order("mes"),
          supabase
            .from("clube_faturamento_por_influenciadora")
            .select("*")
            .order("receita_total", { ascending: false }),
          supabase.from("clube_status_cupons").select("*").maybeSingle(),
        ]);
        if (iErr) throw iErr;
        if (mErr) throw mErr;
        if (fErr) throw fErr;
        if (sErr) throw sErr;
        if (alive) {
          setInflus((iData as ClubeInflu[]) || []);
          setMensal((mData as Mensal[]) || []);
          setFatur((fData as Faturamento[]) || []);
          setStatusCupons((sData as StatusCupons) || null);
        }
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);




  // Chart data
  const chartData = useMemo(
    () =>
      mensal.map((m) => ({
        mes: monthLabel(m.mes),
        emitidos: Number(m.cupons_emitidos_acumulado || 0),
        utilizados: Number(m.cupons_utilizados_distintos || 0),
        atendimentos: Number(m.atendimentos || 0),
        receita: Number(m.receita || 0),
      })),
    [mensal],
  );

  // Unit options for filter
  const unidadeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const f of fatur) if (f.unidade) s.add(f.unidade.trim());
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [fatur]);

  // Filter table
  const faturFiltered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return fatur.filter((f) => {
      if (unidadeFilter && (f.unidade || "").trim() !== unidadeFilter)
        return false;
      if (q) {
        const hay = `${f.nome ?? ""} ${f.codigo_cupom ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // card filters
      if (activeCard) {
        const stP = (f.status_parceria || "").trim().toLowerCase();
        const stC = (f.status_cupom || "").trim().toLowerCase();
        if (activeCard === "ativas" && stP !== "ativa") return false;
        if (activeCard === "expirados" && stC !== "encerrada") return false;
        if (activeCard === "expirando") {
          if (stC !== "ativa") return false;
          if (!f.data_validade) return false;
          const dv = new Date(f.data_validade);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const in30 = new Date(today.getTime() + 30 * 86400000);
          if (Number.isNaN(dv.getTime()) || dv < today || dv > in30)
            return false;
        }
      }
      return true;
    });
  }, [fatur, busca, unidadeFilter, activeCard]);

  const visible = expand ? faturFiltered : faturFiltered.slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[color:var(--color-blow-green-dark)]">
          Panorama das influenciadoras
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cupons emitidos, utilização mensal e faturamento gerado por cada
          embaixadora.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar dados: {error}
        </div>
      )}




      {/* Conversion cards (clube_status_cupons) */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <ClickableKPI
          label="Cupons cadastrados"
          value={num(Number(statusCupons?.cupons_cadastrados || 0))}
        />
        <ClickableKPI
          label="Convertidos"
          value={num(Number(statusCupons?.cupons_convertidos || 0))}
        />
        <ClickableKPI
          label="Não convertidos"
          value={num(Number(statusCupons?.cupons_nao_convertidos || 0))}
          tone="terracotta"
        />
        <ClickableKPI
          label="Taxa de conversão"
          value={`${Number(statusCupons?.taxa_conversao_pct || 0)
            .toFixed(1)
            .replace(".", ",")}%`}
        />
        <ClickableKPI
          label="Faturamento total"
          value={brl(Number(statusCupons?.receita_total || 0))}
        />
      </section>

      {/* Monthly chart */}
      <section className="card-blow p-4 md:p-6">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--color-blow-green-dark)]">
              Cupons emitidos × utilizados por mês
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acumulado de emissões, uso no mês, atendimentos e receita.
            </p>
          </div>
        </div>
        <div className="h-[360px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Carregando…
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados no período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "Receita") return [brl(Number(value)), name];
                    return [num(Number(value)), name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="utilizados"
                  name="Cupons utilizados no mês"
                  fill={C.greenLight}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="emitidos"
                  name="Cupons emitidos (acumulado)"
                  stroke={C.greenDark}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="atendimentos"
                  name="Atendimentos"
                  stroke={C.coral}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke={C.terracotta}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Detail table */}
      <section className="card-blow p-4 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--color-blow-green-dark)]">
              Faturamento por influenciadora
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ordenado por receita total. {num(faturFiltered.length)} resultado(s).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código"
              className="h-9 w-[220px]"
            />
            <select
              value={unidadeFilter}
              onChange={(e) => setUnidadeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas as unidades</option>
              {unidadeOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 px-2 font-medium">Influenciadora</th>
                <th className="py-2 px-2 font-medium">Unidade</th>
                <th className="py-2 px-2 font-medium">Código</th>
                <th className="py-2 px-2 font-medium text-right">
                  Receita total
                </th>
                <th className="py-2 px-2 font-medium text-right">
                  Atendimentos
                </th>
                <th className="py-2 px-2 font-medium text-right">
                  Receita 30d
                </th>
                <th className="py-2 px-2 font-medium">Última utilização</th>
                <th className="py-2 px-2 font-medium">Parceria</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Carregando…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Nenhuma influenciadora encontrada.
                  </td>
                </tr>
              ) : (
                visible.map((f) => {
                  const ativo =
                    (f.status_parceria || "").trim().toLowerCase() === "ativa";
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2 px-2 font-medium">
                        {f.nome || "—"}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {f.unidade || "—"}
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {f.codigo_cupom || "—"}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {brl(Number(f.receita_total || 0))}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {num(Number(f.atendimentos_total || 0))}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {brl(Number(f.receita_ultimos_30_dias || 0))}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {f.ultima_utilizacao
                          ? dateBR(f.ultima_utilizacao)
                          : "—"}
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-normal",
                            ativo
                              ? "bg-[color:var(--color-blow-green-light)]/40 text-[color:var(--color-blow-green-dark)] border-[color:var(--color-blow-green)]"
                              : "bg-[color:var(--color-blow-pink-light)] text-[color:var(--color-blow-terracotta)] border-[color:var(--color-blow-terracotta)]/40",
                          )}
                        >
                          {f.status_parceria || "—"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {faturFiltered.length > 10 && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpand((v) => !v)}
            >
              {expand ? "Ver menos" : `Ver mais (${faturFiltered.length - 10})`}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function ClickableKPI({
  label,
  value,
  active,
  onClick,
  tone,
}: {
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
  tone?: "terracotta" | "amber";
}) {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        "card-blow p-5 md:p-6 relative overflow-hidden text-left transition-all",
        clickable && "hover:shadow-md cursor-pointer",
        active && "ring-2 ring-[color:var(--color-blow-green)]",
        !clickable && "cursor-default",
      )}
    >
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 text-3xl md:text-[2rem] font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      {tone === "terracotta" && (
        <div className="absolute right-0 bottom-0 h-1.5 w-24 bg-[color:var(--color-blow-terracotta)]" />
      )}
      {tone === "amber" && (
        <div className="absolute right-0 bottom-0 h-1.5 w-24 bg-amber-500" />
      )}
    </button>
  );
}
