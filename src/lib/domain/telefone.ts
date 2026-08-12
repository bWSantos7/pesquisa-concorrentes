/**
 * Normalização de telefone — seção 5 da especificação.
 *
 * Antes de pesquisar ou salvar um telefone:
 *  - remover espaços, hífens, parênteses e caracteres especiais;
 *  - manter somente números.
 *
 * O telefone normalizado deve ser único entre agentes (garantido por
 * constraint no banco). Esta função centraliza a regra para uso em
 * validação, login do agente e cadastro pelo gestor.
 */
export function normalizarTelefone(entrada: string): string {
  if (entrada == null) return "";
  return entrada.replace(/\D+/g, "");
}

/**
 * Um telefone é considerado válido para o domínio quando, após a
 * normalização, contém apenas dígitos e um comprimento plausível de número
 * brasileiro (10 a 13 dígitos, cobrindo fixo, celular e DDI 55).
 */
export function telefoneValido(entrada: string): boolean {
  const n = normalizarTelefone(entrada);
  return /^[0-9]{10,13}$/.test(n);
}
