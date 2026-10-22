import { notFound } from "next/navigation";
import { rememberCompany } from "../../actions";
import { CompanyTabs } from "@/components/company-tabs";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyLayout({ children, params }: LayoutProps<"/empresa/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("id, name, color").eq("id", id).maybeSingle();
  if (!company) notFound();
  await rememberCompany(company.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="size-4 rounded-full" style={{ background: company.color }} />
        <h1 className="text-2xl font-semibold">{company.name}</h1>
      </div>
      <CompanyTabs companyId={company.id} />
      {children}
    </div>
  );
}
