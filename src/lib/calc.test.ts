import { describe, expect, it } from 'vitest'
import { buildGroups, buildRepeatedEntries, sortSummaries, statusOf, summarizeMonth, summarizePerson } from './calc'
import type { Entry, EntryKind, Person } from './types'

const PERIOD = '2026-08'

function person(over: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    name: 'Ana',
    role: '',
    contract: 'fixo',
    baseAmount: 2000,
    payDay: 5,
    active: true,
    notes: '',
    createdAt: '',
    ...over,
  }
}

let seq = 0
function entry(kind: EntryKind, amount: number, paid: boolean, date = `${PERIOD}-05`): Entry {
  return {
    id: `e${seq++}`,
    personId: 'p1',
    period: PERIOD,
    kind,
    amount,
    date,
    paid,
    description: '',
    createdAt: '',
  }
}

describe('summarizePerson', () => {
  it('salário simples ainda não pago', () => {
    const s = summarizePerson(person(), [entry('salario', 2000, false)], PERIOD)
    expect(s.total).toBe(2000)
    expect(s.pago).toBe(0)
    expect(s.falta).toBe(2000)
    expect(s.quitado).toBe(false)
  })

  it('salário pago fica quitado', () => {
    const s = summarizePerson(person(), [entry('salario', 2000, true)], PERIOD)
    expect(s.pago).toBe(2000)
    expect(s.falta).toBe(0)
    expect(s.quitado).toBe(true)
  })

  it('adiantamento pago abate do que falta, sem mudar o total', () => {
    const s = summarizePerson(
      person(),
      [entry('salario', 2000, false), entry('vale', 500, true, `${PERIOD}-01`)],
      PERIOD,
    )
    expect(s.total).toBe(2000)
    expect(s.pago).toBe(500)
    expect(s.falta).toBe(1500)
    expect(s.quitado).toBe(false)
  })

  it('quitar o salário depois do adiantamento NÃO faz o pago passar do total', () => {
    const s = summarizePerson(
      person(),
      [entry('salario', 2000, true), entry('vale', 500, true, `${PERIOD}-01`)],
      PERIOD,
    )
    expect(s.total).toBe(2000)
    expect(s.pago).toBe(2000)
    expect(s.falta).toBe(0)
    expect(s.quitado).toBe(true)
  })

  it('adiantamento ainda não pago não conta como desembolso', () => {
    const s = summarizePerson(
      person(),
      [entry('salario', 2000, false), entry('vale', 500, false)],
      PERIOD,
    )
    expect(s.pago).toBe(0)
    expect(s.falta).toBe(2000)
  })

  it('desconto reduz o total e o desembolso, sem estourar o pago', () => {
    const s = summarizePerson(
      person({ contract: 'diarista' }),
      [entry('servico', 600, true), entry('desconto', 120, true)],
      PERIOD,
    )
    expect(s.total).toBe(480)
    expect(s.pago).toBe(480)
    expect(s.falta).toBe(0)
    expect(s.quitado).toBe(true)
  })

  it('extra soma por fora do salário', () => {
    const s = summarizePerson(
      person(),
      [entry('salario', 2000, true), entry('extra', 150, false)],
      PERIOD,
    )
    expect(s.total).toBe(2150)
    expect(s.pago).toBe(2000)
    expect(s.falta).toBe(150)
    expect(s.quitado).toBe(false)
  })

  it('vários serviços de freelancer somam', () => {
    const s = summarizePerson(
      person({ contract: 'freelancer', baseAmount: 0 }),
      [entry('servico', 800, true), entry('servico', 450, false)],
      PERIOD,
    )
    expect(s.total).toBe(1250)
    expect(s.pago).toBe(800)
    expect(s.falta).toBe(450)
  })

  // "Atrasado" olha o dia combinado da pessoa, não a data do lançamento.
  it('mês já passado com saldo em aberto conta como atraso', () => {
    const s = summarizePerson(person(), [{ ...entry('salario', 2000, false), period: '2020-01' }], '2020-01')
    expect(s.atrasado).toBe(true)
  })

  it('mês futuro nunca é atraso, mesmo com tudo em aberto', () => {
    const s = summarizePerson(person(), [{ ...entry('salario', 2000, false), period: '2099-01' }], '2099-01')
    expect(s.atrasado).toBe(false)
  })

  it('mês passado quitado não é atraso', () => {
    const s = summarizePerson(person(), [{ ...entry('salario', 2000, true), period: '2020-01' }], '2020-01')
    expect(s.atrasado).toBe(false)
    expect(s.quitado).toBe(true)
  })

  it('ignora lançamentos de outro mês', () => {
    const outro: Entry = { ...entry('salario', 999, true), period: '2026-07' }
    const s = summarizePerson(person(), [entry('salario', 2000, false), outro], PERIOD)
    expect(s.total).toBe(2000)
    expect(s.entries).toHaveLength(1)
  })

  it('mês sem lançamento não conta como quitado', () => {
    const s = summarizePerson(person(), [], PERIOD)
    expect(s.total).toBe(0)
    expect(s.quitado).toBe(false)
  })
})

