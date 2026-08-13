"use server";

/**
 * Server Actions da Área do Gestor (seções 3, 36, 25).
 * Autenticação própria (bcrypt + sessão JWT em cookie httpOnly — ver
 * src/lib/auth); administração via SQL direto após confirmar que o
 * solicitante é gestor ativo.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { gestorAtual } from "@/lib/auth/gestor";
import { COOKIE_SESSAO, SESSAO_MAX_AGE_SEGUNDOS, criarSessao } from "@/lib/auth/session";
import { verificarSenha } from "@/lib/auth/senha";
import { agenteSchema, dadosPropriosSchema } from "@/lib/validation/schemas";

type R<T = void> = { ok: true; data?: T } | { ok: false; erro: string };

export async function loginGestor(email: string, senha: string): Promise<R> {
  const emailNormalizado = email.trim().toLowerCase();
  const { rows } = await db().query<{ id_gestor: string; senha_hash: string; ativo: boolean }>(
    `select id_gestor, senha_hash, ativo from gestores where lower(email) = $1`,
    [emailNormalizado],
  );
  const gestor = rows[0];
  // Mesma mensagem para e-mail inexistente, senha errada e conta inativa —
  // evita confirmar a existência de uma conta a quem tenta adivinhar.
  if (!gestor || !gestor.ativo) return { ok: false, erro: "E-mail ou senha inválidos." };

  const senhaOk = await verificarSenha(senha, gestor.senha_hash);
  if (!senhaOk) return { ok: false, erro: "E-mail ou senha inválidos." };

  const token = await criarSessao(gestor.id_gestor);
  cookies().set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSAO_MAX_AGE_SEGUNDOS,
  });
  return { ok: true };
}

export async function logoutGestor() {
  cookies().set(COOKIE_SESSAO, "", { httpOnly: true, path: "/", maxAge: 0 });
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

  const pool = db();
  // Verifica duplicidade de telefone normalizado (seção 36).
  const { rows: existe } = await pool.query<{ id_agente: string }>(
    `select id_agente from agentes_campo where telefone = $1`,
    [parsed.data.telefone],
  );
  if (existe[0]) return { ok: false, erro: "Já existe um agente com este telefone." };

  try {
    await pool.query(
      `insert into agentes_campo (nome, telefone, ativo) values ($1, $2, $3)`,
      [parsed.data.nome, parsed.data.telefone, parsed.data.ativo],
    );
  } catch {
    return { ok: false, erro: "Não foi possível cadastrar o agente." };
  }
  return { ok: true };
}

export async function editarAgente(id: string, input: {
  nome: string; telefone: string; ativo: boolean;
}): Promise<R> {
  await exigirGestor();
  const parsed = agenteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const pool = db();
  const { rows: outro } = await pool.query<{ id_agente: string }>(
    `select id_agente from agentes_campo where telefone = $1 and id_agente <> $2`,
    [parsed.data.telefone, id],
  );
  if (outro[0]) return { ok: false, erro: "Telefone já usado por outro agente." };

  try {
    await pool.query(
      `update agentes_campo set nome = $1, telefone = $2, ativo = $3 where id_agente = $4`,
      [parsed.data.nome, parsed.data.telefone, parsed.data.ativo, id],
    );
  } catch {
    return { ok: false, erro: "Não foi possível salvar as alterações." };
  }
  return { ok: true };
}

/** Ativa/inativa (nunca exclui fisicamente — seção 6). */
export async function definirStatusAgente(id: string, ativo: boolean): Promise<R> {
  await exigirGestor();
  try {
    await db().query(`update agentes_campo set ativo = $1 where id_agente = $2`, [ativo, id]);
  } catch {
    return { ok: false, erro: "Não foi possível alterar o status." };
  }
  return { ok: true };
}

/** Cadastro/atualização dos dados próprios do empreendimento (seção 25). */
export async function salvarDadosProprios(input: {
  id_empreendimento: number; mes_ano: string; estoque: number; vendas: number;
}): Promise<R> {
  const g = await exigirGestor();
  const parsed = dadosPropriosSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  try {
    await db().query(
      `insert into dados_proprios_mensais
         (id_empreendimento, mes_ano, estoque, vendas, atualizado_por, atualizado_em)
       values ($1, $2, $3, $4, $5, now())
       on conflict (id_empreendimento, mes_ano) do update
         set estoque = excluded.estoque,
             vendas = excluded.vendas,
             atualizado_por = excluded.atualizado_por,
             atualizado_em = now()`,
      [parsed.data.id_empreendimento, parsed.data.mes_ano, parsed.data.estoque, parsed.data.vendas, g.id_gestor],
    );
  } catch {
    return { ok: false, erro: "Não foi possível salvar os dados próprios." };
  }
  return { ok: true };
}
