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

export type EntryKind = 'salario' | 'servico' | 'extra' | 'adiantamento' | 'desconto'

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
  createdAt: string
}

export interface Database {
  version: 1
  people: Person[]
  entries: Entry[]
}

export const CONTRACT_LABEL: Record<ContractType, string> = {
  fixo: 'Salário fixo',
  freelancer: 'Freelancer',
  diarista: 'Diária',
}

export const KIND_LABEL: Record<EntryKind, string> = {
  salario: 'Salário',
  servico: 'Serviço avulso',
  extra: 'Extra / Bônus',
  adiantamento: 'Adiantamento',
  desconto: 'Desconto',
}

export const KIND_HINT: Record<EntryKind, string> = {
  salario: 'O pagamento principal do mês.',
  servico: 'Trabalho avulso — usado para freelancer e diária.',
  extra: 'Bônus, gorjeta, ajuda de custo. Soma por fora do salário.',
  adiantamento: 'Parte do salário paga antes da data. Abate do que falta pagar.',
  desconto: 'Falta, adiantamento de mês anterior, material quebrado. Abate do total.',
}

/**
 * Como cada tipo entra na conta do mês:
 *  'soma'  → aumenta o total devido no mês (salário, serviço, extra)
 *  'abate' → reduz o total devido (desconto)
 *  'antecipa' → não muda o total; é uma parcela do total já quitada antes (adiantamento)
 */
export const KIND_EFFECT: Record<EntryKind, 'soma' | 'abate' | 'antecipa'> = {
  salario: 'soma',
  servico: 'soma',
  extra: 'soma',
  desconto: 'abate',
  adiantamento: 'antecipa',
}
