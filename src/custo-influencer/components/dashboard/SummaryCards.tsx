import { formatBRL } from "@/custo-influencer/lib/format";
import type { Registro } from "@/custo-influencer/lib/db-types";
import { Banknote, Gift, Wallet, CheckCircle2, Clock } from "lucide-react";

export function SummaryCards({ registros }: { registros: Registro[] }) {
  const dinheiro = registros.reduce((s, r) => s + Number(r.valor_dinheiro || 0), 0);
  const permuta = registros.reduce((s, r) => s + Number(r.valor_permuta || 0), 0);
  const total = dinheiro + permuta;
  const pago = registros
    .filter((r) => r.status === "Pago")
    .reduce((s, r) => s + Number(r.valor_dinheiro || 0) + Number(r.valor_permuta || 0), 0);
  const previsto = total - pago;

  const items = [
    { label: "Custo Financeiro", value: dinheiro, icon: Banknote, color: "var(--color-blow-orange-dark)" },
    { label: "Custo em Permuta", value: permuta, icon: Gift, color: "var(--color-blow-coral)" },
    { label: "Investimento Total", value: total, icon: Wallet, color: "var(--color-blow-orange-dark)" },
    { label: "Pago", value: pago, icon: CheckCircle2, color: "var(--color-blow-green-dark)" },
    { label: "Previsto", value: previsto, icon: Clock, color: "var(--color-blow-terracotta)" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((it) => (
        <div key={it.label} className="card-blow p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <it.icon className="h-4 w-4" style={{ color: it.color }} />
            {it.label}
          </div>
          <div className="mt-2 text-xl font-semibold tabular-nums">{formatBRL(it.value)}</div>
        </div>
      ))}
    </div>
  );
}
