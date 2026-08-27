import { KIND_EFFECT, type Entry, type Person } from './types'

export interface PersonSummary {
  person: Person
  entries: Entry[]
  /** Total bruto devido no mês: salário + serviços + extras - descontos. */
  total: number
  /** Quanto já saiu do bolso dela (qualquer lançamento marcado como pago). */
  pago: number
  /** Quanto ainda falta pagar. Nunca negativo. */
  falta: number
  /** Já pagou tudo que devia neste mês. */
  quitado: boolean
  /** Tem algo pendente com data já vencida. */
  atrasado: boolean
  /**
   * O dia combinado de pagamento já passou. Diferente de `atrasado`, que exige
   * dívida em aberto: serve para avisar de quem venceu e não teve nada lançado.
   */
  venceu: boolean
}

export interface MonthSummary {
  total: number
  pago: number
  falta: number
  pessoasQuitadas: number
  pessoasPendentes: number
  pessoasAtrasadas: number
}

export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1 + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const name = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function summarizePerson(person: Person, allEntries: Entry[], period: string): PersonSummary {
  const entries = allEntries
    .filter((e) => e.personId === person.id && e.period === period)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Divide os lançamentos em três papéis:
  //   cobra   → o que ela deve no mês (salário, serviço, extra)
  //   abate   → o que reduz essa dívida (desconto)
  //   antecipa→ parte da dívida paga antes da data (adiantamento)
  const cobrancas = entries.filter((e) => KIND_EFFECT[e.kind] === 'soma')
  const abatimentos = entries.filter((e) => KIND_EFFECT[e.kind] === 'abate')
  const adiantamentos = entries.filter((e) => KIND_EFFECT[e.kind] === 'antecipa')

  const somaTudo = (list: Entry[]) => list.reduce((acc, e) => acc + e.amount, 0)

  const total = somaTudo(cobrancas) - somaTudo(abatimentos)

  // Dinheiro que já saiu por cobranças quitadas, menos os descontos já aplicados.
  const pagoPorCobrancas = somaTudo(cobrancas.filter((e) => e.paid)) - somaTudo(abatimentos.filter((e) => e.paid))

  // O adiantamento é uma parcela do que já está sendo cobrado. Ele só acrescenta
  // desembolso enquanto sobrar cobrança em aberto para ele cobrir — quando ela
  // quita o salário cheio, esse valor já está embutido nele.
  const emAberto = Math.max(0, total - pagoPorCobrancas)
  const adiantadoQueAindaConta = Math.min(somaTudo(adiantamentos.filter((e) => e.paid)), emAberto)

  const pago = Math.max(0, pagoPorCobrancas + adiantadoQueAindaConta)
  const falta = Math.max(0, total - pago)

  // "Atrasado" olha o dia combinado de pagamento da pessoa, não a data de cada
  // lançamento: é assim que ela pensa ("a Ana recebe dia 5 e hoje é 27").
  // Só faz sentido dentro do mês corrente — meses passados com saldo em aberto
  // contam como atraso, e meses futuros nunca.
  const hoje = todayIso()
  const mesAtual = hoje.slice(0, 7)
  let venceu: boolean
  if (period < mesAtual) venceu = true
  else if (period > mesAtual) venceu = false
  else venceu = person.payDay < Number(hoje.slice(8, 10))

  const atrasado = falta > 0 && venceu

  return {
    person,
    entries,
    total,
    pago,
    falta,
    quitado: total > 0 && falta === 0,
    atrasado,
    venceu,
  }
}

export type StatusKey = 'atraso' | 'apagar' | 'pagos'
export type FilterKey = 'todos' | StatusKey
export type SortKey = 'vencimento' | 'valor' | 'nome'

/** Em qual dos três grupos a pessoa cai. Sem lançamento conta como "a pagar". */
export function statusOf(s: PersonSummary): StatusKey {
  if (s.quitado) return 'pagos'
  if (s.atrasado) return 'atraso'
  return 'apagar'
}

export function sortSummaries(list: PersonSummary[], sort: SortKey): PersonSummary[] {
  const byName = (a: PersonSummary, b: PersonSummary) =>
    a.person.name.localeCompare(b.person.name, 'pt-BR')

  return [...list].sort((a, b) => {
    if (sort === 'valor') return b.falta - a.falta || byName(a, b)
    if (sort === 'nome') return byName(a, b)
    return a.person.payDay - b.person.payDay || byName(a, b)
  })
}

