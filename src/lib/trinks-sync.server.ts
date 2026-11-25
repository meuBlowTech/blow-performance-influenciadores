// Sincroniza a lista mestre de unidades com os estabelecimentos da Trinks.
// A Trinks é a fonte da verdade: lojas novas entram, nomes alterados lá são
// propagados (via renomear_unidade, que atualiza influenciadoras/inaugurações).
// Unidades do app sem par na Trinks não são removidas — só reportadas.
// Usado pelo botão da aba Unidades e pelo agendamento em src/server.ts.

import { extractUF } from "@/lib/inauguracoes";

type EstabelecimentoTrinks = { id: number; nome: string };
type PaginaTrinks = { data?: EstabelecimentoTrinks[]; totalPages?: number };
type UnidadeApp = { nome: string; trinks_id: number | null };

export type ResultadoSyncTrinks = {
  totalTrinks: number;
  adicionadas: string[];
  renomeadas: { de: string; para: string }[];
  vinculadas: number;
  semTrinks: string[];
  erros: string[];
  aplicado: boolean;
};

// Compara nomes ignorando caixa e espaços em volta do "|" — a Trinks tem
// variações como "Blow PB | ..." e "bLOw MG| ...".
const normalizar = (nome: string) =>
  nome.trim().toLowerCase().replace(/\s*\|\s*/g, " | ").replace(/\s+/g, " ");

// Tenta TRINKS_API_KEY e, se ela falhar por limite de uso, permissão ou erro
// do servidor, TRINKS_API_KEY_FALLBACK.
async function getTrinks(path: string): Promise<PaginaTrinks> {
  const base = process.env.TRINKS_API_URL ?? "https://api.trinks.com/v1";
  const keys = [process.env.TRINKS_API_KEY, process.env.TRINKS_API_KEY_FALLBACK].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error("Variável TRINKS_API_KEY ausente. Configure no .env.local.");

  let ultimoErro = "";
  for (const key of keys) {
    const r = await fetch(`${base}${path}`, { headers: { "X-Api-Key": key, Accept: "application/json" } });
    if (r.ok) return (await r.json()) as PaginaTrinks;
    ultimoErro = `Trinks respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`;
    if (![401, 403, 429].includes(r.status) && r.status < 500) break;
  }
  throw new Error(ultimoErro);
}

async function listarEstabelecimentos(): Promise<EstabelecimentoTrinks[]> {
  const todos: EstabelecimentoTrinks[] = [];
  for (let page = 1; page <= 50; page++) {
    const body = await getTrinks(`/estabelecimentos?page=${page}&pageSize=50`);
    const itens = body.data ?? [];
    todos.push(...itens.filter((e) => e?.nome?.trim()).map((e) => ({ id: Number(e.id), nome: e.nome.trim() })));
    if (itens.length === 0 || page >= (body.totalPages ?? 1)) break;
  }
  return todos;
}

export async function sincronizarUnidades(aplicar: boolean): Promise<ResultadoSyncTrinks> {
  const { supabaseAdmin } = await import("@/custo-influencer/integrations/supabase/client.server");
  // As tabelas do clube não estão nos tipos gerados do módulo Custos.
  const db = supabaseAdmin as unknown as {
    from: (t: string) => any;
    rpc: (fn: string, args: Record<string, unknown>) => any;
  };

  const trinks = await listarEstabelecimentos();
  const { data: rows, error } = await db.from("unidades").select("nome, trinks_id");
  if (error) throw new Error(error.message);
  const app = (rows ?? []) as UnidadeApp[];

  const res: ResultadoSyncTrinks = {
    totalTrinks: trinks.length,
    adicionadas: [],
    renomeadas: [],
    vinculadas: 0,
    semTrinks: [],
    erros: [],
    aplicado: aplicar,
  };
  const porId = new Map(app.filter((u) => u.trinks_id != null).map((u) => [Number(u.trinks_id), u]));
  const livres = app.filter((u) => u.trinks_id == null);
  const usadas = new Set<UnidadeApp>();

  for (const t of trinks) {
    let alvo = porId.get(t.id);
    let vincular = false;

    if (!alvo) {
      // Unidade ainda sem trinks_id: mesmo nome (normalizado) ou nome do app
      // que é o início do nome da Trinks ("bLOw SE | Aracaju" → "... - Boulevard").
      const nt = normalizar(t.nome);
      const livresAgora = livres.filter((u) => !usadas.has(u));
      let cands = livresAgora.filter((u) => normalizar(u.nome) === nt);
      if (cands.length === 0) cands = livresAgora.filter((u) => nt.startsWith(normalizar(u.nome) + " - "));
      if (cands.length === 1) {
        alvo = cands[0];
        vincular = true;
      }
    }

    try {
      if (!alvo) {
        res.adicionadas.push(t.nome);
        if (aplicar) {
          const { error: e } = await db.from("unidades").insert({ nome: t.nome, uf: extractUF(t.nome), trinks_id: t.id });
          if (e) throw new Error(e.message);
        }
        continue;
      }
      usadas.add(alvo);
      if (alvo.nome !== t.nome) {
        res.renomeadas.push({ de: alvo.nome, para: t.nome });
        if (aplicar) {
          const { error: e } = await db.rpc("renomear_unidade", { p_de: alvo.nome, p_para: t.nome });
          if (e) throw new Error(e.message);
        }
      }
      if (vincular) {
        res.vinculadas++;
        if (aplicar) {
          const { error: e } = await db.from("unidades").update({ trinks_id: t.id }).eq("nome", t.nome);
          if (e) throw new Error(e.message);
        }
      }
    } catch (e) {
      res.erros.push(`${t.nome}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  res.semTrinks = app
    .filter((u) => !usadas.has(u))
    .map((u) => u.nome)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  return res;
}

// Roda a sincronização ao subir o servidor e depois a cada N horas.
// Só liga com TRINKS_SYNC_AUTO=1 (definido em scripts/start-site.cmd), pra não
// rodar no `npm run dev` nem fora desta máquina.
let agendado = false;
export function agendarSincronizacaoUnidades() {
  if (agendado || typeof process === "undefined" || process.env?.TRINKS_SYNC_AUTO !== "1") return;
  agendado = true;
  const horas = Number(process.env.TRINKS_SYNC_INTERVAL_HOURS ?? 6);
  const rodar = async () => {
    try {
      const r = await sincronizarUnidades(true);
      console.log(
        `[trinks-sync] ${new Date().toISOString()} ${r.totalTrinks} lojas na Trinks; ` +
          `+${r.adicionadas.length} adicionadas, ${r.renomeadas.length} renomeadas, ${r.vinculadas} vinculadas` +
          (r.adicionadas.length ? ` | novas: ${r.adicionadas.join("; ")}` : "") +
          (r.renomeadas.length ? ` | renomeadas: ${r.renomeadas.map((x) => `${x.de} → ${x.para}`).join("; ")}` : "") +
          (r.erros.length ? ` | ERROS: ${r.erros.join("; ")}` : ""),
      );
    } catch (e) {
      console.error(`[trinks-sync] ${new Date().toISOString()} falhou:`, e instanceof Error ? e.message : e);
    }
  };
  void rodar();
  setInterval(rodar, horas * 3600_000).unref?.();
}
