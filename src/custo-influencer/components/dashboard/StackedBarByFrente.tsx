import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { FRENTES, FRENTE_LABEL, type Registro } from "@/custo-influencer/lib/db-types";
import { monthKey, monthLabel, formatBRL } from "@/custo-influencer/lib/format";

type Metric = "total" | "dinheiro" | "permuta";

// Mesma ordem categórica fixa usada nos outros gráficos por "frente" deste
// dashboard (ver routes/index.tsx BAR_PALETTE).
const FRENTE_COLOR: Record<string, string> = {
  Inauguracao: "var(--color-blow-orange-dark)",
  "AON de Marca": "var(--color-blow-green)",
  "AON Franquias": "var(--color-blow-coral)",
};

export function StackedBarByFrente({ registros }: { registros: Registro[] }) {
  const [metric, setMetric] = useState<Metric>("total");

  const data = useMemo(() => {
    const months = new Map<string, Record<string, number | string>>();
    for (const r of registros) {
      const key = monthKey(r.data_prevista ?? r.data_pagamento);
      if (key === "—") continue;
      if (!months.has(key)) {
        const base: Record<string, number | string> = { mes: key };
        FRENTES.forEach((f) => (base[f] = 0));
        months.set(key, base);
      }
      const row = months.get(key)!;
      const dn = Number(r.valor_dinheiro || 0);
      const pm = Number(r.valor_permuta || 0);
      const v = metric === "dinheiro" ? dn : metric === "permuta" ? pm : dn + pm;
      row[r.frente] = Number(row[r.frente] || 0) + v;
    }
    return Array.from(months.values()).sort((a, b) => String(a.mes).localeCompare(String(b.mes)));
  }, [registros, metric]);

  return (
    <div className="card-blow p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-[color:var(--color-blow-orange-dark)]">
          Investimento por frente · mês a mês
        </h3>
        <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="total">Total</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="permuta">Permuta</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="mes"
              tickFormatter={(v) => monthLabel(String(v))}
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            />
            <YAxis
              tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-accent)", fillOpacity: 0.4 }}
              itemStyle={{ color: "var(--color-foreground)" }}
              labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
              formatter={(v: number) => formatBRL(Number(v))}
              labelFormatter={(l) => monthLabel(String(l))}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ color: "var(--color-muted-foreground)" }}
              formatter={(value) => FRENTE_LABEL[value as keyof typeof FRENTE_LABEL] ?? value}
            />
            {FRENTES.map((f) => (
              <Bar key={f} dataKey={f} stackId="a" fill={FRENTE_COLOR[f]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
