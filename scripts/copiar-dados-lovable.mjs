// Copia os dados do Supabase do Lovable Cloud (somente leitura, chave pública)
// para o projeto Supabase Blow (service role do .env.local).
//
// Uso: node --env-file=.env.local scripts/copiar-dados-lovable.mjs
//
// Recusa rodar se alguma tabela de destino já tiver dados, pra não duplicar.
// As views (clube_faturamento_por_influenciadora, clube_cupons_mensal,
// clube_status_cupons) não são copiadas: são recalculadas no banco novo.

const ORIGEM_URL = "https://vcmahlxowiddwxvehkna.supabase.co/rest/v1";
const ORIGEM_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbWFobHhvd2lkZHd4dmVoa25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjA4ODIsImV4cCI6MjA5ODQ5Njg4Mn0.Bd58E5D7OfjcMb2PaULDAcdsQ0okChy29zquZuGRwDQ";

const DESTINO_URL = `${process.env.SUPABASE_URL}/rest/v1`;
const DESTINO_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!process.env.SUPABASE_URL || !DESTINO_KEY) {
  console.error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Rode com --env-file=.env.local");
  process.exit(1);
}

// Colunas com id bigint (identity) são omitidas: o banco novo gera ids novos.
// Nenhuma outra tabela referencia esses ids.
const TABELAS = [
  { nome: "unidades" },
  { nome: "clube_influenciadoras" },
  { nome: "clube_solicitacoes" },
  { nome: "inauguracoes", semId: true },
  { nome: "cupons_emitidos", semId: true },
  { nome: "consumo_cupons", semId: true },
];

async function lerOrigem(tabela) {
  const linhas = [];
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${ORIGEM_URL}/${tabela}?select=*`, {
      headers: { apikey: ORIGEM_KEY, Authorization: `Bearer ${ORIGEM_KEY}`, Range: `${off}-${off + 999}` },
    });
    if (!r.ok) throw new Error(`${tabela}: leitura falhou (${r.status}) ${await r.text()}`);
    const pagina = await r.json();
    linhas.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return linhas;
}

const destinoHeaders = {
  apikey: DESTINO_KEY,
  Authorization: `Bearer ${DESTINO_KEY}`,
  "Content-Type": "application/json",
};

async function contarDestino(tabela) {
  const r = await fetch(`${DESTINO_URL}/${tabela}?select=*`, {
    method: "HEAD",
    headers: { ...destinoHeaders, Prefer: "count=exact", Range: "0-0" },
  });
  if (!r.ok) throw new Error(`${tabela}: tabela não encontrada no destino (${r.status}). A migração foi aplicada?`);
  return Number(r.headers.get("content-range")?.split("/")[1] ?? 0);
}

async function gravarDestino(tabela, linhas) {
  for (let i = 0; i < linhas.length; i += 500) {
    const lote = linhas.slice(i, i + 500);
    const r = await fetch(`${DESTINO_URL}/${tabela}`, {
      method: "POST",
      headers: { ...destinoHeaders, Prefer: "return=minimal" },
      body: JSON.stringify(lote),
    });
    if (!r.ok) throw new Error(`${tabela}: gravação falhou no lote ${i} (${r.status}) ${await r.text()}`);
  }
}

for (const { nome } of TABELAS) {
  const n = await contarDestino(nome);
  if (n > 0) {
    console.error(`Destino já tem ${n} linhas em ${nome}. Nada foi copiado.`);
    process.exit(1);
  }
}

for (const { nome, semId } of TABELAS) {
  let linhas = await lerOrigem(nome);
  if (semId) linhas = linhas.map(({ id, ...resto }) => resto);
  await gravarDestino(nome, linhas);
  const n = await contarDestino(nome);
  console.log(`${nome}: ${linhas.length} lidas, ${n} no destino`);
}
