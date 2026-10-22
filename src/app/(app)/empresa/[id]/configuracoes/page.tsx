import { ConfirmButton } from "@/components/confirm-button";
import { AdAccountForm, CompanyForm } from "@/components/settings-forms";
import { createClient } from "@/lib/supabase/server";
import { archiveCompanyAction, deleteAdAccountAction, deleteCompanyAction } from "../actions";

const PLATFORM_LABEL = { meta: "Meta Ads", google: "Google Ads" } as const;

export default async function SettingsPage({ params }: PageProps<"/empresa/[id]/configuracoes">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: company }, { data: accounts }] = await Promise.all([
    supabase.from("companies").select("name, color").eq("id", id).single(),
    supabase.from("ad_accounts").select("id, platform, name, external_id, currency").eq("company_id", id).order("platform"),
  ]);
  if (!company) return null;

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Empresa</h2>
        <CompanyForm companyId={id} name={company.name} color={company.color} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Contas de anúncios</h2>
        <p className="text-sm opacity-70">Cada importação é gravada em uma conta. Cadastre pelo menos uma por plataforma.</p>
        {accounts?.length ? (
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/15 dark:border-white/15">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{a.name}</span>
                <span className="opacity-60">
                  {PLATFORM_LABEL[a.platform as keyof typeof PLATFORM_LABEL]} · {a.currency}
                  {a.external_id ? ` · ${a.external_id}` : ""}
                </span>
                <form action={deleteAdAccountAction.bind(null, id, a.id)} className="ml-auto">
                  <ConfirmButton message={`Excluir a conta "${a.name}" e todos os dados importados nela?`}>
                    Excluir
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">Nenhuma conta cadastrada.</p>
        )}
        <AdAccountForm companyId={id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Zona de risco</h2>
        <div className="flex flex-wrap gap-2">
          <form action={archiveCompanyAction.bind(null, id)}>
            <ConfirmButton message="Arquivar esta empresa? Ela some da lista, mas os dados são mantidos.">
              Arquivar empresa
            </ConfirmButton>
          </form>
          <form action={deleteCompanyAction.bind(null, id)}>
            <ConfirmButton
              className="btn text-red-600"
              message="Excluir esta empresa apaga contas, importações e métricas. Isso não pode ser desfeito. Continuar?"
            >
              Excluir empresa
            </ConfirmButton>
          </form>
        </div>
      </section>
    </div>
  );
}
