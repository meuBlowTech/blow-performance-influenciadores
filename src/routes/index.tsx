import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Building2,
  DollarSign,
  Download,
  LayoutDashboard,
  Lock,
  PartyPopper,
  Receipt,
  Search,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
  Users2,
  X,
  Zap,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase, type ConsumoCupom, type CupomEmitido, type Unidade } from "@/lib/supabase";
import {
  brl,
  dateBR,
  downloadCSV,
  isoDay,
  isoWeek,
  num,
  toCSV,
} from "@/lib/format";
import { parseCodes } from "@/lib/coupons";
import { comandaKey, extractUF } from "@/lib/inauguracoes";
import { Button } from "@/components/ui/button";
import ClubeView from "@/components/ClubeView";
import AdminView from "@/components/AdminView";
import InauguracaoView from "@/components/InauguracaoView";
import InfluenciadorasSection from "@/components/InfluenciadorasSection";
import { DateRangePicker } from "@/components/DateRangePicker";
import { MultiFilter } from "@/components/MultiFilter";


export const Route = createFileRoute("/")({
  component: Dashboard,
});

// bLOw palette (referencia os tokens de --color-blow-* em styles.css — Recharts
// aceita var() como valor de stroke/fill normalmente, então os gráficos já
// acompanham o tema automaticamente)
const C = {
  greenDark: "var(--color-blow-orange-dark)",
  green: "var(--color-blow-orange)",
  greenLight: "var(--color-blow-orange-light)",
  terracotta: "var(--color-blow-terracotta)",
  coral: "var(--color-blow-coral)",
  pinkLight: "var(--color-blow-pink-light)",
  pinkMute: "var(--color-blow-pink-mute)",
  neutral: "var(--color-border)",
  neutralDark: "var(--color-blow-neutral-dark)",
};
const STATUS_GREEN = "var(--color-blow-green)";

const BAR_PALETTE = [
  C.green,
  C.greenDark,
  C.coral,
  C.greenLight,
  C.pinkMute,
  C.green,
  C.greenDark,
  C.coral,
  C.greenLight,
  C.pinkMute,
  C.green,
  C.greenDark,
  C.coral,
  C.greenLight,
  C.pinkMute,
];

type Row = ConsumoCupom;

const NAV_SECTIONS = [
  {
    id: "performance",
    label: "Geral",
    subtitle: "Visão consolidada de receita, cupons e desempenho da rede bLOw.",
    icon: LayoutDashboard,
  },
  {
    id: "influenciadores",
    label: "Performance",
    subtitle: "Cupons emitidos, utilização mensal e faturamento gerado por cada influenciadora.",
    icon: TrendingUp,
  },
  {
    id: "inauguracao",
    label: "Inaugurações",
    subtitle: "Performance das unidades recém-inauguradas.",
    icon: PartyPopper,
  },
  {
    id: "clube",
    label: "Influenciadores",
    subtitle: "Cadastro de influenciadoras e acompanhamento de cupons sem dono.",
    icon: Users2,
  },
] as const;

const ADMIN_SECTION = {
  id: "admin",
  label: "Administração",
  subtitle: "Aprovações, edição de influenciadoras, unidades e inaugurações — acesso restrito ao time de marketing franqueadora.",
  icon: Lock,
} as const;

