# BI Ads

BI de tráfego pago (Meta Ads + Google Ads) por empresa. Veja o PRD em `PRD — BI de Meta Ads.md`.

Stack: Next.js (App Router) + TypeScript, Supabase (Postgres, Auth, Storage), Tailwind, Recharts, Papa Parse / SheetJS.

## Rodando local

1. Crie um projeto no Supabase e rode, em ordem, os arquivos de `supabase/migrations/` no SQL Editor (ou via `supabase db push`).
2. Copie `.env.example` para `.env.local` e preencha a URL e a chave anon.
3. Crie o seu usuário (Auth → Users). O primeiro usuário vira `admin`; depois desative o cadastro público.
4. `npm install && npm run dev`

Testes: `npm test` (leitura de números/datas, mapeamento de colunas e normalização dos relatórios).

## Status

- [x] Fase 0: banco com RLS, login, clientes, empresas, arquivar/excluir, contas de anúncios
- [x] Fase 1: importação por upload (CSV/Excel), mapeamento por sinônimos, pré-visualização, gravação atômica sem duplicar, histórico e desfazer
- [x] Fase 2: dashboards Meta, Google e visão geral (filtros de período e conta, comparação com o período anterior, tabelas com navegação e exportação CSV)
