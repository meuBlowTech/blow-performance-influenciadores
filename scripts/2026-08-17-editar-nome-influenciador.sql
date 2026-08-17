-- Permite editar o nome da influenciadora pela tela de edição do admin
-- (mesmo padrão coalesce dos outros campos: só sobrescreve se um valor
-- novo for enviado).
CREATE OR REPLACE FUNCTION public.clube_atualizar_influenciadora(p_id uuid, p_password text, p_unidade text DEFAULT NULL::text, p_unidades_inclusas text[] DEFAULT NULL::text[], p_formato_parceria text DEFAULT NULL::text, p_status_parceria text DEFAULT NULL::text, p_codigo_cupom text DEFAULT NULL::text, p_status_cupom text DEFAULT NULL::text, p_data_inicio date DEFAULT NULL::date, p_data_validade date DEFAULT NULL::date, p_instagram text DEFAULT NULL::text, p_contato text DEFAULT NULL::text, p_data_encerramento_parceria date DEFAULT NULL::date, p_nome text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not clube_check_admin(p_password) then
    return jsonb_build_object('success', false, 'message', 'Acesso não autorizado.');
  end if;

  update clube_influenciadoras set
    nome = coalesce(nullif(trim(p_nome), ''), nome),
    unidade = coalesce(p_unidade, unidade),
    unidades_inclusas = coalesce(p_unidades_inclusas, unidades_inclusas),
    formato_parceria = coalesce(p_formato_parceria, formato_parceria),
    status_parceria = coalesce(p_status_parceria, status_parceria),
    codigo_cupom = coalesce(p_codigo_cupom, codigo_cupom),
    status_cupom = coalesce(p_status_cupom, status_cupom),
    data_inicio = coalesce(p_data_inicio, data_inicio),
    data_validade = coalesce(p_data_validade, data_validade),
    data_encerramento_parceria = coalesce(p_data_encerramento_parceria, data_encerramento_parceria),
    instagram = coalesce(p_instagram, instagram),
    contato = coalesce(p_contato, contato),
    updated_at = now()
  where id = p_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Influenciadora não encontrada.');
  end if;

  return jsonb_build_object('success', true, 'message', 'Atualizado com sucesso!');
end;
$function$;