export interface Group {
  key: StatusKey
  titulo: string
  cor: string
  items: PersonSummary[]
  /** Falta a pagar do grupo; no grupo "Pagos", o total já pago. */
  soma: number
}

const GROUP_DEF: { key: StatusKey; titulo: string; cor: string }[] = [
  { key: 'atraso', titulo: 'Em atraso', cor: '#b3452f' },
  { key: 'apagar', titulo: 'A pagar', cor: '#b8862a' },
  { key: 'pagos', titulo: 'Pagos', cor: '#2f7d5c' },
]

/** Grupos na ordem fixa do design, já sem os vazios. */
export function buildGroups(visible: PersonSummary[]): Group[] {
  return GROUP_DEF.map((g) => {
    const items = visible.filter((s) => statusOf(s) === g.key)
    const soma = items.reduce((acc, s) => acc + (g.key === 'pagos' ? s.pago : s.falta), 0)
    return { ...g, items, soma }
  }).filter((g) => g.items.length > 0)
}

export interface MonthStats extends MonthSummary {
  atrasoTotal: number
  atrasoCount: number
  /** Primeira pessoa a vencer entre as que ainda não estão atrasadas. */
  proximo: PersonSummary | null
}

export function monthStats(list: PersonSummary[]): MonthStats {
  const base = summarizeMonth(list)
  const atrasados = list.filter((s) => s.atrasado)
  const aVencer = sortSummaries(
    list.filter((s) => s.falta > 0 && !s.atrasado),
    'vencimento',
  )
  return {
    ...base,
    atrasoTotal: atrasados.reduce((acc, s) => acc + s.falta, 0),
    atrasoCount: atrasados.length,
    proximo: aVencer[0] ?? null,
  }
}

/** "27/08" — data curta usada na sublinha do lançamento. */
export function formatShortDate(iso: string): string {
  if (!iso) return ''
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

/** Abreviação do mês para a coluna do dia: "AGO". */
export function monthAbbr(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

/**
 * Monta os lançamentos do mês novo a partir do mês anterior, para ela não ter
 * que redigitar o salário de todo mundo. Copia só o que é recorrente (salário e
 * descontos fixos não entram: desconto e adiantamento são pontuais daquele mês),
 * sempre como "ainda não pago", ajustando a data para o mês de destino.
 */
export function buildRepeatedEntries(
  entries: Entry[],
  fromPeriod: string,
  toPeriod: string,
  people: Person[],
  makeId: () => string,
): Entry[] {
  const jaTem = new Set(entries.filter((e) => e.period === toPeriod).map((e) => e.personId))
  const ativos = new Set(people.filter((p) => p.active).map((p) => p.id))

  return entries
    .filter(
      (e) =>
        e.period === fromPeriod &&
        // Só o que se repete todo mês. Vale, desconto, extra e reembolso são do
        // mês em que aconteceram — repetir criaria cobrança que ela não combinou.
        (e.kind === 'salario' || e.kind === 'servico' || e.kind === 'diaria') &&
        ativos.has(e.personId) &&
        // Quem já tem qualquer lançamento no mês novo fica de fora, para não duplicar.
        !jaTem.has(e.personId),
    )
    .map((e) => ({
      ...e,
      id: makeId(),
      period: toPeriod,
      date: moveDateToPeriod(e.date, toPeriod),
      paid: false,
      createdAt: new Date().toISOString(),
    }))
}

/** Mantém o dia, troca o mês/ano — respeitando meses mais curtos (31 → 28/30). */
function moveDateToPeriod(iso: string, period: string): string {
  const [y, m] = period.split('-').map(Number)
  const dia = Number(iso?.split('-')[2]) || 1
  const ultimoDia = new Date(y, m, 0).getDate()
  return `${period}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`
}

export function summarizeMonth(summaries: PersonSummary[]): MonthSummary {
  return summaries.reduce<MonthSummary>(
    (acc, s) => {
      acc.total += s.total
      acc.pago += s.pago
      acc.falta += s.falta
      if (s.quitado) acc.pessoasQuitadas += 1
      else if (s.total > 0 || s.entries.length > 0) acc.pessoasPendentes += 1
      if (s.atrasado) acc.pessoasAtrasadas += 1
      return acc
    },
    { total: 0, pago: 0, falta: 0, pessoasQuitadas: 0, pessoasPendentes: 0, pessoasAtrasadas: 0 },
  )
}
