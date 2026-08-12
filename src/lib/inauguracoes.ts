import { isoDay } from "@/lib/format";

export const comandaKey = (r: {
  estabelecimento: string | null;
  comanda: string | null;
  data_hora_atendimento: string | null;
}) =>
  `${r.estabelecimento ?? ""}||${r.comanda ?? ""}||${
    r.data_hora_atendimento ? isoDay(r.data_hora_atendimento) : ""
  }`;

export const extractUF = (nome: string): string | null => {
  const m = nome.match(/bLOw\s+([A-Za-z]{2})\s*\|/i);
  return m ? m[1].toUpperCase() : null;
};