describe('summarizeMonth', () => {
  it('o já pago nunca passa do total do mês', () => {
    const summaries = [
      summarizePerson(
        person(),
        [entry('salario', 2000, true), entry('vale', 500, true)],
        PERIOD,
      ),
      summarizePerson(
        person({ id: 'p2' }),
        [{ ...entry('servico', 800, true), personId: 'p2' }],
        PERIOD,
      ),
    ]
    const m = summarizeMonth(summaries)
    expect(m.pago).toBeLessThanOrEqual(m.total)
    expect(m.total).toBe(2800)
    expect(m.pago).toBe(2800)
    expect(m.falta).toBe(0)
  })

  it('total = pago + falta', () => {
    const summaries = [
      summarizePerson(
        person(),
        [entry('salario', 2000, false), entry('vale', 500, true)],
        PERIOD,
      ),
    ]
    const m = summarizeMonth(summaries)
    expect(m.pago + m.falta).toBe(m.total)
  })
})

describe('buildRepeatedEntries', () => {
  const pessoas = [person(), person({ id: 'p2', name: 'Bruno' })]
  let n = 0
  const makeId = () => `novo${n++}`

  it('repete salário do mês anterior como não pago', () => {
    const anterior = [{ ...entry('salario', 2000, true), period: '2026-07', date: '2026-07-05' }]
    const novos = buildRepeatedEntries(anterior, '2026-07', '2026-08', pessoas, makeId)
    expect(novos).toHaveLength(1)
    expect(novos[0].period).toBe('2026-08')
    expect(novos[0].date).toBe('2026-08-05')
    expect(novos[0].amount).toBe(2000)
    expect(novos[0].paid).toBe(false)
  })

  it('NÃO repete adiantamento nem desconto', () => {
    const anterior = [
      { ...entry('salario', 2000, true), period: '2026-07', date: '2026-07-05' },
      { ...entry('vale', 500, true), period: '2026-07', date: '2026-07-01' },
      { ...entry('desconto', 100, true), period: '2026-07', date: '2026-07-20' },
    ]
    const novos = buildRepeatedEntries(anterior, '2026-07', '2026-08', pessoas, makeId)
    expect(novos.map((e) => e.kind)).toEqual(['salario'])
  })

  it('não duplica quem já tem lançamento no mês novo', () => {
    const anterior = [
      { ...entry('salario', 2000, true), period: '2026-07', date: '2026-07-05' },
      { ...entry('salario', 900, true), personId: 'p2', period: '2026-07', date: '2026-07-10' },
    ]
    const jaLancado = [{ ...entry('salario', 2000, false), period: '2026-08' }]
    const novos = buildRepeatedEntries(
      [...anterior, ...jaLancado],
      '2026-07',
      '2026-08',
      pessoas,
      makeId,
    )
    expect(novos.map((e) => e.personId)).toEqual(['p2'])
  })

  it('ignora quem foi desativado', () => {
    const anterior = [{ ...entry('salario', 2000, true), period: '2026-07', date: '2026-07-05' }]
    const novos = buildRepeatedEntries(
      anterior,
      '2026-07',
      '2026-08',
      [person({ active: false })],
      makeId,
    )
    expect(novos).toHaveLength(0)
  })

  it('dia 31 vira o último dia de um mês curto', () => {
    const anterior = [{ ...entry('salario', 2000, true), period: '2026-01', date: '2026-01-31' }]
    const novos = buildRepeatedEntries(anterior, '2026-01', '2026-02', pessoas, makeId)
    expect(novos[0].date).toBe('2026-02-28')
  })

  it('mês anterior vazio não gera nada', () => {
    expect(buildRepeatedEntries([], '2026-07', '2026-08', pessoas, makeId)).toHaveLength(0)
  })
})

