import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type ConsumoCupom } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, num, dateBR, isoDay, isoWeek, parseLocalDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConsumoCupons } from "@/hooks/useConsumoCupons";
import { useInauguracoes, type Inauguracao } from "@/hooks/useInauguracoes";
import { comandaKey } from "@/lib/inauguracoes";

type WindowDays = 30 | 60 | 90;
type DetailWindow = WindowDays | "compare";

type WindowedMetrics = {
  receita: number;
  atendimentos: number;
  cuponsUtilizados: number;
  influenciadorasAtivas: number;
  janelaCompleta: boolean;
};

const C = {
  greenDark: "var(--color-blow-orange-dark)",
  green: "var(--color-blow-orange)",
  terracotta: "var(--color-blow-terracotta)",
};

// Recalcula receita/atendimentos/cupons/influenciadoras pra uma unidade numa
// janela de N dias desde a inauguração, direto de consumo_cupons — ignora as
// colunas _30d da view (só usa dela estabelecimento/data_inauguracao/uf como
// identidade). Compartilhado entre a visão geral (todas as unidades, janela
// única) e o detalhe de uma unidade (janela própria, incluindo comparação).
function computeWindowMetrics(
  row: Inauguracao,
  days: number,
  consumoRows: ConsumoCupom[],
  influencerMap: Map<string, string>,
): WindowedMetrics {
  const start = parseLocalDate(row.data_inauguracao);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const today = new Date();

  const rowsForUnit = consumoRows.filter((c) => {
    if (c.estabelecimento !== row.estabelecimento) return false;
    if (!c.data_hora_atendimento) return false;
    const t = new Date(c.data_hora_atendimento);
    return t >= start && t < end;
  });

  const receita = rowsForUnit.reduce((s, c) => s + (Number(c.valor_liquido) || 0), 0);
  const comandas = new Set(rowsForUnit.filter((c) => c.comanda).map(comandaKey));
  const codigosValidos = new Set(
    rowsForUnit
      .map((c) => (c.codigo_cupom || "").trim().toUpperCase())
      .filter((code) => code && influencerMap.has(code)),
  );
  const influenciadoras = new Set(
    Array.from(codigosValidos).map((code) => influencerMap.get(code) || code),
  );

  return {
    receita,
    atendimentos: comandas.size,
    cuponsUtilizados: codigosValidos.size,
    influenciadorasAtivas: influenciadoras.size,
    janelaCompleta: today >= end,
  };
}

export default function InauguracaoView() {
  const { rows, loading } = useInauguracoes();
  const { rows: consumoRows, influencerMap } = useConsumoCupons();
  const [windowDays, setWindowDays] = useState<WindowDays>(30);

  const windowedByUnit = useMemo(() => {
    const map = new Map<string, WindowedMetrics>();
    for (const r of rows) {
      map.set(r.estabelecimento, computeWindowMetrics(r, windowDays, consumoRows, influencerMap));
    }
    return map;
  }, [rows, consumoRows, influencerMap, windowDays]);

  const chartData = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            new Date(a.data_inauguracao).getTime() -
            new Date(b.data_inauguracao).getTime(),
        )
        .map((r) => {
          const m = windowedByUnit.get(r.estabelecimento);
          return {
            nome: r.estabelecimento,
            data: dateBR(r.data_inauguracao),
            receita: m?.receita ?? 0,
            janela_completa: m?.janelaCompleta ?? r.janela_completa,
          };
        }),
    [rows, windowedByUnit],
  );

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <ComparativoSection
        loading={loading}
        rows={rows}
        chartData={chartData}
        windowDays={windowDays}
        onWindowDaysChange={setWindowDays}
        windowedByUnit={windowedByUnit}
        consumoRows={consumoRows}
        influencerMap={influencerMap}
      />
    </main>
  );
}

function WindowToggle<T extends WindowDays | "compare">({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <div className="inline-flex rounded-md border border-input p-0.5 bg-background">
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-[5px] transition-colors whitespace-nowrap",
            value === opt
              ? "bg-[color:var(--color-blow-orange-dark)] text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt === "compare" ? "Comparar período" : `${opt} dias`}
        </button>
      ))}
    </div>
  );
}

const WINDOW_OPTIONS = [30, 60, 90] as const;
const DETAIL_WINDOW_OPTIONS = [30, 60, 90, "compare"] as const;

