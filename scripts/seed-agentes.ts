/**
 * Seed opcional de agentes de campo de exemplo — uso local/manual.
 *
 * O primeiro Gestor já é criado automaticamente no deploy (a partir de
 * GESTOR_EMAIL/GESTOR_SENHA/GESTOR_NOME — ver scripts/migrate.mjs). Este
 * script serve só para popular alguns agentes de exemplo em dev.
 *
 * Uso:
 *   DATABASE_URL=postgres://... npm run seed:agentes
 */
import { Pool } from "pg";
import { normalizarTelefone } from "../src/lib/domain/telefone";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Defina DATABASE_URL.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

// Agentes de exemplo (telefones fictícios). Ajuste ou remova conforme necessário.
const AGENTES_EXEMPLO = [
  { nome: "Agente Demonstração", telefone: "(11) 90000-0001" },
];

async function main() {
  for (const a of AGENTES_EXEMPLO) {
    const telefone = normalizarTelefone(a.telefone);
    await pool.query(
      `insert into agentes_campo (nome, telefone, ativo)
       values ($1, $2, true)
       on conflict (telefone) do update set nome = excluded.nome, ativo = true`,
      [a.nome, telefone],
    );
    console.log(`Agente garantido: ${a.nome} (${telefone})`);
  }
  console.log("\nSeed de agentes concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
