/**
 * Autorização do Gestor (seções 3 e 40).
 * Verifica sessão Supabase Auth e se o usuário é um gestor ativo.
 */
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase/clients";

export interface GestorAtual { id_gestor: string; nome: string; email: string; }

/** Retorna o gestor autenticado e ativo, ou null. */
export async function gestorAtual(): Promise<GestorAtual | null> {
  const supabase = serverClient(cookies());
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: gestor } = await supabase
    .from("gestores")
    .select("id_gestor, nome, email, ativo")
    .eq("id_gestor", auth.user.id)
    .maybeSingle();

  if (!gestor || !gestor.ativo) return null;
  return { id_gestor: gestor.id_gestor, nome: gestor.nome, email: gestor.email };
}
