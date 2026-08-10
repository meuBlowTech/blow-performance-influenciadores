# bLOw Insights

Crie um dashboard de performance de marketing de influência para uma rede de escovarias (bLOw). Idioma: português do Brasil. Conecte ao meu Supabase já integrado.

FONTE DE DADOS

Tabela: consumo_cupons

Colunas: estabelecimento (unidade), data_hora_atendimento (timestamp), cliente_hash, comanda, categoria_item, item, valor_item, valor_desconto, valor_liquido, fechamento_conta, quem_fechou_conta, comentario_fechamento, nome_cupom, codigo_cupom, tipo_item, data_extracao.

Cada atendimento (uma comanda) gera VÁRIAS linhas (uma por item consumido). Considere isso nos cálculos.

KPIs NO TOPO (cards):

1. Receita Total = soma de valor_liquido no período filtrado

2. Ticket Médio = receita total dividida pelo número de comandas distintas (NÃO pelo número de linhas)

3. Nº de Atendimentos = contagem de comandas distintas

4. Nº de Cupons Ativos = contagem de codigo_cupom distintos com pelo menos uma venda no período

GRÁFICOS:

1. Evolução no tempo: gráfico de linha com receita por dia (eixo X = data de data_hora_atendimento, eixo Y = soma de valor_liquido). Permitir alternar entre visão diária e semanal.

2. Ranking de cupons: gráfico de barras horizontal, top 15 cupons por receita. Mostrar codigo_cupom e nome_cupom juntos. Ao lado, tabela com: cupom, receita, nº de atendimentos, ticket médio daquele cupom.

3. Desempenho por unidade: gráfico de barras com receita por estabelecimento, e uma tabela comparando cada unidade (receita, atendimentos, ticket médio).

FILTROS (aplicam a tudo na tela):

- Período (seletor de data início/fim)

- Unidade (estabelecimento) — multiseleção

- Cupom (codigo_cupom) — multiseleção

- Botão "limpar filtros"

EXPORTAÇÃO:

- Botão para exportar os dados filtrados em CSV

- Botão para exportar a tabela de ranking de cupons em CSV

DESIGN E IDENTIDADE VISUAL (marca bLOw):

- Marca premium, público feminino de 32 a 48 anos. Visual limpo, sofisticado e arejado, com bastante espaço em branco.

- Paleta de cores da marca (use exatamente estes tons):

  • Verde escuro #3D5F4A — cor principal, use em cabeçalho, títulos e elementos de destaque

  • Verde médio #6B9A73 e verde claro #A8CFA0 — cores secundárias, use em gráficos e realces positivos

  • Terracota / laranja queimado #C6421E — cor de destaque para chamar atenção (ex: barra do cupom nº1, KPI principal). Usar com moderação.

  • Coral / salmão #D98B7A — apoio, para variação nas séries de gráfico

  • Rosa claro #F2D9D2 e rosa acinzentado #D9B3B0 — fundos suaves de cards e tons de apoio

  • Cinzas neutros #E2E2E0, #C9C9C7 — bordas, texto secundário, fundos discretos

  • Fundo geral: branco ou off-white (#FAFAF8). Texto principal em verde escuro ou cinza escuro.

- Nos gráficos de barra com muitas categorias, use uma escala harmônica derivada dos verdes e corais acima, evitando cores fora da paleta.

- Cards de KPI no topo, gráficos no meio, tabelas no final.

- Responsivo (desktop e mobile).

- Formatar valores em Real brasileiro (R$ 1.234,56).

- Formatar datas no padrão brasileiro (dd/mm/aaaa).

Não invente dados. Se algum campo vier vazio, trate como ausente, não estime.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://blow-performance-influenciadores.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2a388fa2-7b4c-4178-9768-8addfb16c840).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
