import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, History, Shield, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { supabase } from "@/custo-influencer/integrations/supabase/client";
import { useAuth, canCreateEdit, canPay, canViewHistorico, isAdmin } from "@/custo-influencer/hooks/useAuth";
import { useRegistros, useFilteredRegistros, type RegistroInput } from "@/custo-influencer/hooks/useRegistros";
import { useHistorico } from "@/custo-influencer/hooks/useHistorico";
import { logHistorico } from "@/custo-influencer/lib/historico";
import { todayISO } from "@/custo-influencer/lib/format";
import { describeSupaError, logSupaError } from "@/custo-influencer/lib/supa-error";
import { uploadNF } from "@/custo-influencer/lib/nf-upload";
import { uploadComprovante, removeComprovante } from "@/custo-influencer/lib/comprovante-upload";
import {
  notificarNFSlack,
  notificarPagamentoSlack,
  dispararPagamentosPrevistos,
  dispararNovosPrevistos,
} from "@/custo-influencer/lib/slack.functions";
import { bloqueioParaPago } from "@/custo-influencer/lib/pagamento-rules";
import type { AppRole, Registro } from "@/custo-influencer/lib/db-types";

import { SummaryCards } from "@/custo-influencer/components/dashboard/SummaryCards";
import { GlobalFilters } from "@/custo-influencer/components/dashboard/GlobalFilters";
import { StackedBarByFrente } from "@/custo-influencer/components/dashboard/StackedBarByFrente";
import { DonutByFrente } from "@/custo-influencer/components/dashboard/DonutByFrente";
import { MatrixFrenteMes } from "@/custo-influencer/components/dashboard/MatrixFrenteMes";
import { RegistrosTable } from "@/custo-influencer/components/registros/RegistrosTable";
import { RegistroForm } from "@/custo-influencer/components/forms/RegistroForm";
import { RegistroDetails } from "@/custo-influencer/components/registros/RegistroDetails";
import { HistoricoTable } from "@/custo-influencer/components/historico/HistoricoTable";
import { CustosSignIn } from "@/custo-influencer/components/CustosSignIn";

type CustosSubTab = "dashboard" | "historico" | "perfis";

// ---------- Entry point ----------
export function CustosInfluenciaTab() {
  const { user, roles, userLabel, loading: loadingPerfil } = useAuth();

  if (!user) return <CustosSignIn />;

  return <CustosAuthenticated roles={roles} userLabel={userLabel} loadingPerfil={loadingPerfil} />;
}

