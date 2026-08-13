/**
 * Acesso a dados da hierarquia (seções 15–18, 39).
 * Carregamento progressivo: Regional -> Cidade -> Empreendimento -> Concorrente.
 * SQL direto via pool pg — o fluxo do agente não tem sessão própria; a
 * autorização é feita na camada de domínio/servidor (Server Actions), não
 * no banco.
 */
import { db } from "@/lib/db/pool";

export interface Regional { regional: string; }
export interface Cidade { id_cidade: number; regional: string; cidade: string; }
export interface Empreendimento { id_empreendimento: number; id_cidade: number; empreendimento: string; ativo: boolean; }
export interface Concorrente { id_concorrente: number; id_empreendimento: number; concorrente: string; ativo: boolean; }

export async function listarRegionais(): Promise<Regional[]> {
  const { rows } = await db().query<Regional>(
    `select regional from regionais order by regional`,
  );
  return rows;
}

export async function listarCidades(regional: string): Promise<Cidade[]> {
  const { rows } = await db().query<Cidade>(
    `select id_cidade, regional, cidade from cidades where regional = $1 order by cidade`,
    [regional],
  );
  return rows;
}

export async function listarEmpreendimentos(idCidade: number): Promise<Empreendimento[]> {
  const { rows } = await db().query<Empreendimento>(
    `select id_empreendimento, id_cidade, empreendimento, ativo
       from empreendimentos
      where id_cidade = $1 and ativo = true
      order by empreendimento`,
    [idCidade],
  );
  return rows;
}

export async function listarConcorrentes(idEmpreendimento: number): Promise<Concorrente[]> {
  const { rows } = await db().query<Concorrente>(
    `select id_concorrente, id_empreendimento, concorrente, ativo
       from concorrentes
      where id_empreendimento = $1 and ativo = true
      order by concorrente`,
    [idEmpreendimento],
  );
  return rows;
}
