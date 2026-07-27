import { useEffect, useMemo, useState } from "react";
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
import { dateBR } from "@/lib/format";
import { toast } from "sonner";
import { useUnidadesUnificadas } from "@/hooks/useUnidadesUnificadas";

// ---------- Types ----------
type ClubeInfluenciadora = {
  id: string;
  nome: string;
  unidade: string | null;
  unidades_inclusas: string[] | null;
  formato_parceria: string | null;
  status_parceria: "ativa" | "encerrada" | string | null;
  codigo_cupom: string | null;
  status_cupom: "ativa" | "encerrada" | string | null;
  data_inicio: string | null;
  data_validade: string | null;
  instagram: string | null;
  contato: string | null;
};

type ClubeSolicitacao = {
  id: string;
  created_at: string;
  nome_influenciador: string | null;
  unidade: string | null;
  outras_unidades: string | null;
  formato_parceria_sugerido: string | null;
  codigo_cupom_sugerido: string | null;
  instagram: string | null;
  contato: string | null;
  observacao: string | null;
  status_solicitacao: string | null;
  solicitante_nome: string | null;
  solicitante_email: string | null;
};

type SubTab = "status" | "solicitar" | "aprovacoes" | "editar";

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

const unidadesDe = (i: ClubeInfluenciadora): string[] => {
  const arr: string[] = [];
  if (i.unidade) arr.push(i.unidade);
  if (Array.isArray(i.unidades_inclusas)) {
    for (const u of i.unidades_inclusas) if (u && !arr.includes(u)) arr.push(u);
  }
  return arr;
};

// ---------- Main ----------
export default function ClubeView() {
  const [sub, setSub] = useState<SubTab>("status");
  const [adminPass, setAdminPass] = useState<string | null>(null);
  const [influenciadoras, setInfluenciadoras] = useState<ClubeInfluenciadora[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadInfluenciadoras = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clube_influenciadoras")
      .select("*")
      .order("nome", { ascending: true });
    if (error) toast.error(error.message);
    setInfluenciadoras((data ?? []) as ClubeInfluenciadora[]);
    setLoading(false);
  };

  useEffect(() => {
    reloadInfluenciadoras();
  }, []);

  const tabs: { id: SubTab; label: string }[] = [
    { id: "status", label: "Ver Status" },
    { id: "solicitar", label: "Solicitar Cadastro" },
    { id: "aprovacoes", label: "Aprovações" },
    { id: "editar", label: "Editar Influenciadoras" },
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
                ? "border-[color:var(--color-blow-green-dark)] text-[color:var(--color-blow-green-dark)]"
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
      {sub === "aprovacoes" && (
        <AdminGate password={adminPass} onAuthed={setAdminPass}>
          {(pw) => <AprovacoesTab password={pw} onChanged={reloadInfluenciadoras} />}
        </AdminGate>
      )}
      {sub === "editar" && (
        <AdminGate password={adminPass} onAuthed={setAdminPass}>
          {(pw) => (
            <EditarTab
              password={pw}
              influenciadoras={influenciadoras}
              reload={reloadInfluenciadoras}
            />
          )}
        </AdminGate>
      )}
    </main>
  );
}

