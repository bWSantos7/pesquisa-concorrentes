/**
 * Competência (Mês/Ano) — seção 19 da especificação.
 *
 * - Determinar automaticamente usando o fuso America/Sao_Paulo.
 * - Persistir sempre o primeiro dia do mês (YYYY-MM-01).
 * - Exibir como MM/YYYY (ou "Agosto/2026").
 * - Nunca armazenar como texto livre.
 */

const TZ = "America/Sao_Paulo";

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Ano e mês (1–12) correntes no fuso America/Sao_Paulo. */
function anoMesSaoPaulo(base: Date = new Date()): { ano: number; mes: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(base);
  const ano = Number(parts.find((p) => p.type === "year")!.value);
  const mes = Number(parts.find((p) => p.type === "month")!.value);
  return { ano, mes };
}

/**
 * Competência vigente como string de data do primeiro dia do mês:
 * "2026-08-01". É esse valor que vai para a coluna `mes_ano` (date).
 */
export function competenciaVigente(base: Date = new Date()): string {
  const { ano, mes } = anoMesSaoPaulo(base);
  return primeiroDiaDoMes(ano, mes);
}

/** Monta "YYYY-MM-01" a partir de ano e mês (1–12). */
export function primeiroDiaDoMes(ano: number, mes: number): string {
  const mm = String(mes).padStart(2, "0");
  return `${ano}-${mm}-01`;
}

/**
 * Valida uma competência "YYYY-MM-01": formato correto, mês entre 1 e 12 e
 * ano num intervalo plausível. Usada para conferir a competência escolhida
 * pelo agente antes de persistir.
 */
export function competenciaValida(mesAno: string): boolean {
  if (!/^\d{4}-\d{2}-01$/.test(mesAno)) return false;
  const [ano, mes] = mesAno.split("-").map(Number);
  return mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100;
}

/** "2026-08-01" -> "08/2026" para exibição compacta. */
export function formatarCompetenciaCurta(mesAno: string): string {
  const [ano, mes] = mesAno.split("-");
  return `${mes}/${ano}`;
}

/** "2026-08-01" -> "Agosto/2026" para exibição por extenso. */
export function formatarCompetenciaLonga(mesAno: string): string {
  const [ano, mes] = mesAno.split("-");
  return `${MESES_PT[Number(mes) - 1]}/${ano}`;
}
