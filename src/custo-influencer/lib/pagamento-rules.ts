// Regra de negócio: comprovante obrigatório para marcar como Pago
// quando houver valor em dinheiro (Dinheiro ou Misto).

export const MSG_COMPROVANTE_OBRIGATORIO =
  "Anexe o comprovante de pagamento antes de marcar como Pago.";

export interface PagavelLike {
  status: string;
  valor_dinheiro: number | string | null;
  comprovante_url: string | null;
}

/** Retorna a mensagem de bloqueio, ou null quando pode marcar como Pago. */
export function bloqueioParaPago(r: PagavelLike): string | null {
  const dinheiro = Number(r.valor_dinheiro ?? 0);
  if (dinheiro > 0 && !r.comprovante_url?.trim()) return MSG_COMPROVANTE_OBRIGATORIO;
  return null;
}
