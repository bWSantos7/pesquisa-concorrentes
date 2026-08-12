/**
 * Clientes Supabase — seção 3 e 40.
 *
 * Três clientes com responsabilidades distintas:
 *  - browserClient: usa a ANON key, seguro no navegador (área do Gestor,
 *    sujeito a RLS).
 *  - serverClient: cliente por-requisição com a sessão do Gestor (cookies),
 *    para Server Actions/Route Handlers autenticados.
 *  - serviceClient: usa a SERVICE ROLE key, SOMENTE no servidor. Ignora RLS.
 *    Usado no fluxo do Agente (que não tem sessão Auth) e em seeds.
 *
 * A Service Role Key NUNCA deve ser importada em código de cliente.
 */
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { cookies } from "next/headers";

/**
 * Lê uma variável de ambiente obrigatória, com erro claro se ausente.
 * Avaliada apenas quando os clientes são de fato criados (não no import do
 * módulo), para nunca derrubar o build por uma env ausente em rota que não
 * usa Supabase.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Configure-a em Railway → Service → Variables antes do deploy.`,
    );
  }
  return value;
}

/** Cliente para componentes de cliente (área do Gestor). Sujeito a RLS. */
export function browserClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient(url, anonKey);
}

type CookieStore = ReturnType<typeof cookies>;

/** Cliente autenticado por requisição (lê sessão via cookies). Sujeito a RLS. */
export function serverClient(cookieStore: CookieStore) {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // set chamado a partir de Server Component: ignorável quando há middleware.
        }
      },
    },
  });
}

/**
 * Cliente com Service Role — SOMENTE servidor. Ignora RLS.
 * Lança erro se for avaliado sem a chave (proteção contra uso indevido).
 */
export function serviceClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
