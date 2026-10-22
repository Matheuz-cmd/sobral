import { DailyChart } from "@/components/dashboard/daily-chart";
import { DataNotice } from "@/components/dashboard/data-notice";
import { DataTable, type Column, type TableRow } from "@/components/dashboard/data-table";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { dailySeries, getDailyRows, getLastDataDate, rates, summarize, type Totals } from "@/lib/dashboard";
import { readFilters } from "@/lib/dashboard-params";

const COLUMNS: Column[] = [
  { key: "name", label: "Plataforma", format: "text" },
  { key: "spend", label: "Investimento", format: "brl" },
  { key: "share", label: "% do investimento", format: "pct" },
  { key: "impressions", label: "Impressões", format: "int" },
  { key: "clicks", label: "Cliques", format: "int" },
  { key: "ctr", label: "CTR", format: "pct" },
  { key: "cpc", label: "CPC", format: "brl" },
  { key: "result", label: "Resultado principal", format: "dec" },
  { key: "cost_per_result", label: "Custo por resultado", format: "brl" },
];

/** Visão consolidada da empresa: as duas plataformas somadas e lado a lado (RF18). */
export default async function OverviewPage({ params, searchParams }: PageProps<"/empresa/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { filters, period, accounts, accountId } = await readFilters(id, sp);

  const [rows, metaLast, googleLast] = await Promise.all([
    getDailyRows(filters),
    getLastDataDate(id, "meta"),
    getLastDataDate(id, "google"),
  ]);

  const total = summarize(rows, period);
  const meta = summarize(rows, period, (r) => r.platform === "meta");
  const google = summarize(rows, period, (r) => r.platform === "google");
  const metaVisits = summarize(rows, period, (r) => r.platform === "meta" && r.campaign_type === "profile_visits");
  const [vCur, vPrev] = [rates(metaVisits.current), rates(metaVisits.previous)];
  const [gCur, gPrev] = [rates(google.current), rates(google.previous)];

  const series = dailySeries(rows, period, {
    meta: (r) => (r.platform === "meta" ? r.spend : 0),
    google: (r) => (r.platform === "google" ? r.spend : 0),
  });

  const platformRow = (key: string, name: string, t: Totals, result: number, resultSpend: number): TableRow => {
    const r = rates(t);
    return {
      id: key, name,
      spend: t.spend,
      share: total.current.spend > 0 ? t.spend / total.current.spend : null,
      impressions: t.impressions, clicks: t.clicks, ctr: r.ctr, cpc: r.cpc,
      result,
      cost_per_result: result > 0 ? resultSpend / result : null,
    };
  };
  const tableRows = [
    platformRow("meta", "Meta Ads · visitas ao perfil", meta.current, metaVisits.current.profile_visits, metaVisits.current.spend),
    platformRow("google", "Google Ads · ações locais", google.current, google.current.local_actions, google.current.spend),
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <FilterBar period={period} accounts={accounts} accountId={accountId} />
        <DataNotice
          period={period}
          lastDates={[{ label: "Meta", date: metaLast }, { label: "Google", date: googleLast }]}
          missingDays={series.missingDays}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Investimento</h2>
        <StatGrid>
          <StatCard label="Total" value={total.current.spend} previous={total.previous.spend} format="brl" />
          <StatCard label="Meta Ads" value={meta.current.spend} previous={meta.previous.spend} format="brl" />
          <StatCard label="Google Ads" value={google.current.spend} previous={google.previous.spend} format="brl" />
        </StatGrid>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Resultados</h2>
        <StatGrid>
          <StatCard label="Visitas ao perfil (Meta)" value={metaVisits.current.profile_visits} previous={metaVisits.previous.profile_visits} format="int" />
          <StatCard label="Custo por visita" value={vCur.costPerVisit} previous={vPrev.costPerVisit} format="brl" lowerIsBetter />
          <StatCard label="Seguidores (Meta)" value={metaVisits.current.ig_follows} previous={metaVisits.previous.ig_follows} format="int" />
          <StatCard label="Ações locais (Google)" value={google.current.local_actions} previous={google.previous.local_actions} format="dec" />
          <StatCard label="Custo por ação local" value={gCur.costPerLocalAction} previous={gPrev.costPerLocalAction} format="brl" lowerIsBetter />
        </StatGrid>
        <p className="text-xs opacity-60">
          Os resultados não são somados entre plataformas porque medem coisas diferentes. Campanhas de WhatsApp
          entram no investimento, mas não têm resultado exibido.
        </p>
      </section>

      <DailyChart
        title="Investimento por dia e plataforma"
        points={series.points}
        series={[
          { key: "meta", label: "Meta Ads", color: "var(--series-1)" },
          { key: "google", label: "Google Ads", color: "var(--series-2)" },
        ]}
        format="brl"
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Por plataforma</h2>
        <DataTable columns={COLUMNS} rows={tableRows} initialSort="spend" fileName={`visao-geral-${period.from}-a-${period.to}`} />
      </section>
    </div>
  );
}
