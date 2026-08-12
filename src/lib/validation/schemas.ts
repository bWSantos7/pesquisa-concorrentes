/**
 * Schemas de validação (Zod) — seção 40 (validação no backend) e 41.
 * Regras de negócio de entrada centralizadas aqui e reutilizadas por
 * Server Actions e formulários.
 */
import { z } from "zod";
import { normalizarTelefone, telefoneValido } from "@/lib/domain/telefone";

/** Telefone: aceita qualquer formatação; normaliza e valida comprimento. */
export const telefoneSchema = z
  .string()
  .min(1, "Informe o telefone")
  .refine((v) => telefoneValido(v), "Telefone inválido")
  .transform((v) => normalizarTelefone(v));

/** Login do agente (seção 4): somente telefone. */
export const loginAgenteSchema = z.object({
  telefone: telefoneSchema,
});

/** Cadastro/edição de agente pelo gestor (seção 6). */
export const agenteSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  telefone: telefoneSchema,
  ativo: z.boolean().default(true),
});

/** Cadastro de novo concorrente (seção 13). ID é gerado no backend. */
export const novoConcorrenteSchema = z.object({
  id_empreendimento: z.number().int().positive(),
  nome: z.string().trim().min(1, "Nome do concorrente é obrigatório"),
});

/** Estoque e vendas: inteiros >= 0 (seções 20 e 21). */
const inteiroNaoNegativo = z
  .number({ invalid_type_error: "Informe um número inteiro" })
  .int("Somente números inteiros")
  .min(0, "Mínimo 0");

/** Registro de coleta (seções 22–24). mes_ano é definido no servidor. */
export const coletaSchema = z.object({
  id_agente: z.string().uuid(),
  id_concorrente: z.number().int().positive(),
  estoque: inteiroNaoNegativo,
  vendas: inteiroNaoNegativo,
  /** Quando true, atualiza coleta existente do mês (seção 23). */
  atualizar: z.boolean().default(false),
});

/** Dados próprios do empreendimento (seção 25), cadastrados pelo gestor. */
export const dadosPropriosSchema = z.object({
  id_empreendimento: z.number().int().positive(),
  mes_ano: z.string().regex(/^\d{4}-\d{2}-01$/, "Competência inválida"),
  estoque: inteiroNaoNegativo,
  vendas: inteiroNaoNegativo,
});

export type LoginAgenteInput = z.infer<typeof loginAgenteSchema>;
export type AgenteInput = z.infer<typeof agenteSchema>;
export type NovoConcorrenteInput = z.infer<typeof novoConcorrenteSchema>;
export type ColetaInput = z.infer<typeof coletaSchema>;
export type DadosPropriosInput = z.infer<typeof dadosPropriosSchema>;