describe('agrupamento e ordenação', () => {
  const base = (over: Partial<Person>) => person(over)

  it('separa nos três grupos na ordem do design, sem os vazios', () => {
    const quitada = summarizePerson(base({ id: 'q', name: 'Quitada' }), [
      { ...entry('salario', 1000, true), personId: 'q' },
    ], PERIOD)
    const aberta = summarizePerson(base({ id: 'a', name: 'Aberta', payDay: 31 }), [
      { ...entry('salario', 1000, false), personId: 'a' },
    ], PERIOD)

    const grupos = buildGroups([quitada, aberta])
    // Só existem grupos com gente dentro.
    expect(grupos.every((g) => g.items.length > 0)).toBe(true)
    // A ordem relativa segue atraso → a pagar → pagos.
    const keys = grupos.map((g) => g.key)
    expect(keys).toEqual([...keys].sort((x, y) => {
      const ord = { atraso: 0, apagar: 1, pagos: 2 } as const
      return ord[x] - ord[y]
    }))
  })

  it('soma do grupo Pagos usa o que já foi pago', () => {
    const q = summarizePerson(base({ id: 'q' }), [{ ...entry('salario', 1000, true), personId: 'q' }], PERIOD)
    const g = buildGroups([q]).find((x) => x.key === 'pagos')
    expect(g?.soma).toBe(1000)
  })

  it('ordena por vencimento, maior valor e nome', () => {
    const mk = (id: string, name: string, payDay: number, valor: number) =>
      summarizePerson(base({ id, name, payDay }), [
        { ...entry('salario', valor, false), personId: id },
      ], PERIOD)

    const zeca = mk('1', 'Zeca', 5, 100)
    const ana = mk('2', 'Ana', 20, 900)

    expect(sortSummaries([ana, zeca], 'vencimento').map((s) => s.person.name)).toEqual(['Zeca', 'Ana'])
    expect(sortSummaries([zeca, ana], 'valor').map((s) => s.person.name)).toEqual(['Ana', 'Zeca'])
    expect(sortSummaries([zeca, ana], 'nome').map((s) => s.person.name)).toEqual(['Ana', 'Zeca'])
  })

  it('quem não tem lançamento cai em "a pagar", não em "pagos"', () => {
    const s = summarizePerson(base({ id: 'z', payDay: 31 }), [], PERIOD)
    expect(statusOf(s)).toBe('apagar')
  })
})

describe('novos tipos de lançamento', () => {
  it('diária e reembolso somam ao total', () => {
    const s = summarizePerson(person(), [entry('diaria', 900, false), entry('reembolso', 60, false)], PERIOD)
    expect(s.total).toBe(960)
  })

  it('vale pago abate sem inflar o total (regra herdada do adiantamento)', () => {
    const s = summarizePerson(person(), [entry('salario', 2000, false), entry('vale', 500, true)], PERIOD)
    expect(s.total).toBe(2000)
    expect(s.pago).toBe(500)
    expect(s.falta).toBe(1500)
  })
})
