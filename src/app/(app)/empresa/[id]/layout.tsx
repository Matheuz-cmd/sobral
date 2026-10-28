import { notFound } from "next/navigation";
import { CompanyTabs } from "@/components/company-tabs";
import { RememberCompany } from "@/components/remember-company";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyLayout({ children, params }: LayoutProps<"/empresa/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("id, name, color").eq("id", id).maybeSingle();
  if (!company) notFound();

  return (
    <div className="space-y-6">
      <RememberCompany companyId={company.id} />
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="size-4 shrink-0 rounded-full" style={{ background: company.color }} />
        <h1 className="truncate text-2xl font-semibold">{company.name}</h1>
      </div>
      <CompanyTabs companyId={company.id} />
      {children}
    </div>
  );
}
