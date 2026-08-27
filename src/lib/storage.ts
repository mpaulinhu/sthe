import type { Database, Entry, Person } from './types'

const KEY = 'sthe.pagamentos.v1'

const EMPTY: Database = { version: 2, people: [], entries: [] }

/**
 * v1 → v2: `adiantamento` virou `vale` (mesmo efeito: antecipa parte do total).
 * Bancos gravados antes dessa mudança ainda trazem o nome antigo; sem a
 * conversão o lançamento cairia num tipo inexistente e sumiria da conta.
 */
function migrate(raw: unknown): Database {
  const db = raw as { people?: Person[]; entries?: (Omit<Entry, 'kind'> & { kind: string })[] }
  if (!db || !Array.isArray(db.people) || !Array.isArray(db.entries)) return EMPTY

  const entries = db.entries.map((e) => {
    const kind = e.kind === 'adiantamento' ? 'vale' : e.kind
    return { ...e, kind } as Entry
  })

  return { version: 2, people: db.people, entries }
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