function ComparativoSection({
  loading,
  rows,
  chartData,
  windowDays,
  onWindowDaysChange,
  windowedByUnit,
  consumoRows,
  influencerMap,
}: {
  loading: boolean;
  rows: Inauguracao[];
  chartData: { nome: string; data: string; receita: number; janela_completa: boolean }[];
  windowDays: WindowDays;
  onWindowDaysChange: (v: WindowDays) => void;
  windowedByUnit: Map<string, WindowedMetrics>;
  consumoRows: ConsumoCupom[];
  influencerMap: Map<string, string>;
}) {
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const toggleExpand = (estabelecimento: string) =>
    setExpandedUnit((prev) => (prev === estabelecimento ? null : estabelecimento));

  const expandedRow = rows.find((r) => r.estabelecimento === expandedUnit) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Performance de inaugurações
          </h2>
          <p className="text-sm text-muted-foreground">
            Performance dos primeiros {windowDays} dias de cada unidade.
          </p>
        </div>
        <WindowToggle value={windowDays} onChange={onWindowDaysChange} options={WINDOW_OPTIONS} />
      </div>

      {loading ? (
        <div className="card-blow p-6 text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : rows.length === 0 ? (
        <div className="card-blow p-6 text-sm text-muted-foreground">
          Nenhuma inauguração cadastrada ainda.
        </div>
      ) : (
        <>
          <div className="card-blow p-6">
            <h3 className="font-semibold mb-1">Receita nos {windowDays} dias por unidade</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ordenado da inauguração mais antiga para a mais recente.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="nome"
                    angle={-25}
                    textAnchor="end"
                    height={70}
                    interval={0}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(v) => brl(Number(v)).replace("R$", "").trim()}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--color-foreground)",
                    }}
                    labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                    formatter={(v: number) => brl(Number(v))}
                    labelFormatter={(l, payload) => {
                      const p = payload?.[0]?.payload as
                        | { data: string; janela_completa: boolean }
                        | undefined;
                      return `${l}${p ? ` — ${p.data}${p.janela_completa ? "" : " (em andamento)"}` : ""}`;
                    }}
                  />
                  <Bar dataKey="receita" fill={C.green} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Selecione uma unidade para ver o detalhe
            </p>
            <div className="flex flex-wrap gap-2">
              {rows.map((r) => {
                const m = windowedByUnit.get(r.estabelecimento);
                const selected = expandedUnit === r.estabelecimento;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleExpand(r.estabelecimento)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-[color:var(--color-blow-orange)] bg-[color:var(--color-blow-orange-light)]/30 text-[color:var(--color-blow-orange-dark)] font-medium"
                        : "border-border bg-card hover:border-[color:var(--color-blow-orange-light)] text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        m?.janelaCompleta
                          ? "bg-[color:var(--color-blow-orange)]"
                          : "bg-[color:var(--color-blow-terracotta)]",
                      )}
                    />
                    {r.estabelecimento}
                    {selected ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {expandedRow && (
            <UnidadeDetalhe
              row={expandedRow}
              defaultWindow={windowDays}
              consumoRows={consumoRows}
              influencerMap={influencerMap}
              onClose={() => setExpandedUnit(null)}
            />
          )}
        </>
      )}
    </section>
  );
}

