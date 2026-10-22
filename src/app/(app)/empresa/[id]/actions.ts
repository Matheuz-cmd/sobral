"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertOneOf, assertUuid, requireUser } from "@/lib/auth";

type Result = { error?: string };

const PLATFORMS = ["meta", "google"] as const;
const CAMPAIGN_TYPES = ["messages_whatsapp", "profile_visits", "local_actions", "other"] as const;

export async function createAdAccountAction(
  companyId: string,
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  assertUuid(companyId);
  const name = String(formData.get("name") ?? "").trim();
  const platform = String(formData.get("platform") ?? "");
  const externalId = String(formData.get("external_id") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "BRL").trim().toUpperCase() || "BRL";
  if (!name) return { error: "Informe o nome da conta." };
  if (!(PLATFORMS as readonly string[]).includes(platform)) return { error: "Escolha a plataforma." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Use o código da moeda com 3 letras, como BRL." };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("ad_accounts")
    .insert({ company_id: companyId, platform, name, external_id: externalId, currency });
  if (error) return { error: "Não foi possível cadastrar a conta. Tente de novo." };
  revalidatePath(`/empresa/${companyId}`, "layout");
  return {};
}

export async function deleteAdAccountAction(companyId: string, accountId: string) {
  assertUuid(companyId);
  assertUuid(accountId);
  const { supabase } = await requireUser();
  await supabase.from("ad_accounts").delete().eq("id", accountId).eq("company_id", companyId);
  revalidatePath(`/empresa/${companyId}`, "layout");
}

export async function updateCompanyAction(
  companyId: string,
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  assertUuid(companyId);
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  if (!name) return { error: "Informe o nome da empresa." };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Cor inválida." };

  const { supabase } = await requireUser();
  const { error } = await supabase.from("companies").update({ name, color }).eq("id", companyId);
  if (error) return { error: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/", "layout");
  return {};
}

export async function archiveCompanyAction(companyId: string) {
  assertUuid(companyId);
  const { supabase } = await requireUser();
  await supabase.from("companies").update({ status: "archived" }).eq("id", companyId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteCompanyAction(companyId: string) {
  assertUuid(companyId);
  const { supabase } = await requireUser();
  await supabase.from("companies").delete().eq("id", companyId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function setCampaignTypeAction(companyId: string, campaignId: string, type: string) {
  assertUuid(companyId);
  assertUuid(campaignId);
  assertOneOf(type, CAMPAIGN_TYPES);
  const { supabase } = await requireUser();
  await supabase
    .from("campaigns")
    .update({ campaign_type: type, type_manual: true })
    .eq("id", campaignId)
    .eq("company_id", companyId);
  revalidatePath(`/empresa/${companyId}`, "layout");
}
