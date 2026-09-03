/**
 * Montagem dos dados do Dashboard (seções 27–33) a partir do banco.
 * Combina os números do empreendimento próprio (DADOS_PROPRIOS_MENSAIS) com
 * as coletas dos concorrentes (COLETAS_MENSAIS) para a competência escolhida,
 * e delega os cálculos à camada de domínio.
 */
import { db } from "@/lib/db/pool";
import { calcularDashboard, type ItemMercado, type ResultadoDashboard } from "@/lib/domain/dashboard";
import { calcularConsolidado, type ResultadoConsolidado } from "@/lib/domain/consolidado";

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

export interface ConsolidadoParams {
  mesAno: string; // YYYY-MM-01
  regional?: string;
  idCidade?: number;
}

/**
 * Agrega a competência inteira num comparativo Sousa Araújo vs Concorrentes,
 * opcionalmente restrito a uma Regional e/ou Cidade. Não lista empreendimentos:
 * devolve só os dois lados somados + a cobertura da amostra.
 */
export async function montarConsolidado(
  params: ConsolidadoParams,
): Promise<ResultadoConsolidado & {
  empreendimentosNoEscopo: number;
  empreendimentosComProprios: number;
  concorrentesComColeta: number;
}> {
  const pool = db();

  // Valores do escopo (Regional/Cidade), sempre nesta ordem.
  const escopoVals: unknown[] = [];
  if (params.regional) escopoVals.push(params.regional);
  if (params.idCidade) escopoVals.push(params.idCidade);

  // Monta o "and cid.regional = $N and emp.id_cidade = $M" com os placeholders
  // deslocados por `offset` (as somas têm $1 = mes_ano antes; a cobertura não).
  const escopoSqlCom = (offset: number) => {
    const conds: string[] = [];
    let n = offset;
    if (params.regional) conds.push(`cid.regional = $${(n += 1)}`);
    if (params.idCidade) conds.push(`emp.id_cidade = $${(n += 1)}`);
    return conds.length ? `and ${conds.join(" and ")}` : "";
  };
  const escopoSql = escopoSqlCom(1); // depois de $1 = mes_ano

  const [propRes, concRes, escopoRes] = await Promise.all([
    // Lado Sousa: soma dos dados próprios da competência no escopo.
    pool.query<{ estoque: string | null; vendas: string | null; emps: string }>(
      `select coalesce(sum(dp.estoque), 0) as estoque,
              coalesce(sum(dp.vendas), 0)  as vendas,
              count(*) as emps
         from dados_proprios_mensais dp
         join empreendimentos emp on emp.id_empreendimento = dp.id_empreendimento
         join cidades cid         on cid.id_cidade = emp.id_cidade
        where dp.mes_ano = $1 and emp.ativo = true ${escopoSql}`,
      [params.mesAno, ...escopoVals],
    ),
    // Lado Concorrentes: soma das coletas da competência no escopo.
    pool.query<{ estoque: string | null; vendas: string | null; concs: string }>(
      `select coalesce(sum(cm.estoque), 0) as estoque,
              coalesce(sum(cm.vendas), 0)  as vendas,
              count(*) as concs
         from coletas_mensais cm
         join concorrentes c      on c.id_concorrente = cm.id_concorrente and c.ativo = true
         join empreendimentos emp on emp.id_empreendimento = c.id_empreendimento
         join cidades cid         on cid.id_cidade = emp.id_cidade
        where cm.mes_ano = $1 and emp.ativo = true ${escopoSql}`,
      [params.mesAno, ...escopoVals],
    ),
    // Denominador de cobertura: empreendimentos ativos no escopo (sem competência).
    pool.query<{ total: string }>(
      `select count(*) as total
         from empreendimentos emp
         join cidades cid on cid.id_cidade = emp.id_cidade
        where emp.ativo = true ${escopoSqlCom(0)}`,
      escopoVals,
    ),
  ]);

  const p = propRes.rows[0];
  const c = concRes.rows[0];

  const resultado = calcularConsolidado({
    sousaEstoque: Number(p?.estoque ?? 0),
    sousaVendas: Number(p?.vendas ?? 0),
    concEstoque: Number(c?.estoque ?? 0),
    concVendas: Number(c?.vendas ?? 0),
  });

  return {
    ...resultado,
    empreendimentosNoEscopo: Number(escopoRes.rows[0]?.total ?? 0),
    empreendimentosComProprios: Number(p?.emps ?? 0),
    concorrentesComColeta: Number(c?.concs ?? 0),
  };
}
