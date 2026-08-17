import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HistoricoRow } from "@/custo-influencer/lib/db-types";
import { formatDateTime } from "@/custo-influencer/lib/format";

export function HistoricoTable({ rows }: { rows: HistoricoRow[] }) {
  const [user, setUser] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (user && !r.usuario.toLowerCase().includes(user.toLowerCase())) return false;
      if (start && r.data_hora < start) return false;
      if (end && r.data_hora.slice(0, 10) > end) return false;
      return true;
    });
  }, [rows, user, start, end]);

  return (
    <div className="space-y-4">
      <div className="card-blow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Usuário</Label>
            <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Buscar por nome/email" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card-blow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2">Data/Hora</th>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Sem entradas.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.data_hora)}</td>
                <td className="px-3 py-2">{r.usuario}</td>
                <td className="px-3 py-2 font-medium">{r.acao_realizada}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.detalhe ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
