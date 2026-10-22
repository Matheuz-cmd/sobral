-- Fase 2 · totais diários por tipo de campanha.
-- Os cards e gráficos de resultado usam só as campanhas do tipo certo
-- (ex.: custo por visita = investimento das campanhas de visitas ÷ visitas delas).

create view public.v_daily_by_campaign_type with (security_invoker = true) as
select
  m.company_id,
  a.platform,
  m.ad_account_id,
  c.campaign_type,
  m.date,
  sum(m.spend)              as spend,
  sum(m.impressions)        as impressions,
  sum(m.clicks)             as clicks,
  sum(m.profile_visits)     as profile_visits,
  sum(m.ig_follows)         as ig_follows,
  sum(m.local_actions)      as local_actions,
  sum(m.directions)         as directions,
  sum(m.calls)              as calls,
  sum(m.website_clicks)     as website_clicks,
  sum(m.other_interactions) as other_interactions
from public.metrics_daily m
join public.ad_accounts a on a.id = m.ad_account_id
join public.campaigns c on c.id = m.campaign_id
group by m.company_id, a.platform, m.ad_account_id, c.campaign_type, m.date;
