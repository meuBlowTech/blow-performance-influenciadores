import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FRENTES, FORMAS, STATUSES, FRENTE_LABEL, type Registro } from "@/custo-influencer/lib/db-types";
import type { RegistroInput } from "@/custo-influencer/hooks/useRegistros";
import { NF_ACCEPT, validateNFFile } from "@/custo-influencer/lib/nf-upload";
import { bloqueioParaPago } from "@/custo-influencer/lib/pagamento-rules";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  initial?: Registro | null;
  canAttachNF?: boolean;
  onSave: (input: RegistroInput, nfFile?: File | null) => Promise<void>;
}

const empty: RegistroInput = {
  frente: "Inauguracao",
  influenciador: "",
  handle: "",
  acao: "",
  cidade: "",
  forma_pagamento: "Dinheiro",
  valor_dinheiro: 0,
  valor_permuta: 0,
  descricao_permuta: "",
  status: "Previsto",
  data_prevista: "",
  data_pagamento: null,
  responsavel: "",
  obs: "",
  nf_url: null,
  comprovante_url: null,
};

export function RegistroForm({ open, onOpenChange, initial, canAttachNF = true, onSave }: Props) {
  const [form, setForm] = useState<RegistroInput>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nfFile, setNfFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        const { id: _id, criado_em: _c, atualizado_em: _a, ...rest } = initial;
        setForm(rest);
      } else setForm(empty);
      setErr(null);
      setNfFile(null);
    }
  }, [open, initial]);

  const set = <K extends keyof RegistroInput>(k: K, v: RegistroInput[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      const v = validateNFFile(f);
      if (v) { setErr(v); setNfFile(null); e.target.value = ""; return; }
    }
    setErr(null);
    setNfFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.influenciador.trim()) { setErr("Informe o influenciador"); return; }
    if (!form.data_prevista) { setErr("Informe a data prevista"); return; }
    if (form.status === "Pago") {
      const bloqueio = bloqueioParaPago({
        status: form.status,
        valor_dinheiro: Number(form.valor_dinheiro) || 0,
        comprovante_url: form.comprovante_url ?? initial?.comprovante_url ?? null,
      });
      if (bloqueio) { setErr(bloqueio); return; }
    }

    setSaving(true);
    setErr(null);
    try {
      await onSave({
        ...form,
        valor_dinheiro: Number(form.valor_dinheiro) || 0,
        valor_permuta: Number(form.valor_permuta) || 0,
      }, nfFile);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (typeof e === "object" ? JSON.stringify(e) : String(e));
      console.error("[RegistroForm.submit]", e);
      setErr(msg || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[color:var(--color-blow-orange-dark)]">
            {initial ? "Editar registro" : "Novo registro"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Frente *</Label>
            <Select value={form.frente} onValueChange={(v) => set("frente", v as typeof form.frente)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FRENTES.map((f) => <SelectItem key={f} value={f}>{FRENTE_LABEL[f]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as typeof form.status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Influenciador *</Label>
            <Input value={form.influenciador} onChange={(e) => set("influenciador", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">@handle</Label>
            <Input value={form.handle ?? ""} onChange={(e) => set("handle", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Ação</Label>
            <Input value={form.acao ?? ""} onChange={(e) => set("acao", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cidade</Label>
            <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Responsável</Label>
            <Input value={form.responsavel ?? ""} onChange={(e) => set("responsavel", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
            <Select value={form.forma_pagamento ?? "Dinheiro"} onValueChange={(v) => set("forma_pagamento", v as typeof form.forma_pagamento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Data prevista *</Label>
            <Input type="date" value={form.data_prevista ?? ""} onChange={(e) => set("data_prevista", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Valor em dinheiro (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.valor_dinheiro} onChange={(e) => set("valor_dinheiro", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Valor em permuta (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.valor_permuta} onChange={(e) => set("valor_permuta", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Descrição da permuta</Label>
            <Input value={form.descricao_permuta ?? ""} onChange={(e) => set("descricao_permuta", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea value={form.obs ?? ""} onChange={(e) => set("obs", e.target.value)} rows={2} />
          </div>
          {canAttachNF && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Nota Fiscal (PDF, JPG ou PNG · máx 10 MB)</Label>
              <Input type="file" accept={NF_ACCEPT} onChange={handleFileChange} />
              {form.nf_url && !nfFile && (
                <p className="text-xs text-muted-foreground">NF já anexada. Selecione um arquivo para substituir.</p>
              )}
              {nfFile && (
                <p className="text-xs text-muted-foreground">Selecionado: {nfFile.name}</p>
              )}
            </div>
          )}
          {err && <div className="sm:col-span-2 text-sm text-[color:var(--color-blow-terracotta)]">{err}</div>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
