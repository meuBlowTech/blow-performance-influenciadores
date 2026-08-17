import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FRENTES, FRENTE_LABEL, type Registro } from "@/custo-influencer/lib/db-types";
import { formatBRL } from "@/custo-influencer/lib/format";

const COLORS = ["var(--color-blow-orange-dark)", "var(--color-blow-green)", "var(--color-blow-coral)"];

export function DonutByFrente({ registros }: { registros: Registro[] }) {
  const data = useMemo(() => {
    return FRENTES.map((f) => {
      const total = registros
        .filter((r) => r.frente === f)
        .reduce((s, r) => s + Number(r.valor_dinheiro || 0) + Number(r.valor_permuta || 0), 0);
      return { name: FRENTE_LABEL[f], value: total };
    }).filter((d) => d.value > 0);
  }, [registros]);

  return (
    <div className="card-blow p-4">
      <h3 className="font-semibold mb-3 text-[color:var(--color-blow-orange-dark)]">
        Participação por frente
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              formatter={(v: number) => formatBRL(Number(v))}
              itemStyle={{ color: "var(--color-foreground)" }}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ color: "var(--color-muted-foreground)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
