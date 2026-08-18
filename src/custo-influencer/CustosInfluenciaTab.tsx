import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useRegistros, useFilteredRegistros, type RegistroInput } from "@/custo-influencer/hooks/useRegistros";
import { useHistorico } from "@/custo-influencer/hooks/useHistorico";
import { uploadArquivo, removerComprovante, abrirArquivo } from "@/custo-influencer/actions/arquivos.actions";
import { testarPagamentosPrevistos, testarNovosPrevistos } from "@/custo-influencer/actions/slack.actions";
import type { Registro } from "@/custo-influencer/lib/db-types";

import { SummaryCards } from "@/custo-influencer/components/dashboard/SummaryCards";
import { GlobalFilters } from "@/custo-influencer/components/dashboard/GlobalFilters";
import { StackedBarByFrente } from "@/custo-influencer/components/dashboard/StackedBarByFrente";
import { DonutByFrente } from "@/custo-influencer/components/dashboard/DonutByFrente";
import { MatrixFrenteMes } from "@/custo-influencer/components/dashboard/MatrixFrenteMes";
import { RegistrosTable } from "@/custo-influencer/components/registros/RegistrosTable";
import { RegistroForm } from "@/custo-influencer/components/forms/RegistroForm";
import { RegistroDetails } from "@/custo-influencer/components/registros/RegistroDetails";
import { HistoricoTable } from "@/custo-influencer/components/historico/HistoricoTable";

type CustosSubTab = "dashboard" | "historico";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

// ---------- Entry point ----------
// Não há mais login próprio: quem já passou pela senha de Administração tem
// acesso completo a este módulo, igual as outras abas do Admin.
export function CustosInfluenciaTab({ password }: { password: string }) {
  const [sub, setSub] = useState<CustosSubTab>("dashboard");

  const tabs: { id: CustosSubTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "historico", label: "Histórico" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border">
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

      {sub === "dashboard" && <CustosDashboard password={password} />}
      {sub === "historico" && <CustosHistorico password={password} />}
    </div>
  );
}

