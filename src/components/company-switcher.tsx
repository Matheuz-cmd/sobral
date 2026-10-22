"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Client } from "@/lib/types";

export function CompanySwitcher({ clients }: { clients: Client[] }) {
  const currentId = usePathname().match(/^\/empresa\/([^/]+)/)?.[1];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

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

  function close() {
    setOpen(false);
    setQuery("");
  }

  // Fecha com Esc ou clique fora, só enquanto o painel está aberto.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={panelId}
        className="btn flex max-w-[60vw] items-center gap-2"
      >
        <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: current?.color ?? "#9ca3af" }} />
        <span className="truncate">{current?.name ?? "Selecionar empresa"}</span>
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute left-0 z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] overscroll-contain rounded-xl border border-black/10 bg-background p-2 shadow-lg dark:border-white/15"
        >
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar empresa ou cliente"
            placeholder="Buscar empresa ou cliente…"
            autoComplete="off"
            className="input mb-2"
          />
          <nav aria-label="Empresas" className="max-h-72 overflow-auto">
            {groups.map((c) => (
              <div key={c.id}>
                <p className="px-2 pt-2 text-xs font-medium uppercase tracking-wide opacity-60">{c.name}</p>
                <ul>
                  {c.companies.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/empresa/${e.id}`}
                        onClick={close}
                        aria-current={e.id === currentId ? "page" : undefined}
                        className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5 aria-[current=page]:font-medium dark:hover:bg-white/10"
                      >
                        <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: e.color }} />
                        <span className="truncate">{e.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {groups.length === 0 ? <p className="px-2 py-3 text-sm opacity-60">Nenhuma empresa encontrada.</p> : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
