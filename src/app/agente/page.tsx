import { formatarCompetenciaLonga } from "@/lib/domain/competencia";
import { competenciaVigente } from "@/lib/domain/competencia";
import AgenteFluxo from "./AgenteFluxo";

export const dynamic = "force-dynamic";

export default function AgentePage() {
  const competencia = formatarCompetenciaLonga(competenciaVigente());
  return <AgenteFluxo competenciaLabel={competencia} />;
}
