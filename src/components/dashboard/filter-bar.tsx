"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PRESETS, type Period, type PresetKey } from "@/lib/period";

/** Filtros de período e conta (RF19). O estado fica na URL, então o link compartilha a mesma visão. */
export function FilterBar({
  period,
  accounts,
  accountId,
}: {
  period: Period;
  accounts: { id: string; name: string }[];
  accountId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-sm">
        <span>Período</span>
        <select
          value={period.preset}
          onChange={(e) => {
            const preset = e.target.value as PresetKey;
            update(
              preset === "custom"
                ? { periodo: preset, de: period.from, ate: period.to }
                : { periodo: preset, de: null, ate: null },
            );
          }}
          className="input"
        >
          {Object.entries(PRESETS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
      {period.preset === "custom" && (
        <>
          <label className="space-y-1 text-sm">
            <span>De</span>
            <input type="date" value={period.from} max={period.to} onChange={(e) => update({ de: e.target.value })} className="input" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Até</span>
            <input type="date" value={period.to} min={period.from} onChange={(e) => update({ ate: e.target.value })} className="input" />
          </label>
        </>
      )}
      {accounts.length > 1 && (
        <label className="space-y-1 text-sm">
          <span>Conta</span>
          <select value={accountId ?? ""} onChange={(e) => update({ conta: e.target.value || null })} className="input">
            <option value="">Todas as contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
