import { describe, expect, it } from 'vitest'
import {
  buildFixedSalaries,
  buildGroups,
  buildRepeatedEntries,
  payDayLabel,
  peopleVisibleInPeriod,
  pendingByMethod,
  resolvePayDate,
  sortSummaries,
  statusOf,
  summarizeMonth,
  summarizePerson,
  advanceAmount,
  resolveAdvanceDate,
  proportionalForPeriod,
  activeInPeriod,
  findProportionalMismatches,
} from './calc'
import type { Entry, EntryKind, Person } from './types'

const SEG_A_SEX = [1, 2, 3, 4, 5]

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
    createdAt: `${PERIOD}-01T00:00:00.000Z`,
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

describe('venceu x atrasado', () => {
  it('sem lançamento e dia já passado: venceu, mas NÃO é atraso (não há dívida)', () => {
    const s = summarizePerson(person({ payDay: 1 }), [], '2020-01')
    expect(s.venceu).toBe(true)
    expect(s.atrasado).toBe(false)
    expect(s.total).toBe(0)
  })

  it('com dívida e dia já passado: venceu e é atraso', () => {
    const s = summarizePerson(
      person({ payDay: 1 }),
      [{ ...entry('salario', 1000, false), period: '2020-01' }],
      '2020-01',
    )
    expect(s.venceu).toBe(true)
    expect(s.atrasado).toBe(true)
  })

  it('mês futuro não venceu', () => {
    const s = summarizePerson(person({ payDay: 1 }), [], '2099-01')
    expect(s.venceu).toBe(false)
    expect(s.atrasado).toBe(false)
  })
})

describe('buildFixedSalaries', () => {
  const id = () => `novo${seq++}`

  it('cria o salário de quem é fixo, com o dia de pagar da pessoa', () => {
    const novos = buildFixedSalaries([], PERIOD, [person({ baseAmount: 2000, payDay: 5 })], id)

    expect(novos).toHaveLength(1)
    expect(novos[0]).toMatchObject({
      personId: 'p1',
      kind: 'salario',
      amount: 2000,
      period: PERIOD,
      date: `${PERIOD}-05`,
      paid: false,
    })
  })

  it('não cria para diarista nem freelancer que não foi adicionado ao mês', () => {
    // Sem membership eles nem aparecem na lista do mês — criar valor aqui
    // inventaria uma dívida para alguém que não está trabalhando no período.
    const gente = [
      person({ id: 'a', contract: 'diarista', baseAmount: 130 }),
      person({ id: 'b', contract: 'freelancer', baseAmount: 500 }),
    ]
    expect(buildFixedSalaries([], PERIOD, gente, id)).toEqual([])
  })

  it('cria para freelancer trazido pelo "Adicionar ao mês", com o valor do cadastro', () => {
    const freela = person({ id: 'b', contract: 'freelancer', baseAmount: 500, payDay: 10 })
    const novos = buildFixedSalaries([], PERIOD, [freela], id, [
      { personId: 'b', period: PERIOD },
    ])

    expect(novos).toHaveLength(1)
    expect(novos[0]).toMatchObject({
      personId: 'b',
      // Freelancer lança "serviço", não "salário" — o rótulo vai para o
      // recibo e para o relatório por função.
      kind: 'servico',
      amount: 500,
      date: `${PERIOD}-10`,
      paid: false,
    })
  })

  it('cria para diarista adicionada ao mês, como diária', () => {
    const diarista = person({ id: 'a', contract: 'diarista', baseAmount: 130 })
    const novos = buildFixedSalaries([], PERIOD, [diarista], id, [
      { personId: 'a', period: PERIOD },
    ])

    expect(novos).toHaveLength(1)
    expect(novos[0]).toMatchObject({ kind: 'diaria', amount: 130 })
  })

  it('membership de outro mês não traz o valor para este', () => {
    const freela = person({ id: 'b', contract: 'freelancer', baseAmount: 500 })
    expect(
      buildFixedSalaries([], PERIOD, [freela], id, [{ personId: 'b', period: '2026-07' }]),
    ).toEqual([])
  })

  it('freelancer sem valor combinado continua sem lançamento', () => {
    // Valor que varia sempre é o caso normal do freela: aí ela lança à mão, e
    // adivinhar um número seria pior do que deixar em branco.
    const freela = person({ id: 'b', contract: 'freelancer', baseAmount: 0 })
    expect(
      buildFixedSalaries([], PERIOD, [freela], id, [{ personId: 'b', period: PERIOD }]),
    ).toEqual([])
  })

  it('freelancer adicionado que já teve valor lançado não ganha outro', () => {
    const freela = person({ id: 'b', contract: 'freelancer', baseAmount: 500 })
    const jaLancou = [{ ...entry('servico', 900, false), personId: 'b' }]
    expect(
      buildFixedSalaries(jaLancou, PERIOD, [freela], id, [{ personId: 'b', period: PERIOD }]),
    ).toEqual([])
  })

  it('não cria para fixo sem valor combinado', () => {
    expect(buildFixedSalaries([], PERIOD, [person({ baseAmount: 0 })], id)).toEqual([])
  })

  it('não cria para pessoa inativa', () => {
    expect(buildFixedSalaries([], PERIOD, [person({ active: false })], id)).toEqual([])
  })

  it('respeita quem já tem lançamento no mês, mesmo que não seja salário', () => {
    // Se ela já lançou qualquer coisa, o mês é "dela" — acrescentar salário
    // por cima inflaria o total sem ela pedir.
    const jaLancou = [entry('diaria', 400, false)]
    expect(buildFixedSalaries(jaLancou, PERIOD, [person()], id)).toEqual([])
  })

  it('ignora lançamento de outro mês ao decidir', () => {
    const outroMes = [{ ...entry('salario', 2000, false), period: '2026-07' }]
    expect(buildFixedSalaries(outroMes, PERIOD, [person()], id)).toHaveLength(1)
  })

  it('encaixa o dia 31 em mês curto', () => {
    // Fevereiro de 2026 tem 28 dias — o vencimento cai no último.
    const novos = buildFixedSalaries([], '2026-02', [person({ payDay: 31 })], id)
    expect(novos[0].date).toBe('2026-02-28')
  })
})

