import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FRENTES, STATUSES, FORMAS, FRENTE_LABEL } from "@/custo-influencer/lib/db-types";
import type { Filters } from "@/custo-influencer/hooks/useRegistros";
import { defaultFilters } from "@/custo-influencer/hooks/useRegistros";
import { Filter, X } from "lucide-react";

export function GlobalFilters({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  return (
    <div className="card-blow p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-[color:var(--color-blow-orange-dark)]" />
        <h3 className="font-semibold">Filtros</h3>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setFilters(defaultFilters)}>
          <X className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Frente</Label>
          <Select value={filters.frente} onValueChange={(v) => setFilters({ ...filters, frente: v as Filters["frente"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {FRENTES.map((f) => <SelectItem key={f} value={f}>{FRENTE_LABEL[f]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v as Filters["status"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Pagamento</Label>
          <Select value={filters.forma} onValueChange={(v) => setFilters({ ...filters, forma: v as Filters["forma"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {FORMAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
