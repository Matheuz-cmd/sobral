import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { NewClientForm, NewCompanyForm } from "@/components/create-forms";
import { getClientsWithCompanies, getCompanySnapshots } from "@/lib/data";
import { formatBRL, formatDateTime } from "@/lib/format";
import { todayISO } from "@/lib/period";
import { deleteAction, setStatusAction } from "./actions";

export default async function HomePage() {
  const [all, snapshots] = await Promise.all([
    getClientsWithCompanies(true),
    getCompanySnapshots(`${todayISO().slice(0, 7)}-01`),
  ]);
  const active = all.filter((c) => c.status === "active");
  const archivedClients = all.filter((c) => c.status === "archived");
  const archivedCompanies = active.flatMap((c) =>
    c.companies.filter((e) => e.status === "archived").map((e) => ({ ...e, clientName: c.name })),
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-balance">Clientes e empresas</h1>
      <NewClientForm />
      {active.length === 0 && <p className="opacity-70">Crie o primeiro cliente para começar.</p>}

      {active.map((client) => (
        <section key={client.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">{client.name}</h2>
            <form action={setStatusAction.bind(null, "clients", client.id, "archived")} className="ml-auto">
              <ConfirmButton message={`Arquivar o cliente "${client.name}"? Ele e suas empresas somem da lista, mas os dados são mantidos.`}>
                Arquivar
              </ConfirmButton>
            </form>
            <form action={deleteAction.bind(null, "clients", client.id)}>
              <ConfirmButton
                className="btn text-red-600"
                message={`Excluir o cliente "${client.name}" apaga todas as empresas e dados dele. Isso não pode ser desfeito. Continuar?`}
              >
                Excluir
              </ConfirmButton>
            </form>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {client.companies
              .filter((e) => e.status === "active")
              .map((company) => (
                <Link
                  key={company.id}
                  href={`/empresa/${company.id}`}
                  className="rounded-xl border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                  style={{ borderLeft: `4px solid ${company.color}` }}
                >
                  <p className="font-medium">{company.name}</p>
                  {(() => {
                    const s = snapshots.get(company.id);
                    if (!s?.lastImport) return <p className="mt-1 text-sm opacity-60">Sem importações ainda</p>;
                    return (
                      <div className="mt-2 space-y-0.5 text-sm">
                        <p className="opacity-60">Investimento no mês</p>
                        <p className="tabular-nums">Meta {formatBRL(s.meta)} · Google {formatBRL(s.google)}</p>
                        <p className="text-xs opacity-60">Última importação: {formatDateTime(s.lastImport)}</p>
                      </div>
                    );
                  })()}
                </Link>
              ))}
          </div>
          <NewCompanyForm clientId={client.id} />
        </section>
      ))}

      {(archivedClients.length > 0 || archivedCompanies.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Arquivados</h2>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/15 dark:border-white/15">
            {archivedClients.map((c) => (
              <li key={c.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                <span>Cliente: {c.name}</span>
                <form action={setStatusAction.bind(null, "clients", c.id, "active")} className="ml-auto">
                  <button className="btn">Restaurar</button>
                </form>
              </li>
            ))}
            {archivedCompanies.map((e) => (
              <li key={e.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                <span>
                  Empresa: {e.name} <span className="opacity-60">({e.clientName})</span>
                </span>
                <form action={setStatusAction.bind(null, "companies", e.id, "active")} className="ml-auto">
                  <button className="btn">Restaurar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
