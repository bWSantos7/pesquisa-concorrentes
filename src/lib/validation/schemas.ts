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

/**
 * Edição de concorrente pelo Gestor (seção 2: "cadastrar concorrentes;
 * editar cadastros permitidos"). O empreendimento pai não é editável aqui:
 * o ID do concorrente carrega o prefixo do empreendimento original
 * (seção 12), então trocar o pai quebraria essa invariante.
 */
export const concorrenteEdicaoSchema = z.object({
  concorrente: z.string().trim().min(1, "Nome do concorrente é obrigatório"),
  ativo: z.boolean().default(true),
});

/**
 * Cadastro de empreendimento pelo Gestor (seção 10). Diferente do
 * concorrente, o id_empreendimento NÃO é gerado — é informado pelo gestor
 * (é o código de origem que vira prefixo dos concorrentes, seção 12).
 */
export const empreendimentoSchema = z.object({
  id_empreendimento: z.number().int().positive(),
  id_cidade: z.number().int().positive(),
  empreendimento: z.string().trim().min(1, "Nome é obrigatório"),
  ativo: z.boolean().default(true),
});

/** Edição de empreendimento: o ID não muda depois de criado (ver acima). */
export const empreendimentoEdicaoSchema = z.object({
  id_cidade: z.number().int().positive(),
  empreendimento: z.string().trim().min(1, "Nome é obrigatório"),
  ativo: z.boolean().default(true),
});

/**
 * Cadastro de gestor por outro gestor — extensão pedida pelo usuário,
 * além do escopo original da especificação (que só previa Auth externo).
 * Senha em texto puro só passa por aqui; nunca é persistida (vira hash
 * em src/lib/auth/senha.ts antes de chegar ao banco).
 */
const senhaSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres");

export const gestorSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  email: z.string().trim().email("E-mail inválido"),
  senha: senhaSchema,
  ativo: z.boolean().default(true),
});

/** Edição de gestor: senha em branco = não altera a senha atual. */
export const gestorEdicaoSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  email: z.string().trim().email("E-mail inválido"),
  senha: z.union([senhaSchema, z.literal("")]).optional(),
  ativo: z.boolean().default(true),
});

/** Estoque e vendas: inteiros >= 0 (seções 20 e 21). */
const inteiroNaoNegativo = z
  .number({ invalid_type_error: "Informe um número inteiro" })
  .int("Somente números inteiros")
  .min(0, "Mínimo 0");

/**
 * Registro de coleta (seções 22–24).
 * mes_ano: competência escolhida pelo agente no formato YYYY-MM-01. É
 * opcional — quando ausente, o servidor usa a competência vigente.
 */
export const coletaSchema = z.object({
  id_agente: z.string().uuid(),
  id_concorrente: z.number().int().positive(),
  estoque: inteiroNaoNegativo,
  vendas: inteiroNaoNegativo,
  mes_ano: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/, "Competência inválida")
    .optional(),
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
export type ConcorrenteEdicaoInput = z.infer<typeof concorrenteEdicaoSchema>;
export type EmpreendimentoInput = z.infer<typeof empreendimentoSchema>;
export type EmpreendimentoEdicaoInput = z.infer<typeof empreendimentoEdicaoSchema>;
export type GestorInput = z.infer<typeof gestorSchema>;
export type GestorEdicaoInput = z.infer<typeof gestorEdicaoSchema>;
export type ColetaInput = z.infer<typeof coletaSchema>;
export type DadosPropriosInput = z.infer<typeof dadosPropriosSchema>;
