/**
 * Hash e verificação de senha do Gestor (bcrypt).
 * A senha em texto puro nunca é persistida — apenas o hash.
 */
import bcrypt from "bcryptjs";

const CUSTO = 12;

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
