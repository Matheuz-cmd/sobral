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
  { key: "spend", label: "Investimento", format: "brl" },
  { key: "impressions", label: "Impressões", format: "int" },
  { key: "clicks", label: "Cliques no link", format: "int" },
  { key: "ctr", label: "CTR", format: "pct" },
  { key: "cpc", label: "CPC", format: "brl" },
  { key: "cpm", label: "CPM", format: "brl" },
  { key: "profile_visits", label: "Visitas ao perfil", format: "int" },
  { key: "cost_per_visit", label: "Custo por visita", format: "brl" },
  { key: "ig_follows", label: "Seguidores", format: "int" },
  { key: "cost_per_follow", label: "Custo por seguidor", format: "brl" },
];

/** Linha da tabela; campanhas de WhatsApp não exibem resultado (ver PRD). */
function toRow(id: string, name: string, t: Totals, whatsapp: boolean, href?: string): TableRow {
  const r = rates(t);
  return {
    id, name, href: href ?? null,
    spend: t.spend, impressions: t.impressions, clicks: t.clicks,
    ctr: r.ctr, cpc: r.cpc, cpm: r.cpm,
    profile_visits: whatsapp ? null : t.profile_visits,
    cost_per_visit: whatsapp ? null : r.costPerVisit,
    ig_follows: whatsapp ? null : t.ig_follows,
    cost_per_follow: whatsapp ? null : r.costPerFollow,
  };
}

