"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { slug: "", label: "Visão geral" },
  { slug: "meta", label: "Meta Ads" },
  { slug: "google", label: "Google Ads" },
  { slug: "importacoes", label: "Importações" },
  { slug: "configuracoes", label: "Configurações" },
];

export function CompanyTabs({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const base = `/empresa/${companyId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/10 dark:border-white/15">
      {tabs.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active ? "border-current font-medium" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
