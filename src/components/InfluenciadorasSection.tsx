import { useEffect, useMemo, useState } from "react";
import {
  Area,
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
import { CheckCircle2, DollarSign, Percent, Ticket, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl, dateBR, defaultPeriodRange, num, parseLocalDate } from "@/lib/format";
import { parseCodes } from "@/lib/coupons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUnidadesUnificadas } from "@/hooks/useUnidadesUnificadas";
import { useConsumoCupons } from "@/hooks/useConsumoCupons";
import { DateRangePicker } from "@/components/DateRangePicker";
import { KpiCard } from "@/components/KpiCard";

const C = {
  greenDark: "var(--color-blow-orange-dark)",
  green: "var(--color-blow-orange)",
  greenLight: "var(--color-blow-orange-light)",
  coral: "var(--color-blow-coral)",
  // Linha de receita usa verde propositalmente — dá contraste real num
  // gráfico com 4 séries, e "dinheiro em verde" é uma leitura imediata.
  receita: "var(--color-blow-green)",
};

type ClubeInflu = {
  id: string;
  nome: string | null;
  unidade: string | null;
  unidades_inclusas: string[] | null;
  codigo_cupom: string | null;
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

function monthLabel(iso: string) {
  const d = parseLocalDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${mes}/${d.getFullYear()}`;
}

export default function InfluenciadorasSection() {
  const [influs, setInflus] = useState<ClubeInflu[]>([]);
  const [mensal, setMensal] = useState<Mensal[]>([]);
  const [fatur, setFatur] = useState<Faturamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { rows: consumoRows } = useConsumoCupons();

  // filters
  const [activeCard, setActiveCard] = useState<
    "ativas" | "expirados" | "expirando" | null
  >(null);
  const [busca, setBusca] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("");
  const [expand, setExpand] = useState(false);
  // Mesma janela padrão do campo de período da aba Geral — todo campo de
  // período do app precisa abrir sincronizado com ela.
  const [periodStart, setPeriodStart] = useState<Date | undefined>(
    () => defaultPeriodRange().start,
  );
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(
    () => defaultPeriodRange().end,
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [
          { data: iData, error: iErr },
          { data: mData, error: mErr },
          { data: fData, error: fErr },
        ] = await Promise.all([
          supabase
            .from("clube_influenciadoras")
            .select(
              "id, nome, unidade, unidades_inclusas, codigo_cupom, status_parceria, status_cupom, data_validade",
            ),
          supabase.from("clube_cupons_mensal").select("*").order("mes"),
          supabase
            .from("clube_faturamento_por_influenciadora")
            .select("*")
            .order("receita_total", { ascending: false }),
        ]);
        if (iErr) throw iErr;
        if (mErr) throw mErr;
        if (fErr) throw fErr;
        if (alive) {
          setInflus((iData as ClubeInflu[]) || []);
          setMensal((mData as Mensal[]) || []);
          setFatur((fData as Faturamento[]) || []);
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

  // Status de cupons no período selecionado — calculado direto de
  // consumo_cupons (em vez da view clube_status_cupons, que é lifetime e
  // não respeita o filtro de período), pra ficar consistente com o resto
  // da página. "Cadastrados" é o total do clube (não é um recorte de
  // tempo); os demais refletem só o período selecionado.
  const statusCupons = useMemo(() => {
    const codigos = new Set<string>();
    for (const i of influs) for (const c of parseCodes(i.codigo_cupom)) codigos.add(c);

    const startTs = periodStart ? new Date(periodStart).setHours(0, 0, 0, 0) : null;
    const endTs = periodEnd ? new Date(periodEnd).setHours(23, 59, 59, 999) : null;

    const convertidos = new Set<string>();
    let receita = 0;
    for (const r of consumoRows) {
      if (!r.data_hora_atendimento) continue;
      const t = new Date(r.data_hora_atendimento).getTime();
      if (startTs !== null && t < startTs) continue;
      if (endTs !== null && t > endTs) continue;
      const code = (r.codigo_cupom || "").trim().toUpperCase();
      if (!code || !codigos.has(code)) continue;
      convertidos.add(code);
      receita += Number(r.valor_liquido) || 0;
    }

    const cadastrados = codigos.size;
    return {
      cupons_cadastrados: cadastrados,
      cupons_convertidos: convertidos.size,
      cupons_nao_convertidos: cadastrados - convertidos.size,
      taxa_conversao_pct: cadastrados ? (convertidos.size / cadastrados) * 100 : 0,
      receita_total: receita,
    };
  }, [influs, consumoRows, periodStart, periodEnd]);




  // Chart data
  const chartData = useMemo(
    () =>
      mensal
        .filter((m) => {
          const d = parseLocalDate(m.mes);
          if (Number.isNaN(d.getTime())) return true;
          if (periodStart) {
            const start = new Date(periodStart);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            if (d < start) return false;
          }
          if (periodEnd) {
            const end = new Date(periodEnd);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
          return true;
        })
        .map((m) => ({
          mes: monthLabel(m.mes),
          emitidos: Number(m.cupons_emitidos_acumulado || 0),
          utilizados: Number(m.cupons_utilizados_distintos || 0),
          atendimentos: Number(m.atendimentos || 0),
          receita: Number(m.receita || 0),
        })),
    [mensal, periodStart, periodEnd],
  );

  // Unit options for filter
  const { unidades: unidadesUnificadas } = useUnidadesUnificadas();
  const unidadeOptions = useMemo(() => {
    const s = new Set<string>(unidadesUnificadas);
    for (const f of fatur) if (f.unidade) s.add(f.unidade.trim());
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [fatur, unidadesUnificadas]);

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
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* Período — guia a visualização da página como um todo */}
      <DateRangePicker
        label="Período"
        start={periodStart}
        end={periodEnd}
        onChange={(s, e) => {
          setPeriodStart(s);
          setPeriodEnd(e);
        }}
      />

      {/* Conversion cards — calculadas no período selecionado acima
          (exceto "Cupons cadastrados", que é o total do clube) */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Ticket}
          label="Cupons cadastrados"
          value={num(Number(statusCupons.cupons_cadastrados))}
          description="Total no clube"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Convertidos"
          value={num(Number(statusCupons.cupons_convertidos))}
          description="No período selecionado"
          tone="green"
        />
        <KpiCard
          icon={XCircle}
          label="Não convertidos"
          value={num(Number(statusCupons.cupons_nao_convertidos))}
          description="Sem uso no período"
          tone="terracotta"
        />
        <KpiCard
          icon={Percent}
          label="Taxa de conversão"
          value={`${Number(statusCupons.taxa_conversao_pct)
            .toFixed(1)
            .replace(".", ",")}%`}
          description="Convertidos ÷ cadastrados"
        />
        <KpiCard
          icon={DollarSign}
          label="Faturamento no período"
          value={brl(Number(statusCupons.receita_total))}
          description="Cupons convertidos no período"
          tone="green"
        />
      </section>

      {/* Monthly chart */}
      <section className="card-blow p-4 md:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[color:var(--color-blow-orange-dark)]">
            Cupons emitidos × utilizados por mês
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acumulado de emissões, uso no mês, atendimentos e receita.
          </p>
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
                <defs>
                  <linearGradient id="emitidosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.greenDark} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={C.greenDark} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  payloadUniqBy={true}
                  cursor={{ fill: "var(--color-accent)", fillOpacity: 0.4 }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "var(--color-foreground)",
                  }}
                  labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                  formatter={(value: number, name: string) => {
                    if (name === "Receita") return [brl(Number(value)), name];
                    return [num(Number(value)), name];
                  }}
                />
                <Legend wrapperStyle={{ color: "var(--color-muted-foreground)" }} />
                <Bar
                  yAxisId="left"
                  dataKey="utilizados"
                  name="Cupons utilizados no mês"
                  fill={C.greenLight}
                  radius={[4, 4, 0, 0]}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="emitidos"
                  stroke="none"
                  fill="url(#emitidosGradient)"
                  legendType="none"
                  isAnimationActive={false}
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
                  stroke={C.receita}
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
            <h3 className="text-lg font-semibold text-[color:var(--color-blow-orange-dark)]">
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

