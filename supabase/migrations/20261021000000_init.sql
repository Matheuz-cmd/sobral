-- BI de tráfego pago · schema inicial (Fase 0)
-- Isolamento por empresa: toda política de RLS passa por company_members.

create extension if not exists pgcrypto;

-- ───────────────────────── Usuários e papéis ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

-- O primeiro usuário cadastrado é o gestor (admin); os demais entram como client.
-- Desative o cadastro público no Supabase Auth depois de criar o seu usuário.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles) then 'client' else 'admin' end
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_company_id uuid,
  preferences jsonb not null default '{}'::jsonb
);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Clientes e empresas ─────────────────────────

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  logo_url text,
  color text not null default '#2563eb',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);
create index companies_client_idx on public.companies (client_id);

alter table public.user_settings
  add constraint user_settings_last_company_fk
  foreign key (last_company_id) references public.companies (id) on delete set null;

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'viewer')),
  primary key (company_id, user_id)
);
create index company_members_user_idx on public.company_members (user_id);

-- ───────────────────────── Helpers de RLS ─────────────────────────

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function public.is_company_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members where company_id = cid and user_id = auth.uid()
  );
$$;

create function public.is_company_owner(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid() and role = 'owner'
  );
$$;

create function public.is_client_creator(clid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clients where id = clid and created_by = auth.uid());
$$;

