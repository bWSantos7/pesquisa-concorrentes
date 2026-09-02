import { competenciaVigente } from "@/lib/domain/competencia";
import AgenteFluxo from "./AgenteFluxo";

export const dynamic = "force-dynamic";

export default function AgentePage() {
  // "YYYY-MM" apenas para pré-selecionar o mês; o agente pode trocar.
  const competenciaInicial = competenciaVigente().slice(0, 7);
  return <AgenteFluxo competenciaInicial={competenciaInicial} />;
}