export default async function MetaPage({ params, searchParams }: PageProps<"/empresa/[id]/meta">) {
  const { id } = await params;
  const sp = await searchParams;
  const { filters, period, accounts, accountId } = await readFilters(id, sp, "meta");
  const base = `/empresa/${id}/meta`;

  const [rows, campaigns, lastDate] = await Promise.all([
    getDailyRows(filters, "meta"),
    getCampaigns(filters, "meta"),
    getLastDataDate(id, "meta"),
  ]);

  const all = summarize(rows, period);
  const visits = summarize(rows, period, (r) => r.campaign_type === "profile_visits");
  const whatsapp = summarize(rows, period, (r) => r.campaign_type === "messages_whatsapp");
  const [cur, prev] = [rates(all.current), rates(all.previous)];
  const [vCur, vPrev] = [rates(visits.current), rates(visits.previous)];
  const [wCur, wPrev] = [rates(whatsapp.current), rates(whatsapp.previous)];
  const hasVisits = campaigns.some((c) => c.campaign_type === "profile_visits") || visits.previous.spend > 0;
  const hasWhatsapp = campaigns.some((c) => c.campaign_type === "messages_whatsapp") || whatsapp.previous.spend > 0;

  const spendSeries = dailySeries(rows, period, { spend: (r) => r.spend });
  const visitSeries = dailySeries(rows, period, {
    visits: (r) => (r.campaign_type === "profile_visits" ? r.profile_visits : 0),
  });

  // Navegação campanha → conjunto → anúncio (RF13)
  const campaignId = param(sp, "campanha");
  const adsetName = param(sp, "conjunto");
  const campaign = campaigns.find((c) => c.campaign_id === campaignId);
  let table: { title: string; rows: TableRow[]; withType: boolean };
  if (campaign) {
    const breakdown = await getBreakdown(filters, campaign.campaign_id, adsetName);
    const isWhatsapp = campaign.campaign_type === "messages_whatsapp";
    table = {
      title: adsetName ? "Anúncios" : "Conjuntos de anúncios",
      withType: false,
      rows: breakdown.map((b) =>
        toRow(b.name, b.name, b, isWhatsapp, adsetName ? undefined : hrefWith(base, sp, { conjunto: b.name })),
      ),
    };
  } else {
    table = {
      title: "Campanhas",
      withType: true,
      rows: campaigns.map((c) => ({
        ...toRow(c.campaign_id, c.campaign_name, c, c.campaign_type === "messages_whatsapp", hrefWith(base, sp, { campanha: c.campaign_id })),
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
        <DataNotice period={period} lastDates={[{ label: "Meta", date: lastDate }]} missingDays={spendSeries.missingDays} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Todas as campanhas</h2>
        <StatGrid>
          <StatCard label="Investimento" value={all.current.spend} previous={all.previous.spend} format="brl" />
          <StatCard label="Impressões" value={all.current.impressions} previous={all.previous.impressions} format="int" />
          <StatCard label="Cliques no link" value={all.current.clicks} previous={all.previous.clicks} format="int" />
          <StatCard label="CTR" value={cur.ctr} previous={prev.ctr} format="pct" />
          <StatCard label="CPC" value={cur.cpc} previous={prev.cpc} format="brl" lowerIsBetter />
          <StatCard label="CPM" value={cur.cpm} previous={prev.cpm} format="brl" lowerIsBetter />
        </StatGrid>
        <p className="text-xs opacity-60">
          Alcance não é exibido: ele conta pessoas únicas e não pode ser somado entre dias e anúncios.
        </p>
      </section>

      {hasVisits && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Visitas ao perfil</h2>
          <StatGrid>
            <StatCard label="Investimento" value={visits.current.spend} previous={visits.previous.spend} format="brl" />
            <StatCard label="Visitas ao perfil" value={visits.current.profile_visits} previous={visits.previous.profile_visits} format="int" />
            <StatCard label="Custo por visita" value={vCur.costPerVisit} previous={vPrev.costPerVisit} format="brl" lowerIsBetter />
            <StatCard label="Seguidores" value={visits.current.ig_follows} previous={visits.previous.ig_follows} format="int" />
            <StatCard label="Custo por seguidor" value={vCur.costPerFollow} previous={vPrev.costPerFollow} format="brl" lowerIsBetter />
            <StatCard label="CTR" value={vCur.ctr} previous={vPrev.ctr} format="pct" />
            <StatCard label="CPM" value={vCur.cpm} previous={vPrev.cpm} format="brl" lowerIsBetter />
          </StatGrid>
        </section>
      )}

      {hasWhatsapp && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Mensagens para o WhatsApp</h2>
          <StatGrid>
            <StatCard label="Investimento" value={whatsapp.current.spend} previous={whatsapp.previous.spend} format="brl" />
            <StatCard label="Impressões" value={whatsapp.current.impressions} previous={whatsapp.previous.impressions} format="int" />
            <StatCard label="Cliques no link" value={whatsapp.current.clicks} previous={whatsapp.previous.clicks} format="int" />
            <StatCard label="CTR" value={wCur.ctr} previous={wPrev.ctr} format="pct" />
            <StatCard label="CPC" value={wCur.cpc} previous={wPrev.cpc} format="brl" lowerIsBetter />
            <StatCard label="CPM" value={wCur.cpm} previous={wPrev.cpm} format="brl" lowerIsBetter />
          </StatGrid>
          <p className="text-xs opacity-60">
            Conversas iniciadas não são exibidas: o número reportado pelo Meta não bate com a realidade.
          </p>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <DailyChart title="Investimento por dia" points={spendSeries.points} series={[{ key: "spend", label: "Investimento", color: "var(--series-1)" }]} format="brl" />
        {hasVisits && (
          <DailyChart title="Visitas ao perfil por dia" points={visitSeries.points} series={[{ key: "visits", label: "Visitas ao perfil", color: "var(--series-1)" }]} format="int" />
        )}
      </section>

      <section className="space-y-3">
        <nav aria-label="Navegação" className="flex flex-wrap items-center gap-1 text-sm">
          {campaign ? (
            <>
              <Link href={hrefWith(base, sp, { campanha: null, conjunto: null })} className="underline-offset-2 hover:underline">
                Campanhas
              </Link>
              <span className="opacity-50">/</span>
              {adsetName ? (
                <>
                  <Link href={hrefWith(base, sp, { conjunto: null })} className="underline-offset-2 hover:underline">
                    {campaign.campaign_name}
                  </Link>
                  <span className="opacity-50">/</span>
                  <span className="font-medium">{adsetName}</span>
                </>
              ) : (
                <span className="font-medium">{campaign.campaign_name}</span>
              )}
            </>
          ) : null}
        </nav>
        <h2 className="text-lg font-medium">{table.title}</h2>
        <DataTable
          columns={columns}
          rows={table.rows}
          initialSort="spend"
          fileName={`meta-${table.title.toLowerCase().replace(/\s+/g, "-")}-${period.from}-a-${period.to}`}
          companyId={table.withType ? id : undefined}
        />
      </section>
    </div>
  );
}
