"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Client } from "@/lib/types";

export function CompanySwitcher({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const currentId = usePathname().match(/^\/empresa\/([^/]+)/)?.[1];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = clients.flatMap((c) => c.companies).find((e) => e.id === currentId);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .map((c) => ({
        ...c,
        companies: c.companies.filter(
          (e) => !q || e.name.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.companies.length > 0);
  }, [clients, query]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="btn flex items-center gap-2"
      >
        <span className="size-3 rounded-full" style={{ background: current?.color ?? "#9ca3af" }} />
        {current?.name ?? "Selecionar empresa"}
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-72 rounded-xl border border-black/10 bg-background p-2 shadow-lg dark:border-white/15">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresa ou cliente"
            className="input mb-2"
          />
          <ul role="listbox" className="max-h-72 overflow-auto">
            {groups.map((c) => (
              <li key={c.id}>
                <p className="px-2 pt-2 text-xs font-medium uppercase tracking-wide opacity-60">{c.name}</p>
                {c.companies.map((e) => (
                  <button
                    key={e.id}
                    role="option"
                    aria-selected={e.id === currentId}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(`/empresa/${e.id}`);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <span className="size-3 rounded-full" style={{ background: e.color }} />
                    {e.name}
                  </button>
                ))}
              </li>
            ))}
            {groups.length === 0 && <li className="px-2 py-3 text-sm opacity-60">Nenhuma empresa encontrada.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
