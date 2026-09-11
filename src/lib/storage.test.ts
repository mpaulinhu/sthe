import { describe, expect, it } from 'vitest'
import { parseImportedDb } from './storage'

describe('migração do banco', () => {
  it('v1 → v7: converte adiantamento em vale, preservando o resto', () => {
    const v1 = JSON.stringify({
      version: 1,
      people: [{ id: 'p1', name: 'Ana', active: true }],
      entries: [
        { id: 'e1', personId: 'p1', period: '2026-08', kind: 'adiantamento', amount: 500, paid: true },
        { id: 'e2', personId: 'p1', period: '2026-08', kind: 'salario', amount: 2000, paid: false },
      ],
    })

    const db = parseImportedDb(v1)

    expect(db.version).toBe(7)
    expect(db.entries.map((e) => e.kind)).toEqual(['vale', 'salario'])
    // O valor e o estado de pago não podem se perder na conversão.
    expect(db.entries[0].amount).toBe(500)
    expect(db.entries[0].paid).toBe(true)
    expect(db.people).toHaveLength(1)
  })

  it('v2 → v7: mantém pagamentos e cria a agenda vazia', () => {
    const v2 = JSON.stringify({
      version: 2,
      people: [{ id: 'p1', name: 'Ana', active: true }],
      entries: [
        { id: 'e1', personId: 'p1', period: '2026-08', kind: 'vale', amount: 100, paid: true },
      ],
    })

    const db = parseImportedDb(v2)

    expect(db.version).toBe(7)
    expect(db.entries[0].kind).toBe('vale')
    expect(db.people).toHaveLength(1)
    expect(db.agenda).toEqual([])
    expect(db.monthMemberships).toEqual([])
  })

  it('v3 → v7: preserva os itens salvos como `shifts`', () => {
    const v3 = JSON.stringify({
      version: 3,
      people: [],
      entries: [],
      shifts: [{ id: 'sh1', date: '2026-09-09', title: 'Loja', time: '09:00-18:00', personIds: [] }],
    })

    const db = parseImportedDb(v3)

    expect(db.version).toBe(7)
    expect(db.agenda).toHaveLength(1)
    expect(db.agenda[0].title).toBe('Loja')
  })

  it('descarta um `kind` salvo por uma versão intermediária', () => {
    const comKind = JSON.stringify({
      version: 4,
      people: [],
      entries: [],
      agenda: [
        { id: 'a1', kind: 'turno', date: '2026-09-09', title: 'Loja', time: '09:00-18:00', personIds: [] },
      ],
    })

    const db = parseImportedDb(comKind)

    expect(db.agenda).toHaveLength(1)
    expect(db.agenda[0]).not.toHaveProperty('kind')
    expect(db.agenda[0].title).toBe('Loja')
  })

  it('v4 → v7: mantém tudo e cria monthMemberships vazio', () => {
    const v4 = JSON.stringify({
      version: 4,
      people: [{ id: 'p1', name: 'Ana', active: true }],
      entries: [],
      agenda: [],
    })

    const db = parseImportedDb(v4)

    expect(db.version).toBe(7)
    expect(db.people).toHaveLength(1)
    expect(db.monthMemberships).toEqual([])
  })

  it('v5 → v7: preserva monthMemberships e cria a lista de recibos', () => {
    const v5 = JSON.stringify({
      version: 5,
      people: [],
      entries: [],
      agenda: [],
      monthMemberships: [{ personId: 'p1', period: '2026-09' }],
    })

    const db = parseImportedDb(v5)

    expect(db.version).toBe(7)
    expect(db.monthMemberships).toEqual([{ personId: 'p1', period: '2026-09' }])
    // Pagamentos antigos não ganham recibo retroativo — ninguém assinou nada
    // na época, e inventar um destruiria o valor probatório dos verdadeiros.
    expect(db.recibos).toEqual([])
  })

  it('restaurar um backup preserva os recibos assinados', () => {
    const v6 = JSON.stringify({
      version: 6,
      people: [],
      entries: [],
      agenda: [],
      monthMemberships: [],
      recibos: [{ id: 'r1', numero: 1, personName: 'Ana', hash: 'abc', prevHash: 'genesis' }],
    })

    const db = parseImportedDb(v6)

    expect(db.recibos).toHaveLength(1)
    expect(db.recibos[0].numero).toBe(1)
    // O hash precisa atravessar o backup intacto, senão a cadeia quebraria
    // toda vez que ela restaurasse os dados num aparelho novo.
    expect(db.recibos[0].hash).toBe('abc')
  })

  it('arquivo fora do formato é rejeitado', () => {
    expect(() => parseImportedDb('{"foo":1}')).toThrow()
  })
})
