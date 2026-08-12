/**
 * Montagem dos dados do Dashboard (seções 27–33) a partir do banco.
 * Combina os números do empreendimento próprio (DADOS_PROPRIOS_MENSAIS) com
 * as coletas dos concorrentes (COLETAS_MENSAIS) para a competência escolhida,
 * e delega os cálculos à camada de domínio.
 */
import { serviceClient } from "@/lib/supabase/clients";
import { calcularDashboard, type ItemMercado, type ResultadoDashboard } from "@/lib/domain/dashboard";

export interface DashboardParams {
  idEmpreendimento: number;
  mesAno: string; // YYYY-MM-01
}

export async function montarDashboard(
  params: DashboardParams,
): Promise<ResultadoDashboard & {
  nomeEmpreendimento: string | null;
  temDadosProprios: boolean;
  totalConcorrentesComColeta: number;
}> {
  const db = serviceClient();

  const { data: emp } = await db
    .from("empreendimentos")
    .select("empreendimento")
    .eq("id_empreendimento", params.idEmpreendimento)
    .maybeSingle();

  // Próprio
  const { data: proprio } = await db
    .from("dados_proprios_mensais")
    .select("estoque, vendas")
    .eq("id_empreendimento", params.idEmpreendimento)
    .eq("mes_ano", params.mesAno)
    .maybeSingle();

  // Concorrentes com coleta na competência
  const { data: concorrentes } = await db
    .from("concorrentes")
    .select("id_concorrente, concorrente, coletas_mensais!inner(estoque, vendas, mes_ano)")
    .eq("id_empreendimento", params.idEmpreendimento)
    .eq("ativo", true)
    .eq("coletas_mensais.mes_ano", params.mesAno);

  const itens: ItemMercado[] = [];

  if (proprio) {
    itens.push({
      rotulo: emp?.empreendimento ?? "Empreendimento próprio",
      proprio: true,
      estoque: proprio.estoque,
      vendas: proprio.vendas,
    });
  }

  let totalConcorrentesComColeta = 0;
  for (const c of concorrentes ?? []) {
    const coleta = Array.isArray(c.coletas_mensais) ? c.coletas_mensais[0] : c.coletas_mensais;
    if (!coleta) continue;
    totalConcorrentesComColeta += 1;
    itens.push({
      rotulo: c.concorrente,
      proprio: false,
      estoque: coleta.estoque,
      vendas: coleta.vendas,
    });
  }

  const resultado = calcularDashboard(itens);
  return {
    ...resultado,
    nomeEmpreendimento: emp?.empreendimento ?? null,
    temDadosProprios: Boolean(proprio),
    totalConcorrentesComColeta,
  };
}
