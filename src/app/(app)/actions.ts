"use server";

import { revalidatePath } from "next/cache";
import { assertOneOf, assertUuid, requireUser } from "@/lib/auth";

type Result = { error?: string };

const fail = (message: string): Result => ({ error: message });

const TABLES = ["clients", "companies"] as const;
const STATUSES = ["active", "archived"] as const;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function createClientAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Informe o nome do cliente.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("clients").insert({ name });
  if (error) return fail("Não foi possível criar o cliente. Tente de novo.");
  revalidatePath("/", "layout");
  return {};
}

export async function createCompanyAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "");
  const color = String(formData.get("color") ?? "#2563eb");
  if (!name) return fail("Informe o nome da empresa.");
  if (!HEX_COLOR.test(color)) return fail("Cor inválida.");
  assertUuid(clientId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("companies").insert({ name, client_id: clientId, color });
  if (error) return fail("Não foi possível criar a empresa. Tente de novo.");
  revalidatePath("/", "layout");
  return {};
}

export async function setStatusAction(table: (typeof TABLES)[number], id: string, status: (typeof STATUSES)[number]) {
  assertOneOf(table, TABLES);
  assertOneOf(status, STATUSES);
  assertUuid(id);
  const { supabase } = await requireUser();
  await supabase.from(table).update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteAction(table: (typeof TABLES)[number], id: string) {
  assertOneOf(table, TABLES);
  assertUuid(id);
  const { supabase } = await requireUser();
  await supabase.from(table).delete().eq("id", id);
  revalidatePath("/", "layout");
}
