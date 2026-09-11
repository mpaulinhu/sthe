import { KIND_EFFECT, type AgendaItem, type Database, type Entry } from './types'

/** Domingo a sábado da semana que contém `iso`. */
export function weekOf(iso: string): string[] {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const inicio = new Date(base)
  inicio.setDate(base.getDate() - base.getDay())

  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicio)
    dia.setDate(inicio.getDate() + i)
    return toIso(dia)
  })
}

/**
 * A grade do mês que contém `iso`: sempre semanas inteiras, de domingo a
 * sábado, então começa antes do dia 1º e termina depois do último dia.
 *
 * Os dias vizinhos que entram na conta são de propósito — sem eles a grade
 * ficaria com buracos nas pontas, e um compromisso na virada do mês
 * desapareceria da vista. A tela os desenha esmaecidos para não confundir.
 *
 * Devolve 35 ou 42 dias (5 ou 6 semanas), conforme o mês se encaixa.
 */
export function monthGrid(iso: string): string[] {
  const [y, m] = iso.split('-').map(Number)
  const primeiro = new Date(y, m - 1, 1)
  const ultimo = new Date(y, m, 0)

  const inicio = new Date(primeiro)
  inicio.setDate(1 - primeiro.getDay())

  const fim = new Date(ultimo)
  fim.setDate(ultimo.getDate() + (6 - ultimo.getDay()))

  const dias: string[] = []
  for (const dia = new Date(inicio); dia <= fim; dia.setDate(dia.getDate() + 1)) {
    dias.push(toIso(dia))
  }
  return dias
}

/** Anda `n` meses a partir de `iso`, sempre caindo no dia 1º. */
export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split('-').map(Number)
  return toIso(new Date(y, m - 1 + n, 1))
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayIso(): string {
  return toIso(new Date())
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return toIso(date)
}

/** "seg", "ter"… para o cabeçalho da agenda. */
export function weekdayAbbr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
    .toLocaleDateString('pt-BR', { weekday: 'short' })
    .replace('.', '')
    .slice(0, 3)
}

/**
 * Itens de um dia, por horário — quem não tem hora marcada (string vazia)
 * fica no topo, já que "sem hora" costuma valer pro dia inteiro.
 */
export function agendaOfDay(items: AgendaItem[], iso: string): AgendaItem[] {
  return items
    .filter((it) => it.date === iso)
    .sort((a, b) => a.time.localeCompare(b.time))
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------

/**
 * Custo real de um conjunto de lançamentos: soma o que cobra, subtrai o que
 * abate e ignora o vale (que é parcela de algo já contado, não custo novo).
 * É a MESMA regra de `summarizePerson` — os relatórios precisam bater com o
 * total que a tela de pagamentos mostra, senão a mesma folha aparece com dois
 * valores diferentes.
 */
export function payrollTotal(entries: Entry[]): number {
  return entries.reduce((acc, e) => {
    const efeito = KIND_EFFECT[e.kind]
    if (efeito === 'soma') return acc + e.amount
    if (efeito === 'abate') return acc - e.amount
    return acc
  }, 0)
}

export interface RoleSlice {
  role: string
  total: number
}

/**
 * Quanto cada função custa no mês. Alimenta a barra de "folha por função" —
 * é onde ela enxerga para onde o dinheiro está indo.
 */
export function payrollByRole(db: Database, period: string): RoleSlice[] {
  const porFuncao = new Map<string, Entry[]>()

  db.entries
    .filter((e) => e.period === period)
    .forEach((e) => {
      const pessoa = db.people.find((p) => p.id === e.personId)
      if (!pessoa) return
      const role = pessoa.role.trim() || 'Sem função'
      porFuncao.set(role, [...(porFuncao.get(role) ?? []), e])
    })

  return [...porFuncao.entries()]
    .map(([role, entries]) => ({ role, total: payrollTotal(entries) }))
    .filter((f) => f.total > 0)
    .sort((a, b) => b.total - a.total)
}

export interface MonthComparison {
  period: string
  folha: number
}

/** Os `count` meses até `period`, para a comparação dos relatórios. */
export function monthlyComparison(db: Database, period: string, count = 3): MonthComparison[] {
  const [y, m] = period.split('-').map(Number)

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(y, m - 1 - (count - 1 - i), 1)
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { period: p, folha: payrollTotal(db.entries.filter((e) => e.period === p)) }
  })
}
