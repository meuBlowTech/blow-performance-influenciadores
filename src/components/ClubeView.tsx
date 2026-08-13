import { useMemo, useState } from "react";
import { Building2, Clock, TicketX, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { brl, num, dateBR } from "@/lib/format";
import { toast } from "sonner";
import { useUnidadesUnificadas } from "@/hooks/useUnidadesUnificadas";
import { useConsumoCupons } from "@/hooks/useConsumoCupons";
import { useInfluenciadoras, type ClubeInfluenciadora } from "@/hooks/useInfluenciadoras";
import { MultiFilter } from "@/components/MultiFilter";
import { comandaKey } from "@/lib/inauguracoes";
import { KpiCard } from "@/components/KpiCard";
import { FORMATO_PARCERIA_OPTIONS, formatoLabel, unidadesDe, computeAllUnidades } from "@/lib/influenciadoras";

type SubTab = "status" | "solicitar" | "sem_dono";

// ---------- Helpers ----------
const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

const isExpiringSoon = (i: ClubeInfluenciadora) => {
  if (i.status_cupom !== "ativa") return false;
  const dd = daysUntil(i.data_validade);
  return dd !== null && dd >= 0 && dd <= 30;
};

// ---------- Main ----------
export default function ClubeView() {
  const [sub, setSub] = useState<SubTab>("status");
  const { influenciadoras, loading } = useInfluenciadoras();

  const tabs: { id: SubTab; label: string }[] = [
    { id: "status", label: "Influenciadores cadastrados" },
    { id: "sem_dono", label: "Cupons sem dono" },
    { id: "solicitar", label: "Cadastro de Influenciador" },
  ];

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              sub === t.id
                ? "border-[color:var(--color-blow-orange-dark)] text-[color:var(--color-blow-orange-dark)]"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "status" && (
        <StatusTab influenciadoras={influenciadoras} loading={loading} />
      )}
      {sub === "solicitar" && (
        <SolicitarTab influenciadoras={influenciadoras} />
      )}
      {sub === "sem_dono" && <SemDonoTab />}
    </main>
  );
}

// ---------- Status tab ----------
type FilterCard = null | "ativas" | "inativas" | "unidades" | "expirados" | "expirando";

