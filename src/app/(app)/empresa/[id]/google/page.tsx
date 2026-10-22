import Link from "next/link";
import { DailyChart } from "@/components/dashboard/daily-chart";
import { DataNotice } from "@/components/dashboard/data-notice";
import { DataTable, type Column, type TableRow } from "@/components/dashboard/data-table";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import {
  dailySeries, getBreakdown, getCampaigns, getDailyRows, getLastDataDate, rates, summarize, type Totals,
} from "@/lib/dashboard";
import { hrefWith, param, readFilters } from "@/lib/dashboard-params";

const COLUMNS: Column[] = [
  { key: "name", label: "Nome", format: "text" },
  { key: "spend", label: "Custo", format: "brl" },
  { key: "impressions", label: "Impressões", format: "int" },
  { key: "clicks", label: "Cliques", format: "int" },
  { key: "ctr", label: "CTR", format: "pct" },
  { key: "cpc", label: "CPC médio", format: "brl" },
  { key: "local_actions", label: "Ações locais", format: "dec" },
  { key: "cost_per_local_action", label: "Custo por ação", format: "brl" },
];

function toRow(id: string, name: string, t: Totals, href?: string): TableRow {
  const r = rates(t);
  return {
    id, name, href: href ?? null,
    spend: t.spend, impressions: t.impressions, clicks: t.clicks,
    ctr: r.ctr, cpc: r.cpc,
    local_actions: t.local_actions, cost_per_local_action: r.costPerLocalAction,
  };
}

export default async function GooglePage({ params, searchParams }: PageProps<"/empresa/[id]/google">) {
  const { id } = await params;
  const sp = await searchParams;
  const { filters, period, accounts, accountId } = await readFilters(id, sp, "google");
  const base = `/empresa/${id}/google`;

  const [rows, campaigns, lastDate] = await Promise.all([
    getDailyRows(filters, "google"),
    getCampaigns(filters, "google"),
    getLastDataDate(id, "google"),
  ]);

  const { current, previous } = summarize(rows, period);
  const [cur, prev] = [rates(current), rates(previous)];
  // O detalhe por tipo só existe se o relatório veio segmentado por ação de conversão.
  const hasBreakdown = current.directions + current.calls + current.website_clicks + current.other_interactions > 0;

  const spendSeries = dailySeries(rows, period, { spend: (r) => r.spend });
  const actionSeries = dailySeries(rows, period, { actions: (r) => r.local_actions });

  const campaignId = param(sp, "campanha");
  const campaign = campaigns.find((c) => c.campaign_id === campaignId);
  let table: { title: string; rows: TableRow[]; withType: boolean };
  if (campaign) {
    const groups = await getBreakdown(filters, campaign.campaign_id);
    table = {
      title: "Grupos de anúncios",
      withType: false,
      rows: groups.map((g) =>
        toRow(g.name, g.name === "(sem nome)" ? "Sem grupo de anúncios (campanha Inteligente)" : g.name, g),
      ),
    };
  } else {
    table = {
      title: "Campanhas",
      withType: true,
      rows: campaigns.map((c) => ({
        ...toRow(c.campaign_id, c.campaign_name, c, hrefWith(base, sp, { campanha: c.campaign_id })),
        campaign_type: c.campaign_type,
      })),
    };
  }
  const columns: Column[] = table.withType
    ? [COLUMNS[0], { key: "campaign_type", label: "Tipo", format: "campaign_type" }, ...COLUMNS.slice(1)]
    : COLUMNS;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <FilterBar period={period} accounts={accounts} accountId={accountId} />
        <DataNotice period={period} lastDates={[{ label: "Google", date: lastDate }]} missingDays={spendSeries.missingDays} />
      </div>

      <section className="space-y-3">
        <StatGrid>
          <StatCard label="Investimento" value={current.spend} previous={previous.spend} format="brl" />
          <StatCard label="Impressões" value={current.impressions} previous={previous.impressions} format="int" />
          <StatCard label="Cliques" value={current.clicks} previous={previous.clicks} format="int" />
          <StatCard label="CTR" value={cur.ctr} previous={prev.ctr} format="pct" />
          <StatCard label="CPC médio" value={cur.cpc} previous={prev.cpc} format="brl" lowerIsBetter />
          <StatCard label="Ações locais" value={current.local_actions} previous={previous.local_actions} format="dec" />
          <StatCard label="Custo por ação local" value={cur.costPerLocalAction} previous={prev.costPerLocalAction} format="brl" lowerIsBetter />
        </StatGrid>
        {hasBreakdown ? (
          <StatGrid>
            <StatCard label="Rotas" value={current.directions} previous={previous.directions} format="dec" />
            <StatCard label="Ligações" value={current.calls} previous={previous.calls} format="dec" />
            <StatCard label="Cliques no site" value={current.website_clicks} previous={previous.website_clicks} format="dec" />
            <StatCard label="Outras interações" value={current.other_interactions} previous={previous.other_interactions} format="dec" />
          </StatGrid>
        ) : (
          <p className="text-xs opacity-60">
            Ações locais vêm de &quot;Todas as conv.&quot;. Para ver rotas, ligações e cliques no site separados, exporte o
            relatório com &quot;Ação de conversão&quot; nas linhas.
          </p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DailyChart title="Investimento por dia" points={spendSeries.points} series={[{ key: "spend", label: "Investimento", color: "var(--series-2)" }]} format="brl" />
        <DailyChart title="Ações locais por dia" points={actionSeries.points} series={[{ key: "actions", label: "Ações locais", color: "var(--series-2)" }]} format="dec" />
      </section>

      <section className="space-y-3">
        {campaign && (
          <nav aria-label="Navegação" className="flex flex-wrap items-center gap-1 text-sm">
            <Link href={hrefWith(base, sp, { campanha: null })} className="underline-offset-2 hover:underline">Campanhas</Link>
            <span className="opacity-50">/</span>
            <span className="font-medium">{campaign.campaign_name}</span>
          </nav>
        )}
        <h2 className="text-lg font-medium">{table.title}</h2>
        <DataTable
          columns={columns}
          rows={table.rows}
          initialSort="spend"
          fileName={`google-${table.title.toLowerCase().replace(/\s+/g, "-")}-${period.from}-a-${period.to}`}
          companyId={table.withType ? id : undefined}
        />
      </section>
    </div>
  );
}
