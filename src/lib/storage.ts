import {
  DEFAULT_WORK_DAYS,
  EMPTY_COMPANY,
  type AgendaItem,
  type Company,
  type Database,
  type Entry,
  type MonthMembership,
  type Person,
  type Receipt,
} from './types'

const KEY = 'sthe.pagamentos.v1'

const EMPTY: Database = {
  version: 7,
  company: EMPTY_COMPANY,
  people: [],
  entries: [],
  agenda: [],
  monthMemberships: [],
  recibos: [],
}

/**
 * v1 → v2: `adiantamento` virou `vale` (mesmo efeito: antecipa parte do total).
 * v2 → v3: entrou a agenda (`shifts`).
 * v3 → v4: `shifts` virou `agenda`. Um item passou a ter `kind` por uma
 * versão intermediária — o campo é só descartado aqui, sem distinção de tipo.
 * v4 → v5: entrou `monthMemberships`, para "readicionar" ao mês um freela ou
 * diarista que já trabalhou antes. Bancos anteriores não têm essa lista —
 * entra vazia, sem perder nada do que já existia.
 * v5 → v6: entraram os recibos assinados (`recibos`) e o CPF no cadastro.
 * Pagamentos antigos continuam válidos como registro — só não têm recibo
 * assinado, o que é correto: ninguém assinou nada na época.
 * v6 → v7: entraram os dados de quem paga (`company`), que antes estavam
 * chumbados no código. Recibos da v6 não têm o pagador congelado — ficam com
 * o campo vazio, sinalizando que foram emitidos antes desse dado existir.
 */
function migrate(raw: unknown): Database {
  const db = raw as {
    company?: Partial<Company>
    people?: Person[]
    entries?: (Omit<Entry, 'kind'> & { kind: string })[]
    shifts?: (AgendaItem & { kind?: string })[]
    agenda?: (AgendaItem & { kind?: string })[]
    monthMemberships?: MonthMembership[]
    recibos?: Receipt[]
  }
  if (!db || !Array.isArray(db.people) || !Array.isArray(db.entries)) return EMPTY

  const entries = db.entries.map((e) => {
    const kind = e.kind === 'adiantamento' ? 'vale' : e.kind
    return { ...e, kind } as Entry
  })

  const rawAgenda = db.agenda ?? db.shifts ?? []
  const agenda = rawAgenda.map(({ kind: _kind, ...item }) => item) as AgendaItem[]

  const monthMemberships = Array.isArray(db.monthMemberships) ? db.monthMemberships : []
  const recibos = Array.isArray(db.recibos) ? db.recibos : []
  // Campo a campo em vez de espalhar o objeto salvo: um backup antigo pode ter
  // só parte das chaves, e o resto precisa cair no padrão em vez de virar
  // `undefined` dentro de um campo que a interface promete existir.
  const company: Company = {
    ...EMPTY_COMPANY,
    ...(db.company ?? {}),
    // Backup de antes do calendário de dias úteis existir, ou corrompido:
    // um array vazio travaria a contagem de "Nº dia útil" para sempre.
    workDays:
      Array.isArray(db.company?.workDays) && db.company.workDays.length > 0
        ? db.company.workDays
        : DEFAULT_WORK_DAYS,
  }

  return { version: 7, company, people: db.people, entries, agenda, monthMemberships, recibos }
}

export function loadDb(): Database {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    return migrate(JSON.parse(raw))
  } catch {
    return EMPTY
  }
}

export function saveDb(db: Database): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch (err) {
    console.error('Não foi possível salvar no navegador', err)
  }
}

export function exportDb(db: Database): void {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sthe-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportedDb(text: string): Database {
  const parsed = JSON.parse(text)
  if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.entries)) {
    throw new Error('Arquivo fora do formato esperado.')
  }
  return migrate(parsed)
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
