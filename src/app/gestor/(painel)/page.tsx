import Link from "next/link";
import { competenciaVigente, formatarCompetenciaLonga } from "@/lib/domain/competencia";
import { formatarPercentual } from "@/lib/domain/dashboard";
import { montarDashboard } from "@/lib/data/dashboard";
import {
  listarRegionais, listarCidades, listarEmpreendimentos,
} from "@/lib/data/hierarquia";
import FiltrosDashboard from "./FiltrosDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { mes?: string; regional?: string; cidade?: string; emp?: string };
}) {
  const mesAno = searchParams.mes ?? competenciaVigente();
  const regional = searchParams.regional ?? "";
  const idCidade = searchParams.cidade ? Number(searchParams.cidade) : undefined;
  const idEmp = searchParams.emp ? Number(searchParams.emp) : undefined;

  const regionais = await listarRegionais();
  const cidades = regional ? await listarCidades(regional) : [];
  const emps = idCidade ? await listarEmpreendimentos(idCidade) : [];

  const dados = idEmp ? await montarDashboard({ idEmpreendimento: idEmp, mesAno }) : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-ink/50">Competência: {formatarCompetenciaLonga(mesAno)}</p>
        </div>
      </div>

      <FiltrosDashboard
        mesAno={mesAno}
        regional={regional}
        idCidade={searchParams.cidade ?? ""}
        idEmp={searchParams.emp ?? ""}
        regionais={regionais.map((r) => r.regional)}
        cidades={cidades.map((c) => ({ id: c.id_cidade, nome: c.cidade }))}
        emps={emps.map((e) => ({ id: e.id_empreendimento, nome: e.empreendimento }))}
      />

      {!idEmp && (
        <div className="card text-ink/60">
          Selecione Regional, Cidade e Empreendimento para ver o comparativo.
        </div>
      )}

      {idEmp && dados && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi titulo="Oferta (estoque total)" valor={String(dados.ofertaTotal)} />
            <Kpi titulo="Vendas totais" valor={String(dados.vendasTotais)} />
            <Kpi titulo="Itens no mercado" valor={String(dados.itens.length)} />
            <Kpi titulo="Empreendimento" valor={dados.nomeEmpreendimento ?? "—"} pequeno />
          </div>

          {/* Aviso: falta o dado próprio do empreendimento nesta competência.
              O comparativo ainda aparece com os concorrentes, mas sem a linha
              do próprio empreendimento — deixamos isso explícito e acionável. */}
          {!dados.temDadosProprios && (
            <div className="card border-accent/40 bg-accent/[.06]" role="status">
              <p className="font-medium text-ink">
                Sem dados próprios cadastrados para {formatarCompetenciaLonga(mesAno)}.
              </p>
              <p className="mt-1 text-sm text-ink/60">
                O empreendimento próprio não entra no comparativo até que estoque e
                vendas sejam informados nesta competência.
              </p>
              <Link
                href={`/gestor/dados-proprios?mes=${mesAno}&regional=${encodeURIComponent(regional)}&cidade=${searchParams.cidade ?? ""}&emp=${idEmp}`}
                className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brandhi"
              >
                Cadastrar dados próprios
              </Link>
            </div>
          )}

          {dados.itens.length === 0 ? (
            <div className="card text-ink/60" role="status">
              {dados.totalConcorrentesComColeta === 0 && !dados.temDadosProprios ? (
                <>Nenhuma coleta de concorrente e nenhum dado próprio nesta competência.
                Assim que houver coletas ou o cadastro próprio, o comparativo aparece aqui.</>
              ) : (
                <>Sem itens para exibir nesta competência.</>
              )}
            </div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Comparativo de estoque, representatividade, vendas, VSO e ranking de VSO
                  para {dados.nomeEmpreendimento ?? "o empreendimento"} e seus concorrentes
                  em {formatarCompetenciaLonga(mesAno)}.
                </caption>
                <thead>
                  <tr className="border-b border-black/[.06] text-left text-ink/50">
                    <th scope="col" className="px-4 py-3 font-medium">Empreendimento / Concorrente</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Estoque</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Representatividade</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Vendas</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">VSO</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Ranking VSO</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dados.itens]
                    .sort((a, b) => a.rankingVso - b.rankingVso)
                    .map((i) => (
                      <tr key={i.rotulo}
                        className={`border-b border-black/[.04] ${i.proprio ? "bg-brand/[.06]" : ""}`}>
                        <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                          {i.rotulo}
                          {i.proprio && (
                            <span className="ml-2 rounded bg-brand/15 px-2 py-0.5 text-xs text-brand">
                              próprio
                            </span>
                          )}
                        </th>
                        <td className="px-4 py-3 text-right tabular-nums">{i.estoque}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatarPercentual(i.representatividade)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{i.vendas}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatarPercentual(i.vso)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={i.rankingVso === 1 ? "font-bold text-accent" : "text-ink/70"}>
                            {i.rankingVso}º
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, pequeno }: { titulo: string; valor: string; pequeno?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-ink/50">{titulo}</p>
      <p className={`mt-1 font-bold text-ink ${pequeno ? "text-base leading-tight" : "text-3xl"}`}>
        {valor}
      </p>
    </div>
  );
}
