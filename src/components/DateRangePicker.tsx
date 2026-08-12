import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DateRangePicker({
  label,
  start,
  end,
  onChange,
}: {
  label: string;
  start?: Date;
  end?: Date;
  onChange: (s?: Date, e?: Date) => void;
}) {
  const text =
    start && end
      ? `${format(start, "dd/MM/yy", { locale: ptBR })} — ${format(end, "dd/MM/yy", { locale: ptBR })}`
      : start
        ? `A partir de ${format(start, "dd/MM/yy", { locale: ptBR })}`
        : end
          ? `Até ${format(end, "dd/MM/yy", { locale: ptBR })}`
          : "Todos os períodos";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-[240px] justify-start font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {text}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
          <Calendar
            mode="range"
            locale={ptBR}
            selected={{ from: start, to: end }}
            onSelect={(r) => onChange(r?.from, r?.to)}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
