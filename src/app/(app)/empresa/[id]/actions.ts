"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

export async function createAdAccountAction(
  companyId: string,
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  const platform = String(formData.get("platform") ?? "");
  const externalId = String(formData.get("external_id") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "BRL").trim().toUpperCase() || "BRL";
  if (!name) return { error: "Informe o nome da conta." };
  if (platform !== "meta" && platform !== "google") return { error: "Escolha a plataforma." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ad_accounts")
    .insert({ company_id: companyId, platform, name, external_id: externalId, currency });
  if (error) return { error: "Não foi possível cadastrar a conta." };
  revalidatePath(`/empresa/${companyId}`, "layout");
  return {};
}

export async function deleteAdAccountAction(companyId: string, accountId: string) {
  const supabase = await createClient();
  await supabase.from("ad_accounts").delete().eq("id", accountId).eq("company_id", companyId);
  revalidatePath(`/empresa/${companyId}`, "layout");
}

export async function updateCompanyAction(
  companyId: string,
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  if (!name) return { error: "Informe o nome da empresa." };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Cor inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ name, color }).eq("id", companyId);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/", "layout");
  return {};
}

export async function archiveCompanyAction(companyId: string) {
  const supabase = await createClient();
  await supabase.from("companies").update({ status: "archived" }).eq("id", companyId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteCompanyAction(companyId: string) {
  const supabase = await createClient();
  await supabase.from("companies").delete().eq("id", companyId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function setCampaignTypeAction(companyId: string, campaignId: string, type: string) {
  const supabase = await createClient();
  await supabase
    .from("campaigns")
    .update({ campaign_type: type, type_manual: true })
    .eq("id", campaignId)
    .eq("company_id", companyId);
  revalidatePath(`/empresa/${companyId}`, "layout");
}
