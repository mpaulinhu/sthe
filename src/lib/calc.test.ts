import { describe, expect, it } from 'vitest'
import { summarizeMonth, summarizePerson } from './calc'
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
      [entry('salario', 2000, false), entry('adiantamento', 500, true, `${PERIOD}-01`)],
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
      [entry('salario', 2000, true), entry('adiantamento', 500, true, `${PERIOD}-01`)],
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
      [entry('salario', 2000, false), entry('adiantamento', 500, false)],
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

  it('pendente com data passada aparece como atrasado', () => {
    const s = summarizePerson(person(), [entry('salario', 2000, false, '2020-01-05')], PERIOD)
    expect(s.atrasado).toBe(true)
  })

  it('pendente com data futura não é atraso', () => {
    const s = summarizePerson(person(), [entry('salario', 2000, false, '2099-01-05')], PERIOD)
    expect(s.atrasado).toBe(false)
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
        [entry('salario', 2000, true), entry('adiantamento', 500, true)],
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
        [entry('salario', 2000, false), entry('adiantamento', 500, true)],
        PERIOD,
      ),
    ]
    const m = summarizeMonth(summaries)
    expect(m.pago + m.falta).toBe(m.total)
  })
})
