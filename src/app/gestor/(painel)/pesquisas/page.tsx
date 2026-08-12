import { listarPesquisas, listarAgentesOpcoes } from "@/lib/data/gestor";
import {
  listarRegionais, listarCidades, listarEmpreendimentos, listarConcorrentes,
} from "@/lib/data/hierarquia";
import { formatarCompetenciaCurta } from "@/lib/domain/competencia";
import FiltrosPesquisas from "./FiltrosPesquisas";

export const dynamic = "force-dynamic";

const PAGINA = 50;

export default async function PesquisasPage({
  searchParams,
}: {
  searchParams: {
    p?: string; mes?: string; regional?: string; cidade?: string;
    emp?: string; conc?: string; agente?: string;
  };
}) {
  const pagina = Math.max(1, Number(searchParams.p ?? "1"));
  const offset = (pagina - 1) * PAGINA;

  const mesAno = searchParams.mes || undefined;
  const regional = searchParams.regional || "";
  const idCidade = searchParams.cidade ? Number(searchParams.cidade) : undefined;
  const idEmp = searchParams.emp ? Number(searchParams.emp) : undefined;
  const idConc = searchParams.conc ? Number(searchParams.conc) : undefined;
  const idAgente = searchParams.agente || undefined;

  // Opções para os selects (dependentes onde a hierarquia exige).
  const [regionais, agentes] = await Promise.all([
    listarRegionais(),
    listarAgentesOpcoes(),
  ]);
  const cidades = regional ? await listarCidades(regional) : [];
  const emps = idCidade ? await listarEmpreendimentos(idCidade) : [];
  const concs = idEmp ? await listarConcorrentes(idEmp) : [];

  const linhas = await listarPesquisas({
    mesAno,
    regional: regional || undefined,
    idCidade,
    idEmpreendimento: idEmp,
    idConcorrente: idConc,
    idAgente,
    limite: PAGINA,
    offset,
  });

  // Preserva os filtros ativos na paginação.
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (searchParams.mes) params.set("mes", searchParams.mes);
    if (regional) params.set("regional", regional);
    if (searchParams.cidade) params.set("cidade", searchParams.cidade);
    if (searchParams.emp) params.set("emp", searchParams.emp);
    if (searchParams.conc) params.set("conc", searchParams.conc);
    if (idAgente) params.set("agente", idAgente);
    params.set("p", String(p));
    return `/gestor/pesquisas?${params.toString()}`;
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold text-ink">Pesquisas realizadas</h1>

      <FiltrosPesquisas
        mes={searchParams.mes ?? ""}
        regional={regional}
        idCidade={searchParams.cidade ?? ""}
        idEmp={searchParams.emp ?? ""}
        idConc={searchParams.conc ?? ""}
        idAgente={idAgente ?? ""}
        regionais={regionais.map((r) => r.regional)}
        cidades={cidades.map((c) => ({ id: c.id_cidade, nome: c.cidade }))}
        emps={emps.map((e) => ({ id: e.id_empreendimento, nome: e.empreendimento }))}
        concs={concs.map((c) => ({ id: c.id_concorrente, nome: c.concorrente }))}
        agentes={agentes}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[.06] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Data/hora</th>
              <th className="px-4 py-3 font-medium">Agente</th>
              <th className="px-4 py-3 font-medium">Regional</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
              <th className="px-4 py-3 font-medium">Empreendimento</th>
              <th className="px-4 py-3 font-medium">Concorrente</th>
              <th className="px-4 py-3 font-medium">Comp.</th>
              <th className="px-4 py-3 text-right font-medium">Estoque</th>
              <th className="px-4 py-3 text-right font-medium">Vendas</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-ink/50">
                Nenhuma pesquisa encontrada para os filtros aplicados.
              </td></tr>
            )}
            {linhas.map((l) => (
              <tr key={l.id_coleta} className="border-b border-black/[.04]">
                <td className="px-4 py-3 text-ink/70">
                  {new Date(l.coletado_em).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3">{l.agente}</td>
                <td className="px-4 py-3">{l.regional}</td>
                <td className="px-4 py-3">{l.cidade}</td>
                <td className="px-4 py-3">{l.empreendimento}</td>
                <td className="px-4 py-3">{l.concorrente}</td>
                <td className="px-4 py-3">{formatarCompetenciaCurta(l.mes_ano)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{l.estoque}</td>
                <td className="px-4 py-3 text-right tabular-nums">{l.vendas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <a className="btn-ghost aria-disabled:pointer-events-none aria-disabled:opacity-40"
          aria-disabled={pagina <= 1}
          href={pagina > 1 ? qs(pagina - 1) : undefined}>
          ← Anterior
        </a>
        <span className="text-ink/50">Página {pagina}</span>
        <a className="btn-ghost aria-disabled:pointer-events-none aria-disabled:opacity-40"
          aria-disabled={linhas.length < PAGINA}
          href={linhas.length === PAGINA ? qs(pagina + 1) : undefined}>
          Próxima →
        </a>
      </div>
    </div>
  );
}
