export type Frente = "Inauguracao" | "AON de Marca" | "AON Franquias";
export type FormaPagamento = "Dinheiro" | "Permuta" | "Misto";
export type StatusRegistro = "Previsto" | "Pago";
export type AppRole = "Financeiro" | "Marketing" | "Influencia";

export interface Registro {
  id: string;
  frente: Frente;
  influenciador: string;
  handle: string | null;
  acao: string | null;
  cidade: string | null;
  forma_pagamento: FormaPagamento | null;
  valor_dinheiro: number;
  valor_permuta: number;
  descricao_permuta: string | null;
  status: StatusRegistro;
  data_prevista: string | null;
  data_pagamento: string | null;
  responsavel: string | null;
  obs: string | null;
  nf_url: string | null;
  comprovante_url: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface HistoricoRow {
  id: string;
  registro_id: string | null;
  usuario: string;
  acao_realizada: string;
  detalhe: string | null;
  data_hora: string;
}

export const FRENTES: Frente[] = ["Inauguracao", "AON de Marca", "AON Franquias"];
export const FORMAS: FormaPagamento[] = ["Dinheiro", "Permuta", "Misto"];
export const STATUSES: StatusRegistro[] = ["Previsto", "Pago"];

export const FRENTE_LABEL: Record<Frente, string> = {
  Inauguracao: "Inauguração",
  "AON de Marca": "AON de Marca",
  "AON Franquias": "AON Franquias",
};
