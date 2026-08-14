import { listarGestores } from "@/lib/data/gestor";
import { gestorAtual } from "@/lib/auth/gestor";
import GestaoGestores from "./GestaoGestores";

export const dynamic = "force-dynamic";

export default async function GestoresPage() {
  const [itens, atual] = await Promise.all([listarGestores(), gestorAtual()]);
  return <GestaoGestores itens={itens} idGestorAtual={atual?.id_gestor ?? ""} />;
}
