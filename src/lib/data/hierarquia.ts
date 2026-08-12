/**
 * Acesso a dados da hierarquia (seções 15–18, 39).
 * Carregamento progressivo: Regional -> Cidade -> Empreendimento -> Concorrente.
 * Usa o service client no servidor (fluxo do agente sem sessão Auth).
 */
import { serviceClient } from "@/lib/supabase/clients";

export interface Regional { regional: string; }
export interface Cidade { id_cidade: number; regional: string; cidade: string; }
export interface Empreendimento { id_empreendimento: number; id_cidade: number; empreendimento: string; ativo: boolean; }
export interface Concorrente { id_concorrente: number; id_empreendimento: number; concorrente: string; ativo: boolean; }

export async function listarRegionais(): Promise<Regional[]> {
  const db = serviceClient();
  const { data, error } = await db.from("regionais").select("regional").order("regional");
  if (error) throw error;
  return data ?? [];
}

export async function listarCidades(regional: string): Promise<Cidade[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from("cidades")
    .select("id_cidade, regional, cidade")
    .eq("regional", regional)
    .order("cidade");
  if (error) throw error;
  return data ?? [];
}

export async function listarEmpreendimentos(idCidade: number): Promise<Empreendimento[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from("empreendimentos")
    .select("id_empreendimento, id_cidade, empreendimento, ativo")
    .eq("id_cidade", idCidade)
    .eq("ativo", true)
    .order("empreendimento");
  if (error) throw error;
  return data ?? [];
}

export async function listarConcorrentes(idEmpreendimento: number): Promise<Concorrente[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from("concorrentes")
    .select("id_concorrente, id_empreendimento, concorrente, ativo")
    .eq("id_empreendimento", idEmpreendimento)
    .eq("ativo", true)
    .order("concorrente");
  if (error) throw error;
  return data ?? [];
}
