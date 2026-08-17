import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil, FileText, Paperclip, Receipt, Loader2, Trash2 } from "lucide-react";
import type { Registro } from "@/custo-influencer/lib/db-types";
import { FRENTE_LABEL } from "@/custo-influencer/lib/db-types";
import { formatBRL, formatData } from "@/custo-influencer/lib/format";
import { NF_ACCEPT, openNF, validateNFFile } from "@/custo-influencer/lib/nf-upload";
import { COMP_ACCEPT, openComprovante, validateComprovanteFile } from "@/custo-influencer/lib/comprovante-upload";
import { toast } from "sonner";

interface Props {
  registro: Registro | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  canEdit: boolean;
  canAttachNF: boolean;
  canAttachComprovante: boolean;
  onEdit: (r: Registro) => void;
  onAttachNF: (r: Registro, file: File) => Promise<void>;
  onAttachComprovante: (r: Registro, file: File) => Promise<void>;
  onRemoveComprovante: (r: Registro) => Promise<void>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function RegistroDetails({
  registro,
  open,
  onOpenChange,
  canEdit,
  canAttachNF,
  canAttachComprovante,
  onEdit,
  onAttachNF,
  onAttachComprovante,
  onRemoveComprovante,
}: Props) {
  const nfRef = useRef<HTMLInputElement | null>(null);
  const compRef = useRef<HTMLInputElement | null>(null);
  const [nfLoading, setNfLoading] = useState(false);
  const [compLoading, setCompLoading] = useState(false);

  if (!registro) return null;
  const r = registro;

  const handleNF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const v = validateNFFile(f); if (v) { toast.error(v); return; }
    setNfLoading(true);
    try { await onAttachNF(r, f); } finally { setNfLoading(false); }
  };

  const handleComp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const v = validateComprovanteFile(f); if (v) { toast.error(v); return; }
    setCompLoading(true);
    try { await onAttachComprovante(r, f); } finally { setCompLoading(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-[color:var(--color-blow-orange)]/50 text-[color:var(--color-blow-orange-dark)]">
              {FRENTE_LABEL[r.frente]}
            </Badge>
            <Badge
              className={
                r.status === "Pago"
                  ? "bg-[color:var(--color-blow-green)] text-white hover:bg-[color:var(--color-blow-green)]"
                  : "bg-[color:var(--color-blow-terracotta)] text-white hover:bg-[color:var(--color-blow-terracotta)]"
              }
            >
              {r.status}
            </Badge>
          </div>
          <SheetTitle className="text-left text-[color:var(--color-blow-orange-dark)]">{r.influenciador}</SheetTitle>
          {r.handle && <SheetDescription className="text-left">{r.handle}</SheetDescription>}
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ação">{r.acao ?? "—"}</Field>
            <Field label="Cidade">{r.cidade ?? "—"}</Field>
            <Field label="Forma de pagamento">{r.forma_pagamento ?? "—"}</Field>
            <Field label="Responsável">{r.responsavel ?? "—"}</Field>
            <Field label="Valor em dinheiro"><span className="tabular-nums">{formatBRL(Number(r.valor_dinheiro))}</span></Field>
            <Field label="Valor em permuta"><span className="tabular-nums">{formatBRL(Number(r.valor_permuta))}</span></Field>
            <Field label="Data prevista">{formatData(r.data_prevista)}</Field>
            <Field label="Data de pagamento">{formatData(r.data_pagamento)}</Field>
          </div>

          {r.descricao_permuta && (
            <Field label="Descrição da permuta">
              <p className="whitespace-pre-wrap">{r.descricao_permuta}</p>
            </Field>
          )}

          <Field label="Observações">
            <p className="whitespace-pre-wrap text-sm">
              {r.obs?.trim() ? r.obs : <span className="text-muted-foreground">—</span>}
            </p>
          </Field>

          <Separator />

          {/* Anexos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Nota fiscal</span>
                {!r.nf_url && <span className="text-muted-foreground text-xs">Não anexada</span>}
              </div>
              <div className="flex items-center gap-1">
                {r.nf_url && (
                  <Button size="sm" variant="outline" onClick={() => openNF(r.nf_url!).catch((e) => toast.error(e instanceof Error ? e.message : "Falha"))}>
                    Abrir
                  </Button>
                )}
                {canAttachNF && (
                  <>
                    <input ref={nfRef} type="file" accept={NF_ACCEPT} className="hidden" onChange={handleNF} />
                    <Button size="sm" variant="ghost" disabled={nfLoading} onClick={() => nfRef.current?.click()}>
                      {nfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                      <span className="ml-1">{r.nf_url ? "Substituir" : "Anexar"}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Comprovante de pagamento</span>
                {!r.comprovante_url && <span className="text-muted-foreground text-xs">Não anexado</span>}
              </div>
              <div className="flex items-center gap-1">
                {r.comprovante_url && (
                  <Button size="sm" variant="outline" onClick={() => openComprovante(r.comprovante_url!).catch((e) => toast.error(e instanceof Error ? e.message : "Falha"))}>
                    Abrir
                  </Button>
                )}
                {canAttachComprovante && (
                  <>
                    <input ref={compRef} type="file" accept={COMP_ACCEPT} className="hidden" onChange={handleComp} />
                    <Button size="sm" variant="ghost" disabled={compLoading} onClick={() => compRef.current?.click()}>
                      {compLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                      <span className="ml-1">{r.comprovante_url ? "Substituir" : "Anexar"}</span>
                    </Button>
                    {r.comprovante_url && (
                      <Button size="sm" variant="ghost" onClick={async () => { setCompLoading(true); try { await onRemoveComprovante(r); } finally { setCompLoading(false); } }} title="Remover comprovante">
                        <Trash2 className="h-4 w-4 text-[color:var(--color-blow-terracotta)]" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {canEdit && (
            <>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={() => onEdit(r)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
