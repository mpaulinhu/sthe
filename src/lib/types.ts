export type ContractType = 'fixo' | 'freelancer' | 'diarista'

export interface Person {
  id: string
  name: string
  role: string
  contract: ContractType
  /** Valor base mensal (fixo) ou valor de referência da diária. Freelancer pode ser 0. */
  baseAmount: number
  /** Dia do mês em que costuma receber (1-31). Usado para ordenar e alertar atraso. */
  payDay: number
  active: boolean
  notes: string
  createdAt: string
}

export type EntryKind =
  | 'salario'
  | 'diaria'
  | 'servico'
  | 'extra'
  | 'reembolso'
  | 'vale'
  | 'desconto'

/** Como o pagamento foi feito. */
export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Transferência' | 'Cartão'

export const PAYMENT_METHODS: PaymentMethod[] = ['Pix', 'Dinheiro', 'Transferência', 'Cartão']

export interface Entry {
  id: string
  personId: string
  /** Competência YYYY-MM — a que mês de trabalho esse lançamento pertence. */
  period: string
  kind: EntryKind
  amount: number
  /** Data em que foi (ou está previsto) o pagamento. ISO YYYY-MM-DD. */
  date: string
  paid: boolean
  description: string
  /** Forma de pagamento, preenchida quando o lançamento é quitado. */
  method?: PaymentMethod
  /**
   * Nome do arquivo do comprovante. Hoje guardamos só o nome — a imagem em si
   * fica de fora enquanto o armazenamento for localStorage (~5 MB no total).
   * Quando migrar para o Firestore, o binário comprimido entra aqui ao lado
   * (limite de 1 MB por documento).
   */
  receiptName?: string
  createdAt: string
}

export interface Database {
  version: 2
  people: Person[]
  entries: Entry[]
}

export const CONTRACT_LABEL: Record<ContractType, string> = {
  fixo: 'Salário fixo',
  diarista: 'Diária',
  freelancer: 'Freelancer',
}

/** Rótulo curto usado no segmented control do cadastro. */
export const CONTRACT_SHORT: Record<ContractType, string> = {
  fixo: 'Fixo',
  diarista: 'Diária',
  freelancer: 'Freela',
}

export const KIND_LABEL: Record<EntryKind, string> = {
  salario: 'Salário',
  diaria: 'Diária',
  servico: 'Serviço',
  extra: 'Hora extra',
  reembolso: 'Reembolso',
  vale: 'Vale',
  desconto: 'Desconto',
}

export const KIND_HINT: Record<EntryKind, string> = {
  salario: 'O pagamento principal do mês.',
  diaria: 'Dias trabalhados no período.',
  servico: 'Trabalho avulso, freelancer.',
  extra: 'Horas ou plantão a mais, por fora do combinado.',
  reembolso: 'Despesa que ela adiantou e você devolve.',
  vale: 'Parte paga antes da data. Abate do que falta.',
  desconto: 'Falta, material, adiantamento anterior. Reduz o total.',
}

/**
 * Como cada tipo entra na conta do mês:
 *  'soma'     → aumenta o total devido (salário, diária, serviço, extra, reembolso)
 *  'abate'    → reduz o total devido (desconto)
 *  'antecipa' → não muda o total; é uma parcela dele paga antes (vale)
 */
export const KIND_EFFECT: Record<EntryKind, 'soma' | 'abate' | 'antecipa'> = {
  salario: 'soma',
  diaria: 'soma',
  servico: 'soma',
  extra: 'soma',
  reembolso: 'soma',
  vale: 'antecipa',
  desconto: 'abate',
}

/** Ordem em que os tipos aparecem nos chips do sheet "Lançar valor". */
export const KIND_ORDER: EntryKind[] = [
  'salario',
  'diaria',
  'servico',
  'extra',
  'reembolso',
  'vale',
  'desconto',
]

/** Tipo sugerido ao lançar para alguém, conforme como a pessoa recebe. */
export function defaultKindFor(contract: ContractType): EntryKind {
  if (contract === 'fixo') return 'salario'
  if (contract === 'diarista') return 'diaria'
  return 'servico'
}
