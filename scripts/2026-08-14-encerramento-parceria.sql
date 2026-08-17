'    -- Etapa 1: colunas novas + remoção da obrigatoriedade da validade do cupom.
    -- Aditivo e seguro — não altera dados existentes, só afrouxa uma constraint
    -- e adiciona colunas novas (NULL por padrão nas linhas já existentes).
    
    -- Novo campo "data de encerramento da parceria"
    alter table clube_influenciadoras
      add column if not exists data_encerramento_parceria date;
    
    alter table clube_solicitacoes
      add column if not exists data_encerramento_parceria_sugerida date;
    
    -- Remove a obrigatoriedade da validade do cupom (nem toda parceria tem)
    alter table clube_influenciadoras
      alter column data_validade drop not null;
    
    alter table clube_solicitacoes
      alter column data_validade_sugerida drop not null;
    
    -- Etapa 2: propaga o novo campo nas 2 funções que precisam dele.
    -- clube_rejeitar_solicitacao não toca em nenhum dos dois campos — não
    -- precisa de mudança.
    
    -- 2a) Ao aprovar uma solicitação, leva a data de encerramento sugerida
    -- para a influenciadora criada (mesmo padrão já usado para data_validade).
    CREATE OR REPLACE FUNCTION public.clube_aprovar_solicitacao(p_id uuid, p_password text)
     RETURNS jsonb
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path TO 'public', 'extensions'
    AS $function$declare
      v_row clube_solicitacoes;
      v_extras text[];
    begin
      if not clube_check_admin(p_password) then
        return jsonb_build_object('success', false, 'message', 'Acesso não autorizado.');
      end if;
    
      select * into v_row from clube_solicitacoes where id = p_id;
      if not found then
        return jsonb_build_object('success', false, 'message', 'Solicitação não encontrada.');
      end if;
      if v_row.status_solicitacao = 'aprovado' then
        return jsonb_build_object('success', false, 'message', 'Essa solicitação já foi aprovada anteriormente.');
      end if;
    
      v_extras := case
       when v_row.outras_unidades is not null and length(trim(v_row.outras_unidades)) > 0
        then (select array_agg(trim(u)) from unnest(string_to_array(v_row.outras_unidades, ',')) as u where trim(u) <> '')
        else '{}'::text[]
      end;
    
      insert into clube_influenciadoras
        (nome, unidade, unidades_inclusas, formato_parceria, status_parceria, codigo_cupom, status_cupom, data_inicio, data_validade, data_encerramento_parceria, instagram, contato)
      values
        (v_row.nome_influenciador, v_row.unidade, coalesce(v_extras, '{}'), coalesce(v_row.formato_parceria_sugerido, 'clube'),
         coalesce(v_row.status_parceria_sugerido, 'ativa'),
         nullif(trim(coalesce(v_row.codigo_cupom_sugerido, '')), ''),
         'ativa', current_date, v_row.data_validade_sugerida, v_row.data_encerramento_parceria_sugerida, v_row.instagram, v_row.contato);
    
      update clube_solicitacoes set status_solicitacao = 'aprovado' where id = p_id;
       return jsonb_build_object(
        'success', true,
        'message', case
          when v_row.codigo_cupom_sugerido is not null and trim(v_row.codigo_cupom_sugerido) <> ''
            then '✅ Cadastro de "' || v_row.nome_influenciador || '" aprovado com o cupom ' || v_row.codigo_cupom_sugerido || '!'
          else '✅ Cadastro de "' || v_row.nome_influenciador || '" aprovado! Não esqueça de preencher o código do cupom na edição da influenciadora.'
        end
      );
    end;$function$;
    
    -- 2b) Permite editar a data de encerramento da parceria pela tela de
    -- edição (mesmo padrão coalesce dos outros campos: só sobrescreve se um
    -- valor novo for enviado).
    CREATE OR REPLACE FUNCTION public.clube_atualizar_influenciadora(p_id uuid, p_password text, p_unidade text DEFAULT NULL::text, p_unidades_inclusas text[] DEFAULT NULL::text[], p_formato_parceria text DEFAULT NULL::text, p_status_parceria text DEFAULT NULL::text, p_codigo_cupom text DEFAULT NULL::text, p_status_cupom text DEFAULT NULL::text, p_data_inicio date DEFAULT NULL::date, p_data_validade date DEFAULT NULL::date, p_instagram text DEFAULT NULL::text, p_contato text DEFAULT NULL::text, p_data_encerramento_parceria date DEFAULT NULL::date)
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
'