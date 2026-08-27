import { describe, expect, it } from 'vitest'
import { parseImportedDb } from './storage'

describe('migração v1 → v2', () => {
  it('converte adiantamento em vale, preservando o resto', () => {
    const v1 = JSON.stringify({
      version: 1,
      people: [{ id: 'p1', name: 'Ana', active: true }],
      entries: [
        { id: 'e1', personId: 'p1', period: '2026-08', kind: 'adiantamento', amount: 500, paid: true },
        { id: 'e2', personId: 'p1', period: '2026-08', kind: 'salario', amount: 2000, paid: false },
      ],
    })

    const db = parseImportedDb(v1)

    expect(db.version).toBe(2)
    expect(db.entries.map((e) => e.kind)).toEqual(['vale', 'salario'])
    // O valor e o estado de pago não podem se perder na conversão.
    expect(db.entries[0].amount).toBe(500)
    expect(db.entries[0].paid).toBe(true)
    expect(db.people).toHaveLength(1)
  })

  it('um banco já em v2 passa intacto', () => {
    const v2 = JSON.stringify({
      version: 2,
      people: [],
      entries: [{ id: 'e1', personId: 'p1', period: '2026-08', kind: 'vale', amount: 100, paid: true }],
    })
    expect(parseImportedDb(v2).entries[0].kind).toBe('vale')
  })

  it('arquivo fora do formato é rejeitado', () => {
    expect(() => parseImportedDb('{"foo":1}')).toThrow()
  })
})
