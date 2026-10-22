"use client";

// Grava a importação: envia as linhas em lotes para a tabela de staging e confirma tudo
// numa única transação no banco (commit_import). Se algo falhar, nada vai para os dashboards.

import { createClient } from "@/lib/supabase/client";
import type { NamedMapping, NormalizedRow, Platform } from "./types";

const BATCH = 1000;

export type ImportProgress = { label: string; percent: number };

export type CommitInput = {
  companyId: string;
  adAccountId: string;
  platform: Platform;
  file: File;
  records: NormalizedRow[];
  rowsRead: number;
  rowsError: number;
  namedMapping: NamedMapping;
  onProgress: (p: ImportProgress) => void;
};

export type CommitResult = {
  importId: string;
  rows: number;
  replaced: number;
  periodStart: string;
  periodEnd: string;
  warning?: string;
};

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function commitImport(input: CommitInput): Promise<CommitResult> {
  const { companyId, adAccountId, platform, file, records, onProgress } = input;
  const supabase = createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) throw new Error("Sessão expirada. Entre novamente.");

  onProgress({ label: "Registrando importação", percent: 2 });
  const { data: created, error: createError } = await supabase
    .from("imports")
    .insert({
      company_id: companyId,
      ad_account_id: adAccountId,
      platform,
      file_name: file.name,
      rows_read: input.rowsRead,
      rows_error: input.rowsError,
    })
    .select("id")
    .single();
  if (createError || !created) throw new Error("Não foi possível registrar a importação.");
  const importId: string = created.id;

  const abort = async (message: string): Promise<never> => {
    await supabase.from("metrics_staging").delete().eq("import_id", importId);
    await supabase.from("imports").update({ status: "failed", error_log: { message } }).eq("id", importId);
    throw new Error(message);
  };

  let warning: string | undefined;
  onProgress({ label: "Guardando o arquivo", percent: 5 });
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${userId}/${companyId}/${importId}-${safeName}`;
  const upload = await supabase.storage.from("imports").upload(path, file);
  if (upload.error) {
    warning = "A importação foi feita, mas o arquivo original não pôde ser guardado.";
  } else {
    await supabase.from("imports").update({ storage_path: path }).eq("id", importId);
  }

  for (let start = 0; start < records.length; start += BATCH) {
    const batch = records.slice(start, start + BATCH).map((r) => ({ ...r, import_id: importId }));
    const { error } = await supabase.from("metrics_staging").insert(batch);
    if (error) return abort("Falha ao enviar as linhas para o banco. Nada foi gravado.");
    onProgress({
      label: "Enviando linhas",
      percent: 10 + Math.round((Math.min(start + BATCH, records.length) / records.length) * 80),
    });
    await tick();
  }

  onProgress({ label: "Confirmando", percent: 93 });
  const { data, error } = await supabase.rpc("commit_import", { p_import: importId });
  if (error) return abort(error.message || "Falha ao confirmar a importação. Nada foi gravado.");

  await supabase.from("column_mappings").upsert({
    company_id: companyId,
    platform,
    mapping: input.namedMapping,
    updated_at: new Date().toISOString(),
  });

  onProgress({ label: "Pronto", percent: 100 });
  return {
    importId,
    rows: data.rows,
    replaced: data.replaced,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    warning,
  };
}

export async function undoImport(importId: string): Promise<void> {
  const { error } = await createClient().rpc("undo_import", { p_import: importId });
  if (error) throw new Error("Não foi possível desfazer a importação.");
}
