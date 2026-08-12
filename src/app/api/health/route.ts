/**
 * Healthcheck para o Railway (e outros orquestradores).
 * Propositalmente não consulta o Supabase: deve responder 200 mesmo que o
 * banco esteja indisponível, para não derrubar o deploy por instabilidade
 * externa. A disponibilidade do Supabase é responsabilidade das rotas que o
 * usam, não do healthcheck de processo.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