describe('resolvePayDate — dia fixo', () => {
  it('mantém o dia quando o mês tem dias suficientes', () => {
    expect(resolvePayDate('2026-08', { payDay: 10, payDayMode: 'fixo' })).toBe('2026-08-10')
  })

  it('dia 31 em novembro (30 dias) cai no dia 30 — o bug relatado', () => {
    expect(resolvePayDate('2026-11', { payDay: 31, payDayMode: 'fixo' })).toBe('2026-11-30')
  })

  it('dia 30 em fevereiro cai no último dia do mês', () => {
    expect(resolvePayDate('2026-02', { payDay: 30, payDayMode: 'fixo' })).toBe('2026-02-28')
  })

  it('sem payDayMode definido (cadastro antigo) se comporta como fixo', () => {
    expect(resolvePayDate('2026-11', { payDay: 31 })).toBe('2026-11-30')
  })
})

describe('resolvePayDate — dia útil', () => {
  it('conta a partir do 1º do mês usando o calendário seg-sex', () => {
    // Agosto de 2026 começa numa sábado — 1º dia útil é segunda, dia 3.
    expect(resolvePayDate('2026-08', { payDay: 1, payDayMode: 'util' }, SEG_A_SEX)).toBe(
      '2026-08-03',
    )
  })

  it('5º dia útil de setembro de 2026 (começa numa terça)', () => {
    // 1=ter(1) 2=qua(2) 3=qui(3) 4=sex(4) [sáb 5, dom 6 pulam] 5=seg(7)
    expect(resolvePayDate('2026-09', { payDay: 5, payDayMode: 'util' }, SEG_A_SEX)).toBe(
      '2026-09-07',
    )
  })

  it('calendário customizado (incluindo sábado) conta diferente', () => {
    const comSabado = [1, 2, 3, 4, 5, 6]
    expect(resolvePayDate('2026-09', { payDay: 5, payDayMode: 'util' }, comSabado)).toBe(
      '2026-09-05',
    )
  })

  it('cai no último dia útil do mês se não houver dias suficientes', () => {
    // Fevereiro de 2026: só 20 dias úteis (seg-sex). Pedir o 25º não pode
    // estourar para março — usa o último que existe.
    const resultado = resolvePayDate('2026-02', { payDay: 25, payDayMode: 'util' }, SEG_A_SEX)
    expect(resultado.startsWith('2026-02-')).toBe(true)
  })
})

