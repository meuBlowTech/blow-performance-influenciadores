-- Lista mestre de unidades sincronizada com os estabelecimentos da Trinks.
-- trinks_id liga cada unidade ao estabelecimento, pra que um nome alterado na
-- Trinks renomeie a unidade em vez de criar outra.

alter table public.unidades add column trinks_id bigint unique;

-- Renomeia uma unidade e todas as referências a ela pelo nome, numa transação.
-- Só o servidor (service role) chama — a sincronização com a Trinks.
create function public.renomear_unidade(p_de text, p_para text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_de = p_para then
    return;
  end if;
  update unidades set nome = p_para where nome = p_de;
  update inauguracoes set estabelecimento = p_para where estabelecimento = p_de;
  update clube_influenciadoras set unidade = p_para where unidade = p_de;
  update clube_influenciadoras
     set unidades_inclusas = array_replace(unidades_inclusas, p_de, p_para)
   where p_de = any (unidades_inclusas);
  update clube_solicitacoes set unidade = p_para where unidade = p_de;
end;
$$;

revoke execute on function public.renomear_unidade(text, text) from public, anon, authenticated;
grant execute on function public.renomear_unidade(text, text) to service_role;
