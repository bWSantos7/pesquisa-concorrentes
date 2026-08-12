"use server";

/**
 * Server Actions da Área do Gestor (seções 3, 36, 25).
 * Autenticação via Supabase Auth; administração via service client após
 * confirmar que o solicitante é gestor ativo.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverClient, serviceClient } from "@/lib/supabase/clients";
import { gestorAtual } from "@/lib/supabase/gestor";
import { agenteSchema, dadosPropriosSchema } from "@/lib/validation/schemas";

type R<T = void> = { ok: true; data?: T } | { ok: false; erro: string };

export async function loginGestor(email: string, senha: string): Promise<R> {
  const supabase = serverClient(cookies());
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { ok: false, erro: "E-mail ou senha inválidos." };

  const g = await gestorAtual();
  if (!g) {
    await supabase.auth.signOut();
    return { ok: false, erro: "Acesso restrito a gestores ativos." };
  }
  return { ok: true };
}

export async function logoutGestor() {
  const supabase = serverClient(cookies());
  await supabase.auth.signOut();
  redirect("/gestor/login");
}

async function exigirGestor() {
  const g = await gestorAtual();
  if (!g) throw new Error("Não autorizado");
  return g;
}

export async function criarAgente(input: {
  nome: string; telefone: string; ativo: boolean;
}): Promise<R> {
  await exigirGestor();
  const parsed = agenteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const db = serviceClient();
  // Verifica duplicidade de telefone normalizado (seção 36).
  const { data: existe } = await db
    .from("agentes_campo").select("id_agente")
    .eq("telefone", parsed.data.telefone).maybeSingle();
  if (existe) return { ok: false, erro: "Já existe um agente com este telefone." };

  const { error } = await db.from("agentes_campo").insert({
    nome: parsed.data.nome,
    telefone: parsed.data.telefone,
    ativo: parsed.data.ativo,
  });
  if (error) return { ok: false, erro: "Não foi possível cadastrar o agente." };
  return { ok: true };
}

export async function editarAgente(id: string, input: {
  nome: string; telefone: string; ativo: boolean;
}): Promise<R> {
  await exigirGestor();
  const parsed = agenteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const db = serviceClient();
  const { data: outro } = await db
    .from("agentes_campo").select("id_agente")
    .eq("telefone", parsed.data.telefone).neq("id_agente", id).maybeSingle();
  if (outro) return { ok: false, erro: "Telefone já usado por outro agente." };

  const { error } = await db.from("agentes_campo")
    .update({ nome: parsed.data.nome, telefone: parsed.data.telefone, ativo: parsed.data.ativo })
    .eq("id_agente", id);
  if (error) return { ok: false, erro: "Não foi possível salvar as alterações." };
  return { ok: true };
}

/** Ativa/inativa (nunca exclui fisicamente — seção 6). */
export async function definirStatusAgente(id: string, ativo: boolean): Promise<R> {
  await exigirGestor();
  const db = serviceClient();
  const { error } = await db.from("agentes_campo").update({ ativo }).eq("id_agente", id);
  if (error) return { ok: false, erro: "Não foi possível alterar o status." };
  return { ok: true };
}

/** Cadastro/atualização dos dados próprios do empreendimento (seção 25). */
export async function salvarDadosProprios(input: {
  id_empreendimento: number; mes_ano: string; estoque: number; vendas: number;
}): Promise<R> {
  const g = await exigirGestor();
  const parsed = dadosPropriosSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const db = serviceClient();
  const { error } = await db.from("dados_proprios_mensais").upsert(
    {
      id_empreendimento: parsed.data.id_empreendimento,
      mes_ano: parsed.data.mes_ano,
      estoque: parsed.data.estoque,
      vendas: parsed.data.vendas,
      atualizado_por: g.id_gestor,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "id_empreendimento,mes_ano" },
  );
  if (error) return { ok: false, erro: "Não foi possível salvar os dados próprios." };
  return { ok: true };
}
