"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Grava a última empresa aberta direto no Supabase (a RLS só deixa o usuário
 * gravar a própria linha). Não usa server action: o App Router enfileira
 * navegações atrás de actions pendentes, e isso atrasaria o próximo clique.
 */
export function RememberCompany({ companyId }: { companyId: string }) {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getClaims().then(({ data }) => {
      const userId = data?.claims?.sub;
      if (!userId) return;
      // A consulta do Supabase só executa ao ser consumida; o erro é ignorado de propósito:
      // é uma preferência não essencial e não deve quebrar a tela.
      supabase
        .from("user_settings")
        .upsert({ user_id: userId, last_company_id: companyId })
        .then(() => {});
    });
  }, [companyId]);
  return null;
}