// ---------- Dashboard ----------
function CustosDashboard({ password }: { password: string }) {
  const { data: registros, isLoading, create, update, remove, togglePay } = useRegistros(password);
  const { filters, setFilters, filtered } = useFilteredRegistros(registros);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Registro | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<Registro | null>(null);

  const handleNew = () => { setEditing(null); setOpen(true); };
  const handleEdit = (r: Registro) => { setEditing(r); setOpen(true); };

  const handleSave = async (input: RegistroInput, nfFile?: File | null) => {
    try {
      const target = editing
        ? await update.mutateAsync({ id: editing.id, patch: input })
        : await create.mutateAsync(input);

      if (nfFile) {
        try {
          const base64 = await fileToBase64(nfFile);
          await uploadArquivo({
            data: {
              password,
              registroId: target.id,
              kind: "nf",
              fileName: nfFile.name,
              contentType: nfFile.type,
              base64,
            },
          });
        } catch (upErr) {
          toast.warning(`Registro salvo, mas falha ao enviar NF: ${upErr instanceof Error ? upErr.message : "erro"}`);
        }
      }

      toast.success(editing ? "Registro atualizado" : "Registro criado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(`Erro ao salvar: ${msg}`);
      throw new Error(msg);
    }
  };

  const handleAttachNF = async (r: Registro, file: File) => {
    try {
      const base64 = await fileToBase64(file);
      await uploadArquivo({
        data: { password, registroId: r.id, kind: "nf", fileName: file.name, contentType: file.type, base64 },
      });
      toast.success(r.nf_url ? "NF substituída" : "NF anexada");
    } catch (e) {
      toast.error(`Erro ao enviar NF: ${e instanceof Error ? e.message : "erro"}`);
    }
  };

  const handleAttachComprovante = async (r: Registro, file: File) => {
    try {
      const base64 = await fileToBase64(file);
      await uploadArquivo({
        data: { password, registroId: r.id, kind: "comp", fileName: file.name, contentType: file.type, base64 },
      });
      toast.success(r.comprovante_url ? "Comprovante substituído" : "Comprovante anexado");
    } catch (e) {
      toast.error(`Erro ao enviar comprovante: ${e instanceof Error ? e.message : "erro"}`);
    }
  };

  const handleRemoveComprovante = async (r: Registro) => {
    if (!r.comprovante_url) return;
    try {
      await removerComprovante({ data: { password, registroId: r.id, path: r.comprovante_url } });
      toast.success("Comprovante removido");
    } catch (e) {
      toast.error(`Erro ao remover: ${e instanceof Error ? e.message : "erro"}`);
    }
  };

  const handleViewNF = async (path: string) => {
    const { url } = await abrirArquivo({ data: { password, kind: "nf", path } });
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const handleViewComprovante = async (path: string) => {
    const { url } = await abrirArquivo({ data: { password, kind: "comp", path } });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenDetails = (r: Registro) => { setDetailsRow(r); setDetailsOpen(true); };
  const handleEditFromDetails = (r: Registro) => { setDetailsOpen(false); setEditing(r); setOpen(true); };

  const handleDelete = async (r: Registro) => {
    try {
      await remove.mutateAsync(r.id);
      toast.success("Registro excluído");
    } catch (e) {
      toast.error(`Erro ao excluir: ${e instanceof Error ? e.message : "erro"}`);
    }
  };

  const handleTogglePay = async (r: Registro) => {
    try {
      await togglePay.mutateAsync(r.id);
      toast.success(r.status === "Pago" ? "Marcado como Previsto" : "Marcado como Pago");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div />
        <div className="flex items-center gap-2">
          <TestarSlack password={password} />
          <TestarNovosPrevistos password={password} />
          <Button onClick={handleNew}><Plus className="h-4 w-4 mr-1" />Novo registro</Button>
        </div>
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
              canEdit
              canDelete
              canTogglePay
              canAttachNF
              canAttachComprovante
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePay={handleTogglePay}
              onAttachNF={handleAttachNF}
              onAttachComprovante={handleAttachComprovante}
              onOpenDetails={handleOpenDetails}
              onViewNF={handleViewNF}
              onViewComprovante={handleViewComprovante}
            />
          </div>
        </>
      )}

      <RegistroForm open={open} onOpenChange={setOpen} initial={editing} canAttachNF onSave={handleSave} />
      <RegistroDetails
        registro={detailsRow}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        canEdit
        canAttachNF
        canAttachComprovante
        onEdit={handleEditFromDetails}
        onAttachNF={handleAttachNF}
        onAttachComprovante={handleAttachComprovante}
        onRemoveComprovante={handleRemoveComprovante}
        onViewNF={handleViewNF}
        onViewComprovante={handleViewComprovante}
      />
    </div>
  );
}

// ---------- Histórico ----------
function CustosHistorico({ password }: { password: string }) {
  const { data, isLoading } = useHistorico(password);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Histórico</h3>
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

// ---------- Notificações Slack (disparo manual) ----------
function TestarSlack({ password }: { password: string }) {
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    try {
      const res = await testarPagamentosPrevistos({ data: { password } });
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
    <Button onClick={run} disabled={running} variant="outline" size="sm">
      <Send className="h-4 w-4 mr-1" />
      {running ? "Enviando..." : "Testar previstos (12h)"}
    </Button>
  );
}

function TestarNovosPrevistos({ password }: { password: string }) {
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    try {
      const res = await testarNovosPrevistos({ data: { password } });
      if (res.enviado) toast.success(`Resumo enviado ao Slack · ${res.quantidade} novo(s) previsto(s)`);
      else toast.info("Nenhum previsto criado hoje — nada enviado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao disparar notificação");
    } finally {
      setRunning(false);
    }
  };
  return (
    <Button onClick={run} disabled={running} variant="outline" size="sm">
      <Send className="h-4 w-4 mr-1" />
      {running ? "Enviando..." : "Testar novos previstos (18h)"}
    </Button>
  );
}
