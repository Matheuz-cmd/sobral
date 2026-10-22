"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 rounded-xl border border-black/10 p-6 dark:border-white/15"
      >
        <h1 className="text-xl font-semibold">Entrar</h1>
        <label className="block space-y-1 text-sm">
          <span>E-mail</span>
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Senha</span>
          <input name="password" type="password" required autoComplete="current-password" className="input" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
