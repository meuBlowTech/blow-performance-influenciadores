export function formatBRL(value: number | null | undefined): string {
  const v = typeof value === "number" ? value : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatData(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("T")[0].split("-");
    return `${day}/${m}/${y}`;
  } catch {
    return d;
  }
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(d: string | null | undefined): string {
  if (!d) return "—";
  return d.slice(0, 7); // YYYY-MM
}

export function monthLabel(key: string): string {
  if (!/^\d{4}-\d{2}$/.test(key)) return key;
  const [y, m] = key.split("-");
  const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${names[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
