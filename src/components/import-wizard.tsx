"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { autoMap, detectPlatform, findHeaderRow, PLATFORM_FIELDS, toNamedMapping, validateMapping } from "@/lib/import/columns";
import { commitImport, type CommitResult, type ImportProgress } from "@/lib/import/commit";
import { normalizeRows } from "@/lib/import/normalize";
import { ImportFileError, readFileRows } from "@/lib/import/read-file";
import type { Mapping, NamedMapping, Platform } from "@/lib/import/types";
import { formatBRL, formatDate, formatInt } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export type AccountOption = { id: string; name: string; platform: Platform };
export type SavedMappings = Partial<Record<Platform, NamedMapping>>;

const PLATFORM_LABEL: Record<Platform, string> = { meta: "Meta Ads", google: "Google Ads" };
const PREVIEW_ROWS = 8;
const SHOWN_ERRORS = 20;

type Loaded = { fileName: string; rows: unknown[][]; headerIndex: number; headerFound: boolean };

export function ImportWizard({
  companyId,
  accounts,
  savedMappings,
}: {
  companyId: string;
  accounts: AccountOption[];
  savedMappings: SavedMappings;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [platform, setPlatform] = useState<Platform>("meta");
  const [mapping, setMapping] = useState<Mapping>({});
  const [selectedAccount, setSelectedAccount] = useState("");
  const [readError, setReadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [replacedCount, setReplacedCount] = useState<{ key: string; count: number } | null>(null);

  const headers = useMemo(() => (loaded ? loaded.rows[loaded.headerIndex] ?? [] : []), [loaded]);
  const platformAccounts = accounts.filter((a) => a.platform === platform);

  const accountId = platformAccounts.some((a) => a.id === selectedAccount)
    ? selectedAccount
    : platformAccounts[0]?.id ?? "";

  const normalized = useMemo(() => {
    if (!loaded) return null;
    return normalizeRows(platform, loaded.rows.slice(loaded.headerIndex + 1), loaded.headerIndex + 2, mapping);
  }, [loaded, platform, mapping]);

  const mappingProblems = useMemo(() => validateMapping(platform, mapping), [platform, mapping]);

  // Quantas linhas já gravadas serão substituídas (RF07).
  const periodKey = `${accountId}|${normalized?.periodStart}|${normalized?.periodEnd}`;
  const replaced = replacedCount?.key === periodKey ? replacedCount.count : null;
  useEffect(() => {
    if (!accountId || !normalized?.periodStart || !normalized.periodEnd) return;
    let cancelled = false;
    createClient()
      .from("metrics_daily")
      .select("id", { count: "exact", head: true })
      .eq("ad_account_id", accountId)
      .gte("date", normalized.periodStart)
      .lte("date", normalized.periodEnd)
      .then(({ count }) => {
        if (!cancelled) setReplacedCount({ key: periodKey, count: count ?? 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, periodKey, normalized?.periodStart, normalized?.periodEnd]);

  async function onFile(selected: File | null) {
    setFile(selected);
    setLoaded(null);
    setResult(null);
    setCommitError(null);
    setReadError(null);
    if (!selected) return;
    try {
      const rows = await readFileRows(selected);
      const found = findHeaderRow(rows);
      const headerIndex = Math.max(found, 0);
      const detected = detectPlatform(rows[headerIndex] ?? []) ?? platform;
      setPlatform(detected);
      setMapping(autoMap(rows[headerIndex] ?? [], detected, savedMappings[detected]));
      setLoaded({ fileName: selected.name, rows, headerIndex, headerFound: found >= 0 });
    } catch (e) {
      setReadError(e instanceof ImportFileError ? e.message : "Não foi possível ler o arquivo.");
    }
  }

  function changePlatform(next: Platform) {
    setPlatform(next);
    setMapping(autoMap(headers, next, savedMappings[next]));
  }

  async function confirm() {
    if (!file || !normalized || !accountId) return;
    setCommitError(null);
    setProgress({ label: "Iniciando", percent: 0 });
    try {
      const done = await commitImport({
        companyId,
        adAccountId: accountId,
        platform,
        file,
        records: normalized.records,
        rowsRead: normalized.rowsRead,
        rowsError: normalized.errors.length,
        namedMapping: toNamedMapping(mapping, headers),
        onProgress: setProgress,
      });
      setResult(done);
      setLoaded(null);
      setFile(null);
      router.refresh();
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : "Falha na importação.");
    } finally {
      setProgress(null);
    }
  }

  const canConfirm =
    !!loaded && !!accountId && mappingProblems.length === 0 && (normalized?.records.length ?? 0) > 0 && !progress;

  return (
    <div className="space-y-6">
      {result && (
        <div role="status" className="rounded-xl border border-green-600/40 bg-green-600/10 p-4 text-sm">
          <p className="font-medium">
            Importação concluída: {formatInt(result.rows)} linhas de {formatDate(result.periodStart)} a{" "}
            {formatDate(result.periodEnd)}.
          </p>
          {result.replaced > 0 && <p>{formatInt(result.replaced)} linhas antigas do mesmo período foram substituídas.</p>}
          {result.warning && <p className="text-amber-600">{result.warning}</p>}
        </div>
      )}

      {accounts.length === 0 ? (
        <p className="rounded-xl border border-black/10 p-4 text-sm dark:border-white/15">
          Cadastre uma conta de anúncios em <strong>Configurações</strong> antes de importar.
        </p>
      ) : (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Relatório (CSV ou Excel, até 10 MB)</span>
          <input
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="input"
          />
        </label>
      )}

      {readError && <p role="alert" className="text-sm text-red-600">{readError}</p>}

      {loaded && normalized && (
        <>
          <div className="flex flex-wrap gap-4">
            <label className="space-y-1 text-sm">
              <span>Plataforma</span>
              <select value={platform} onChange={(e) => changePlatform(e.target.value as Platform)} className="input">
                <option value="meta">Meta Ads</option>
                <option value="google">Google Ads</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Conta de anúncios</span>
              <select value={accountId} onChange={(e) => setSelectedAccount(e.target.value)} className="input">
                {platformAccounts.length === 0 && <option value="">Nenhuma conta {PLATFORM_LABEL[platform]}</option>}
                {platformAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
          </div>

          {!loaded.headerFound && (
            <p className="text-sm text-amber-600">
              Não reconheci o cabeçalho automaticamente. Confira o mapeamento das colunas abaixo.
            </p>
          )}

          <section className="space-y-2">
            <h3 className="font-medium">Mapeamento de colunas</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_FIELDS[platform].map((field) => (
                <label key={field.key} className="space-y-1 text-sm">
                  <span>
                    {field.label}
                    {field.required && <span className="text-red-600"> *</span>}
                  </span>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => {
                        const next = { ...m };
                        if (e.target.value === "") delete next[field.key];
                        else next[field.key] = Number(e.target.value);
                        return next;
                      })
                    }
                    className="input"
                  >
                    <option value="">— não usar —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{String(h ?? `Coluna ${i + 1}`) || `Coluna ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {mappingProblems.map((p) => (
              <p key={p} role="alert" className="text-sm text-red-600">{p}</p>
            ))}
          </section>

          <section className="space-y-2">
            <h3 className="font-medium">Pré-visualização</h3>
            <p className="text-sm opacity-70">
              {formatInt(normalized.records.length)} registros diários
              {normalized.periodStart && <> · período {formatDate(normalized.periodStart)} a {formatDate(normalized.periodEnd)}</>}
              {normalized.skipped > 0 && <> · {normalized.skipped} linhas ignoradas (vazias ou totais)</>}
            </p>
            {replaced !== null && replaced > 0 && (
              <p className="text-sm text-amber-600">
                Esta conta já tem {formatInt(replaced)} linhas nesse período; elas serão substituídas.
              </p>
            )}
            <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/5 dark:bg-white/10">
                  <tr>
                    {["Data", "Campanha", platform === "meta" ? "Conjunto / Anúncio" : "Grupo", "Investimento", "Impressões", "Cliques"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {normalized.records.slice(0, PREVIEW_ROWS).map((r) => (
                    <tr key={`${r.object_key}#${r.date}`} className="border-t border-black/10 dark:border-white/15">
                      <td className="px-3 py-2">{formatDate(r.date)}</td>
                      <td className="px-3 py-2">{r.campaign_name}</td>
                      <td className="px-3 py-2">{r.adset_name}{r.ad_name ? ` / ${r.ad_name}` : ""}</td>
                      <td className="px-3 py-2">{formatBRL(r.spend)}</td>
                      <td className="px-3 py-2">{formatInt(r.impressions)}</td>
                      <td className="px-3 py-2">{formatInt(r.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {normalized.errors.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-medium text-red-600">{normalized.errors.length} linhas com problema</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {normalized.errors.slice(0, SHOWN_ERRORS).map((e) => (
                  <li key={e.line}>{e.message}</li>
                ))}
              </ul>
              {normalized.errors.length > SHOWN_ERRORS && (
                <p className="text-sm opacity-70">E mais {normalized.errors.length - SHOWN_ERRORS} linhas.</p>
              )}
              <p className="text-sm opacity-70">Ao confirmar, essas linhas ficam de fora e o restante é importado.</p>
            </section>
          )}

          {commitError && <p role="alert" className="text-sm text-red-600">{commitError}</p>}

          {progress ? (
            <div className="space-y-1" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
              <p className="text-sm">{progress.label}…</p>
              <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                <div className="h-full bg-foreground transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          ) : (
            <button onClick={confirm} disabled={!canConfirm} className="btn-primary">
              Confirmar importação
            </button>
          )}
        </>
      )}
    </div>
  );
}
