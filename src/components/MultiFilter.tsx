import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function MultiFilter({
  label,
  options,
  optionLabels,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  optionLabels?: Map<string, string>;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const labelFor = (o: string) => optionLabels?.get(o) ?? o;
  const shown = query
    ? options.filter((o) => labelFor(o).toLowerCase().includes(query.toLowerCase()))
    : options;
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-[200px] justify-start font-normal"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground">Todos</span>
            ) : (
              <span className="flex items-center gap-1">
                <Badge
                  variant="secondary"
                  className="bg-[color:var(--color-blow-pink-light)] text-[color:var(--color-blow-orange-dark)]"
                >
                  {selected.length}
                </Badge>
                selecionados
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-2 border-b border-border">
            <input
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              {shown.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">
                  Nada encontrado.
                </div>
              )}
              {shown.map((o) => (
                <label
                  key={o}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selected.includes(o)}
                    onCheckedChange={() => toggle(o)}
                  />
                  <span className="truncate">{labelFor(o)}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          {selected.length > 0 && (
            <div className="p-2 border-t border-border flex justify-between">
              <button
                onClick={() => onChange([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
              <span className="text-xs text-muted-foreground">
                {selected.length} de {options.length}
              </span>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
