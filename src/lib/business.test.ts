import { describe, expect, it } from 'vitest'
import {
  addMonths,
  monthGrid,
  monthlyComparison,
  payrollByRole,
  payrollTotal,
  weekOf,
} from './business'
import type { Database, Entry } from './types'

function lanc(kind: Entry['kind'], amount: number, over: Partial<Entry> = {}): Entry {
  return {
    id: `e${Math.random()}`,
    personId: 'p1',
    period: '2026-09',
    kind,
    amount,
    date: '2026-09-05',
    paid: false,
    description: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...over,
  }
}

describe('payrollTotal', () => {
  it('soma cobranças, subtrai descontos e ignora o vale', () => {
    // O vale é parcela de um salário já contado — somá-lo dobraria o custo.
    const total = payrollTotal([
      lanc('salario', 2000),
      lanc('extra', 300),
      lanc('desconto', 200),
      lanc('vale', 500),
    ])

    expect(total).toBe(2100)
  })

  it('bate com o total da tela de pagamentos para o mesmo conjunto', () => {
    // Regressão: os relatórios somavam tudo cru e mostravam R$ 2.500 onde a
    // tela de pagamentos mostrava R$ 2.000 — a mesma folha com dois valores.
    expect(payrollTotal([lanc('salario', 2000), lanc('vale', 500)])).toBe(2000)
  })
})

describe('payrollByRole', () => {
  it('agrupa a folha por função, da maior para a menor', () => {
    const db = {
      version: 3,
      people: [
        { id: 'p1', role: 'Vendas' },
        { id: 'p2', role: 'Vendas' },
        { id: 'p3', role: 'Limpeza' },
      ],
      entries: [
        lanc('salario', 1000, { personId: 'p1' }),
        lanc('salario', 500, { personId: 'p2' }),
        lanc('salario', 800, { personId: 'p3' }),
        // Outro mês — não pode entrar na conta.
        lanc('salario', 9999, { personId: 'p1', period: '2026-08' }),
      ],
      shifts: [],
    } as unknown as Database

    expect(payrollByRole(db, '2026-09')).toEqual([
      { role: 'Vendas', total: 1500 },
      { role: 'Limpeza', total: 800 },
    ])
  })

  it('aplica desconto e vale dentro da função', () => {
    const db = {
      version: 3,
      people: [{ id: 'p1', role: 'Vendas' }],
      entries: [lanc('salario', 1000), lanc('vale', 400), lanc('desconto', 100)],
      shifts: [],
    } as unknown as Database

    expect(payrollByRole(db, '2026-09')).toEqual([{ role: 'Vendas', total: 900 }])
  })

  it('agrupa quem está sem função sob um rótulo próprio', () => {
    const db = {
      version: 3,
      people: [{ id: 'p1', role: '  ' }],
      entries: [lanc('salario', 100)],
      shifts: [],
    } as unknown as Database

    expect(payrollByRole(db, '2026-09')).toEqual([{ role: 'Sem função', total: 100 }])
  })

  it('ignora lançamento de pessoa que não existe mais', () => {
    const db = {
      version: 3,
      people: [],
      entries: [lanc('salario', 100, { personId: 'sumiu' })],
      shifts: [],
    } as unknown as Database

    expect(payrollByRole(db, '2026-09')).toEqual([])
  })
})

describe('monthlyComparison', () => {
  it('devolve os três meses até o período, com a folha de cada um', () => {
    const db = {
      version: 3,
      people: [],
      entries: [lanc('salario', 1000), lanc('salario', 500, { period: '2026-08' })],
      shifts: [],
    } as unknown as Database

    const linhas = monthlyComparison(db, '2026-09')

    expect(linhas.map((l) => l.period)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(linhas.map((l) => l.folha)).toEqual([0, 500, 1000])
  })

  it('atravessa a virada de ano', () => {
    const db = { version: 3, people: [], entries: [], shifts: [] } as unknown as Database

    expect(monthlyComparison(db, '2026-01').map((l) => l.period)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
    ])
  })
})

describe('weekOf', () => {
  it('vai de domingo a sábado da semana que contém a data', () => {
    // 2026-09-09 é uma quarta-feira.
    expect(weekOf('2026-09-09')).toEqual([
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ])
  })

  it('atravessa a virada de mês sem quebrar', () => {
    const semana = weekOf('2026-10-01')
    expect(semana).toHaveLength(7)
    expect(semana[0]).toBe('2026-09-27')
    expect(semana[6]).toBe('2026-10-03')
  })
})

describe('monthGrid', () => {
  it('sempre entrega semanas inteiras, de domingo a sábado', () => {
    const grade = monthGrid('2026-09-11')
    expect(grade.length % 7).toBe(0)
    expect(new Date(`${grade[0]}T00:00:00`).getDay()).toBe(0)
    expect(new Date(`${grade[grade.length - 1]}T00:00:00`).getDay()).toBe(6)
  })

  it('cobre o mês inteiro, do 1º ao último dia', () => {
    const grade = monthGrid('2026-09-11')
    expect(grade).toContain('2026-09-01')
    expect(grade).toContain('2026-09-30')
  })

  it('completa as pontas com dias dos meses vizinhos', () => {
    // Setembro de 2026 começa numa terça, então a grade puxa domingo e segunda
    // de agosto para fechar a primeira semana.
    const grade = monthGrid('2026-09-11')
    expect(grade[0]).toBe('2026-08-30')
    expect(grade[grade.length - 1]).toBe('2026-10-03')
  })

  it('não repete nem pula dias', () => {
    const grade = monthGrid('2026-09-11')
    expect(new Set(grade).size).toBe(grade.length)
    for (let i = 1; i < grade.length; i++) {
      const anterior = new Date(`${grade[i - 1]}T00:00:00`)
      const atual = new Date(`${grade[i]}T00:00:00`)
      expect((atual.getTime() - anterior.getTime()) / 86400000).toBe(1)
    }
  })

  it('funciona em fevereiro de ano bissexto', () => {
    const grade = monthGrid('2028-02-10')
    expect(grade).toContain('2028-02-29')
    expect(grade.length % 7).toBe(0)
  })

  it('dá o mesmo resultado para qualquer dia do mesmo mês', () => {
    expect(monthGrid('2026-09-01')).toEqual(monthGrid('2026-09-30'))
  })
})

describe('addMonths', () => {
  it('anda para frente e para trás caindo no dia 1º', () => {
    expect(addMonths('2026-09-11', 1)).toBe('2026-10-01')
    expect(addMonths('2026-09-11', -1)).toBe('2026-08-01')
  })

  it('atravessa a virada do ano', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01')
  })

  it('não escorrega em mês curto — dia 31 + 1 mês não vira março', () => {
    // O clássico: `setMonth` sobre o dia 31 em janeiro daria 3 de março.
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01')
  })
})
