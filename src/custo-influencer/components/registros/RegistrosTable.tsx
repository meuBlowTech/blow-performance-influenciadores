import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, RotateCcw, FileText, Paperclip, Loader2, Receipt, ChevronRight } from "lucide-react";
import type { Registro } from "@/custo-influencer/lib/db-types";
import { formatBRL, formatData } from "@/custo-influencer/lib/format";
import { NF_ACCEPT, validateNFFile } from "@/custo-influencer/lib/nf-upload";
import { COMP_ACCEPT, validateComprovanteFile } from "@/custo-influencer/lib/comprovante-upload";
import { toast } from "sonner";
import { bloqueioParaPago } from "@/custo-influencer/lib/pagamento-rules";

interface Props {
  registros: Registro[];
  canEdit: boolean;
  canDelete: boolean;
  canTogglePay: boolean;
  canAttachNF: boolean;
  canAttachComprovante: boolean;
  onEdit: (r: Registro) => void;
  onDelete: (r: Registro) => Promise<void>;
  onTogglePay: (r: Registro) => Promise<void>;
  onAttachNF: (r: Registro, file: File) => Promise<void>;
  onAttachComprovante: (r: Registro, file: File) => Promise<void>;
  onOpenDetails: (r: Registro) => void;
  onViewNF: (path: string) => Promise<void>;
  onViewComprovante: (path: string) => Promise<void>;
}

type UploadKind = "nf" | "comp";

function StatusBadge({ status }: { status: Registro["status"] }) {
  const pago = status === "Pago";
  return (
    <Badge
      className={
        pago
          ? "bg-[color:var(--color-blow-green)] text-white hover:bg-[color:var(--color-blow-green)]"
          : "bg-[color:var(--color-blow-terracotta)] text-white hover:bg-[color:var(--color-blow-terracotta)]"
      }
    >
      {status}
    </Badge>
  );
}

export function RegistrosTable({
  registros,
  canEdit,
  canDelete,
  canTogglePay,
  canAttachNF,
  canAttachComprovante,
  onEdit,
  onDelete,
  onTogglePay,
  onAttachNF,
  onAttachComprovante,
  onOpenDetails,
  onViewNF,
  onViewComprovante,
}: Props) {
  const [toDelete, setToDelete] = useState<Registro | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [nfLoadingId, setNfLoadingId] = useState<string | null>(null);
  const [compLoadingId, setCompLoadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [target, setTarget] = useState<{ row: Registro; kind: UploadKind } | null>(null);

  const triggerAttach = (row: Registro, kind: UploadKind) => {
    setTarget({ row, kind });
    if (fileInputRef.current) {
      fileInputRef.current.accept = kind === "nf" ? NF_ACCEPT : COMP_ACCEPT;
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !target) return;
    const { row, kind } = target;
    const v = kind === "nf" ? validateNFFile(f) : validateComprovanteFile(f);
    if (v) { toast.error(v); return; }
    if (kind === "nf") {
      setNfLoadingId(row.id);
      try { await onAttachNF(row, f); } finally { setNfLoadingId(null); setTarget(null); }
    } else {
      setCompLoadingId(row.id);
      try { await onAttachComprovante(row, f); } finally { setCompLoadingId(null); setTarget(null); }
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleViewNF = async (path: string) => {
    try { await onViewNF(path); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao abrir NF"); }
  };
  const handleViewComp = async (path: string) => {
    try { await onViewComprovante(path); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao abrir comprovante"); }
  };

  return (
    <div className="card-blow overflow-x-auto">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
      />
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-2 py-2 w-8"></th>
            <th className="px-3 py-2">Frente</th>
            <th className="px-3 py-2">Influenciador</th>
            <th className="px-3 py-2">Ação</th>
            <th className="px-3 py-2">Cidade</th>
            <th className="px-3 py-2 text-right">Dinheiro</th>
            <th className="px-3 py-2 text-right">Permuta</th>
            <th className="px-3 py-2">Prevista</th>
            <th className="px-3 py-2">Pagamento</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">NF</th>
            <th className="px-3 py-2">Comprovante</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {registros.length === 0 && (
            <tr><td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
          )}
          {registros.map((r) => (
            <tr
              key={r.id}
              className="border-t border-border hover:bg-muted/30 cursor-pointer"
              onClick={() => onOpenDetails(r)}
            >
              <td className="px-2 py-2 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="border-[color:var(--color-blow-orange)]/50 text-[color:var(--color-blow-orange-dark)]">
                  {r.frente}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <div className="font-medium underline-offset-2 hover:underline">{r.influenciador}</div>
                {r.handle && <div className="text-xs text-muted-foreground">{r.handle}</div>}
              </td>
              <td className="px-3 py-2">{r.acao ?? "—"}</td>
              <td className="px-3 py-2">{r.cidade ?? "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatBRL(Number(r.valor_dinheiro))}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatBRL(Number(r.valor_permuta))}</td>
              <td className="px-3 py-2">{formatData(r.data_prevista)}</td>
              <td className="px-3 py-2">{formatData(r.data_pagamento)}</td>
              <td className="px-3 py-2">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-3 py-2" onClick={stop}>
                <div className="flex items-center gap-1">
                  {r.nf_url ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleViewNF(r.nf_url!)} title="Abrir NF">
                      <FileText className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {canAttachNF && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={nfLoadingId === r.id}
                      onClick={() => triggerAttach(r, "nf")}
                      title={r.nf_url ? "Substituir NF" : "Anexar NF"}
                    >
                      {nfLoadingId === r.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Paperclip className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-3 py-2" onClick={stop}>
                <div className="flex items-center gap-1">
                  {r.comprovante_url ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleViewComp(r.comprovante_url!)} title="Abrir comprovante">
                      <Receipt className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {canAttachComprovante && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={compLoadingId === r.id}
                      onClick={() => triggerAttach(r, "comp")}
                      title={r.comprovante_url ? "Substituir comprovante" : "Anexar comprovante"}
                    >
                      {compLoadingId === r.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Paperclip className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-3 py-2" onClick={stop}>
                <div className="flex items-center justify-end gap-1">
                  {canTogglePay && (
                    <Button size="icon" variant="ghost" disabled={loadingId === r.id}
                      onClick={async () => { setLoadingId(r.id); await onTogglePay(r); setLoadingId(null); }}
                      title={r.status === "Pago" ? "Voltar para Previsto" : (bloqueioParaPago(r) ?? "Marcar como Pago")}>
                      {r.status === "Pago" ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4 text-[color:var(--color-blow-green-dark)]" />}
                    </Button>
                  )}
                  {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => onEdit(r)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(r)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-[color:var(--color-blow-terracotta)]" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro "{toDelete?.influenciador}" será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[color:var(--color-blow-terracotta)] text-white hover:bg-[color:var(--color-blow-terracotta)]/90"
              onClick={async () => { if (toDelete) { await onDelete(toDelete); setToDelete(null); } }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
