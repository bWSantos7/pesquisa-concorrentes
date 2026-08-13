/**
 * Montagem dos dados do Dashboard (seções 27–33) a partir do banco.
 * Combina os números do empreendimento próprio (DADOS_PROPRIOS_MENSAIS) com
 * as coletas dos concorrentes (COLETAS_MENSAIS) para a competência escolhida,
 * e delega os cálculos à camada de domínio.
 */
import { db } from "@/lib/db/pool";
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
  const pool = db();

  const empRes = await pool.query<{ empreendimento: string }>(
    `select empreendimento from empreendimentos where id_empreendimento = $1`,
    [params.idEmpreendimento],
  );
  const emp = empRes.rows[0] ?? null;

  const proprioRes = await pool.query<{ estoque: number; vendas: number }>(
    `select estoque, vendas
       from dados_proprios_mensais
      where id_empreendimento = $1 and mes_ano = $2`,
    [params.idEmpreendimento, params.mesAno],
  );
  const proprio = proprioRes.rows[0] ?? null;

  // Concorrentes ativos com coleta na competência (equivalente a inner join).
  const concRes = await pool.query<{ id_concorrente: number; concorrente: string; estoque: number; vendas: number }>(
    `select c.id_concorrente, c.concorrente, cm.estoque, cm.vendas
       from concorrentes c
       join coletas_mensais cm on cm.id_concorrente = c.id_concorrente and cm.mes_ano = $2
      where c.id_empreendimento = $1 and c.ativo = true`,
    [params.idEmpreendimento, params.mesAno],
  );

  const itens: ItemMercado[] = [];

  if (proprio) {
    itens.push({
      rotulo: emp?.empreendimento ?? "Empreendimento próprio",
      proprio: true,
      estoque: proprio.estoque,
      vendas: proprio.vendas,
    });
  }

  for (const c of concRes.rows) {
    itens.push({
      rotulo: c.concorrente,
      proprio: false,
      estoque: c.estoque,
      vendas: c.vendas,
    });
  }

  const resultado = calcularDashboard(itens);
  return {
    ...resultado,
    nomeEmpreendimento: emp?.empreendimento ?? null,
    temDadosProprios: Boolean(proprio),
    totalConcorrentesComColeta: concRes.rows.length,
  };
}
