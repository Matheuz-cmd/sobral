"use client";

import { useEffect } from "react";
import { rememberCompany } from "@/app/(app)/actions";

/** Grava a última empresa aberta depois da renderização, sem atrasar a página. */
export function RememberCompany({ companyId }: { companyId: string }) {
  useEffect(() => {
    rememberCompany(companyId).catch(() => {
      // preferência não essencial: falhar aqui não deve quebrar a tela
    });
  }, [companyId]);
  return null;
}