function UnidadeDetalhe({
  row,
  defaultWindow,
  consumoRows,
  influencerMap,
  onClose,
}: {
  row: Inauguracao;
  defaultWindow: WindowDays;
  consumoRows: ConsumoCupom[];
  influencerMap: Map<string, string>;
  onClose: () => void;
}) {
  const [detailWindow, setDetailWindow] = useState<DetailWindow>(defaultWindow);
  const comparando = detailWindow === "compare";
  const effectiveDays = comparando ? 90 : detailWindow;

  const metrics = useMemo(
    () => computeWindowMetrics(row, effectiveDays, consumoRows, influencerMap),
    [row, effectiveDays, consumoRows, influencerMap],
  );

  const rowsInWindow = useMemo(() => {
    const start = parseLocalDate(row.data_inauguracao);
    const end = new Date(start);
    end.setDate(end.getDate() + effectiveDays);
    return consumoRows.filter((c) => {
      if (c.estabelecimento !== row.estabelecimento) return false;
      if (!c.data_hora_atendimento) return false;
      const t = new Date(c.data_hora_atendimento);
      return t >= start && t < end;
    });
  }, [row, consumoRows, effectiveDays]);

  const porSemana = effectiveDays === 90 && !comparando;

  // Comparativo mensal — Mês 1/2/3 desde a inauguração, pra ver evolução
  // ou queda de performance ao longo dos primeiros 90 dias.
  const monthlyComparison = useMemo(() => {
    const start = parseLocalDate(row.data_inauguracao);
    const buckets = [0, 1, 2].map((i) => {
      const bucketStart = new Date(start);
      bucketStart.setDate(bucketStart.getDate() + i * 30);
      const bucketEnd = new Date(start);
      bucketEnd.setDate(bucketEnd.getDate() + (i + 1) * 30);
      return { label: `Mês ${i + 1}`, start: bucketStart, end: bucketEnd, receita: 0, comandas: new Set<string>() };
    });
    for (const c of rowsInWindow) {
      if (!c.data_hora_atendimento) continue;
      const t = new Date(c.data_hora_atendimento);
      const bucket = buckets.find((b) => t >= b.start && t < b.end);
      if (!bucket) continue;
      bucket.receita += Number(c.valor_liquido) || 0;
      if (c.comanda) bucket.comandas.add(comandaKey(c));
    }
    return buckets.map((b) => ({
      label: b.label,
      receita: Number(b.receita.toFixed(2)),
      atendimentos: b.comandas.size,
    }));
  }, [row, rowsInWindow]);

  const timeline = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of rowsInWindow) {
      if (!c.data_hora_atendimento) continue;
      const key = porSemana ? isoWeek(c.data_hora_atendimento) : isoDay(c.data_hora_atendimento);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + (Number(c.valor_liquido) || 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({
        key: k,
        label: porSemana ? k.replace("-S", " · Sem ") : dateBR(`${k}T00:00:00`),
        receita: Number(v.toFixed(2)),
      }));
  }, [rowsInWindow, porSemana]);

  const atribuicao = useMemo(() => {
    type Agg = { codigo: string; nome: string; receita: number; comandas: Set<string> };
    const map = new Map<string, Agg>();
    for (const c of rowsInWindow) {
      const code = (c.codigo_cupom || "").trim().toUpperCase();
      if (!code || !influencerMap.has(code)) continue;
      if (!map.has(code)) {
        map.set(code, { codigo: code, nome: influencerMap.get(code) || code, receita: 0, comandas: new Set() });
      }
      const a = map.get(code)!;
      a.receita += Number(c.valor_liquido) || 0;
      if (c.comanda) a.comandas.add(comandaKey(c));
    }
    return Array.from(map.values())
      .map((a) => ({
        codigo: a.codigo,
        nome: a.nome,
        receita: a.receita,
        atendimentos: a.comandas.size,
      }))
      .sort((a, b) => b.receita - a.receita);
  }, [rowsInWindow, influencerMap]);

  return (
    <div className="card-blow p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-[color:var(--color-blow-orange-dark)]">
              {row.estabelecimento}
            </h3>
            {metrics.janelaCompleta ? (
              <Badge
                variant="secondary"
                className="bg-[color:var(--color-blow-orange-light)]/40 text-[color:var(--color-blow-orange-dark)] border-0"
              >
                Janela {effectiveDays}d
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-[color:var(--color-blow-pink-light)] text-[color:var(--color-blow-terracotta)] border-0"
              >
                Em andamento
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {row.uf ? `${row.uf} · ` : ""}
            Inaugurada em {dateBR(row.data_inauguracao)}
            {row.dias_desde_inauguracao !== null &&
              ` · há ${row.dias_desde_inauguracao} dia${row.dias_desde_inauguracao === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Janela de análise
        </span>
        <WindowToggle
          value={detailWindow}
          onChange={setDetailWindow}
          options={DETAIL_WINDOW_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label={`Receita ${effectiveDays}d`} value={brl(metrics.receita)} />
        <Metric label="Atendimentos" value={num(metrics.atendimentos)} />
        <Metric label="Cupons utilizados" value={num(metrics.cuponsUtilizados)} />
        <Metric label="Influenciadoras ativas" value={num(metrics.influenciadorasAtivas)} />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">
          {comparando ? "Comparativo mensal (Mês 1 × Mês 2 × Mês 3)" : "Linha do tempo da performance"}
        </h4>
        {comparando ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v) => brl(Number(v)).replace("R$", "").trim()}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "var(--color-foreground)",
                  }}
                  labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                  formatter={(v: number) => [brl(Number(v)), "Receita"]}
                  labelFormatter={(label, payload) => {
                    const atend = payload?.[0]?.payload?.atendimentos;
                    return `${label}${atend !== undefined ? ` — ${atend} atendimento${atend === 1 ? "" : "s"}` : ""}`;
                  }}
                />
                <Bar dataKey="receita" name="receita" fill={C.green} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem atendimentos no período.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeline} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v) => brl(Number(v)).replace("R$", "").trim()}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "var(--color-foreground)",
                  }}
                  labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                  formatter={(v: number) => brl(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="none"
                  fill="url(#timelineGradient)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke={C.green}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: C.terracotta, stroke: C.terracotta }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">
          Quem gerou a receita (cupom / influenciadora)
        </h4>
        {atribuicao.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cupom de influenciadora cadastrada foi usado nessa janela.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 px-2 font-medium">Influenciadora</th>
                  <th className="py-2 px-2 font-medium">Cupom</th>
                  <th className="py-2 px-2 font-medium text-right">Receita</th>
                  <th className="py-2 px-2 font-medium text-right">Atendimentos</th>
                </tr>
              </thead>
              <tbody>
                {atribuicao.map((a) => (
                  <tr key={a.codigo} className="border-b border-border/60 last:border-0">
                    <td className="py-2 px-2 font-medium">{a.nome || "—"}</td>
                    <td className="py-2 px-2 font-mono text-xs">{a.codigo}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{brl(a.receita)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{num(a.atendimentos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold text-[color:var(--color-blow-orange-dark)]">
        {value}
      </div>
    </div>
  );
}