function Dashboard() {
  const [activeTab, setActiveTab] = useState<
    "performance" | "influenciadores" | "clube" | "inauguracao" | "admin"
  >("performance");
  const active =
    NAV_SECTIONS.find((s) => s.id === activeTab) ?? ADMIN_SECTION;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-blow-orange)] text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold leading-none tracking-tight">
                b<span className="italic">L</span>Ow
              </div>
              <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                Performance de Influência
              </div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_SECTIONS.map((s) => (
                  <SidebarMenuItem key={s.id}>
                    <SidebarMenuButton
                      size="lg"
                      isActive={activeTab === s.id}
                      onClick={() => setActiveTab(s.id)}
                    >
                      <s.icon />
                      <span>{s.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="lg"
                    isActive={activeTab === ADMIN_SECTION.id}
                    onClick={() => setActiveTab(ADMIN_SECTION.id)}
                  >
                    <Lock />
                    <span>{ADMIN_SECTION.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          <SidebarTrigger />
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar unidades, cupons, influenciadoras…"
              className="h-9 w-full rounded-md border border-input bg-muted pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="button"
            aria-label="Notificações"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bell className="h-4.5 w-4.5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-blow-orange)]/20 text-sm font-semibold text-[color:var(--color-blow-orange)]">
            BL
          </div>
        </header>
        <div className="px-4 pt-6 md:px-6">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {active.label}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{active.subtitle}</p>
        </div>
        {activeTab === "performance" ? (
          <PerformanceView />
        ) : activeTab === "influenciadores" ? (
          <CuradoriaView />
        ) : activeTab === "clube" ? (
          <ClubeView />
        ) : activeTab === "inauguracao" ? (
          <InauguracaoView />
        ) : (
          <AdminView />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

function PerformanceView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [influencerMap, setInfluencerMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // filters — abre sempre com o compilado do mês atual até ontem
  const [dateStart, setDateStart] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateEnd, setDateEnd] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [unidades, setUnidades] = useState<string[]>([]);
  const [cupons, setCupons] = useState<string[]>([]);
  const [chartMode, setChartMode] = useState<"dia" | "semana">("dia");
  const [chartModeInf, setChartModeInf] = useState<"dia" | "semana">("dia");
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[] | null>(null);
  const [expandInfluencers, setExpandInfluencers] = useState(false);
  const [expandUnidades, setExpandUnidades] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // Load registered influencers first — restrict entire Performance tab
      // to coupons cadastrados em clube_influenciadoras.
      const { data: influData, error: influErr } = await supabase
        .from("clube_influenciadoras")
        .select("nome, codigo_cupom");
      if (influErr) {
        if (alive) setError(influErr.message);
      }
      const map = new Map<string, string>();
      for (const i of (influData || []) as { nome: string | null; codigo_cupom: string | null }[]) {
        for (const c of parseCodes(i.codigo_cupom)) {
          if (!map.has(c)) map.set(c, (i.nome || "").trim());
        }
      }
      if (alive) setInfluencerMap(map);

      // paginate to bypass 1000-row default
      const all: Row[] = [];
      const pageSize = 1000;
      let from = 0;
      let done = false;
      while (!done) {
        const { data, error } = await supabase
          .from("consumo_cupons")
          .select("*")
          .range(from, from + pageSize - 1);
        if (error) {
          if (alive) setError(error.message);
          break;
        }
        if (!data || data.length === 0) break;
        all.push(...(data as Row[]));
        if (data.length < pageSize) done = true;
        else from += pageSize;
        if (all.length > 200_000) done = true; // safety cap
      }
      if (alive) {
        setRows(all);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const allUnidades = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.estabelecimento).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows],
  );

  const allCupons = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => r.codigo_cupom)
            .filter(
              (c): c is string =>
                !!c && influencerMap.has(c.trim().toUpperCase()),
            ),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows, influencerMap],
  );


  const filtered = useMemo(() => {
    const startTs = dateStart ? new Date(dateStart).setHours(0, 0, 0, 0) : null;
    const endTs = dateEnd ? new Date(dateEnd).setHours(23, 59, 59, 999) : null;
    const uSet = unidades.length ? new Set(unidades) : null;
    const cSet = cupons.length ? new Set(cupons) : null;

    return rows.filter((r) => {
      // Restrict to coupons registered in clube_influenciadoras
      const code = (r.codigo_cupom || "").trim().toUpperCase();
      if (!code || !influencerMap.has(code)) return false;
      if (uSet && !uSet.has(r.estabelecimento || "")) return false;
      if (cSet && !cSet.has(r.codigo_cupom || "")) return false;
      if (startTs !== null || endTs !== null) {
        if (!r.data_hora_atendimento) return false;
        const t = new Date(r.data_hora_atendimento).getTime();
        if (Number.isNaN(t)) return false;
        if (startTs !== null && t < startTs) return false;
        if (endTs !== null && t > endTs) return false;
      }
      return true;
    });
  }, [rows, dateStart, dateEnd, unidades, cupons, influencerMap]);


  // KPIs
  const kpis = useMemo(() => {
    const receita = filtered.reduce(
      (s, r) => s + (Number(r.valor_liquido) || 0),
      0,
    );
    const comandas = new Set(
      filtered.filter((r) => r.comanda).map(comandaKey),
    );
    const nAtend = comandas.size;
    const ticket = nAtend > 0 ? receita / nAtend : 0;
    const cuponsAtivos = new Set(
      filtered.map((r) => r.codigo_cupom).filter(Boolean),
    ).size;
    return { receita, ticket, nAtend, cuponsAtivos };
  }, [filtered]);

  // Time series
  const timeSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      if (!r.data_hora_atendimento) continue;
      const key =
        chartMode === "dia"
          ? isoDay(r.data_hora_atendimento)
          : isoWeek(r.data_hora_atendimento);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + (Number(r.valor_liquido) || 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({
        key: k,
        label:
          chartMode === "dia"
            ? dateBR(k + "T00:00:00")
            : k.replace("-S", " · Sem "),
        receita: Number(v.toFixed(2)),
      }));
  }, [filtered, chartMode]);

  // Ranking cupons
  const cuponsRanking = useMemo(() => {
    type Agg = {
      codigo: string;
      nome: string;
      receita: number;
      comandas: Set<string>;
    };
    const map = new Map<string, Agg>();
    for (const r of filtered) {
      const code = r.codigo_cupom;
      if (!code) continue;
      const registeredName =
        influencerMap.get(code.trim().toUpperCase()) || "";
      if (!map.has(code))
        map.set(code, {
          codigo: code,
          nome: registeredName || r.nome_cupom || "",
          receita: 0,
          comandas: new Set(),
        });
      const a = map.get(code)!;
      a.receita += Number(r.valor_liquido) || 0;
      if (r.comanda)
        a.comandas.add(
          `${r.estabelecimento ?? ""}||${r.comanda}||${
            r.data_hora_atendimento ? isoDay(r.data_hora_atendimento) : ""
          }`,
        );
      if (!a.nome && registeredName) a.nome = registeredName;
    }
    return Array.from(map.values())
      .map((a) => ({
        codigo: a.codigo,
        nome: a.nome,
        receita: a.receita,
        atendimentos: a.comandas.size,
        ticket: a.comandas.size ? a.receita / a.comandas.size : 0,
      }))
      .sort((a, b) => b.receita - a.receita);

  }, [filtered, influencerMap]);


  const top15 = cuponsRanking.slice(0, 15);

  // Influenciadoras — mesma agregação de cupons, mas exibida como visão de influência
  const influencerRanking = cuponsRanking;
  const topInfluencerCodes = useMemo(
    () => influencerRanking.slice(0, 5).map((r) => r.codigo),
    [influencerRanking],
  );
  const activeInfluencers = selectedInfluencers ?? topInfluencerCodes;

  const influencerLabels = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of influencerRanking) {
      m.set(r.codigo, r.nome ? `${r.codigo} · ${r.nome}` : r.codigo);
    }
    return m;
  }, [influencerRanking]);

  const influencerTimeSeries = useMemo(() => {
    if (activeInfluencers.length === 0) return [] as Array<Record<string, number | string>>;
    const active = new Set(activeInfluencers);
    // period -> code -> receita
    const map = new Map<string, Map<string, number>>();
    for (const r of filtered) {
      const code = r.codigo_cupom;
      if (!code || !active.has(code)) continue;
      if (!r.data_hora_atendimento) continue;
      const key =
        chartModeInf === "dia"
          ? isoDay(r.data_hora_atendimento)
          : isoWeek(r.data_hora_atendimento);
      if (!key) continue;
      if (!map.has(key)) map.set(key, new Map());
      const inner = map.get(key)!;
      inner.set(code, (inner.get(code) || 0) + (Number(r.valor_liquido) || 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, inner]) => {
        const row: Record<string, number | string> = {
          key: k,
          label:
            chartModeInf === "dia"
              ? dateBR(k + "T00:00:00")
              : k.replace("-S", " · Sem "),
        };
        for (const code of activeInfluencers) {
          row[code] = Number((inner.get(code) || 0).toFixed(2));
        }
        return row;
      });
  }, [filtered, chartModeInf, activeInfluencers]);

  // Unidades
  const unidadesData = useMemo(() => {
    type Agg = { unidade: string; receita: number; comandas: Set<string> };
    const map = new Map<string, Agg>();
    for (const r of filtered) {
      const u = r.estabelecimento;
      if (!u) continue;
      if (!map.has(u))
        map.set(u, { unidade: u, receita: 0, comandas: new Set() });
      const a = map.get(u)!;
      a.receita += Number(r.valor_liquido) || 0;
      if (r.comanda)
        a.comandas.add(
          `${r.comanda}||${
            r.data_hora_atendimento ? isoDay(r.data_hora_atendimento) : ""
          }`,
        );
    }
    return Array.from(map.values())
      .map((a) => ({
        unidade: a.unidade,
        receita: a.receita,
        atendimentos: a.comandas.size,
        ticket: a.comandas.size ? a.receita / a.comandas.size : 0,
      }))
      .sort((a, b) => b.receita - a.receita);
  }, [filtered]);

  const clearFilters = () => {
    setDateStart(undefined);
    setDateEnd(undefined);
    setUnidades([]);
    setCupons([]);
  };

  const exportRawCSV = () => {
    const rowsOut = filtered.map((r) => ({
      estabelecimento: r.estabelecimento ?? "",
      data_hora_atendimento: r.data_hora_atendimento ?? "",
      cliente_hash: r.cliente_hash ?? "",
      comanda: r.comanda ?? "",
      categoria_item: r.categoria_item ?? "",
      item: r.item ?? "",
      valor_item: r.valor_item ?? "",
      valor_desconto: r.valor_desconto ?? "",
      valor_liquido: r.valor_liquido ?? "",
      fechamento_conta: r.fechamento_conta ?? "",
      quem_fechou_conta: r.quem_fechou_conta ?? "",
      comentario_fechamento: r.comentario_fechamento ?? "",
      nome_cupom: r.nome_cupom ?? "",
      codigo_cupom: r.codigo_cupom ?? "",
      tipo_item: r.tipo_item ?? "",
      data_extracao: r.data_extracao ?? "",
    }));
    downloadCSV(
      `blow_consumo_cupons_${format(new Date(), "yyyyMMdd_HHmm")}.csv`,
      toCSV(rowsOut),
    );
  };

  const exportRankingCSV = () => {
    const rowsOut = cuponsRanking.map((r) => ({
      codigo_cupom: r.codigo,
      nome_cupom: r.nome,
      receita: r.receita.toFixed(2).replace(".", ","),
      atendimentos: r.atendimentos,
      ticket_medio: r.ticket.toFixed(2).replace(".", ","),
    }));
    downloadCSV(
      `blow_ranking_cupons_${format(new Date(), "yyyyMMdd_HHmm")}.csv`,
      toCSV(rowsOut),
    );
  };

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-6 pt-3 text-xs text-muted-foreground">
        {loading
          ? "Carregando dados…"
          : `${num(rows.length)} linhas · ${num(allUnidades.length)} unidades · ${num(allCupons.length)} cupons`}
      </div>


      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6 md:py-10 space-y-8">
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Erro ao carregar dados: {error}
          </div>
        )}

        {/* Filters */}
        <section className="card-blow p-4 md:p-6">
          <div className="flex flex-wrap items-end gap-3 md:gap-4">
            <DateRangePicker
              label="Período"
              start={dateStart}
              end={dateEnd}
              onChange={(s, e) => {
                setDateStart(s);
                setDateEnd(e);
              }}
            />
            <MultiFilter
              label="Unidade"
              options={allUnidades}
              selected={unidades}
              onChange={setUnidades}
            />
            <MultiFilter
              label="Cupom"
              options={allCupons}
              selected={cupons}
              onChange={setCupons}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-4 w-4" /> Limpar filtros
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportRawCSV}
                disabled={filtered.length === 0}
              >
                <Download className="mr-1 h-4 w-4" /> Dados filtrados
              </Button>
              <Button
                size="sm"
                onClick={exportRankingCSV}
                disabled={cuponsRanking.length === 0}
                className="bg-[color:var(--color-blow-orange-dark)] hover:bg-[color:var(--color-blow-orange-dark)]/90"
              >
                <Download className="mr-1 h-4 w-4" /> Ranking cupons
              </Button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={DollarSign}
            label="Receita total"
            value={brl(kpis.receita)}
            description="No período filtrado"
            tone="terracotta"
          />
          <KpiCard
            icon={Receipt}
            label="Ticket médio"
            value={brl(kpis.ticket)}
            description="Média por atendimento"
          />
          <KpiCard
            icon={Users}
            label="Atendimentos"
            value={num(kpis.nAtend)}
            description="Comandas únicas no período"
          />
          <KpiCard
            icon={Ticket}
            label="Cupons ativos"
            value={num(kpis.cuponsAtivos)}
            description="Usados no período filtrado"
          />
        </section>

        {/* Time series */}
        <section className="card-blow p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl md:text-2xl">Evolução da receita</h2>
              <p className="text-sm text-muted-foreground">
                Receita líquida ao longo do período filtrado.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-border bg-muted p-1">
              {(["dia", "semana"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-full transition-colors",
                    chartMode === m
                      ? "bg-[color:var(--color-blow-orange-dark)] text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "dia" ? "Diário" : "Semanal"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[320px] w-full">
            {timeSeries.length === 0 ? (
              <EmptyState loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={timeSeries}
                  margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                >
                  <defs>
                    <linearGradient id="receitaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.greenDark} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.greenDark} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    stroke="var(--color-blow-neutral-dark)"
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    stroke="var(--color-blow-neutral-dark)"
                    tickFormatter={(v) =>
                      v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`
                    }
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
                    formatter={(v: number) => [brl(v), "Receita"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="none"
                    fill="url(#receitaGradient)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke={C.greenDark}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: C.terracotta, stroke: C.terracotta }}
                    activeDot={{ r: 5, fill: C.terracotta }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Ranking cupons */}
        <section className="card-blow p-4 md:p-6">
          <div className="mb-4">
            <h2 className="text-xl md:text-2xl">Ranking de cupons</h2>
            <p className="text-sm text-muted-foreground">
              Top 15 cupons por receita líquida no período.
            </p>
          </div>
          <div className="h-[520px]">
            {top15.length === 0 ? (
              <EmptyState loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top15.map((r) => ({
                    ...r,
                    label: `${r.codigo}${r.nome ? " · " + r.nome : ""}`,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, bottom: 5, left: 20 }}
                >
                  <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    stroke="var(--color-blow-neutral-dark)"
                    tickFormatter={(v) =>
                      v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={220}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    stroke="var(--color-blow-neutral-dark)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--color-foreground)",
                    }}
                    formatter={(v: number) => [brl(v), "Receita"]}
                  />
                  <Bar dataKey="receita" radius={[0, 6, 6, 0]}>
                    {top15.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? C.terracotta : BAR_PALETTE[i % BAR_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Influenciadoras */}
        <section className="card-blow p-4 md:p-6">
          <div className="mb-4">
            <h2 className="text-xl md:text-2xl">Desempenho por influenciadora</h2>
            <p className="text-sm text-muted-foreground">
              Cada cupom representa uma influenciadora. Respeita filtros de período e unidade.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border mb-6">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-blow-pink-light)]/60 text-[color:var(--color-blow-orange-dark)]">
                <tr>
                  <Th>Influenciadora</Th>
                  <Th className="text-right">Nº cupons utilizados</Th>
                  <Th className="text-right">Receita total</Th>
                  <Th className="text-right">Ticket médio</Th>
                </tr>
              </thead>
              <tbody>
                {influencerRanking.slice(0, expandInfluencers ? undefined : 10).map((r) => (
                  <tr key={r.codigo} className="border-t border-border hover:bg-muted/50">
                    <Td>
                      <div className="font-medium">{r.nome || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.codigo}</div>
                    </Td>
                    <Td className="text-right tabular-nums">{num(r.atendimentos)}</Td>
                    <Td className="text-right tabular-nums">{brl(r.receita)}</Td>
                    <Td className="text-right tabular-nums">{brl(r.ticket)}</Td>
                  </tr>
                ))}
                {influencerRanking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">
                      Sem dados no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {influencerRanking.length > 10 && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandInfluencers((v) => !v)}
                className="text-[color:var(--color-blow-orange-dark)] hover:bg-[color:var(--color-blow-orange-light)]/20"
              >
                {expandInfluencers ? "Ver menos" : "Ver mais"}
              </Button>
            </div>
          )}


          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg">Faturamento por influenciadora ao longo do tempo</h3>
              <p className="text-sm text-muted-foreground">
                Padrão: top 5 por receita. Ajuste no seletor.
              </p>
            </div>
            <div className="flex items-end gap-3">
              <MultiFilter
                label="Influenciadoras"
                options={influencerRanking.map((r) => r.codigo)}
                optionLabels={influencerLabels}
                selected={activeInfluencers}
                onChange={(v) => setSelectedInfluencers(v)}
              />
              <div className="inline-flex rounded-full border border-border bg-muted p-1">
                {(["dia", "semana"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartModeInf(m)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-medium rounded-full transition-colors",
                      chartModeInf === m
                        ? "bg-[color:var(--color-blow-orange-dark)] text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "dia" ? "Diário" : "Semanal"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[360px] w-full">
            {influencerTimeSeries.length === 0 || activeInfluencers.length === 0 ? (
              <EmptyState loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={influencerTimeSeries}
                  margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    stroke="var(--color-blow-neutral-dark)"
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    stroke="var(--color-blow-neutral-dark)"
                    tickFormatter={(v) =>
                      v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`
                    }
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
                    formatter={(v: number, name: string) => [
                      brl(v),
                      influencerLabels.get(name) || name,
                    ]}
                  />
                  {activeInfluencers.map((code, i) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      name={code}
                      stroke={BAR_PALETTE[i % BAR_PALETTE.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Unidades */}
        <section className="card-blow p-4 md:p-6">
          <div className="mb-4">
            <h2 className="text-xl md:text-2xl">Desempenho por unidade</h2>
            <p className="text-sm text-muted-foreground">
              Receita, atendimentos e ticket médio por estabelecimento.
            </p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 h-[380px]">
              {unidadesData.length === 0 ? (
                <EmptyState loading={loading} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={unidadesData}
                    margin={{ top: 10, right: 20, bottom: 60, left: 10 }}
                  >
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="unidade"
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                      stroke="var(--color-blow-neutral-dark)"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                      stroke="var(--color-blow-neutral-dark)"
                      tickFormatter={(v) =>
                        v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "var(--color-foreground)",
                      }}
                      formatter={(v: number) => [brl(v), "Receita"]}
                    />
                    <Bar dataKey="receita" radius={[6, 6, 0, 0]}>
                      {unidadesData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={BAR_PALETTE[i % BAR_PALETTE.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="xl:col-span-2">
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-[color:var(--color-blow-pink-light)]/60 text-[color:var(--color-blow-orange-dark)]">
                    <tr>
                      <Th>Unidade</Th>
                      <Th className="text-right">Receita</Th>
                      <Th className="text-right">Atend.</Th>
                      <Th className="text-right">Ticket</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {unidadesData.slice(0, expandUnidades ? undefined : 10).map((r) => (
                      <tr
                        key={r.unidade}
                        className="border-t border-border hover:bg-muted/50"
                      >
                        <Td className="font-medium">{r.unidade}</Td>
                        <Td className="text-right tabular-nums">
                          {brl(r.receita)}
                        </Td>
                        <Td className="text-right tabular-nums">
                          {num(r.atendimentos)}
                        </Td>
                        <Td className="text-right tabular-nums">
                          {brl(r.ticket)}
                        </Td>
                      </tr>
                    ))}
                    {unidadesData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-6 text-center text-muted-foreground text-sm"
                        >
                          Sem dados no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {unidadesData.length > 10 && (
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandUnidades((v) => !v)}
                    className="text-[color:var(--color-blow-orange-dark)] hover:bg-[color:var(--color-blow-orange-light)]/20"
                  >
                    {expandUnidades ? "Ver menos" : "Ver mais"}
                  </Button>
                </div>
              )}

            </div>
          </div>
        </section>

        <footer className="pt-4 pb-8 text-center text-xs text-muted-foreground">
          bLOw · Dashboard de performance ·{" "}
          {loading ? "carregando…" : `${num(filtered.length)} linhas filtradas`}
        </footer>
      </main>
    </>
  );
}

/* ---------- subcomponents ---------- */

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "text-left font-medium text-xs uppercase tracking-wider px-3 py-2.5",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>;
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      {loading ? "Carregando…" : "Sem dados no período selecionado."}
    </div>
  );
}

/* ---------- Influenciadores ---------- */

type Classificacao = "PRIORITARIO" | "ATENCAO" | "SAUDAVEL";

const CLASS_META: Record<
  Classificacao,
  { label: string; color: string; bg: string; text: string }
> = {
  PRIORITARIO: {
    label: "Prioritário",
    color: C.terracotta,
    bg: "bg-[color:var(--color-blow-terracotta)]/15",
    text: "text-[color:var(--color-blow-terracotta)]",
  },
  ATENCAO: {
    label: "Ponto de atenção",
    color: "var(--color-blow-coral)",
    bg: "bg-[color:var(--color-blow-coral)]/15",
    text: "text-[color:var(--color-blow-coral)]",
  },
  SAUDAVEL: {
    label: "Saudável",
    color: STATUS_GREEN,
    bg: "bg-[color:var(--color-blow-green)]/15",
    text: "text-[color:var(--color-blow-green-dark)]",
  },
};

function CuradoriaView() {
  const [emitidos, setEmitidos] = useState<CupomEmitido[]>([]);
  const [unidadesList, setUnidadesList] = useState<Unidade[]>([]);
  const [consumoCodes, setConsumoCodes] = useState<
    Map<string, { atend: number; receita: number }>
  >(new Map());
  const [unitCodeMap, setUnitCodeMap] = useState<
    Map<string, Map<string, { atend: number; receita: number }>>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unit view filters
  const [ufFilter, setUfFilter] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [expandUnit, setExpandUnit] = useState(false);

  // Coupon status filters
  const [formato, setFormato] = useState<string[]>([]);
  const [statusP, setStatusP] = useState<string[]>([]);
  const [expand, setExpand] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // unidades
        const { data: uData, error: uErr } = await supabase
          .from("unidades")
          .select("nome");
        if (uErr) throw uErr;

        // cupons_emitidos (paginated)
        const emAll: CupomEmitido[] = [];
        {
          const pageSize = 1000;
          let from = 0;
          while (true) {
            const { data, error } = await supabase
              .from("cupons_emitidos")
              .select("*")
              .range(from, from + pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            emAll.push(...(data as CupomEmitido[]));
            if (data.length < pageSize) break;
            from += pageSize;
            if (emAll.length > 50_000) break;
          }
        }

        // consumo aggregate: global by code + per-unit by code
        const codeMap = new Map<
          string,
          { comandas: Set<string>; receita: number }
        >();
        const uMap = new Map<
          string,
          Map<string, { comandas: Set<string>; receita: number }>
        >();
        {
          const pageSize = 1000;
          let from = 0;
          while (true) {
            const { data, error } = await supabase
              .from("consumo_cupons")
              .select(
                "codigo_cupom, comanda, valor_liquido, estabelecimento, data_hora_atendimento",
              )
              .range(from, from + pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            for (const r of data as ConsumoCupom[]) {
              const code = (r.codigo_cupom || "").trim().toUpperCase();
              if (!code) continue;
              const day = r.data_hora_atendimento
                ? isoDay(r.data_hora_atendimento)
                : "";
              const est = r.estabelecimento ?? "";
              const comandaKey = r.comanda
                ? `${est}||${r.comanda}||${day}`
                : null;
              const receita = Number(r.valor_liquido) || 0;

              if (!codeMap.has(code))
                codeMap.set(code, { comandas: new Set(), receita: 0 });
              const g = codeMap.get(code)!;
              g.receita += receita;
              if (comandaKey) g.comandas.add(comandaKey);

              if (est) {
                if (!uMap.has(est)) uMap.set(est, new Map());
                const inner = uMap.get(est)!;
                if (!inner.has(code))
                  inner.set(code, { comandas: new Set(), receita: 0 });
                const gi = inner.get(code)!;
                gi.receita += receita;
                if (comandaKey) gi.comandas.add(comandaKey);
              }
            }
            if (data.length < pageSize) break;
            from += pageSize;
            if (from > 200_000) break;
          }
        }
        const flat = new Map<string, { atend: number; receita: number }>();
        for (const [k, v] of codeMap)
          flat.set(k, { atend: v.comandas.size, receita: v.receita });
        const flatUnit = new Map<
          string,
          Map<string, { atend: number; receita: number }>
        >();
        for (const [u, inner] of uMap) {
          const m = new Map<string, { atend: number; receita: number }>();
          for (const [c, v] of inner)
            m.set(c, { atend: v.comandas.size, receita: v.receita });
          flatUnit.set(u, m);
        }

        if (alive) {
          setEmitidos(emAll);
          setUnidadesList((uData as Unidade[]) || []);
          setConsumoCodes(flat);
          setUnitCodeMap(flatUnit);
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

  // ---- Per-unit view ----
  const unitRows = useMemo(() => {
    // active influencers by unit
    const activeByUnit = new Map<
      string,
      { count: number; codes: Set<string> }
    >();
    for (const e of emitidos) {
      const status = (e.status_parceria || "").trim().toLowerCase();
      if (status !== "ativa") continue;
      const u = (e.unidade || "").trim();
      if (!u) continue;
      if (!activeByUnit.has(u))
        activeByUnit.set(u, { count: 0, codes: new Set() });
      const agg = activeByUnit.get(u)!;
      agg.count += 1;
      for (const c of parseCodes(e.codigo_cupom)) agg.codes.add(c);
    }

    return unidadesList.map((u) => {
      const nome = u.nome;
      const info = activeByUnit.get(nome);
      const ativos = info?.count ?? 0;
      const codes = info?.codes ?? new Set<string>();
      const perU = unitCodeMap.get(nome) ?? new Map();
      let receita = 0;
      let atend = 0;
      for (const c of codes) {
        const hit = perU.get(c);
        if (hit) {
          receita += hit.receita;
          atend += hit.atend;
        }
      }
      const classificacao: Classificacao =
        ativos === 0
          ? "PRIORITARIO"
          : receita <= 0
            ? "ATENCAO"
            : "SAUDAVEL";
      return {
        nome,
        uf: extractUF(nome) ?? "—",
        ativos,
        receita,
        atend,
        classificacao,
      };
    });
  }, [emitidos, unidadesList, unitCodeMap]);

  const allUFs = useMemo(
    () =>
      Array.from(new Set(unitRows.map((r) => r.uf).filter((u) => u !== "—")))
        .sort(),
    [unitRows],
  );
  const allClasses: Classificacao[] = ["PRIORITARIO", "ATENCAO", "SAUDAVEL"];

  const unitFiltered = useMemo(() => {
    const uSet = ufFilter.length ? new Set(ufFilter) : null;
    const cSet = classFilter.length ? new Set(classFilter) : null;
    return unitRows.filter((r) => {
      if (uSet && !uSet.has(r.uf)) return false;
      if (cSet && !cSet.has(r.classificacao)) return false;
      return true;
    });
  }, [unitRows, ufFilter, classFilter]);

  const unitSorted = useMemo(() => {
    const order: Record<Classificacao, number> = {
      PRIORITARIO: 0,
      ATENCAO: 1,
      SAUDAVEL: 2,
    };
    return [...unitFiltered].sort((a, b) => {
      const d = order[a.classificacao] - order[b.classificacao];
      if (d !== 0) return d;
      return b.receita - a.receita;
    });
  }, [unitFiltered]);

  const unitSummary = useMemo(() => {
    const total = unitFiltered.length;
    let prio = 0,
      atn = 0,
      ok = 0;
    for (const r of unitFiltered) {
      if (r.classificacao === "PRIORITARIO") prio += 1;
      else if (r.classificacao === "ATENCAO") atn += 1;
      else ok += 1;
    }
    return { total, prio, atn, ok };
  }, [unitFiltered]);

  const unitBarData = useMemo(
    () =>
      unitFiltered
        .filter((r) => r.receita > 0)
        .sort((a, b) => b.receita - a.receita)
        .slice(0, 20)
        .map((r) => ({
          nome: r.nome.replace(/^bLOw\s+/, ""),
          receita: Number(r.receita.toFixed(2)),
          classificacao: r.classificacao,
        })),
    [unitFiltered],
  );

  const exportUnitCSV = () => {
    const out = unitSorted.map((r) => ({
      unidade: r.nome,
      uf: r.uf,
      influenciadores_ativos: r.ativos,
      atendimentos: r.atend,
      receita: r.receita.toFixed(2).replace(".", ","),
      classificacao: CLASS_META[r.classificacao].label,
    }));
    downloadCSV(
      `blow_visao_unidades_${format(new Date(), "yyyyMMdd_HHmm")}.csv`,
      toCSV(out),
    );
  };

  // ---- Coupon status view (existing) ----
  type Enriched = CupomEmitido & {
    codes: string[];
    convert: boolean;
    atend: number;
    receita: number;
  };

  const enriched: Enriched[] = useMemo(() => {
    return emitidos.map((e) => {
      const codes = parseCodes(e.codigo_cupom);
      let atend = 0;
      let receita = 0;
      let convert = false;
      for (const c of codes) {
        const hit = consumoCodes.get(c);
        if (hit) {
          convert = true;
          atend += hit.atend;
          receita += hit.receita;
        }
      }
      return { ...e, codes, convert, atend, receita };
    });
  }, [emitidos, consumoCodes]);

  const formatos = useMemo(
    () =>
      Array.from(
        new Set(
          emitidos.map((e) => (e.formato_parceria || "").trim()).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [emitidos],
  );
  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          emitidos.map((e) => (e.status_parceria || "").trim()).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [emitidos],
  );

  const filteredCoup = useMemo(() => {
    const fSet = formato.length ? new Set(formato) : null;
    const sSet = statusP.length ? new Set(statusP) : null;
    return enriched.filter((e) => {
      if (fSet && !fSet.has((e.formato_parceria || "").trim())) return false;
      if (sSet && !sSet.has((e.status_parceria || "").trim())) return false;
      return true;
    });
  }, [enriched, formato, statusP]);

  const summary = useMemo(() => {
    const total = filteredCoup.length;
    const conv = filteredCoup.filter((e) => e.convert).length;
    const nconv = total - conv;
    const rate = total ? (conv / total) * 100 : 0;
    return { total, conv, nconv, rate };
  }, [filteredCoup]);

  const sorted = useMemo(
    () =>
      [...filteredCoup].sort((a, b) => {
        if (a.convert !== b.convert) return a.convert ? 1 : -1;
        return b.receita - a.receita;
      }),
    [filteredCoup],
  );

  const byFormato = useMemo(() => {
    const map = new Map<
      string,
      { formato: string; converteu: number; nao: number }
    >();
    for (const e of filteredCoup) {
      const key = (e.formato_parceria || "—").trim() || "—";
      if (!map.has(key)) map.set(key, { formato: key, converteu: 0, nao: 0 });
      const a = map.get(key)!;
      if (e.convert) a.converteu += 1;
      else a.nao += 1;
    }
    return Array.from(map.values()).sort(
      (a, b) => b.converteu + b.nao - (a.converteu + a.nao),
    );
  }, [filteredCoup]);

  const clearCoupFilters = () => {
    setFormato([]);
    setStatusP([]);
  };
  const clearUnitFilters = () => {
    setUfFilter([]);
    setClassFilter([]);
  };

  const exportCSV = () => {
    const out = sorted.map((e) => ({
      nome_influenciador: e.nome_influenciador ?? "",
      unidade: e.unidade ?? "",
      codigo_cupom: e.codigo_cupom ?? "",
      formato_parceria: e.formato_parceria ?? "",
      status_parceria: e.status_parceria ?? "",
      data_inicio: e.data_inicio ?? "",
      data_validade: e.data_validade ?? "",
      converteu: e.convert ? "Sim" : "Não",
      atendimentos: e.atend,
      receita: e.receita.toFixed(2).replace(".", ","),
    }));
    downloadCSV(
      `blow_curadoria_${format(new Date(), "yyyyMMdd_HHmm")}.csv`,
      toCSV(out),
    );
  };

  const classLabels = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of allClasses) m.set(c, CLASS_META[c].label);
    return m;
  }, []);

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-6 pt-3 text-xs text-muted-foreground">
        {loading
          ? "Carregando dados…"
          : `${num(unidadesList.length)} unidades · ${num(emitidos.length)} cupons emitidos · ${num(consumoCodes.size)} códigos consumidos`}
      </div>
      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6 md:py-10 space-y-10">
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Erro ao carregar dados: {error}
          </div>
        )}

        {/* ============ PANORAMA DAS INFLUENCIADORAS (Clube) ============ */}
        <InfluenciadorasSection />

        {/* Unidade x faturamento via influenciadora — logo após Faturamento por influenciadora */}
        <section className="card-blow p-4 md:p-6">
          <div className="mb-4">
            <h3 className="text-xl md:text-2xl">
              Unidade x faturamento via influenciadora
            </h3>
          </div>
          <div className="h-[420px] w-full">
            {unitBarData.length === 0 ? (
              <EmptyState loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={unitBarData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, bottom: 10, left: 10 }}
                >
                  <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    stroke="var(--color-blow-neutral-dark)"
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={230}
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    stroke="var(--color-blow-neutral-dark)"
                  />
                  <Tooltip
                    formatter={(v: number) => brl(Number(v))}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--color-foreground)",
                    }}
                  />
                  <Bar dataKey="receita" radius={[0, 6, 6, 0]}>
                    {unitBarData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={CLASS_META[d.classificacao].color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ============ VISÃO POR UNIDADE ============ */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[color:var(--color-blow-orange-dark)]">
              Visão por unidade
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cobertura de influenciadores ativos e retorno gerado em cada loja
              da rede.
            </p>
          </div>

          {/* Filters */}
          <section className="card-blow p-4 md:p-6">
            <div className="flex flex-wrap items-end gap-3 md:gap-4">
              <MultiFilter
                label="Estado (UF)"
                options={allUFs}
                selected={ufFilter}
                onChange={setUfFilter}
              />
              <MultiFilter
                label="Classificação"
                options={allClasses}
                optionLabels={classLabels}
                selected={classFilter}
                onChange={setClassFilter}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUnitFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-4 w-4" /> Limpar filtros
              </Button>
              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={exportUnitCSV}
                  disabled={unitSorted.length === 0}
                  className="bg-[color:var(--color-blow-orange-dark)] hover:bg-[color:var(--color-blow-orange-dark)]/90"
                >
                  <Download className="mr-1 h-4 w-4" /> Exportar visão
                </Button>
              </div>
            </div>
          </section>

          {/* Summary cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Building2}
              label="Total de unidades"
              value={num(unitSummary.total)}
              description="Com inauguração acompanhada"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Prioritário"
              value={num(unitSummary.prio)}
              description="Sem influenciadora ativa"
              tone="terracotta"
            />
            <KpiCard
              icon={AlertCircle}
              label="Ponto de atenção"
              value={num(unitSummary.atn)}
              description="Influenciadora ativa, sem receita"
              tone="coral"
            />
            <KpiCard
              icon={ShieldCheck}
              label="Saudável"
              value={num(unitSummary.ok)}
              description="Com receita registrada"
              tone="green"
            />
          </section>

          {/* Table */}
          <section className="card-blow p-4 md:p-6">
            <div className="mb-4">
              <h3 className="text-xl md:text-2xl">Visão por unidade</h3>
              <p className="text-sm text-muted-foreground">
                Prioritárias primeiro — unidades sem influenciador ativo.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--color-blow-pink-light)]/60 text-[color:var(--color-blow-orange-dark)]">
                  <tr>
                    <Th>Unidade</Th>
                    <Th>UF</Th>
                    <Th className="text-right">Influ. ativos</Th>
                    <Th className="text-right">Atend.</Th>
                    <Th className="text-right">Retorno</Th>
                    <Th>Classificação</Th>
                  </tr>
                </thead>
                <tbody>
                  {unitSorted
                    .slice(0, expandUnit ? undefined : 10)
                    .map((r) => {
                      const meta = CLASS_META[r.classificacao];
                      return (
                        <tr
                          key={r.nome}
                          className="border-t border-border hover:bg-muted/50"
                        >
                          <Td className="font-medium">{r.nome}</Td>
                          <Td className="text-xs">{r.uf}</Td>
                          <Td className="text-right tabular-nums">
                            {num(r.ativos)}
                          </Td>
                          <Td className="text-right tabular-nums">
                            {num(r.atend)}
                          </Td>
                          <Td className="text-right tabular-nums">
                            {brl(r.receita)}
                          </Td>
                          <Td>
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                                meta.bg,
                                meta.text,
                              )}
                            >
                              {meta.label}
                            </span>
                          </Td>
                        </tr>
                      );
                    })}
                  {unitSorted.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-muted-foreground text-sm"
                      >
                        {loading
                          ? "Carregando…"
                          : "Sem unidades para os filtros atuais."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {unitSorted.length > 10 && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandUnit((v) => !v)}
                  className="text-[color:var(--color-blow-orange-dark)] hover:bg-[color:var(--color-blow-orange-light)]/20"
                >
                  {expandUnit ? "Ver menos" : "Ver mais"}
                </Button>
              </div>
            )}
          </section>
        </div>

        <footer className="pt-4 pb-8 text-center text-xs text-muted-foreground">
          bLOw · Influenciadores ·{" "}
          {loading
            ? "carregando…"
            : `${num(unitRows.length)} unidades · ${num(sorted.length)} cupons`}
        </footer>
      </main>
    </>
  );
}

