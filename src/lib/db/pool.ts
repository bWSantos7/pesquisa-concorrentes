/**
 * Pool de conexão PostgreSQL (Railway) — substitui os clientes Supabase.
 *
 * Um único Pool por processo, criado sob demanda (não no import do módulo,
 * para nunca derrubar rotas/build que não tocam o banco). SSL é decidido
 * pelo host da connection string: desligado para Postgres local ou na rede
 * privada do Railway (`*.railway.internal`), habilitado (sem validação de
 * CA, como é comum em Postgres gerenciado) para qualquer outro host.
 */
import { Pool, types } from "pg";
import { requireEnv } from "@/lib/env";

// O driver `pg`, por padrão, converte colunas `date` (OID 1082) em objetos
// JS `Date` — não em string. Todo o app assume `mes_ano` como texto
// "YYYY-MM-01" (ver src/lib/domain/competencia.ts, que faz `.split("-")`),
// então mantemos o valor cru do Postgres como veio, sem parsing.
types.setTypeParser(types.builtins.DATE, (val) => val);

let pool: Pool | undefined;

function precisaSsl(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return !(
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".railway.internal")
    );
  } catch {
    return true;
  }
}

function criarPool(): Pool {
  const connectionString = requireEnv("DATABASE_URL");
  return new Pool({
    connectionString,
    ssl: precisaSsl(connectionString) ? { rejectUnauthorized: false } : false,
    max: 10,
  });
}

/** Pool de conexão, sob demanda. Use `db().query(...)`. */
export function db(): Pool {
  if (!pool) pool = criarPool();
  return pool;
}
