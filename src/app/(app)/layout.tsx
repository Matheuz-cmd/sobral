import Link from "next/link";
import { CompanySwitcher } from "@/components/company-switcher";
import { getClientsWithCompanies } from "@/lib/data";
import { logout } from "../login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const clients = await getClientsWithCompanies();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/10 bg-background px-4 py-3 dark:border-white/15">
        <Link href="/" className="font-semibold">BI Ads</Link>
        <CompanySwitcher clients={clients} />
        <form action={logout} className="ml-auto">
          <button className="btn">Sair</button>
        </form>
      </header>
      <div className="mx-auto max-w-6xl p-4">{children}</div>
    </div>
  );
}
