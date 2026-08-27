import type { Database } from './types'

const KEY = 'sthe.pagamentos.v1'

const EMPTY: Database = { version: 1, people: [], entries: [] }

export function loadDb(): Database {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Database
    if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.entries)) return EMPTY
    return { version: 1, people: parsed.people, entries: parsed.entries }
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
  const parsed = JSON.parse(text) as Database
  if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.entries)) {
    throw new Error('Arquivo fora do formato esperado.')
  }
  return { version: 1, people: parsed.people, entries: parsed.entries }
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
