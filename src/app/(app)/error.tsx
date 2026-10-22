"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="space-y-3 rounded-xl border border-black/10 p-6 dark:border-white/15">
      <h2 className="text-lg font-medium">Não foi possível carregar esta tela</h2>
      <p className="text-sm opacity-70">
        Pode ser uma falha momentânea de conexão com o banco. Tente de novo; se continuar, saia e entre novamente.
      </p>
      <button onClick={() => retry()} className="btn">
        Tentar de novo
      </button>
    </div>
  );
}
