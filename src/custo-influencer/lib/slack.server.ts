// Server-only Slack helpers. Never imported by client code.

export interface RegistroSlack {
  influenciador: string;
  frente: string;
  acao: string | null;
  cidade: string | null;
  valor_dinheiro: number;
  valor_permuta: number;
  data_prevista: string | null;
  status: string;
  responsavel: string | null;
}

export function brl(v: number | null | undefined): string {
  return (typeof v === "number" ? v : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function dataBR(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export async function sendSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL_CUSTO;
  if (!url) throw new Error("SLACK_WEBHOOK_URL_CUSTO não configurado");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack respondeu ${res.status}: ${body.slice(0, 300)}`);
  }
}

export function buildNFMessage(r: RegistroSlack): string {
  return [
    ":page_facing_up: *Nova NF anexada*",
    "",
    `*Influenciador:* ${r.influenciador}`,
    `*Frente:* ${r.frente}`,
    `*Ação:* ${r.acao ?? "—"}`,
    `*Cidade:* ${r.cidade ?? "—"}`,
    `*Valor em dinheiro:* ${brl(r.valor_dinheiro)}`,
    `*Valor em permuta:* ${brl(r.valor_permuta)}`,
    `*Data prevista de pagamento:* ${dataBR(r.data_prevista)}`,
    `*Status:* ${r.status}`,
    `*Responsável:* ${r.responsavel ?? "—"}`,
  ].join("\n");
}

export interface PagamentoEfetuadoSlack {
  influenciador: string;
  frente: string;
  valor_dinheiro: number;
  valor_permuta: number;
  forma_pagamento: string | null;
  data_pagamento: string | null;
  responsavel: string | null;
}

export function buildPagamentoEfetuadoMessage(r: PagamentoEfetuadoSlack): string {
  const total = (r.valor_dinheiro ?? 0) + (r.valor_permuta ?? 0);
  return [
    ":white_check_mark: *Pagamento efetuado*",
    "",
    `*Influenciador:* ${r.influenciador}`,
    `*Frente:* ${r.frente}`,
    `*Valor total:* ${brl(total)}`,
    `*Forma de pagamento:* ${r.forma_pagamento ?? "—"}`,
    `*Data de pagamento:* ${dataBR(r.data_pagamento)}`,
    `*Responsável:* ${r.responsavel ?? "—"}`,
  ].join("\n");
}


/** YYYY-MM-DD para "hoje" no fuso de Brasília (UTC-3). */
export function brasiliaDate(offsetDays = 0): string {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return now.toISOString().slice(0, 10);
}

function section(titulo: string, itens: RegistroSlack[]): string {
  const linhas = itens.map((r) => {
    const total = (r.valor_dinheiro ?? 0) + (r.valor_permuta ?? 0);
    return `• *${r.influenciador}* — ${r.frente} · ${brl(total)} · ${r.responsavel ?? "sem responsável"}`;
  });
  const soma = itens.reduce((a, r) => a + (r.valor_dinheiro ?? 0) + (r.valor_permuta ?? 0), 0);
  const plural = itens.length === 1 ? "pagamento" : "pagamentos";
  return [
    titulo,
    ...linhas,
    `_Total: ${itens.length} ${plural} · ${brl(soma)}_`,
  ].join("\n");
}

export interface PagamentosResultado {
  enviado: boolean;
  emDoisDias: number;
  hoje: number;
  mensagem: string | null;
}

/** Busca e notifica pagamentos previstos. Retorna o resumo do que foi feito. */
export async function runPagamentosPrevistos(): Promise<PagamentosResultado> {
  const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
  const hoje = brasiliaDate(0);
  const doisDias = brasiliaDate(2);

  const { data, error } = await supabaseAdmin
    .from("registros")
    .select(
      "influenciador, frente, acao, cidade, valor_dinheiro, valor_permuta, data_prevista, status, responsavel",
    )
    .eq("status", "Previsto")
    .in("data_prevista", [hoje, doisDias]);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RegistroSlack[];
  const listaHoje = rows.filter((r) => r.data_prevista?.slice(0, 10) === hoje);
  const listaDois = rows.filter((r) => r.data_prevista?.slice(0, 10) === doisDias);

  if (listaHoje.length === 0 && listaDois.length === 0) {
    return { enviado: false, emDoisDias: 0, hoje: 0, mensagem: null };
  }

  const blocos: string[] = [];
  if (listaDois.length > 0) {
    blocos.push(
      section(
        `:alarm_clock: *Pagamentos previstos para daqui a 2 dias (${dataBR(doisDias)})*`,
        listaDois,
      ),
    );
  }
  if (listaHoje.length > 0) {
    blocos.push(
      section(`:rotating_light: *Pagamentos previstos para HOJE (${dataBR(hoje)})*`, listaHoje),
    );
  }
  const mensagem = blocos.join("\n\n");
  await sendSlack(mensagem);

  await supabaseAdmin.from("historico").insert({
    registro_id: null,
    usuario: "Sistema (Slack)",
    acao_realizada: "notificação Slack: pagamentos previstos",
    detalhe: `2 dias (${dataBR(doisDias)}): ${listaDois.length} · hoje (${dataBR(hoje)}): ${listaHoje.length}`,
  } as never);

  return {
    enviado: true,
    emDoisDias: listaDois.length,
    hoje: listaHoje.length,
    mensagem,
  };
}

export interface NovoPrevistoSlack {
  influenciador: string;
  frente: string;
  valor_dinheiro: number;
  valor_permuta: number;
  data_prevista: string | null;
  responsavel: string | null;
}

export interface NovosPrevistosResultado {
  enviado: boolean;
  quantidade: number;
  mensagem: string | null;
}

/** Resumo diário (18h Brasília) dos "Previsto" criados no dia. */
export async function runNovosPrevistos(): Promise<NovosPrevistosResultado> {
  const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
  const hoje = brasiliaDate(0);
  // janela do dia em Brasília (UTC-3) convertida para UTC
  const inicioUTC = `${hoje}T03:00:00.000Z`;
  const fimUTC = `${brasiliaDate(1)}T03:00:00.000Z`;

  const { data, error } = await supabaseAdmin
    .from("registros")
    .select("influenciador, frente, valor_dinheiro, valor_permuta, data_prevista, responsavel")
    .eq("status", "Previsto")
    .gte("criado_em", inicioUTC)
    .lt("criado_em", fimUTC)
    .order("criado_em", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as NovoPrevistoSlack[];
  if (rows.length === 0) return { enviado: false, quantidade: 0, mensagem: null };

  const linhas = rows.map((r) => {
    const total = (r.valor_dinheiro ?? 0) + (r.valor_permuta ?? 0);
    return `• *${r.influenciador}* — ${r.frente} · ${brl(total)} · prevista ${dataBR(r.data_prevista)} · ${r.responsavel ?? "sem responsável"}`;
  });
  const soma = rows.reduce((a, r) => a + (r.valor_dinheiro ?? 0) + (r.valor_permuta ?? 0), 0);
  const plural = rows.length === 1 ? "novo previsto" : "novos previstos";
  const mensagem = [
    `:new: *Novos pagamentos previstos incluídos hoje (${dataBR(hoje)})*`,
    ...linhas,
    `_Total: ${rows.length} ${plural} · ${brl(soma)}_`,
  ].join("\n");

  await sendSlack(mensagem);

  await supabaseAdmin.from("historico").insert({
    registro_id: null,
    usuario: "Sistema (Slack)",
    acao_realizada: "notificação Slack: novos pagamentos previstos",
    detalhe: `${rows.length} registro(s) criados em ${dataBR(hoje)} · ${brl(soma)}`,
  } as never);

  return { enviado: true, quantidade: rows.length, mensagem };
}
