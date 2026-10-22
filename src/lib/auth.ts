import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Toda server action começa aqui: server actions são endpoints públicos, então
 * conferimos a sessão antes de tocar no banco (a RLS continua sendo a última barreira).
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Argumentos de server actions chegam do cliente sem garantia de tipo. */
export function assertUuid(value: unknown): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value)) throw new Error("Identificador inválido.");
}

export function assertOneOf<T extends string>(value: unknown, allowed: readonly T[]): asserts value is T {
  if (!allowed.includes(value as T)) throw new Error("Valor inválido.");
}
