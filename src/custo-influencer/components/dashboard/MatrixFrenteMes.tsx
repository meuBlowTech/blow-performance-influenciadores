import { useMemo } from "react";
import { FRENTES, FRENTE_LABEL, type Registro } from "@/custo-influencer/lib/db-types";
import { monthKey, monthLabel, formatBRL } from "@/custo-influencer/lib/format";

export function MatrixFrenteMes({ registros }: { registros: Registro[] }) {
  const { months, matrix, totalsByMonth, totalsByFrente, grand } = useMemo(() => {
    const monthsSet = new Set<string>();
    const matrix: Record<string, Record<string, number>> = {};
    FRENTES.forEach((f) => (matrix[f] = {}));
    for (const r of registros) {
      const m = monthKey(r.data_prevista ?? r.data_pagamento);
      if (m === "—") continue;
      monthsSet.add(m);
      matrix[r.frente][m] = (matrix[r.frente][m] || 0) + Number(r.valor_dinheiro || 0) + Number(r.valor_permuta || 0);
    }
    const months = Array.from(monthsSet).sort();
    const totalsByMonth: Record<string, number> = {};
    const totalsByFrente: Record<string, number> = {};
    let grand = 0;
    for (const m of months) {
      let t = 0;
      for (const f of FRENTES) {
        const v = matrix[f][m] || 0;
        t += v;
        totalsByFrente[f] = (totalsByFrente[f] || 0) + v;
      }
      totalsByMonth[m] = t;
      grand += t;
    }
    return { months, matrix, totalsByMonth, totalsByFrente, grand };
  }, [registros]);

  return (
    <div className="card-blow p-4 overflow-x-auto">
      <h3 className="font-semibold mb-3 text-[color:var(--color-blow-orange-dark)]">
        Matriz Frente × Mês
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-3">Frente</th>
            {months.map((m) => (
              <th key={m} className="py-2 px-2 text-right">{monthLabel(m)}</th>
            ))}
            <th className="py-2 pl-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {FRENTES.map((f) => (
            <tr key={f} className="border-t border-border">
              <td className="py-2 pr-3 font-medium">{FRENTE_LABEL[f]}</td>
              {months.map((m) => (
                <td key={m} className="py-2 px-2 text-right tabular-nums">{formatBRL(matrix[f][m] || 0)}</td>
              ))}
              <td className="py-2 pl-2 text-right font-semibold tabular-nums">{formatBRL(totalsByFrente[f] || 0)}</td>
            </tr>
          ))}
          <tr className="border-t border-border bg-muted/30">
            <td className="py-2 pr-3 font-semibold">Total</td>
            {months.map((m) => (
              <td key={m} className="py-2 px-2 text-right font-semibold tabular-nums">{formatBRL(totalsByMonth[m] || 0)}</td>
            ))}
            <td className="py-2 pl-2 text-right font-bold text-[color:var(--color-blow-orange-dark)] tabular-nums">
              {formatBRL(grand)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
