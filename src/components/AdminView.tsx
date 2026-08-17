import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useInfluenciadoras, type ClubeInfluenciadora } from "@/hooks/useInfluenciadoras";
import { useInauguracoes, type Inauguracao } from "@/hooks/useInauguracoes";
import { formatoLabel, unidadesDe, computeAllUnidades } from "@/lib/influenciadoras";
import { extractUF } from "@/lib/inauguracoes";

// ---------- Types ----------
type ClubeSolicitacao = {
  id: string;
  created_at: string;
  nome_influenciador: string | null;
  unidade: string | null;
  outras_unidades: string | null;
  formato_parceria_sugerido: string | null;
  codigo_cupom_sugerido: string | null;
  status_parceria_sugerido: string | null;
  data_validade_sugerida: string | null;
  data_encerramento_parceria_sugerida: string | null;
  instagram: string | null;
  contato: string | null;
  observacao: string | null;
  status_solicitacao: string | null;
  solicitante_nome: string | null;
  solicitante_email: string | null;
};

type Unidade = { nome: string; uf: string | null };

const computeAllFormatos = (influenciadoras: ClubeInfluenciadora[]): string[] => {
  const s = new Set<string>();
  for (const i of influenciadoras) if (i.formato_parceria) s.add(i.formato_parceria);
  return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
};

type AdminSubTab = "aprovacoes" | "editar" | "unidades" | "inauguracoes";

