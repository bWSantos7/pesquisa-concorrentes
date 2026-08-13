/**
 * Pool de conexão PostgreSQL (Railway) — substitui os clientes Supabase.
 *
 * Um único Pool por processo, criado sob demanda (não no import do módulo,
 * para nunca derrubar rotas/build que não tocam o banco). SSL é decidido
 * pelo host da connection string: desligado para Postgres local ou na rede
 * privada do Railway (`*.railway.internal`), habilitado (sem validação de
 * CA, como é comum em Postgres gerenciado) para qualquer outro host.
 */
import { Pool } from "pg";
import { requireEnv } from "@/lib/env";

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
