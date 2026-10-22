-- Campanhas Inteligentes do Google não têm grupo de anúncios e chegam no nível de campanha.
-- commit_import apaga todos os níveis da conta no período antes de gravar, então cada
-- conta/dia tem um único nível e as somas podem considerar todas as linhas.

create or replace view public.v_daily_by_platform with (security_invoker = true) as
select
  m.company_id,
  a.platform,
  m.ad_account_id,
  m.date,
  sum(m.spend)              as spend,
  sum(m.impressions)        as impressions,
  sum(m.clicks)             as clicks,
  sum(m.profile_visits)     as profile_visits,
  sum(m.ig_follows)         as ig_follows,
  sum(m.local_actions)      as local_actions,
  sum(m.all_conversions)    as all_conversions
from public.metrics_daily m
join public.ad_accounts a on a.id = m.ad_account_id
group by m.company_id, a.platform, m.ad_account_id, m.date;

create or replace function public.campaign_summary(
  p_company uuid,
  p_from date,
  p_to date,
  p_ad_account uuid default null
) returns table (
  campaign_id uuid,
  campaign_name text,
  platform text,
  campaign_type text,
  spend numeric,
  impressions bigint,
  clicks bigint,
  ctr numeric,
  cpc numeric,
  cpm numeric,
  profile_visits bigint,
  cost_per_profile_visit numeric,
  ig_follows bigint,
  cost_per_follow numeric,
  local_actions numeric,
  cost_per_local_action numeric
)
language sql stable security invoker as $$
  select
    c.id,
    c.name,
    c.platform,
    c.campaign_type,
    sum(m.spend),
    sum(m.impressions)::bigint,
    sum(m.clicks)::bigint,
    sum(m.clicks)::numeric / nullif(sum(m.impressions), 0),
    sum(m.spend) / nullif(sum(m.clicks), 0),
    sum(m.spend) * 1000 / nullif(sum(m.impressions), 0),
    sum(m.profile_visits)::bigint,
    sum(m.spend) / nullif(sum(m.profile_visits), 0),
    sum(m.ig_follows)::bigint,
    sum(m.spend) / nullif(sum(m.ig_follows), 0),
    sum(m.local_actions),
    sum(m.spend) / nullif(sum(m.local_actions), 0)
  from public.metrics_daily m
  join public.campaigns c on c.id = m.campaign_id
  where m.company_id = p_company
    and m.date between p_from and p_to
    and (p_ad_account is null or m.ad_account_id = p_ad_account)
  group by c.id, c.name, c.platform, c.campaign_type;
$$;
