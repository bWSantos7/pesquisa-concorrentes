/**
 * Sessão do Gestor — substitui o Supabase Auth.
 * Token JWT compacto (HS256) assinado com SESSION_SECRET, guardado num
 * cookie httpOnly. O payload carrega apenas o id do gestor (`sub`); os
 * demais dados (nome, ativo) são sempre relidos do banco em `gestorAtual()`,
 * então revogar acesso (desativar o gestor) tem efeito imediato mesmo com
 * o token ainda válido.
 */
import { SignJWT, jwtVerify } from "jose";
import { requireEnv } from "@/lib/env";

export const COOKIE_SESSAO = "gestor_session";
export const SESSAO_MAX_AGE_SEGUNDOS = 60 * 60 * 24 * 7; // 7 dias

function chaveSecreta(): Uint8Array {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET"));
}

export async function criarSessao(idGestor: string): Promise<string> {
  return new SignJWT({ sub: idGestor })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSAO_MAX_AGE_SEGUNDOS}s`)
    .sign(chaveSecreta());
}

/** Retorna o id do gestor do token, ou null se ausente/inválido/expirado. */
export async function verificarSessao(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, chaveSecreta());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