function StatusTab({
  influenciadoras,
  loading,
}: {
  influenciadoras: ClubeInfluenciadora[];
  loading: boolean;
}) {
  const [cardFilter, setCardFilter] = useState<FilterCard>(null);
  const [unidadeFilter, setUnidadeFilter] = useState<string>("todas");
  const [statusParceria, setStatusParceria] = useState<string>("todos");
  const [statusCupom, setStatusCupom] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(12);

  const ativas = influenciadoras.filter((i) => i.status_parceria === "ativa");
  const inativas = influenciadoras.filter((i) => i.status_parceria === "encerrada");
  const unidadesAtivas = new Set<string>();
  for (const i of ativas) for (const u of unidadesDe(i)) unidadesAtivas.add(u);
  const expirados = influenciadoras.filter((i) => i.status_cupom === "encerrada");
  const expirando = influenciadoras.filter(isExpiringSoon);

  const { unidades: unidadesUnificadas } = useUnidadesUnificadas();
  const allUnidades = useMemo(
    () => computeAllUnidades(influenciadoras, unidadesUnificadas),
    [influenciadoras, unidadesUnificadas],
  );

  const filtered = useMemo(() => {
    return influenciadoras.filter((i) => {
      // card filter
      if (cardFilter === "ativas" || cardFilter === "unidades") {
        if (i.status_parceria !== "ativa") return false;
      }
      if (cardFilter === "inativas" && i.status_parceria !== "encerrada") return false;
      if (cardFilter === "expirados" && i.status_cupom !== "encerrada") return false;
      if (cardFilter === "expirando" && !isExpiringSoon(i)) return false;

      if (unidadeFilter !== "todas" && !unidadesDe(i).includes(unidadeFilter)) return false;
      if (statusParceria !== "todos" && i.status_parceria !== statusParceria) return false;
      if (statusCupom === "ativa" && i.status_cupom !== "ativa") return false;
      if (statusCupom === "encerrada" && i.status_cupom !== "encerrada") return false;
      if (statusCupom === "expirando" && !isExpiringSoon(i)) return false;

      const term = search.trim().toLowerCase();
      if (term) {
        const hay = `${i.nome ?? ""} ${i.codigo_cupom ?? ""} ${unidadesDe(i).join(" ")}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [influenciadoras, cardFilter, unidadeFilter, statusParceria, statusCupom, search]);

  const toggleCard = (c: FilterCard) => setCardFilter((prev) => (prev === c ? null : c));

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          icon={UserCheck}
          label="Influenciadoras ativas"
          value={ativas.length}
          active={cardFilter === "ativas"}
          onClick={() => toggleCard("ativas")}
          tone="green"
        />
        <KpiCard
          icon={UserX}
          label="Influenciadoras inativas"
          value={inativas.length}
          active={cardFilter === "inativas"}
          onClick={() => toggleCard("inativas")}
          tone="neutral"
        />
        <KpiCard
          icon={Building2}
          label="Unidades ativas"
          value={unidadesAtivas.size}
          active={cardFilter === "unidades"}
          onClick={() => toggleCard("unidades")}
          tone="green"
        />
        <KpiCard
          icon={TicketX}
          label="Cupons expirados"
          value={expirados.length}
          active={cardFilter === "expirados"}
          onClick={() => toggleCard("expirados")}
          tone="terracotta"
        />
        <KpiCard
          icon={Clock}
          label="Expirando em 30 dias"
          value={expirando.length}
          active={cardFilter === "expirando"}
          onClick={() => toggleCard("expirando")}
          tone="coral"
        />
      </div>


      <div className="flex flex-wrap gap-3 mb-6">
        <div className="min-w-[220px]">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome, cupom ou unidade…"
          />
        </div>
        <div className="min-w-[220px]">
          <Label className="text-xs text-muted-foreground">Unidade</Label>
          <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {allUnidades.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Label className="text-xs text-muted-foreground">Status da parceria</Label>
          <Select value={statusParceria} onValueChange={setStatusParceria}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Status do cupom</Label>
          <Select value={statusCupom} onValueChange={setStatusCupom}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativa">Ativo</SelectItem>
              <SelectItem value="encerrada">Expirado</SelectItem>
              <SelectItem value="expirando">Expirando em 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma influenciadora encontrada.</p>
      ) : (
        <>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
          >
            {filtered.slice(0, visible).map((i) => (
              <InfluenciadoraCard key={i.id} i={i} />
            ))}
          </div>
          {filtered.length > visible && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => setVisible((v) => v + 12)}>
                Ver mais ({filtered.length - visible} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InfluenciadoraCard({ i }: { i: ClubeInfluenciadora }) {
  const extras = (i.unidades_inclusas ?? []).filter((u) => u && u !== i.unidade);
  const parceriaAtiva = i.status_parceria === "ativa";
  const cupomAtivo = i.status_cupom === "ativa";
  const expSoon = isExpiringSoon(i);
  return (
    <div className="card-blow p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-[color:var(--color-blow-orange-dark)]">{i.nome}</h4>
          {i.unidade && <p className="text-xs text-muted-foreground mt-0.5">{i.unidade}</p>}
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <Badge
            className={cn(
              "text-[10px]",
              parceriaAtiva
                ? "bg-[color:var(--color-blow-green)] text-white hover:bg-[color:var(--color-blow-green)]"
                : "bg-[color:var(--color-blow-terracotta)] text-white hover:bg-[color:var(--color-blow-terracotta)]",
            )}
          >
            {parceriaAtiva ? "Parceria ativa" : "Parceria encerrada"}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              cupomAtivo && !expSoon && "border-[color:var(--color-blow-green)] text-[color:var(--color-blow-green-dark)]",
              expSoon && "border-[color:var(--color-blow-coral)] text-[color:var(--color-blow-terracotta)]",
              !cupomAtivo && "border-[color:var(--color-blow-terracotta)] text-[color:var(--color-blow-terracotta)]",
            )}
          >
            {cupomAtivo ? (expSoon ? "Cupom expirando" : "Cupom ativo") : "Cupom expirado"}
          </Badge>
        </div>
      </div>
      {extras.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            + também em:
          </span>
          {extras.map((u) => (
            <span
              key={u}
              className="text-[11px] rounded-full bg-[color:var(--color-blow-pink-light)] text-[color:var(--color-blow-orange-dark)] px-2 py-0.5"
            >
              {u}
            </span>
          ))}
        </div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Formato</dt>
          <dd className="mt-0.5">
            <Badge
              variant="outline"
              className="text-[10px] border-[color:var(--color-blow-orange)]/50 text-[color:var(--color-blow-orange-dark)]"
            >
              {formatoLabel(i.formato_parceria)}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cupom</dt>
          <dd className="font-medium font-mono">{i.codigo_cupom ?? "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Válido até</dt>
          <dd className="font-medium">
            {i.data_validade ? dateBR(i.data_validade) : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

// ---------- Solicitar tab ----------
function SolicitarTab({ influenciadoras }: { influenciadoras: ClubeInfluenciadora[] }) {
  const initialForm = {
    solicitante_nome: "",
    solicitante_email: "",
    nome_influenciador: "",
    unidade: "",
    codigo_cupom_sugerido: "",
    formato_parceria_sugerido: "clube_franqueadora",
    status_parceria_sugerido: "ativa",
    data_validade_sugerida: "",
    instagram: "",
    contato: "",
    observacao: "",
  };
  const [form, setForm] = useState(initialForm);
  const [outrasUnidades, setOutrasUnidades] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const { unidades: unidadesUnificadas } = useUnidadesUnificadas();
  const unidadesSugestoes = useMemo(() => {
    const s = new Set<string>(unidadesUnificadas);
    for (const i of influenciadoras) for (const u of unidadesDe(i)) s.add(u);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [influenciadoras, unidadesUnificadas]);
  const outrasUnidadesOptions = useMemo(
    () => unidadesSugestoes.filter((u) => u !== form.unidade),
    [unidadesSugestoes, form.unidade],
  );

  const upd = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.solicitante_nome || !form.solicitante_email || !form.nome_influenciador || !form.unidade) {
      toast.error("Preencha os campos obrigatórios (*)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("clube_solicitacoes").insert({
      ...form,
      outras_unidades: outrasUnidades.join(", "),
      status_solicitacao: "pendente",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-lg card-blow p-8 text-center">
        <h3 className="text-xl font-semibold text-[color:var(--color-blow-orange-dark)] mb-3">
          Solicitação enviada!
        </h3>
        <p className="text-sm text-muted-foreground">
          Nosso time de marketing vai analisar e aprovar em até 7 dias úteis, e vamos entrar em contato pra alinhar os demais detalhes.
        </p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => {
            setSent(false);
            setForm(initialForm);
            setOutrasUnidades([]);
          }}
        >
          Fazer nova solicitação
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl card-blow p-6 space-y-4">
      <h3 className="text-lg font-semibold text-[color:var(--color-blow-orange-dark)]">
        Solicitar cadastro no Clube
      </h3>
      <p className="text-sm text-muted-foreground -mt-2">
        Nosso time avalia e aprova em até 7 dias úteis.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Seu nome *">
          <Input value={form.solicitante_nome} onChange={(e) => upd("solicitante_nome")(e.target.value)} />
        </Field>
        <Field label="Seu e-mail *">
          <Input type="email" value={form.solicitante_email} onChange={(e) => upd("solicitante_email")(e.target.value)} />
        </Field>
        <Field label="Nome da influenciadora *">
          <Input value={form.nome_influenciador} onChange={(e) => upd("nome_influenciador")(e.target.value)} />
        </Field>
        <Field label="Unidade *">
          <Input
            list="unidades-sugestoes"
            value={form.unidade}
            onChange={(e) => upd("unidade")(e.target.value)}
          />
          <datalist id="unidades-sugestoes">
            {unidadesSugestoes.map((u) => <option key={u} value={u} />)}
          </datalist>
        </Field>
        <Field label="Código do cupom (se já souber)">
          <Input
            value={form.codigo_cupom_sugerido}
            onChange={(e) => upd("codigo_cupom_sugerido")(e.target.value)}
            placeholder="Opcional"
          />
        </Field>
        <Field label="Outras unidades">
          <MultiFilter
            label=""
            options={outrasUnidadesOptions}
            selected={outrasUnidades}
            onChange={setOutrasUnidades}
          />
        </Field>
        <Field label="Formato de parceria">
          <Select
            value={form.formato_parceria_sugerido}
            onValueChange={upd("formato_parceria_sugerido")}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMATO_PARCERIA_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status da parceria">
          <Select
            value={form.status_parceria_sugerido}
            onValueChange={upd("status_parceria_sugerido")}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Validade do cupom">
          <Input
            type="date"
            value={form.data_validade_sugerida}
            onChange={(e) => upd("data_validade_sugerida")(e.target.value)}
          />
        </Field>
        <Field label="Instagram">
          <Input value={form.instagram} onChange={(e) => upd("instagram")(e.target.value)} placeholder="@handle" />
        </Field>
        <Field label="Contato / WhatsApp">
          <Input value={form.contato} onChange={(e) => upd("contato")(e.target.value)} />
        </Field>
      </div>
      <Field label="Observações">
        <Textarea rows={3} value={form.observacao} onChange={(e) => upd("observacao")(e.target.value)} />
      </Field>
      <Button type="submit" disabled={submitting} className="w-full md:w-auto">
        {submitting ? "Enviando…" : "Enviar solicitação"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ---------- Cupons sem dono ----------
type CupomOrfao = {
  codigo: string;
  nomeCupom: string;
  unidades: string[];
  receita: number;
  atendimentos: number;
  primeiraVenda: string | null;
  ultimaVenda: string | null;
};

function SemDonoTab() {
  const { rows, influencerMap, loading } = useConsumoCupons();
  const { unidades: unidadesUnificadas } = useUnidadesUnificadas();
  const [search, setSearch] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState("todas");

  const orfaos = useMemo(() => {
    const map = new Map<string, { rows: typeof rows; nomeCupom: string }>();
    for (const r of rows) {
      const code = (r.codigo_cupom || "").trim().toUpperCase();
      if (!code || influencerMap.has(code)) continue;
      if (!map.has(code)) map.set(code, { rows: [], nomeCupom: r.nome_cupom || "" });
      const entry = map.get(code)!;
      entry.rows.push(r);
      if (!entry.nomeCupom && r.nome_cupom) entry.nomeCupom = r.nome_cupom;
    }
    const list: CupomOrfao[] = [];
    for (const [codigo, { rows: rs, nomeCupom }] of map) {
      const unidadesSet = new Set<string>();
      const comandas = new Set<string>();
      let receita = 0;
      let primeira: string | null = null;
      let ultima: string | null = null;
      for (const r of rs) {
        if (r.estabelecimento) unidadesSet.add(r.estabelecimento);
        receita += Number(r.valor_liquido) || 0;
        if (r.comanda) comandas.add(comandaKey(r));
        if (r.data_hora_atendimento) {
          if (!primeira || r.data_hora_atendimento < primeira) primeira = r.data_hora_atendimento;
          if (!ultima || r.data_hora_atendimento > ultima) ultima = r.data_hora_atendimento;
        }
      }
      list.push({
        codigo,
        nomeCupom: nomeCupom || codigo,
        unidades: Array.from(unidadesSet).sort((a, b) => a.localeCompare(b, "pt-BR")),
        receita,
        atendimentos: comandas.size,
        primeiraVenda: primeira,
        ultimaVenda: ultima,
      });
    }
    return list.sort((a, b) => b.receita - a.receita);
  }, [rows, influencerMap]);

  const allUnidades = useMemo(() => {
    const s = new Set<string>(unidadesUnificadas);
    for (const o of orfaos) for (const u of o.unidades) s.add(u);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [orfaos, unidadesUnificadas]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orfaos.filter((o) => {
      if (unidadeFilter !== "todas" && !o.unidades.includes(unidadeFilter)) return false;
      if (term) {
        const hay = `${o.codigo} ${o.nomeCupom}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [orfaos, search, unidadeFilter]);

  const totalReceita = filtered.reduce((s, o) => s + o.receita, 0);
  const totalAtendimentos = filtered.reduce((s, o) => s + o.atendimentos, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cupons sem dono</h2>
        <p className="text-sm text-muted-foreground">
          Códigos de cupom usados nas vendas que ainda não correspondem a nenhuma influenciadora
          cadastrada — cadastre a pessoa com esse código pra o faturamento passar a ser atribuído
          automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card-blow p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Receita não atribuída
          </div>
          <div className="mt-2 text-3xl font-semibold text-[color:var(--color-blow-terracotta)]">
            {brl(totalReceita)}
          </div>
        </div>
        <div className="card-blow p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Atendimentos</div>
          <div className="mt-2 text-3xl font-semibold text-[color:var(--color-blow-orange-dark)]">
            {num(totalAtendimentos)}
          </div>
        </div>
        <div className="card-blow p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Códigos sem dono
          </div>
          <div className="mt-2 text-3xl font-semibold text-[color:var(--color-blow-orange-dark)]">
            {filtered.length}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[220px]">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Código ou nome do cupom…"
          />
        </div>
        <div className="min-w-[220px]">
          <Label className="text-xs text-muted-foreground">Unidade</Label>
          <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {allUnidades.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="card-blow p-8 text-center text-muted-foreground text-sm">
          Nenhum cupom sem dono encontrado. 🎉
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 px-2 font-medium">Código</th>
                <th className="py-2 px-2 font-medium">Nome do cupom</th>
                <th className="py-2 px-2 font-medium">Unidade(s)</th>
                <th className="py-2 px-2 font-medium text-right">Receita</th>
                <th className="py-2 px-2 font-medium text-right">Atendimentos</th>
                <th className="py-2 px-2 font-medium">Primeira venda</th>
                <th className="py-2 px-2 font-medium">Última venda</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.codigo} className="border-b border-border/60 last:border-0">
                  <td className="py-2 px-2 font-mono text-xs">{o.codigo}</td>
                  <td className="py-2 px-2">{o.nomeCupom || "—"}</td>
                  <td className="py-2 px-2 text-muted-foreground">
                    {o.unidades.length > 0 ? o.unidades.join(", ") : "—"}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums font-medium">{brl(o.receita)}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{num(o.atendimentos)}</td>
                  <td className="py-2 px-2 text-muted-foreground">
                    {o.primeiraVenda ? dateBR(o.primeiraVenda) : "—"}
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">
                    {o.ultimaVenda ? dateBR(o.ultimaVenda) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

