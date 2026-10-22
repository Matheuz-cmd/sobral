"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

const fail = (message: string): Result => ({ error: message });

export async function createClientAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Informe o nome do cliente.");
  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({ name });
  if (error) return fail("Não foi possível criar o cliente.");
  revalidatePath("/", "layout");
  return {};
}

export async function createCompanyAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "");
  const color = String(formData.get("color") ?? "#2563eb");
  if (!name) return fail("Informe o nome da empresa.");
  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({ name, client_id: clientId, color });
  if (error) return fail("Não foi possível criar a empresa.");
  revalidatePath("/", "layout");
  return {};
}

export async function setStatusAction(table: "clients" | "companies", id: string, status: "active" | "archived") {
  const supabase = await createClient();
  await supabase.from(table).update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteAction(table: "clients" | "companies", id: string) {
  const supabase = await createClient();
  await supabase.from(table).delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function rememberCompany(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return;
  await supabase.from("user_settings").upsert({ user_id: userId, last_company_id: companyId });
}
