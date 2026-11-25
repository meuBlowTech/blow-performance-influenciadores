-- Correções nas views, depois da primeira migração:
-- 1) clube_cupons_mensal inclui os meses sem nenhum uso de cupom (zerados),
--    do primeiro ao último mês com uso — como a view original fazia.

create or replace view public.clube_cupons_mensal as
with uso as (
  select
    date_trunc('month', c.data_hora_atendimento at time zone 'UTC')::date as mes,
    count(distinct c.codigo_cupom) as cupons_utilizados_distintos,
    count(distinct c.comanda) as atendimentos,
    round(sum(c.valor_liquido), 2) as receita
  from public.consumo_cupons c
  join public.clube_influenciadoras i on i.codigo_cupom = c.codigo_cupom
  where c.data_hora_atendimento is not null
  group by 1
),
meses as (
  select generate_series(min(mes), max(mes), interval '1 month')::date as mes from uso
)
select
  m.mes,
  (select count(*) from public.clube_influenciadoras i
    where i.codigo_cupom is not null
      and i.data_inicio < (m.mes + interval '1 month')) as cupons_emitidos_acumulado,
  coalesce(u.cupons_utilizados_distintos, 0) as cupons_utilizados_distintos,
  coalesce(u.atendimentos, 0) as atendimentos,
  coalesce(u.receita, 0) as receita
from meses m
left join uso u on u.mes = m.mes
order by m.mes;

-- clube_inauguracoes_30d: desempenho dos primeiros 30 dias de cada inauguração
-- (dia da inauguração + 29), contando os cupons das influenciadoras vinculadas
-- à unidade (principal ou incluída) — em qualquer loja onde o cupom foi usado.
-- Como nas outras views, um código cadastrado em duas influenciadoras soma a
-- receita duas vezes; atendimentos e cupons são contagens distintas.

create view public.clube_inauguracoes_30d as
select
  i.id,
  i.estabelecimento,
  i.data_inauguracao,
  i.uf,
  (now() at time zone 'America/Sao_Paulo')::date - i.data_inauguracao as dias_desde_inauguracao,
  (now() at time zone 'America/Sao_Paulo')::date - i.data_inauguracao >= 30 as janela_completa,
  coalesce(round(sum(c.valor_liquido), 2), 0) as receita_30d,
  count(distinct c.comanda) as atendimentos_30d,
  count(distinct c.codigo_cupom) as cupons_utilizados_30d,
  count(distinct ci.id) filter (where c.id is not null) as influenciadoras_ativas_30d
from public.inauguracoes i
left join public.clube_influenciadoras ci
  on ci.codigo_cupom is not null
 and (ci.unidade = i.estabelecimento or i.estabelecimento = any (ci.unidades_inclusas))
left join public.consumo_cupons c
  on c.codigo_cupom = ci.codigo_cupom
 and (c.data_hora_atendimento at time zone 'UTC')::date between i.data_inauguracao and i.data_inauguracao + 29
group by i.id;

grant select on public.clube_inauguracoes_30d to anon, authenticated;