// ---------- Authenticated shell (header + inner nav) ----------
function CustosAuthenticated({
  roles,
  userLabel,
  loadingPerfil,
}: {
  roles: AppRole[];
  userLabel: string;
  loadingPerfil: boolean;
}) {
  const [sub, setSub] = useState<CustosSubTab>("dashboard");
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  };

  const semPerfil = !loadingPerfil && roles.length === 0;

  const tabs: { id: CustosSubTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(canViewHistorico(roles) ? [{ id: "historico" as const, label: "Histórico", icon: History }] : []),
    ...(isAdmin(roles) ? [{ id: "perfis" as const, label: "Perfis", icon: Shield }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-muted-foreground">{userLabel}</span>
          {loadingPerfil ? (
            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">carregando perfil…</span>
          ) : roles.length ? (
            roles.map((r) => (
              <span
                key={r}
                className="px-1.5 py-0.5 rounded bg-[color:var(--color-blow-orange-dark)] text-white text-[10px] font-medium"
              >
                {r}
              </span>
            ))
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-[color:var(--color-blow-terracotta)] text-white text-[10px] font-medium">
              sem perfil
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut} disabled={signingOut}>
          <LogOut className="h-4 w-4 mr-1" /> Sair
        </Button>
      </div>

      {semPerfil && (
        <div className="rounded-md border border-[color:var(--color-blow-terracotta)]/40 bg-[color:var(--color-blow-pink-light)]/40 px-4 py-2.5 text-sm">
          <strong>Perfil não atribuído.</strong> Você está autenticada(o) mas ainda não tem
          permissões. Peça a alguém com perfil Marketing pra liberar o seu na aba Perfis.
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px inline-flex items-center gap-1.5",
              sub === t.id
                ? "border-[color:var(--color-blow-orange-dark)] text-[color:var(--color-blow-orange-dark)]"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {sub === "dashboard" && <CustosDashboard roles={roles} userLabel={userLabel} loadingPerfil={loadingPerfil} />}
      {sub === "historico" && canViewHistorico(roles) && <CustosHistorico />}
      {sub === "perfis" && isAdmin(roles) && <CustosPerfis />}
    </div>
  );
}

// ---------- Dashboard ----------
function CustosDashboard({
  roles,
  userLabel,
  loadingPerfil,
}: {
  roles: AppRole[];
  userLabel: string;
  loadingPerfil: boolean;
}) {
  const { data: registros, isLoading, create, update, remove } = useRegistros();
  const { filters, setFilters, filtered } = useFilteredRegistros(registros);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Registro | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<Registro | null>(null);

  const editAllowed = !loadingPerfil && canCreateEdit(roles);
  const payAllowed = !loadingPerfil && canPay(roles);
  const compAllowed = !loadingPerfil && roles.includes("Financeiro");

  const handleNew = () => { setEditing(null); setOpen(true); };
  const handleEdit = (r: Registro) => { setEditing(r); setOpen(true); };

  const diffString = (oldR: Registro, newR: RegistroInput): string => {
    const keys: (keyof RegistroInput)[] = [
      "frente", "influenciador", "handle", "acao", "cidade", "forma_pagamento",
      "valor_dinheiro", "valor_permuta", "status", "data_prevista", "responsavel",
    ];
    const parts: string[] = [];
    for (const k of keys) {
      const a = (oldR as unknown as Record<string, unknown>)[k];
      const b = (newR as unknown as Record<string, unknown>)[k];
      if (String(a ?? "") !== String(b ?? "")) parts.push(`${k}: ${a ?? "—"} → ${b ?? "—"}`);
    }
    return parts.join(" | ");
  };

  const notificarSlackPagamento = async (registroId: string) => {
    try {
      await notificarPagamentoSlack({ data: { registroId } });
      await logHistorico({
        registro_id: registroId,
        usuario: userLabel,
        acao_realizada: "notificação Slack: pagamento efetuado",
        detalhe: "enviada com sucesso",
      });
    } catch (e) {
      const msg = describeSupaError(e);
      logSupaError("notificarSlackPagamento", e);
      await logHistorico({
        registro_id: registroId,
        usuario: userLabel,
        acao_realizada: "falha na notificação Slack: pagamento efetuado",
        detalhe: msg,
      });
      toast.warning(`Status atualizado, mas a notificação no Slack falhou: ${msg}`);
    }
  };

  const notificarSlackNF = async (registroId: string) => {
    try {
      await notificarNFSlack({ data: { registroId } });
      await logHistorico({
        registro_id: registroId,
        usuario: userLabel,
        acao_realizada: "notificação Slack: NF anexada",
        detalhe: "enviada com sucesso",
      });
    } catch (e) {
      const msg = describeSupaError(e);
      logSupaError("notificarSlackNF", e);
      await logHistorico({
        registro_id: registroId,
        usuario: userLabel,
        acao_realizada: "falha na notificação Slack: NF anexada",
        detalhe: msg,
      });
      toast.warning(`NF anexada, mas a notificação no Slack falhou: ${msg}`);
    }
  };

  const handleSave = async (input: RegistroInput, nfFile?: File | null) => {
    if (input.status === "Pago") {
      const bloqueio = bloqueioParaPago({
        status: input.status,
        valor_dinheiro: input.valor_dinheiro,
        comprovante_url: input.comprovante_url ?? editing?.comprovante_url ?? null,
      });
      if (bloqueio) { toast.error(bloqueio); throw new Error(bloqueio); }
    }
    const virouPago = input.status === "Pago" && editing?.status !== "Pago";
    try {
      let target: Registro;
      let action: "criou" | "editou";
      if (editing) {
        target = await update.mutateAsync({ id: editing.id, patch: input });
        action = "editou";
      } else {
        target = await create.mutateAsync(input);
        action = "criou";
      }

      let nfChanged: "anexou" | "substituiu" | null = null;
      if (nfFile) {
        try {
          const path = await uploadNF(target.id, nfFile);
          const had = !!(editing?.nf_url);
          await update.mutateAsync({ id: target.id, patch: { nf_url: path } });
          nfChanged = had ? "substituiu" : "anexou";
        } catch (upErr) {
          toast.warning(`Registro salvo, mas falha ao enviar NF: ${describeSupaError(upErr)}`);
        }
      }

      const baseDetalhe = action === "editou"
        ? (diffString(editing!, input) || "sem mudanças relevantes")
        : `${input.frente} · ${input.influenciador}`;
      const hist = await logHistorico({
        registro_id: target.id,
        usuario: userLabel,
        acao_realizada: `${action} registro`,
        detalhe: baseDetalhe,
      });
      if (!hist.success) toast.warning(`Registro salvo, mas histórico falhou: ${hist.error}`);

      if (nfChanged) {
        await logHistorico({
          registro_id: target.id,
          usuario: userLabel,
          acao_realizada: `${nfChanged} NF`,
          detalhe: nfFile?.name ?? null,
        });
        await notificarSlackNF(target.id);
      }

      toast.success(action === "criou" ? "Registro criado" : "Registro atualizado");
      if (virouPago) await notificarSlackPagamento(target.id);
    } catch (e) {
      logSupaError("handleSave", e);
      const msg = describeSupaError(e);
      toast.error(`Erro ao salvar: ${msg}`);
      throw new Error(msg);
    }
  };

  const handleAttachNF = async (r: Registro, file: File) => {
    try {
      const path = await uploadNF(r.id, file);
      await update.mutateAsync({ id: r.id, patch: { nf_url: path } });
      const acao = r.nf_url ? "substituiu NF" : "anexou NF";
      await logHistorico({ registro_id: r.id, usuario: userLabel, acao_realizada: acao, detalhe: file.name });
      toast.success(r.nf_url ? "NF substituída" : "NF anexada");
      await notificarSlackNF(r.id);
    } catch (e) {
      logSupaError("handleAttachNF", e);
      toast.error(`Erro ao enviar NF: ${describeSupaError(e)}`);
    }
  };

  const handleAttachComprovante = async (r: Registro, file: File) => {
    try {
      const path = await uploadComprovante(r.id, file);
      await update.mutateAsync({ id: r.id, patch: { comprovante_url: path } });
      const acao = r.comprovante_url ? "substituiu comprovante de pagamento" : "anexou comprovante de pagamento";
      await logHistorico({ registro_id: r.id, usuario: userLabel, acao_realizada: acao, detalhe: file.name });
      toast.success(r.comprovante_url ? "Comprovante substituído" : "Comprovante anexado");
    } catch (e) {
      logSupaError("handleAttachComprovante", e);
      toast.error(`Erro ao enviar comprovante: ${describeSupaError(e)}`);
    }
  };

  const handleRemoveComprovante = async (r: Registro) => {
    if (!r.comprovante_url) return;
    try {
      await removeComprovante(r.comprovante_url);
      await update.mutateAsync({ id: r.id, patch: { comprovante_url: null } });
      await logHistorico({ registro_id: r.id, usuario: userLabel, acao_realizada: "removeu comprovante de pagamento", detalhe: null });
      toast.success("Comprovante removido");
    } catch (e) {
      logSupaError("handleRemoveComprovante", e);
      toast.error(`Erro ao remover: ${describeSupaError(e)}`);
    }
  };

  const handleOpenDetails = (r: Registro) => { setDetailsRow(r); setDetailsOpen(true); };
  const handleEditFromDetails = (r: Registro) => { setDetailsOpen(false); setEditing(r); setOpen(true); };

  const handleDelete = async (r: Registro) => {
    try {
      await remove.mutateAsync(r.id);
      const hist = await logHistorico({ registro_id: null, usuario: userLabel, acao_realizada: "excluiu registro", detalhe: `${r.frente} · ${r.influenciador}` });
      if (!hist.success) toast.warning(`Excluído, mas histórico falhou: ${hist.error}`);
      else toast.success("Registro excluído");
    } catch (e) {
      logSupaError("handleDelete", e);
      toast.error(`Erro ao excluir: ${describeSupaError(e)}`);
    }
  };

  const handleTogglePay = async (r: Registro) => {
    const novo = r.status === "Pago" ? "Previsto" : "Pago";
    if (novo === "Pago") {
      const bloqueio = bloqueioParaPago(r);
      if (bloqueio) { toast.error(bloqueio); return; }
    }
    try {
      const patch: Partial<RegistroInput> = { status: novo, data_pagamento: novo === "Pago" ? todayISO() : null };
      await update.mutateAsync({ id: r.id, patch });
      const hist = await logHistorico({ registro_id: r.id, usuario: userLabel, acao_realizada: `marcou como ${novo}`, detalhe: `Status: ${r.status} → ${novo}` });
      if (!hist.success) toast.warning(`Status alterado, mas histórico falhou: ${hist.error}`);
      else toast.success(`Marcado como ${novo}`);
      if (novo === "Pago") await notificarSlackPagamento(r.id);
    } catch (e) {
      logSupaError("handleTogglePay", e);
      toast.error(`Erro: ${describeSupaError(e)}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Custos de influência</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada de custo por frente</p>
        </div>
        {editAllowed && (
          <Button onClick={handleNew}><Plus className="h-4 w-4 mr-1" />Novo registro</Button>
        )}
      </div>

      <GlobalFilters filters={filters} setFilters={setFilters} />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <SummaryCards registros={filtered} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><StackedBarByFrente registros={filtered} /></div>
            <DonutByFrente registros={filtered} />
          </div>
          <MatrixFrenteMes registros={filtered} />
          <div>
            <h3 className="text-lg font-semibold mb-3">Registros</h3>
            <RegistrosTable
              registros={filtered}
              canEdit={editAllowed || payAllowed}
              canDelete={editAllowed}
              canTogglePay={payAllowed}
              canAttachNF={editAllowed}
              canAttachComprovante={compAllowed}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePay={handleTogglePay}
              onAttachNF={handleAttachNF}
              onAttachComprovante={handleAttachComprovante}
              onOpenDetails={handleOpenDetails}
            />
          </div>
        </>
      )}

      <RegistroForm open={open} onOpenChange={setOpen} initial={editing} canAttachNF={editAllowed} onSave={handleSave} />
      <RegistroDetails
        registro={detailsRow}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        canEdit={editAllowed || payAllowed}
        canAttachNF={editAllowed}
        canAttachComprovante={compAllowed}
        onEdit={handleEditFromDetails}
        onAttachNF={handleAttachNF}
        onAttachComprovante={handleAttachComprovante}
        onRemoveComprovante={handleRemoveComprovante}
      />
    </div>
  );
}

// ---------- Histórico ----------
function CustosHistorico() {
  const { data, isLoading } = useHistorico();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Histórico</h2>
        <p className="text-sm text-muted-foreground">Auditoria de todas as ações registradas</p>
      </div>
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <HistoricoTable rows={data ?? []} />
      )}
    </div>
  );
}

// ---------- Perfis ----------
interface RoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

function CustosPerfis() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AppRole>("Marketing");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("user_roles" as never).select("*").order("created_at", { ascending: false });
    setRows((data as unknown as RoleRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const grant = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId.trim());
      if (!isUuid) {
        toast.error("Cole o UUID do usuário (veja em 'Meu ID de usuário' abaixo, depois do login).");
        return;
      }
      const { error } = await supabase.from("user_roles" as never).insert({ user_id: userId.trim(), role } as never);
      if (error) throw error;
      toast.success("Perfil atribuído");
      setUserId("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("user_roles" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Perfil removido");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Administração de perfis</h2>
        <p className="text-sm text-muted-foreground">Atribua Financeiro, Marketing ou Influência aos usuários.</p>
      </div>

      <div className="card-blow p-4 space-y-3">
        <h3 className="font-semibold">Notificações Slack</h3>
        <p className="text-sm text-muted-foreground">
          Dispare agora as rotinas agendadas: o resumo do meio-dia (pagamentos previstos para hoje
          e daqui a 2 dias) e o resumo das 18h (novos previstos incluídos hoje). Se não houver nada
          a reportar, nenhuma mensagem é enviada.
        </p>
        <div className="flex flex-wrap gap-2">
          <TestarSlack />
          <TestarNovosPrevistos />
        </div>
      </div>

      <div className="card-blow p-4">
        <h3 className="font-semibold mb-3">Meu ID de usuário</h3>
        <MyUserId />
      </div>

      <div className="card-blow p-4 space-y-3">
        <h3 className="font-semibold">Conceder perfil</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground">UUID do usuário</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="00000000-0000-..." />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Financeiro">Financeiro</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Influencia">Influência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={grant} disabled={loading}>Atribuir</Button>
        </div>
      </div>

      <div className="card-blow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Perfil</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Nenhuma atribuição ainda.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{r.user_id}</td>
                <td className="px-3 py-2"><Badge>{r.role}</Badge></td>
                <td className="px-3 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => revoke(r.id)}>
                    <Trash2 className="h-4 w-4 text-[color:var(--color-blow-terracotta)]" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TestarSlack() {
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    try {
      const res = await dispararPagamentosPrevistos();
      if (res.enviado) {
        toast.success(`Resumo enviado ao Slack · hoje: ${res.hoje} · em 2 dias: ${res.emDoisDias}`);
      } else {
        toast.info("Nenhum pagamento previsto para hoje ou daqui a 2 dias — nada enviado.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao disparar notificação");
    } finally {
      setRunning(false);
    }
  };
  return (
    <Button onClick={run} disabled={running} variant="outline">
      <Send className="h-4 w-4 mr-1" />
      {running ? "Enviando..." : "Testar previstos (12h)"}
    </Button>
  );
}

function TestarNovosPrevistos() {
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    try {
      const res = await dispararNovosPrevistos();
      if (res.enviado) toast.success(`Resumo enviado ao Slack · ${res.quantidade} novo(s) previsto(s)`);
      else toast.info("Nenhum previsto criado hoje — nada enviado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao disparar notificação");
    } finally {
      setRunning(false);
    }
  };
  return (
    <Button onClick={run} disabled={running} variant="outline">
      <Send className="h-4 w-4 mr-1" />
      {running ? "Enviando..." : "Testar novos previstos (18h)"}
    </Button>
  );
}

function MyUserId() {
  const [id, setId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    });
  }, []);
  if (!id) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  return (
    <div className="text-sm space-y-1">
      <div><span className="text-muted-foreground">E-mail:</span> {email}</div>
      <div className="font-mono text-xs break-all"><span className="text-muted-foreground font-sans">UUID:</span> {id}</div>
      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(id); toast.success("UUID copiado"); }}>Copiar UUID</Button>
    </div>
  );
}
