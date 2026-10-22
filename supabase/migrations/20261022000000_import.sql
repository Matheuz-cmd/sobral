-- Fase 1 · importação atômica
-- O navegador envia as linhas em lotes para metrics_staging; commit_import move tudo
-- para metrics_daily numa única transação (RNF05): se algo falhar, nada é gravado.

create table public.metrics_staging (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.imports (id) on delete cascade,
  level text not null check (level in ('campaign', 'ad_set', 'ad', 'ad_group')),
  object_key text not null,
  date date not null,
  campaign_name text not null,
  campaign_type text not null default 'other'
    check (campaign_type in ('messages_whatsapp', 'profile_visits', 'local_actions', 'other')),
  adset_name text,
  ad_name text,
  spend numeric(14, 2) not null default 0 check (spend >= 0),
  impressions bigint not null default 0,
  reach bigint,
  clicks bigint not null default 0,
  results numeric(14, 2),
  result_indicator text,
  profile_visits bigint,
  ig_follows bigint,
  all_conversions numeric(14, 2),
  local_actions numeric(14, 2),
  directions numeric(14, 2),
  calls numeric(14, 2),
  website_clicks numeric(14, 2),
  other_interactions numeric(14, 2)
);
create index metrics_staging_import_idx on public.metrics_staging (import_id);

alter table public.metrics_staging enable row level security;

create policy staging_owner on public.metrics_staging
  for all
  using (exists (
    select 1 from public.imports i
    where i.id = import_id and public.is_company_owner(i.company_id)
  ))
  with check (exists (
    select 1 from public.imports i
    where i.id = import_id and public.is_company_owner(i.company_id)
  ));

-- Confirma a importação: substitui os dados da conta no período do arquivo.
create function public.commit_import(p_import uuid) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  imp public.imports;
  acc public.ad_accounts;
  v_from date;
  v_to date;
  v_rows integer;
  v_deleted integer;
begin
  select * into imp from public.imports where id = p_import for update;
  if not found or not public.is_company_owner(imp.company_id) then
    raise exception 'Importação não encontrada.';
  end if;
  if imp.status <> 'pending' then
    raise exception 'Esta importação já foi processada.';
  end if;

  select * into acc from public.ad_accounts
  where id = imp.ad_account_id and company_id = imp.company_id;
  if not found or acc.platform <> imp.platform then
    raise exception 'Conta de anúncios inválida para esta importação.';
  end if;

  select min(date), max(date), count(*) into v_from, v_to, v_rows
  from public.metrics_staging where import_id = p_import;
  if v_rows = 0 then
    raise exception 'O arquivo não tem linhas válidas para importar.';
  end if;

  delete from public.metrics_daily
  where ad_account_id = acc.id and date between v_from and v_to;
  get diagnostics v_deleted = row_count;

  insert into public.campaigns (company_id, ad_account_id, platform, name, campaign_type)
  select distinct on (s.campaign_name)
    imp.company_id, acc.id, acc.platform, s.campaign_name, s.campaign_type
  from public.metrics_staging s
  where s.import_id = p_import
  on conflict (ad_account_id, name) do update
    set campaign_type = case
      when campaigns.type_manual then campaigns.campaign_type
      else excluded.campaign_type
    end;

  insert into public.metrics_daily (
    company_id, ad_account_id, campaign_id, import_id, level, object_key, date,
    campaign_name, adset_name, ad_name, spend, impressions, reach, clicks,
    results, result_indicator, profile_visits, ig_follows, all_conversions,
    local_actions, directions, calls, website_clicks, other_interactions
  )
  select
    imp.company_id, acc.id, c.id, p_import, s.level, s.object_key, s.date,
    s.campaign_name, s.adset_name, s.ad_name, s.spend, s.impressions, s.reach, s.clicks,
    s.results, s.result_indicator, s.profile_visits, s.ig_follows, s.all_conversions,
    s.local_actions, s.directions, s.calls, s.website_clicks, s.other_interactions
  from public.metrics_staging s
  join public.campaigns c on c.ad_account_id = acc.id and c.name = s.campaign_name
  where s.import_id = p_import;

  delete from public.metrics_staging where import_id = p_import;

  update public.imports
  set status = 'done', period_start = v_from, period_end = v_to
  where id = p_import;

  return jsonb_build_object(
    'rows', v_rows, 'replaced', v_deleted, 'period_start', v_from, 'period_end', v_to
  );
end $$;

-- Desfaz uma importação: remove as linhas gravadas por ela.
create function public.undo_import(p_import uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare
  imp public.imports;
begin
  select * into imp from public.imports where id = p_import for update;
  if not found or not public.is_company_owner(imp.company_id) then
    raise exception 'Importação não encontrada.';
  end if;
  delete from public.metrics_daily where import_id = p_import;
  delete from public.metrics_staging where import_id = p_import;
  update public.imports set status = 'undone' where id = p_import;
end $$;
