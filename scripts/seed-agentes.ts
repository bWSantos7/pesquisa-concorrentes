/**
 * Seed de acesso — cria o primeiro Gestor (Supabase Auth + tabela gestores)
 * e, opcionalmente, agentes de campo de exemplo.
 *
 * Uso:
 *   GESTOR_EMAIL=... GESTOR_SENHA=... GESTOR_NOME="..." npm run seed:agentes
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY (somente servidor). Nunca commitar chaves.
 */
import { createClient } from "@supabase/supabase-js";
import { normalizarTelefone } from "../src/lib/domain/telefone";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const GESTOR_EMAIL = process.env.GESTOR_EMAIL ?? "gestor@exemplo.com";
const GESTOR_SENHA = process.env.GESTOR_SENHA ?? "trocar-esta-senha";
const GESTOR_NOME = process.env.GESTOR_NOME ?? "Gestor Padrão";

// Agentes de exemplo (telefones fictícios). Ajuste ou remova conforme necessário.
const AGENTES_EXEMPLO = [
  { nome: "Agente Demonstração", telefone: "(11) 90000-0001" },
];

async function seedGestor() {
  // Cria o usuário no Supabase Auth (idempotente por e-mail).
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: GESTOR_EMAIL,
    password: GESTOR_SENHA,
    email_confirm: true,
  });

  let userId = created?.user?.id;

  if (createErr) {
    // Se já existe, localiza o usuário existente.
    const { data: list } = await db.auth.admin.listUsers();
    const found = list?.users.find((u) => u.email === GESTOR_EMAIL);
    if (!found) {
      console.error("Falha ao criar/localizar gestor:", createErr.message);
      process.exit(1);
    }
    userId = found.id;
    console.log(`Usuário Auth já existia: ${GESTOR_EMAIL}`);
  } else {
    console.log(`Usuário Auth criado: ${GESTOR_EMAIL}`);
  }

  const { error: upsertErr } = await db.from("gestores").upsert(
    { id_gestor: userId!, nome: GESTOR_NOME, email: GESTOR_EMAIL, perfil: "gestor", ativo: true },
    { onConflict: "id_gestor" },
  );
  if (upsertErr) {
    console.error("Falha ao gravar em gestores:", upsertErr.message);
    process.exit(1);
  }
  console.log("Registro em gestores garantido.");
}

async function seedAgentes() {
  for (const a of AGENTES_EXEMPLO) {
    const telefone = normalizarTelefone(a.telefone);
    const { error } = await db.from("agentes_campo").upsert(
      { nome: a.nome, telefone, ativo: true },
      { onConflict: "telefone" },
    );
    if (error) console.error(`Agente ${a.nome}:`, error.message);
    else console.log(`Agente garantido: ${a.nome} (${telefone})`);
  }
}

async function main() {
  await seedGestor();
  await seedAgentes();
  console.log("\nSeed de acesso concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