// ---------- Admin gate ----------
function AdminGate({
  password,
  onAuthed,
  children,
}: {
  password: string | null;
  onAuthed: (pw: string) => void;
  children: (pw: string) => React.ReactNode;
}) {
  const [pw, setPw] = useState("");
  const [checking, setChecking] = useState(false);

  if (password) return <>{children(password)}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    const { data, error } = await supabase.rpc("clube_check_admin", {
      p_password: pw,
    });
    setChecking(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data === true) {
      onAuthed(pw);
      toast.success("Acesso liberado");
    } else {
      toast.error("Senha incorreta");
    }
  };

  return (
    <div className="mx-auto max-w-sm card-blow p-6">
      <h3 className="text-lg font-semibold mb-1">Área restrita</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Digite a senha de administrador para acessar.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Input
          type="password"
          placeholder="Senha"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={checking || !pw} className="w-full">
          {checking ? "Verificando…" : "Entrar"}
        </Button>
      </form>
    </div>
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
  const [visible, setVisible] = useState(12);

  const ativas = influenciadoras.filter((i) => i.status_parceria === "ativa");
  const inativas = influenciadoras.filter((i) => i.status_parceria === "encerrada");
  const unidadesAtivas = new Set<string>();
  for (const i of ativas) for (const u of unidadesDe(i)) unidadesAtivas.add(u);
  const expirados = influenciadoras.filter((i) => i.status_cupom === "encerrada");
  const expirando = influenciadoras.filter(isExpiringSoon);

  const { unidades: unidadesUnificadas } = useUnidadesUnificadas();
  const allUnidades = useMemo(() => {
    const s = new Set<string>(unidadesUnificadas);
    for (const i of influenciadoras) for (const u of unidadesDe(i)) s.add(u);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [influenciadoras, unidadesUnificadas]);

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
      return true;
    });
  }, [influenciadoras, cardFilter, unidadeFilter, statusParceria, statusCupom]);

  const toggleCard = (c: FilterCard) => setCardFilter((prev) => (prev === c ? null : c));

  const KpiCard = ({
    label,
    value,
    active,
    onClick,
    tone,
  }: {
    label: string;
    value: number;
    active: boolean;
    onClick: () => void;
    tone?: "green-dark" | "green-light" | "neutral" | "terracotta" | "amber";
  }) => {
    const toneBar: Record<string, string> = {
      "green-dark": "bg-[color:var(--color-blow-green-dark)]",
      "green-light": "bg-[color:var(--color-blow-green-light)]",
      neutral: "bg-[color:var(--color-blow-neutral-dark)]",
      terracotta: "bg-[color:var(--color-blow-terracotta)]",
      amber: "bg-amber-500",
    };
    return (
      <button
        onClick={onClick}
        className={cn(
          "card-blow p-5 text-left transition-all hover:shadow-md relative overflow-hidden",
          active && "ring-2 ring-[color:var(--color-blow-green)]",
        )}
      >
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-semibold text-[color:var(--color-blow-green-dark)]">
          {value}
        </div>
        {tone && (
          <div className={cn("absolute right-0 bottom-0 h-1.5 w-24", toneBar[tone])} />
        )}
      </button>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          label="Influenciadoras ativas"
          value={ativas.length}
          active={cardFilter === "ativas"}
          onClick={() => toggleCard("ativas")}
          tone="green-dark"
        />
        <KpiCard
          label="Influenciadoras inativas"
          value={inativas.length}
          active={cardFilter === "inativas"}
          onClick={() => toggleCard("inativas")}
          tone="neutral"
        />
        <KpiCard
          label="Unidades ativas"
          value={unidadesAtivas.size}
          active={cardFilter === "unidades"}
          onClick={() => toggleCard("unidades")}
          tone="green-light"
        />
        <KpiCard
          label="Cupons expirados"
          value={expirados.length}
          active={cardFilter === "expirados"}
          onClick={() => toggleCard("expirados")}
          tone="terracotta"
        />
        <KpiCard
          label="Expirando em 30 dias"
          value={expirando.length}
          active={cardFilter === "expirando"}
          onClick={() => toggleCard("expirando")}
          tone="amber"
        />
      </div>


      <div className="flex flex-wrap gap-3 mb-6">
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
          <h4 className="font-semibold text-[color:var(--color-blow-green-dark)]">{i.nome}</h4>
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
              className="text-[11px] rounded-full bg-[color:var(--color-blow-pink-light)] text-[color:var(--color-blow-green-dark)] px-2 py-0.5"
            >
              {u}
            </span>
          ))}
        </div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Formato</dt>
          <dd className="font-medium">{i.formato_parceria ?? "—"}</dd>
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
  const [form, setForm] = useState({
    solicitante_nome: "",
    solicitante_email: "",
    nome_influenciador: "",
    unidade: "",
    codigo_cupom_sugerido: "",
    outras_unidades: "",
    formato_parceria_sugerido: "clube",
    instagram: "",
    contato: "",
    observacao: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const { unidades: unidadesUnificadas } = useUnidadesUnificadas();
  const unidadesSugestoes = useMemo(() => {
    const s = new Set<string>(unidadesUnificadas);
    for (const i of influenciadoras) for (const u of unidadesDe(i)) s.add(u);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [influenciadoras, unidadesUnificadas]);

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
        <h3 className="text-xl font-semibold text-[color:var(--color-blow-green-dark)] mb-3">
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
            setForm({
              solicitante_nome: "",
              solicitante_email: "",
              nome_influenciador: "",
              unidade: "",
              codigo_cupom_sugerido: "",
              outras_unidades: "",
              formato_parceria_sugerido: "clube",
              instagram: "",
              contato: "",
              observacao: "",
            });
          }}
        >
          Fazer nova solicitação
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl card-blow p-6 space-y-4">
      <h3 className="text-lg font-semibold text-[color:var(--color-blow-green-dark)]">
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
        <Field label="Outras unidades (separe por vírgula)">
          <Input value={form.outras_unidades} onChange={(e) => upd("outras_unidades")(e.target.value)} />
        </Field>
        <Field label="Formato de parceria sugerido">
          <Select
            value={form.formato_parceria_sugerido}
            onValueChange={upd("formato_parceria_sugerido")}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="clube">Clube</SelectItem>
              <SelectItem value="pontual">Pontual</SelectItem>
              <SelectItem value="inauguracao">Inauguração</SelectItem>
            </SelectContent>
          </Select>
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

// ---------- Aprovacoes tab ----------
function AprovacoesTab({
  password,
  onChanged,
}: {
  password: string;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ClubeSolicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("clube_listar_solicitacoes_pendentes", {
      p_password: password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((data ?? []) as ClubeSolicitacao[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (id: string, kind: "aprovar" | "rejeitar") => {
    setBusy(id);
    const fn = kind === "aprovar" ? "clube_aprovar_solicitacao" : "clube_rejeitar_solicitacao";
    const { data, error } = await supabase.rpc(fn, { p_id: id, p_password: password });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const msg = (data as { message?: string })?.message ?? (kind === "aprovar" ? "Aprovada" : "Rejeitada");
    const ok = (data as { success?: boolean })?.success !== false;
    (ok ? toast.success : toast.error)(msg);
    await load();
    if (kind === "aprovar") onChanged();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (items.length === 0)
    return (
      <div className="card-blow p-8 text-center text-muted-foreground text-sm">
        Nenhuma solicitação pendente. 🎉
      </div>
    );

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
      {items.map((s) => (
        <div key={s.id} className="card-blow p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-[color:var(--color-blow-green-dark)]">
                {s.nome_influenciador ?? "—"}
              </h4>
              <p className="text-xs text-muted-foreground">{s.unidade ?? "—"}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {s.formato_parceria_sugerido ?? "—"}
            </Badge>
          </div>
          {s.outras_unidades && (
            <p className="mt-2 text-xs">
              <span className="text-muted-foreground">Outras unidades:</span> {s.outras_unidades}
            </p>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div>
              <dt className="text-muted-foreground">Instagram</dt>
              <dd className="font-medium truncate">{s.instagram || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contato</dt>
              <dd className="font-medium truncate">{s.contato || "—"}</dd>
            </div>
          </dl>
          {s.observacao && (
            <p className="mt-3 text-xs text-muted-foreground italic">"{s.observacao}"</p>
          )}
          <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
            Solicitado por <strong>{s.solicitante_nome || "—"}</strong>
            {s.solicitante_email && <> · {s.solicitante_email}</>}
            <br />
            {s.created_at ? dateBR(s.created_at) : ""}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-[color:var(--color-blow-green)] hover:bg-[color:var(--color-blow-green-dark)]"
              disabled={busy === s.id}
              onClick={() => act(s.id, "aprovar")}
            >
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-[color:var(--color-blow-terracotta)] text-[color:var(--color-blow-terracotta)] hover:bg-[color:var(--color-blow-terracotta)]/10"
              disabled={busy === s.id}
              onClick={() => act(s.id, "rejeitar")}
            >
              Rejeitar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Editar tab ----------
function EditarTab({
  password,
  influenciadoras,
  reload,
}: {
  password: string;
  influenciadoras: ClubeInfluenciadora[];
  reload: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return influenciadoras;
    return influenciadoras.filter((i) => i.nome?.toLowerCase().includes(term));
  }, [influenciadoras, q]);

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Label className="text-xs text-muted-foreground">Buscar por nome</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite o nome…" />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
        {filtered.map((i) => (
          <EditRow key={i.id} i={i} password={password} onSaved={reload} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma influenciadora encontrada.</p>
      )}
    </div>
  );
}

function EditRow({
  i,
  password,
  onSaved,
}: {
  i: ClubeInfluenciadora;
  password: string;
  onSaved: () => void;
}) {
  const initial = {
    unidade: i.unidade ?? "",
    unidades_extras: (i.unidades_inclusas ?? []).filter((u) => u && u !== i.unidade).join(", "),
    formato_parceria: i.formato_parceria ?? "",
    status_parceria: (i.status_parceria as string) ?? "ativa",
    codigo_cupom: i.codigo_cupom ?? "",
    status_cupom: (i.status_cupom as string) ?? "ativa",
    data_inicio: i.data_inicio ?? "",
    data_validade: i.data_validade ?? "",
    instagram: i.instagram ?? "",
    contato: i.contato ?? "",
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const upd = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    const diff = (a: string, b: string) => (a === b ? null : a);
    const unidadesArr = form.unidades_extras
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const originalArr = initial.unidades_extras
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const unidadesChanged =
      unidadesArr.length !== originalArr.length ||
      unidadesArr.some((v, idx) => v !== originalArr[idx]);

    const payload = {
      p_id: i.id,
      p_password: password,
      p_unidade: diff(form.unidade, initial.unidade),
      p_unidades_inclusas: unidadesChanged ? unidadesArr : null,
      p_formato_parceria: diff(form.formato_parceria, initial.formato_parceria),
      p_status_parceria: diff(form.status_parceria, initial.status_parceria),
      p_codigo_cupom: diff(form.codigo_cupom, initial.codigo_cupom),
      p_status_cupom: diff(form.status_cupom, initial.status_cupom),
      p_data_inicio: diff(form.data_inicio, initial.data_inicio),
      p_data_validade: diff(form.data_validade, initial.data_validade),
      p_instagram: diff(form.instagram, initial.instagram),
      p_contato: diff(form.contato, initial.contato),
    };

    const { data, error } = await supabase.rpc("clube_atualizar_influenciadora", payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const msg = (data as { message?: string })?.message ?? "Salvo";
    const ok = (data as { success?: boolean })?.success !== false;
    (ok ? toast.success : toast.error)(msg);
    if (ok) onSaved();
  };

  return (
    <div className="card-blow p-5 space-y-3">
      <h4 className="font-semibold text-[color:var(--color-blow-green-dark)]">{i.nome}</h4>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unidade">
          <Input value={form.unidade} onChange={(e) => upd("unidade")(e.target.value)} />
        </Field>
        <Field label="Formato">
          <Input value={form.formato_parceria} onChange={(e) => upd("formato_parceria")(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Unidades extras (separe por vírgula)">
            <Input value={form.unidades_extras} onChange={(e) => upd("unidades_extras")(e.target.value)} />
          </Field>
        </div>
        <Field label="Status da parceria">
          <Select value={form.status_parceria} onValueChange={upd("status_parceria")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status do cupom">
          <Select value={form.status_cupom} onValueChange={upd("status_cupom")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Código do cupom">
          <Input value={form.codigo_cupom} onChange={(e) => upd("codigo_cupom")(e.target.value)} />
        </Field>
        <Field label="Instagram">
          <Input value={form.instagram} onChange={(e) => upd("instagram")(e.target.value)} />
        </Field>
        <Field label="Data de início">
          <Input type="date" value={form.data_inicio ?? ""} onChange={(e) => upd("data_inicio")(e.target.value)} />
        </Field>
        <Field label="Data de validade">
          <Input type="date" value={form.data_validade ?? ""} onChange={(e) => upd("data_validade")(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Contato">
            <Input value={form.contato} onChange={(e) => upd("contato")(e.target.value)} />
          </Field>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );
}