// ---------- Main ----------
export default function AdminView() {
  const [adminPass, setAdminPass] = useState<string | null>(null);
  const [sub, setSub] = useState<AdminSubTab>("aprovacoes");
  const { influenciadoras, reload } = useInfluenciadoras();
  const { rows: inauguracoes, reload: reloadInauguracoes } = useInauguracoes();

  const tabs: { id: AdminSubTab; label: string }[] = [
    { id: "aprovacoes", label: "Aprovações" },
    { id: "editar", label: "Editar Influenciadoras" },
    { id: "unidades", label: "Unidades" },
    { id: "inauguracoes", label: "Gerenciar Inaugurações" },
  ];

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <AdminGate password={adminPass} onAuthed={setAdminPass}>
        {(pw) => (
          <>
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

            {sub === "aprovacoes" && (
              <AprovacoesTab password={pw} onChanged={reload} />
            )}
            {sub === "editar" && (
              <EditarTab password={pw} influenciadoras={influenciadoras} reload={reload} />
            )}
            {sub === "unidades" && <UnidadesTab password={pw} />}
            {sub === "inauguracoes" && (
              <ManageInauguracoes
                password={pw}
                rows={inauguracoes}
                reload={reloadInauguracoes}
              />
            )}
          </>
        )}
      </AdminGate>
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
        Espaço da equipe de marketing franqueadora. Digite a senha de
        administrador para acessar.
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
              <h4 className="font-semibold text-[color:var(--color-blow-orange-dark)]">
                {s.nome_influenciador ?? "—"}
              </h4>
              <p className="text-xs text-muted-foreground">{s.unidade ?? "—"}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {formatoLabel(s.formato_parceria_sugerido)}
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
            {s.codigo_cupom_sugerido && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Cupom sugerido</dt>
                <dd className="font-medium font-mono">{s.codigo_cupom_sugerido}</dd>
              </div>
            )}
            {s.status_parceria_sugerido && (
              <div>
                <dt className="text-muted-foreground">Status da parceria</dt>
                <dd className="font-medium">{s.status_parceria_sugerido}</dd>
              </div>
            )}
            {s.data_validade_sugerida && (
              <div>
                <dt className="text-muted-foreground">Validade do cupom</dt>
                <dd className="font-medium">{dateBR(s.data_validade_sugerida)}</dd>
              </div>
            )}
            {s.data_encerramento_parceria_sugerida && (
              <div>
                <dt className="text-muted-foreground">Encerramento da parceria</dt>
                <dd className="font-medium">{dateBR(s.data_encerramento_parceria_sugerida)}</dd>
              </div>
            )}
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
  const [unidadeFilter, setUnidadeFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [formatoFilter, setFormatoFilter] = useState("todos");

  const { unidades: unidadesUnificadas } = useUnidadesUnificadas();
  const allUnidades = useMemo(
    () => computeAllUnidades(influenciadoras, unidadesUnificadas),
    [influenciadoras, unidadesUnificadas],
  );
  const allFormatos = useMemo(
    () => computeAllFormatos(influenciadoras),
    [influenciadoras],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return influenciadoras.filter((i) => {
      if (term && !i.nome?.toLowerCase().includes(term)) return false;
      if (unidadeFilter !== "todas" && !unidadesDe(i).includes(unidadeFilter)) return false;
      if (statusFilter !== "todos" && i.status_parceria !== statusFilter) return false;
      if (formatoFilter !== "todos" && i.formato_parceria !== formatoFilter) return false;
      return true;
    });
  }, [influenciadoras, q, unidadeFilter, statusFilter, formatoFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[220px]">
          <Label className="text-xs text-muted-foreground">Buscar por nome</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite o nome…" />
        </div>
        <div className="min-w-[200px]">
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Formato de parceria</Label>
          <Select value={formatoFilter} onValueChange={setFormatoFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {allFormatos.map((f) => (
                <SelectItem key={f} value={f}>{formatoLabel(f)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
    nome: i.nome ?? "",
    unidade: i.unidade ?? "",
    unidades_extras: (i.unidades_inclusas ?? []).filter((u) => u && u !== i.unidade).join(", "),
    formato_parceria: i.formato_parceria ?? "",
    status_parceria: (i.status_parceria as string) ?? "ativa",
    codigo_cupom: i.codigo_cupom ?? "",
    status_cupom: (i.status_cupom as string) ?? "ativa",
    data_inicio: i.data_inicio ?? "",
    data_validade: i.data_validade ?? "",
    data_encerramento_parceria: i.data_encerramento_parceria ?? "",
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
      p_nome: diff(form.nome.trim(), initial.nome),
      p_unidade: diff(form.unidade, initial.unidade),
      p_unidades_inclusas: unidadesChanged ? unidadesArr : null,
      p_formato_parceria: diff(form.formato_parceria, initial.formato_parceria),
      p_status_parceria: diff(form.status_parceria, initial.status_parceria),
      p_codigo_cupom: diff(form.codigo_cupom, initial.codigo_cupom),
      p_status_cupom: diff(form.status_cupom, initial.status_cupom),
      p_data_inicio: diff(form.data_inicio, initial.data_inicio),
      p_data_validade: diff(form.data_validade, initial.data_validade),
      p_data_encerramento_parceria: diff(
        form.data_encerramento_parceria,
        initial.data_encerramento_parceria,
      ),
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
      <h4 className="font-semibold text-[color:var(--color-blow-orange-dark)]">{i.nome}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Nome do influenciador">
            <Input value={form.nome} onChange={(e) => upd("nome")(e.target.value)} />
          </Field>
        </div>
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
        <Field label="Encerramento da parceria">
          <Input
            type="date"
            value={form.data_encerramento_parceria ?? ""}
            onChange={(e) => upd("data_encerramento_parceria")(e.target.value)}
          />
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

// ---------- Unidades (lista mestre) ----------
function UnidadesTab({ password }: { password: string }) {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [uf, setUf] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("unidades").select("*").order("nome");
    if (error) toast.error(error.message);
    setUnidades((data ?? []) as Unidade[]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return unidades;
    return unidades.filter((u) => u.nome.toLowerCase().includes(term));
  }, [unidades, q]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("clube_adicionar_unidade", {
      p_nome: nome.trim(),
      p_uf: uf.trim() ? uf.trim().toUpperCase() : null,
      p_password: password,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const msg = (data as { message?: string } | null)?.message ?? "Salvo";
    const ok = (data as { success?: boolean } | null)?.success !== false;
    (ok ? toast.success : toast.error)(msg);
    if (ok) {
      setNome("");
      setUf("");
      await reload();
    }
  };

  const remove = async (unidadeNome: string) => {
    setBusy(unidadeNome);
    const { data, error } = await supabase.rpc("clube_remover_unidade", {
      p_nome: unidadeNome,
      p_password: password,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const msg = (data as { message?: string } | null)?.message ?? "Removido";
    const ok = (data as { success?: boolean } | null)?.success !== false;
    (ok ? toast.success : toast.error)(msg);
    if (ok) await reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Unidades</h2>
        <p className="text-sm text-muted-foreground">
          Lista mestre de unidades usada nos campos de seleção de "Unidade" em todo o
          dashboard — independente de a unidade já ter passado por uma inauguração
          acompanhada aqui.
        </p>
      </div>

      <form onSubmit={add} className="card-blow p-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[280px] flex-1">
          <Label className="text-xs text-muted-foreground">Nome da unidade *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Ex: bLOw SP | Franca - Centro' />
        </div>
        <div className="w-24">
          <Label className="text-xs text-muted-foreground">UF</Label>
          <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="SP" />
        </div>
        <Button type="submit" disabled={saving || !nome.trim()}>
          {saving ? "Adicionando…" : "+ Adicionar unidade"}
        </Button>
      </form>

      <div className="max-w-md">
        <Label className="text-xs text-muted-foreground">Buscar</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite o nome…" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada.</p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {filtered.map((u) => (
            <div key={u.nome} className="card-blow p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{u.nome}</div>
                {u.uf && <div className="text-xs text-muted-foreground">{u.uf}</div>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy === u.nome}
                onClick={() => remove(u.nome)}
                className="text-[color:var(--color-blow-terracotta)] hover:bg-[color:var(--color-blow-terracotta)]/10"
              >
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Gerenciar inaugurações ----------
function ManageInauguracoes({
  password,
  rows,
  reload,
}: {
  password: string;
  rows: Inauguracao[];
  reload: () => void | Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.estabelecimento?.toLowerCase().includes(term));
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="max-w-md flex-1 min-w-[240px]">
          <Label className="text-xs text-muted-foreground">Buscar por estabelecimento</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Digite o nome…"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? "Cancelar" : "+ Adicionar unidade"}
        </Button>
      </div>

      {showAdd && (
        <AddInauguracaoForm
          password={password}
          onSaved={async () => {
            await reload();
            setShowAdd(false);
          }}
        />
      )}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}
      >
        {filtered.map((r) => (
          <EditInauguracaoRow key={r.id} r={r} password={password} onSaved={reload} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada.</p>
      )}
    </div>
  );
}

function EditInauguracaoRow({
  r,
  password,
  onSaved,
}: {
  r: Inauguracao;
  password: string;
  onSaved: () => void | Promise<void>;
}) {
  const initial = {
    estabelecimento: r.estabelecimento ?? "",
    data_inauguracao: r.data_inauguracao ?? "",
    uf: r.uf ?? "",
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const upd = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    const diff = (a: string, b: string) => (a === b ? null : a);
    const payload = {
      p_id: r.id,
      p_password: password,
      p_estabelecimento: diff(form.estabelecimento.trim(), initial.estabelecimento),
      p_data_inauguracao: diff(form.data_inauguracao, initial.data_inauguracao),
      p_uf: diff(
        form.uf.trim() ? form.uf.trim().toUpperCase() : "",
        initial.uf,
      ),
    };
    const { data, error } = await supabase.rpc("clube_atualizar_inauguracao", payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const msg = (data as { message?: string } | null)?.message ?? "Salvo";
    const ok = (data as { ok?: boolean; success?: boolean } | null);
    const okFlag = ok?.ok !== false && ok?.success !== false;
    (okFlag ? toast.success : toast.error)(msg);
    if (okFlag) await onSaved();
  };

  return (
    <div className="card-blow p-5 space-y-3">
      <h4 className="font-semibold text-[color:var(--color-blow-orange-dark)] leading-tight">
        {r.estabelecimento}
      </h4>
      <p className="text-xs text-muted-foreground -mt-2">
        Inaugurada em {dateBR(r.data_inauguracao)}
        {r.uf ? ` · ${r.uf}` : ""}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Estabelecimento</Label>
          <Input
            value={form.estabelecimento}
            onChange={(e) => upd("estabelecimento")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Data de inauguração</Label>
          <Input
            type="date"
            value={form.data_inauguracao}
            onChange={(e) => upd("data_inauguracao")(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">UF</Label>
          <Input
            value={form.uf}
            onChange={(e) => upd("uf")(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
          />
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );
}

function AddInauguracaoForm({
  password,
  onSaved,
}: {
  password: string;
  onSaved: () => void | Promise<void>;
}) {
  const [estabelecimento, setEstabelecimento] = useState("");
  const [dataInauguracao, setDataInauguracao] = useState("");
  const [uf, setUf] = useState("");
  const [saving, setSaving] = useState(false);
  const { unidades } = useUnidadesUnificadas();

  const selectUnidade = (nome: string) => {
    setEstabelecimento(nome);
    const inferida = extractUF(nome);
    if (inferida) setUf(inferida);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estabelecimento.trim() || !dataInauguracao) {
      toast.error("Preencha estabelecimento e data.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("clube_adicionar_inauguracao", {
      p_estabelecimento: estabelecimento.trim(),
      p_data_inauguracao: dataInauguracao,
      p_uf: uf.trim() ? uf.trim().toUpperCase() : null,
      p_password: password,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const msg =
      (data as { message?: string } | null)?.message ??
      "Inauguração adicionada.";
    const ok = (data as { ok?: boolean } | null)?.ok !== false;
    if (ok) {
      toast.success(msg);
      setEstabelecimento("");
      setDataInauguracao("");
      setUf("");
      await onSaved();
    } else {
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={submit} className="card-blow p-6 space-y-4">
      <h3 className="font-semibold text-[color:var(--color-blow-orange-dark)]">
        Adicionar nova inauguração
      </h3>
      <div className="space-y-1.5">
        <Label htmlFor="estab">Unidade *</Label>
        <Select value={estabelecimento} onValueChange={selectUnidade}>
          <SelectTrigger id="estab"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
          <SelectContent>
            {unidades.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Não achou a unidade? Cadastre em Influenciadores → Unidades primeiro.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="data">Data de inauguração *</Label>
          <Input
            id="data"
            type="date"
            value={dataInauguracao}
            onChange={(e) => setDataInauguracao(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uf">UF</Label>
          <Input
            id="uf"
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="RS"
            maxLength={2}
          />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Salvando…" : "Adicionar inauguração"}
      </Button>
    </form>
  );
}
