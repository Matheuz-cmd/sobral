"use client";

import { useActionState } from "react";
import { createAdAccountAction, updateCompanyAction } from "@/app/(app)/empresa/[id]/actions";

export function CompanyForm({ companyId, name, color }: { companyId: string; name: string; color: string }) {
  const [state, action, pending] = useActionState(updateCompanyAction.bind(null, companyId), null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-sm">
        <span>Nome</span>
        <input name="name" defaultValue={name} required className="input" />
      </label>
      <label className="space-y-1 text-sm">
        <span>Cor</span>
        <input name="color" type="color" defaultValue={color} className="block h-9 w-12 rounded border" />
      </label>
      <button disabled={pending} className="btn">Salvar</button>
      {state?.error && <p role="alert" className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function AdAccountForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(createAdAccountAction.bind(null, companyId), null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-sm">
        <span>Plataforma</span>
        <select name="platform" required className="input">
          <option value="meta">Meta Ads</option>
          <option value="google">Google Ads</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>Nome da conta</span>
        <input name="name" required className="input" />
      </label>
      <label className="space-y-1 text-sm">
        <span>ID da conta</span>
        <input name="external_id" placeholder="opcional" className="input" />
      </label>
      <label className="w-20 space-y-1 text-sm">
        <span>Moeda</span>
        <input name="currency" defaultValue="BRL" maxLength={3} className="input" />
      </label>
      <button disabled={pending} className="btn-primary">Cadastrar conta</button>
      {state?.error && <p role="alert" className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