describe('payDayLabel', () => {
  it('descreve dia fixo', () => {
    expect(payDayLabel({ payDay: 5, payDayMode: 'fixo' })).toBe('dia 5')
  })

  it('descreve dia útil', () => {
    expect(payDayLabel({ payDay: 5, payDayMode: 'util' })).toBe('5º dia útil')
  })

  it('sem payDayMode se comporta como fixo', () => {
    expect(payDayLabel({ payDay: 10 })).toBe('dia 10')
  })
})

describe('pendingByMethod', () => {
  function resumo(nome: string, falta: number, method?: Person['method']) {
    return summarizePerson(
      person({ id: nome, name: nome, method }),
      falta > 0 ? [{ ...entry('salario', falta, false), personId: nome }] : [],
      PERIOD,
    )
  }

  it('agrupa o que falta pagar por forma, da maior soma para a menor', () => {
    const fatias = pendingByMethod([
      resumo('Ana', 1000, 'Pix'),
      resumo('Bia', 500, 'Dinheiro'),
      resumo('Cida', 800, 'Pix'),
    ])

    expect(fatias).toEqual([
      { method: 'Pix', total: 1800, pessoas: 2 },
      { method: 'Dinheiro', total: 500, pessoas: 1 },
    ])
  })

  it('quem não tem forma definida cai em "Sem forma"', () => {
    expect(pendingByMethod([resumo('Ana', 300)])).toEqual([
      { method: 'Sem forma', total: 300, pessoas: 1 },
    ])
  })

  it('ignora quem já está quitado', () => {
    const quitada = summarizePerson(
      person({ id: 'q', method: 'Pix' }),
      [{ ...entry('salario', 900, true), personId: 'q' }],
      PERIOD,
    )
    expect(pendingByMethod([quitada, resumo('Ana', 100, 'Pix')])).toEqual([
      { method: 'Pix', total: 100, pessoas: 1 },
    ])
  })

  it('sem ninguém a pagar, não devolve fatia nenhuma', () => {
    expect(pendingByMethod([])).toEqual([])
  })
})

