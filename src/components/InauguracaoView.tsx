import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { brl, num, dateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SubTab = "comparativo" | "gerenciar";

type Inauguracao = {
  id: string;
  estabelecimento: string;
  data_inauguracao: string;
  uf: string | null;
  dias_desde_inauguracao: number | null;
  janela_completa: boolean;
  receita_30d: number | null;
  atendimentos_30d: number | null;
  cupons_utilizados_30d: number | null;
  influenciadoras_ativas_30d: number | null;
};

const C = {
  greenDark: "#3D5F4A",
  green: "#6B9A73",
};

export default function InauguracaoView() {
  const [sub, setSub] = useState<SubTab>("comparativo");
  const [rows, setRows] = useState<Inauguracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminPass, setAdminPass] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clube_inauguracoes_30d")
      .select("*")
      .order("data_inauguracao", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Inauguracao[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const chartData = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            new Date(a.data_inauguracao).getTime() -
            new Date(b.data_inauguracao).getTime(),
        )
        .map((r) => ({
          nome: r.estabelecimento,
          data: dateBR(r.data_inauguracao),
          receita: Number(r.receita_30d ?? 0),
          janela_completa: r.janela_completa,
        })),
    [rows],
  );

  const tabs: { id: SubTab; label: string }[] = [
    { id: "comparativo", label: "Comparativo" },
    { id: "gerenciar", label: "Gerenciar Unidades" },
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

      {sub === "comparativo" && (
        <ComparativoSection loading={loading} rows={rows} chartData={chartData} />
      )}

      {sub === "gerenciar" && (
        adminPass ? (
          <ManageInauguracoes
            password={adminPass}
            rows={rows}
            reload={load}
          />
        ) : (
          <PasswordGate onAuthed={setAdminPass} />
        )
      )}
    </main>
  );
}

function ComparativoSection({
  loading,
  rows,
  chartData,
}: {
  loading: boolean;
  rows: Inauguracao[];
  chartData: { nome: string; data: string; receita: number; janela_completa: boolean }[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Comparativo de inaugurações
        </h2>
        <p className="text-sm text-muted-foreground">
          Performance dos primeiros 30 dias de cada unidade.
        </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((r) => (
                <div key={r.id} className="card-blow p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold leading-tight">
                        {r.estabelecimento}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.uf ? `${r.uf} · ` : ""}
                        Inaugurada em {dateBR(r.data_inauguracao)}
                        {r.dias_desde_inauguracao !== null &&
                          ` · há ${r.dias_desde_inauguracao} dia${r.dias_desde_inauguracao === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    {r.janela_completa ? (
                      <Badge
                        variant="secondary"
                        className="bg-[color:var(--color-blow-green-light)]/40 text-[color:var(--color-blow-green-dark)] border-0"
                      >
                        Janela 30d
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

                  {!r.janela_completa && (
                    <p className="text-xs text-[color:var(--color-blow-terracotta)]">
                      Janela em andamento — ainda não completou 30 dias.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Metric label="Receita 30d" value={brl(Number(r.receita_30d ?? 0))} />
                    <Metric label="Atendimentos" value={num(Number(r.atendimentos_30d ?? 0))} />
                    <Metric
                      label="Cupons utilizados"
                      value={num(Number(r.cupons_utilizados_30d ?? 0))}
                    />
                    <Metric
                      label="Influenciadoras ativas"
                      value={num(Number(r.influenciadoras_ativas_30d ?? 0))}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="card-blow p-6">
              <h3 className="font-semibold mb-1">Receita nos 30 dias por unidade</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Ordenado da inauguração mais antiga para a mais recente.
              </p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E2E0" />
                    <XAxis
                      dataKey="nome"
                      angle={-25}
                      textAnchor="end"
                      height={70}
                      interval={0}
                      tick={{ fontSize: 11, fill: C.greenDark }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: C.greenDark }}
                      tickFormatter={(v) => brl(Number(v)).replace("R$", "").trim()}
                    />
                    <Tooltip
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
          </>
        )}
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Gerenciar unidades
          </h2>
          <p className="text-sm text-muted-foreground">
            Área restrita — cadastro e edição das unidades inauguradas.
          </p>
        </div>

        {adminPass ? (
          <ManageInauguracoes
            password={adminPass}
            rows={rows}
            reload={load}
          />
        ) : (
          <PasswordGate onAuthed={setAdminPass} />
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold text-[color:var(--color-blow-green-dark)]">
        {value}
      </div>
    </div>
  );
}

function PasswordGate({ onAuthed }: { onAuthed: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [checking, setChecking] = useState(false);

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
          <EditRow key={r.id} r={r} password={password} onSaved={reload} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada.</p>
      )}
    </div>
  );
}

function EditRow({
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
      <h4 className="font-semibold text-[color:var(--color-blow-green-dark)] leading-tight">
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
      <h3 className="font-semibold text-[color:var(--color-blow-green-dark)]">
        Adicionar nova unidade
      </h3>
      <div className="space-y-1.5">
        <Label htmlFor="estab">Nome do estabelecimento *</Label>
        <Input
          id="estab"
          value={estabelecimento}
          onChange={(e) => setEstabelecimento(e.target.value)}
          placeholder='Ex: bLOw RS | POA - Rio Branco'
          required
        />
        <p className="text-xs text-muted-foreground">
          Use exatamente o mesmo nome usado na planilha do Trinks.
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
