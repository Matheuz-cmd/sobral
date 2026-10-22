/** Mostrado na hora enquanto o servidor busca os dados do dashboard. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Carregando…</span>
      <div className="h-10 w-80 max-w-full animate-pulse rounded-lg bg-black/5 motion-reduce:animate-none dark:bg-white/10" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-black/5 motion-reduce:animate-none dark:bg-white/10" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-black/5 motion-reduce:animate-none dark:bg-white/10" />
    </div>
  );
}