create function public.client_visible(clid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_client_creator(clid) or exists (
    select 1 from public.companies c
    join public.company_members m on m.company_id = c.id
    where c.client_id = clid and m.user_id = auth.uid()
  );
$$;

-- Ao criar uma empresa, o gestor vira owner dela.
create function public.handle_new_company() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.company_members (company_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict do nothing;
  return new;
end $$;

create trigger on_company_created
  after insert on public.companies
  for each row execute function public.handle_new_company();

-- ───────────────────────── Contas e dados de anúncios ─────────────────────────

create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  platform text not null check (platform in ('meta', 'google')),
  name text not null,
  external_id text,
  currency text not null default 'BRL',
  created_at timestamptz not null default now()
);
create index ad_accounts_company_idx on public.ad_accounts (company_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts (id) on delete cascade,
  platform text not null check (platform in ('meta', 'google')),
  name text not null,
  external_id text,
  -- tipo detectado pelo indicador de resultados; type_manual = ajustado à mão
  campaign_type text not null default 'other'
    check (campaign_type in ('messages_whatsapp', 'profile_visits', 'local_actions', 'other')),
  type_manual boolean not null default false,
  created_at timestamptz not null default now(),
  unique (ad_account_id, name)
);
create index campaigns_company_idx on public.campaigns (company_id);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  ad_account_id uuid references public.ad_accounts (id) on delete set null,
  platform text not null check (platform in ('meta', 'google')),
  file_name text not null,
  storage_path text,
  period_start date,
  period_end date,
  rows_read integer not null default 0,
  rows_error integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed', 'undone')),
  error_log jsonb,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index imports_company_idx on public.imports (company_id, created_at desc);

-- Uma linha por dia e objeto, no nível mais detalhado do relatório
-- (Meta: ad · Google: ad_group). A chave permite que a coleta por API grave aqui depois.
create table public.metrics_daily (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  import_id uuid references public.imports (id) on delete cascade,
  level text not null check (level in ('campaign', 'ad_set', 'ad', 'ad_group')),
  object_key text not null,
  date date not null,
  campaign_name text not null,
  adset_name text,
  ad_name text,
  spend numeric(14, 2) not null default 0 check (spend >= 0),
  impressions bigint not null default 0,
  reach bigint,
  clicks bigint not null default 0,          -- Meta: cliques no link · Google: cliques
  results numeric(14, 2),                    -- "Resultados" do Meta (muda com o objetivo)
  result_indicator text,                     -- "Indicador de resultados" do Meta
  profile_visits bigint,
  ig_follows bigint,
  all_conversions numeric(14, 2),            -- Google: "Todas as conv."
  local_actions numeric(14, 2),              -- Google: soma das ações locais
  directions numeric(14, 2),
  calls numeric(14, 2),
  website_clicks numeric(14, 2),
  other_interactions numeric(14, 2),
  unique (ad_account_id, level, object_key, date)
);
create index metrics_daily_company_date_idx on public.metrics_daily (company_id, date);
create index metrics_daily_import_idx on public.metrics_daily (import_id);
create index metrics_daily_campaign_idx on public.metrics_daily (campaign_id, date);

create table public.column_mappings (
  company_id uuid not null references public.companies (id) on delete cascade,
  platform text not null check (platform in ('meta', 'google')),
  mapping jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (company_id, platform)
);

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.clients enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.imports enable row level security;
alter table public.metrics_daily enable row level security;
alter table public.column_mappings enable row level security;

create policy profiles_self on public.profiles
  for select using (id = auth.uid());

create policy user_settings_self on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- clients
create policy clients_select on public.clients
  for select using (public.client_visible(id));
create policy clients_insert on public.clients
  for insert with check (public.is_admin() and created_by = auth.uid());
create policy clients_update on public.clients
  for update using (public.is_client_creator(id)) with check (public.is_client_creator(id));
create policy clients_delete on public.clients
  for delete using (public.is_client_creator(id));

-- companies
create policy companies_select on public.companies
  for select using (public.is_company_member(id) or public.is_client_creator(client_id));
create policy companies_insert on public.companies
  for insert with check (public.is_admin() and public.is_client_creator(client_id));
create policy companies_update on public.companies
  for update using (public.is_company_owner(id)) with check (public.is_company_owner(id));
create policy companies_delete on public.companies
  for delete using (public.is_company_owner(id));

-- company_members: cada um vê os próprios vínculos; o owner vê e gerencia os da empresa
create policy members_select on public.company_members
  for select using (user_id = auth.uid() or public.is_company_owner(company_id));
create policy members_write on public.company_members
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

-- tabelas de dados: leitura por qualquer membro; escrita só pelo owner (viewer = somente leitura)
create policy ad_accounts_select on public.ad_accounts
  for select using (public.is_company_member(company_id));
create policy ad_accounts_write on public.ad_accounts
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

create policy campaigns_select on public.campaigns
  for select using (public.is_company_member(company_id));
create policy campaigns_write on public.campaigns
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

create policy imports_select on public.imports
  for select using (public.is_company_member(company_id));
create policy imports_write on public.imports
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

create policy metrics_select on public.metrics_daily
  for select using (public.is_company_member(company_id));
create policy metrics_write on public.metrics_daily
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

create policy mappings_select on public.column_mappings
  for select using (public.is_company_member(company_id));
create policy mappings_write on public.column_mappings
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

-- ───────────────────────── Views e funções dos dashboards ─────────────────────────
-- security_invoker: as views respeitam a RLS de quem consulta.

create view public.v_daily_by_platform with (security_invoker = true) as
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
where m.level in ('ad', 'ad_group')
group by m.company_id, a.platform, m.ad_account_id, m.date;

-- Totais por campanha em um período; taxas recalculadas das somas (nunca média de taxas).
create function public.campaign_summary(
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
    and m.level in ('ad', 'ad_group')
    and m.date between p_from and p_to
    and (p_ad_account is null or m.ad_account_id = p_ad_account)
  group by c.id, c.name, c.platform, c.campaign_type;
$$;

-- ───────────────────────── Storage (arquivos enviados) ─────────────────────────
-- Caminho: {user_id}/{company_id}/{arquivo}; bucket privado.

insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;

create policy imports_files_select on storage.objects
  for select using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_company_member(((storage.foldername(name))[2])::uuid)
  );
create policy imports_files_insert on storage.objects
  for insert with check (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_company_owner(((storage.foldername(name))[2])::uuid)
  );
create policy imports_files_delete on storage.objects
  for delete using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_company_owner(((storage.foldername(name))[2])::uuid)
  );
