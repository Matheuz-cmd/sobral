"use client";

import { useActionState } from "react";
import { createClientAction, createCompanyAction } from "@/app/(app)/actions";

export function NewClientForm() {
  const [state, action, pending] = useActionState(createClientAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-sm">
        <span>Novo cliente</span>
        <input name="name" required autoComplete="off" placeholder="Nome do cliente…" className="input" />
      </label>
      <button disabled={pending} className="btn-primary">Criar cliente</button>
      {state?.error && <p role="alert" className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function NewCompanyForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(createCompanyAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="client_id" value={clientId} />
      <input name="name" required autoComplete="off" placeholder="Nova empresa…" aria-label="Nome da empresa" className="input w-48" />
      <input name="color" type="color" defaultValue="#2563eb" aria-label="Cor da empresa" className="h-9 w-10 rounded border" />
      <button disabled={pending} className="btn">Adicionar</button>
      {state?.error && <p role="alert" className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
