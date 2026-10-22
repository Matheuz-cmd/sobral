"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { undoImport } from "@/lib/import/commit";
import { formatDate, formatDateTime, formatInt } from "@/lib/format";

export type ImportRow = {
  id: string;
  platform: "meta" | "google";
  file_name: string;
  period_start: string | null;
  period_end: string | null;
  rows_read: number;
  rows_error: number;
  status: "pending" | "done" | "failed" | "undone";
  created_at: string;
  ad_account_name: string | null;
};

const STATUS: Record<ImportRow["status"], string> = {
  pending: "Pendente",
  done: "Concluída",
  failed: "Falhou",
  undone: "Desfeita",
};

export function ImportHistory({ imports }: { imports: ImportRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function undo(row: ImportRow) {
    if (!window.confirm(`Desfazer a importação "${row.file_name}"? Os dados dela saem dos dashboards.`)) return;
    setBusy(row.id);
    setError(null);
    try {
      await undoImport(row.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao desfazer.");
    } finally {
      setBusy(null);
    }
  }

  if (imports.length === 0) return <p className="text-sm opacity-70">Nenhuma importação ainda.</p>;

  return (
    <div className="space-y-2">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 dark:bg-white/10">
            <tr>
              {["Quando", "Plataforma", "Conta", "Arquivo", "Período", "Linhas", "Erros", "Status", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {imports.map((row) => (
              <tr key={row.id} className="border-t border-black/10 dark:border-white/15">
                <td className="whitespace-nowrap px-3 py-2">{formatDateTime(row.created_at)}</td>
                <td className="px-3 py-2">{row.platform === "meta" ? "Meta" : "Google"}</td>
                <td className="px-3 py-2">{row.ad_account_name ?? "—"}</td>
                <td className="px-3 py-2">{row.file_name}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {row.period_start ? `${formatDate(row.period_start)} a ${formatDate(row.period_end)}` : "—"}
                </td>
                <td className="px-3 py-2">{formatInt(row.rows_read)}</td>
                <td className="px-3 py-2">{formatInt(row.rows_error)}</td>
                <td className="px-3 py-2">{STATUS[row.status]}</td>
                <td className="px-3 py-2">
                  {row.status === "done" && (
                    <button onClick={() => undo(row)} disabled={busy === row.id} className="btn">
                      Desfazer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
