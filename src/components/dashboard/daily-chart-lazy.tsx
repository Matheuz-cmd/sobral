"use client";

import dynamic from "next/dynamic";

/**
 * O Recharts é a dependência mais pesada das telas: carrega depois dos cards,
 * com um espaço reservado da mesma altura para a página não pular.
 */
export const DailyChart = dynamic(() => import("./daily-chart").then((m) => m.DailyChart), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="h-72 animate-pulse rounded-xl border border-black/10 bg-black/5 motion-reduce:animate-none dark:border-white/15 dark:bg-white/10"
    />
  ),
});