describe('peopleVisibleInPeriod', () => {
  describe('fixo', () => {
    it('aparece no mês do cadastro e nos seguintes', () => {
      const ana = person({ createdAt: '2026-08-15T00:00:00.000Z' })
      expect(peopleVisibleInPeriod([ana], [], '2026-08')).toEqual([ana])
      expect(peopleVisibleInPeriod([ana], [], '2026-09')).toEqual([ana])
    })

    it('NÃO aparece em mês anterior ao cadastro — o bug relatado', () => {
      const ana = person({ createdAt: '2026-08-15T00:00:00.000Z' })
      expect(peopleVisibleInPeriod([ana], [], '2026-07')).toEqual([])
      expect(peopleVisibleInPeriod([ana], [], '2026-01')).toEqual([])
    })

    it('some dos meses seguintes à saída, mas continua nos meses em que trabalhou', () => {
      const ana = person({
        createdAt: '2026-01-10T00:00:00.000Z',
        active: false,
        inactivatedAt: '2026-06-20T00:00:00.000Z',
      })
      expect(peopleVisibleInPeriod([ana], [], '2026-05')).toEqual([ana])
      expect(peopleVisibleInPeriod([ana], [], '2026-06')).toEqual([ana])
      expect(peopleVisibleInPeriod([ana], [], '2026-07')).toEqual([])
    })

    it('inativo sem `inactivatedAt` (cadastro antigo) não aparece em mês nenhum', () => {
      const ana = person({ active: false, inactivatedAt: undefined })
      expect(peopleVisibleInPeriod([ana], [], PERIOD)).toEqual([])
    })
  })

  describe('diarista e freelancer', () => {
    it('só aparece no mês em que teve lançamento', () => {
      const helena = person({ id: 'h', contract: 'diarista', createdAt: '2026-01-01T00:00:00.000Z' })
      const lancamentoEmAgosto = [{ ...entry('diaria', 130, false), personId: 'h' }]

      expect(peopleVisibleInPeriod([helena], lancamentoEmAgosto, PERIOD)).toEqual([helena])
      expect(peopleVisibleInPeriod([helena], lancamentoEmAgosto, '2026-09')).toEqual([])
    })

    it('NÃO aparece no mês do cadastro sem lançamento nem membership — cadastro é responsabilidade da Equipe, não desta lista', () => {
      const bruno = person({ id: 'b', contract: 'freelancer', createdAt: `${PERIOD}-01T00:00:00.000Z` })
      expect(peopleVisibleInPeriod([bruno], [], PERIOD)).toEqual([])
    })

    it('sem lançamento nem membership, não aparece em nenhum mês', () => {
      const bruno = person({ id: 'b', contract: 'freelancer', createdAt: '2026-01-01T00:00:00.000Z' })
      expect(peopleVisibleInPeriod([bruno], [], PERIOD)).toEqual([])
      expect(peopleVisibleInPeriod([bruno], [], '2026-09')).toEqual([])
    })

    it('lançamento não pago também conta — não precisa estar quitado para aparecer', () => {
      const bruno = person({ id: 'b', contract: 'freelancer' })
      const naoPago = [{ ...entry('servico', 500, false), personId: 'b' }]
      expect(peopleVisibleInPeriod([bruno], naoPago, PERIOD)).toEqual([bruno])
    })
  })

  it('combina os dois tipos no mesmo mês, cada um pela sua regra', () => {
    const ana = person({ id: 'ana', contract: 'fixo', createdAt: '2026-01-01T00:00:00.000Z' })
    const bruno = person({ id: 'bruno', contract: 'freelancer' })
    const lancamentos = [{ ...entry('servico', 500, false), personId: 'bruno' }]

    const visiveis = peopleVisibleInPeriod([ana, bruno], lancamentos, PERIOD)
    expect(visiveis.map((p) => p.id).sort()).toEqual(['ana', 'bruno'])
  })

  describe('memberships — "Adicionar ao mês"', () => {
    it('readiciona freela/diarista a um mês em que não tem lançamento nem é o mês de cadastro', () => {
      const helena = person({
        id: 'h',
        contract: 'diarista',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      const memberships = [{ personId: 'h', period: PERIOD }]

      expect(peopleVisibleInPeriod([helena], [], PERIOD, memberships)).toEqual([helena])
    })

    it('membership só vale para o período exato', () => {
      const helena = person({
        id: 'h',
        contract: 'diarista',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      const memberships = [{ personId: 'h', period: PERIOD }]

      expect(peopleVisibleInPeriod([helena], [], '2026-09', memberships)).toEqual([])
    })

    it('sem o parâmetro `memberships`, comportamento continua igual ao de antes', () => {
      // Regressão: os ~13 casos de teste anteriores chamam a função com só 3
      // argumentos — o default precisa preservar o comportamento deles.
      const helena = person({ id: 'h', contract: 'diarista', createdAt: '2026-01-01T00:00:00.000Z' })
      expect(peopleVisibleInPeriod([helena], [], PERIOD)).toEqual([])
    })

    it('não afeta fixo — membership é ignorada para esse tipo de contrato', () => {
      const ana = person({ id: 'ana', contract: 'fixo', createdAt: '2026-01-01T00:00:00.000Z' })
      const memberships = [{ personId: 'ana', period: '2020-01' }]
      // Fixo fora da janela cadastro→saída não aparece mesmo com membership.
      expect(peopleVisibleInPeriod([ana], [], '2020-01', memberships)).toEqual([])
    })
  })
})

describe('vale (adiantamento)', () => {
  const comVale = (advance: Person['advance']) =>
    ({ baseAmount: 2000, advance }) as Person

  it('sem vale cadastrado, não há data nem valor', () => {
    const p = comVale(undefined)
    expect(resolveAdvanceDate('2026-09', p)).toBe('')
    expect(advanceAmount(p)).toBe(0)
  })

  it('calcula o percentual sobre o salário', () => {
    expect(advanceAmount(comVale({ day: 20, percent: 40 }))).toBe(800)
    expect(advanceAmount(comVale({ day: 20, percent: 50 }))).toBe(1000)
  })

  it('arredonda ao centavo em percentual quebrado', () => {
    // 2000 * 33% = 660 exato; 1999 * 33% = 659,67 — o que não pode é sobrar
    // fração de centavo num valor que vai para um recibo.
    const p = { baseAmount: 1999, advance: { day: 20, percent: 33 } } as Person
    expect(advanceAmount(p)).toBe(659.67)
  })

  it('resolve o dia fixo dentro do período', () => {
    expect(resolveAdvanceDate('2026-09', comVale({ day: 20, percent: 40 }))).toBe('2026-09-20')
  })

  it('respeita mês curto — dia 31 em fevereiro cai no último dia', () => {
    const data = resolveAdvanceDate('2026-02', comVale({ day: 31, percent: 40 }))
    expect(data).toBe('2026-02-28')
  })

  it('resolve por dia útil quando o modo pede', () => {
    // Setembro de 2026 começa numa terça; o 5º dia útil é dia 7 (seg-sex).
    const data = resolveAdvanceDate(
      '2026-09',
      comVale({ day: 5, mode: 'util', percent: 40 }),
      [1, 2, 3, 4, 5],
    )
    expect(data).toBe('2026-09-07')
  })
})

describe('pagamento em duas etapas (vale + restante)', () => {
  // Ana ganha 2000 e tem vale de 40% = 800, todo dia 20.
  const comVale = () => person({ advance: { day: 20, percent: 40 } })

  it('sem nada pago, sugere o vale — não o mês inteiro', () => {
    const s = summarizePerson(comVale(), [entry('salario', 2000, false)], PERIOD)
    expect(s.valorVale).toBe(800)
    expect(s.faltaVale).toBe(800)
    expect(s.sugestaoPagamento).toBe(800)
    expect(s.falta).toBe(2000)
  })

  it('com o vale pago, sugere o que sobrou', () => {
    const s = summarizePerson(
      comVale(),
      [entry('salario', 2000, false), entry('vale', 800, true)],
      PERIOD,
    )
    expect(s.faltaVale).toBe(0)
    expect(s.sugestaoPagamento).toBe(s.falta)
    expect(s.falta).toBe(1200)
  })

  it('pagamento parcial abate do vale primeiro', () => {
    // Pagou 300 de um vale de 800: ainda deve 500 de vale, não 800.
    const s = summarizePerson(
      comVale(),
      [entry('salario', 2000, false), entry('vale', 300, true)],
      PERIOD,
    )
    expect(s.faltaVale).toBe(500)
    expect(s.sugestaoPagamento).toBe(500)
  })

  it('quem não tem vale segue sugerindo o que falta', () => {
    const s = summarizePerson(person(), [entry('salario', 2000, false)], PERIOD)
    expect(s.valorVale).toBe(0)
    expect(s.faltaVale).toBe(0)
    expect(s.sugestaoPagamento).toBe(2000)
  })

  it('mês já quitado não sugere nada a pagar', () => {
    const s = summarizePerson(comVale(), [entry('salario', 2000, true)], PERIOD)
    expect(s.falta).toBe(0)
    expect(s.faltaVale).toBe(0)
    expect(s.sugestaoPagamento).toBe(0)
  })

  it('vale maior que o devido no mês não sugere mais do que se deve', () => {
    // Mês curto: só 500 lançados, mas o vale calculado é 800. Sugerir 800
    // faria pagar mais do que a pessoa tem a receber.
    const s = summarizePerson(comVale(), [entry('servico', 500, false)], PERIOD)
    expect(s.falta).toBe(500)
    expect(s.sugestaoPagamento).toBe(500)
  })
})

describe('a data em destaque explica o status', () => {
  // PERIOD é 2026-08, um mês no passado — então tudo nele já venceu.
  it('em atraso, o destaque é o salário — nunca o vale futuro', () => {
    // O bug que isso trava: a linha mostrava "20 · VALE" em vermelho quando o
    // atrasado era o salário. Uma data que ainda não chegou não pode aparecer
    // colada num alerta de atraso.
    const s = summarizePerson(
      person({ payDay: 5, advance: { day: 20, percent: 40 } }),
      [entry('salario', 2000, false)],
      PERIOD,
    )
    expect(s.atrasado).toBe(true)
    expect(s.proximaEhVale).toBe(false)
    expect(s.proximaData).toBe(s.dataPagamento)
  })

  it('sem atraso, o vale assume o destaque quando é o que vem primeiro', () => {
    // Período futuro: nada venceu, então o vale (dia 20) é a próxima conta.
    const s = summarizePerson(
      person({ payDay: 28, advance: { day: 20, percent: 40 } }),
      [{ ...entry('salario', 2000, false), period: '2099-01' }],
      '2099-01',
    )
    expect(s.atrasado).toBe(false)
    expect(s.proximaEhVale).toBe(true)
    expect(s.proximaData).toBe(s.dataVale)
  })

  it('o vale segue visível como informação mesmo com o salário em atraso', () => {
    // `faltaVale` é o que a linha usa para mostrar "vale dia 20 · R$ X" ao
    // lado do nome: some do destaque, mas não da tela.
    const s = summarizePerson(
      person({ payDay: 5, advance: { day: 20, percent: 40 } }),
      [entry('salario', 2000, false)],
      PERIOD,
    )
    expect(s.faltaVale).toBe(800)
    expect(s.dataVale).toBe(`${PERIOD}-20`)
  })
})

describe('destaque = a menor das duas datas por vencer', () => {
  const FUTURO = '2099-01'
  const noFuturo = (kind: EntryKind, amount: number) => ({
    ...entry(kind, amount, false),
    period: FUTURO,
    date: `${FUTURO}-05`,
  })

  it('vale dia 20 e salário dia 5: o destaque é o dia 5', () => {
    // O bug que isso trava: a regra antiga só perguntava "o vale já passou?",
    // então escolhia o vale mesmo quando o salário caía antes dele.
    const s = summarizePerson(
      person({ payDay: 5, advance: { day: 20, percent: 40 } }),
      [noFuturo('salario', 2000)],
      FUTURO,
    )
    expect(s.proximaEhVale).toBe(false)
    expect(s.proximaData).toBe(`${FUTURO}-05`)
  })

  it('vale dia 10 e salário dia 25: o destaque é o vale', () => {
    const s = summarizePerson(
      person({ payDay: 25, advance: { day: 10, percent: 40 } }),
      [noFuturo('salario', 2000)],
      FUTURO,
    )
    expect(s.proximaEhVale).toBe(true)
    expect(s.proximaData).toBe(`${FUTURO}-10`)
  })

  it('mesmo dia para os dois: o vale ganha, por ser a primeira parcela', () => {
    const s = summarizePerson(
      person({ payDay: 20, advance: { day: 20, percent: 40 } }),
      [noFuturo('salario', 2000)],
      FUTURO,
    )
    expect(s.proximaEhVale).toBe(true)
  })

  it('vale já quitado sai do destaque, mesmo caindo antes', () => {
    const s = summarizePerson(
      person({ payDay: 25, advance: { day: 10, percent: 40 } }),
      [noFuturo('salario', 2000), { ...noFuturo('vale', 800), paid: true }],
      FUTURO,
    )
    expect(s.faltaVale).toBe(0)
    expect(s.proximaEhVale).toBe(false)
    expect(s.proximaData).toBe(`${FUTURO}-25`)
  })
})

describe('proporcional de admissão e saída', () => {
  const p = (over: Partial<Person>) => person({ baseAmount: 3000, ...over })

  it('mês sem entrada nem saída é cheio — devolve null', () => {
    expect(proportionalForPeriod(p({}), '2026-08')).toBeNull()
    expect(proportionalForPeriod(p({ hiredAt: '2026-03-10' }), '2026-08')).toBeNull()
  })

  it('admitida no dia 11 de um mês de 30 dias recebe 20/30', () => {
    const r = proportionalForPeriod(p({ hiredAt: '2026-09-11' }), '2026-09')!
    expect(r.dias).toBe(20)
    expect(r.valor).toBe(2000)
    expect(r.motivo).toBe('admissao')
  })

  it('admitida no dia 1º recebe o mês cheio, sem proporcional', () => {
    // Trabalhou o mês inteiro. Sem esta regra, um mês de 31 dias pagaria
    // 31/30 = mais que o salário combinado.
    expect(proportionalForPeriod(p({ hiredAt: '2026-08-01' }), '2026-08')).toBeNull()
    expect(proportionalForPeriod(p({ hiredAt: '2026-09-01' }), '2026-09')).toBeNull()
  })

  it('quem sai no último dia do mês também recebe cheio', () => {
    expect(proportionalForPeriod(p({ leftAt: '2026-09-30' }), '2026-09')).toBeNull()
    expect(proportionalForPeriod(p({ leftAt: '2026-02-28' }), '2026-02')).toBeNull()
  })

  it('o divisor é sempre 30, mesmo em mês de 31 dias', () => {
    // Admitida em 02/08 (31 dias): 30 dias trabalhados sobre base 30.
    const r = proportionalForPeriod(p({ hiredAt: '2026-08-02' }), '2026-08')!
    expect(r.dias).toBe(30)
    expect(r.base).toBe(30)
    expect(r.valor).toBe(3000)
  })

  it('o último dia conta como trabalhado', () => {
    // Saiu dia 10: trabalhou 10 dias, não 9.
    const r = proportionalForPeriod(p({ leftAt: '2026-09-10' }), '2026-09')!
    expect(r.dias).toBe(10)
    expect(r.valor).toBe(1000)
    expect(r.motivo).toBe('saida')
  })

  it('entrou e saiu no mesmo mês conta só o intervalo', () => {
    const r = proportionalForPeriod(
      p({ hiredAt: '2026-09-06', leftAt: '2026-09-15' }),
      '2026-09',
    )!
    expect(r.dias).toBe(10)
    expect(r.motivo).toBe('ambos')
  })

  it('fevereiro: admitida dia 15 conta até o dia 28', () => {
    const r = proportionalForPeriod(p({ hiredAt: '2026-02-15' }), '2026-02')!
    expect(r.dias).toBe(14)
  })

  it('datas incoerentes não geram valor negativo', () => {
    const r = proportionalForPeriod(
      p({ hiredAt: '2026-09-20', leftAt: '2026-09-05' }),
      '2026-09',
    )!
    expect(r.dias).toBe(0)
    expect(r.valor).toBe(0)
  })

  it('arredonda ao centavo', () => {
    const r = proportionalForPeriod(
      { baseAmount: 2777, hiredAt: '2026-09-08' },
      '2026-09',
    )!
    expect(r.dias).toBe(23)
    expect(r.valor).toBe(2129.03)
  })
})

describe('activeInPeriod', () => {
  it('mês anterior à admissão não conta', () => {
    expect(activeInPeriod({ hiredAt: '2026-09-11' }, '2026-08')).toBe(false)
    expect(activeInPeriod({ hiredAt: '2026-09-11' }, '2026-09')).toBe(true)
    expect(activeInPeriod({ hiredAt: '2026-09-11' }, '2026-10')).toBe(true)
  })

  it('mês posterior à saída não conta', () => {
    expect(activeInPeriod({ leftAt: '2026-09-10' }, '2026-10')).toBe(false)
    expect(activeInPeriod({ leftAt: '2026-09-10' }, '2026-09')).toBe(true)
  })

  it('sem datas, vale para qualquer mês', () => {
    expect(activeInPeriod({}, '2020-01')).toBe(true)
  })
})

describe('visibilidade por admissão e saída', () => {
  it('não lista quem ainda não foi admitida', () => {
    const ana = person({ hiredAt: '2026-09-11' })
    expect(peopleVisibleInPeriod([ana], [], '2026-08')).toHaveLength(0)
    expect(peopleVisibleInPeriod([ana], [], '2026-09')).toHaveLength(1)
  })

  it('não lista quem já saiu', () => {
    const ana = person({ leftAt: '2026-09-10' })
    expect(peopleVisibleInPeriod([ana], [], '2026-10')).toHaveLength(0)
    expect(peopleVisibleInPeriod([ana], [], '2026-09')).toHaveLength(1)
  })

  it('mas continua listando se houver lançamento naquele mês', () => {
    // Dinheiro registrado precisa aparecer para poder ser corrigido — esconder
    // a linha esconderia o erro junto.
    const ana = person({ leftAt: '2026-09-10' })
    const lanc = { ...entry('salario', 1000, true), period: '2026-10' }
    expect(peopleVisibleInPeriod([ana], [lanc], '2026-10')).toHaveLength(1)
  })
})

describe('lançamento automático respeita admissão e saída', () => {
  const id = () => 'x'

  it('mês de entrada nasce proporcional, com a nota explicando', () => {
    const ana = person({ baseAmount: 3000, hiredAt: '2026-09-11' })
    const [e] = buildFixedSalaries([], '2026-09', [ana], id)
    expect(e.amount).toBe(2000)
    expect(e.description).toBe('Proporcional · 20 de 30 dias')
  })

  it('mês cheio nasce com o salário e sem nota', () => {
    const ana = person({ baseAmount: 3000, hiredAt: '2026-03-11' })
    const [e] = buildFixedSalaries([], '2026-09', [ana], id)
    expect(e.amount).toBe(3000)
    expect(e.description).toBe('')
  })

  it('não lança nada antes da admissão nem depois da saída', () => {
    const ana = person({ baseAmount: 3000, hiredAt: '2026-09-11' })
    expect(buildFixedSalaries([], '2026-08', [ana], id)).toHaveLength(0)

    const bia = person({ id: 'p2', baseAmount: 3000, leftAt: '2026-09-10' })
    expect(buildFixedSalaries([], '2026-10', [bia], id)).toHaveLength(0)
  })

  it('mês de saída nasce proporcional', () => {
    const ana = person({ baseAmount: 3000, leftAt: '2026-09-10' })
    const [e] = buildFixedSalaries([], '2026-09', [ana], id)
    expect(e.amount).toBe(1000)
    expect(e.description).toBe('Proporcional · 10 de 30 dias')
  })
})

describe('detecta salário cheio em mês proporcional', () => {
  // PERIOD é 2026-08 (31 dias); admissão dia 12 => 20 de 30 dias.
  const ana = () => person({ baseAmount: 3000, hiredAt: `${PERIOD}-12` })

  it('acha o lançamento cheio no mês de entrada', () => {
    // O caso real: a data de admissão foi preenchida depois de o mês já ter
    // sido aberto, então o lançamento ficou com o valor cheio.
    const r = findProportionalMismatches([ana()], [entry('salario', 3000, false)], PERIOD)
    expect(r).toHaveLength(1)
    expect(r[0].esperado.dias).toBe(20)
    expect(r[0].esperado.valor).toBe(2000)
  })

  it('ignora quando já está proporcional', () => {
    expect(
      findProportionalMismatches([ana()], [entry('salario', 2000, false)], PERIOD),
    ).toHaveLength(0)
  })

  it('não mexe no que já foi pago', () => {
    // Reescrever o valor de um pagamento que aconteceu deixaria o recibo
    // emitido apontando para outro número.
    expect(
      findProportionalMismatches([ana()], [entry('salario', 3000, true)], PERIOD),
    ).toHaveLength(0)
  })

  it('não mexe em valor ajustado à mão', () => {
    // 2500 não é nem o cheio nem o proporcional: foi escolhido de propósito.
    expect(
      findProportionalMismatches([ana()], [entry('salario', 2500, false)], PERIOD),
    ).toHaveLength(0)
  })

  it('mês cheio não gera divergência', () => {
    const veterana = person({ baseAmount: 3000, hiredAt: '2025-01-10' })
    expect(
      findProportionalMismatches([veterana], [entry('salario', 3000, false)], PERIOD),
    ).toHaveLength(0)
  })
})
