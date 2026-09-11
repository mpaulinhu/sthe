import { describe, expect, it } from 'vitest'
import { MAX_PASSOS, pilha, type Passo } from './useDesfazer'
import type { Database } from './types'

/** Banco mínimo, distinguível por um marcador — só a identidade importa aqui. */
function banco(marca: string): Database {
  return {
    people: [],
    entries: [],
    agenda: [],
    recibos: [],
    monthMemberships: [],
    company: { name: marca, doc: '', docType: 'cnpj', tradeName: '', address: '', workDays: [] },
  } as unknown as Database
}

const nome = (d: Database) => d.company.name

describe('pilha.registrar', () => {
  it('empilha o estado na ordem em que aconteceu', () => {
    let p: Passo[] = []
    p = pilha.registrar(p, banco('a'), 'Primeira')
    p = pilha.registrar(p, banco('b'), 'Segunda')
    expect(p.map((x) => nome(x.estado))).toEqual(['a', 'b'])
  })

  it('descarta o mais antigo ao passar do limite', () => {
    let p: Passo[] = []
    for (let i = 0; i < MAX_PASSOS + 5; i++) p = pilha.registrar(p, banco(`e${i}`), 'x')
    expect(p).toHaveLength(MAX_PASSOS)
    // Os 5 primeiros saíram; o topo é sempre o mais recente.
    expect(nome(p[0].estado)).toBe('e5')
    expect(nome(p[p.length - 1].estado)).toBe(`e${MAX_PASSOS + 4}`)
  })
})

describe('pilha.desfazer', () => {
  it('devolve null com passado vazio, em vez de quebrar', () => {
    expect(pilha.desfazer([], [], banco('atual'))).toBeNull()
  })

  it('volta ao estado anterior e joga o atual no futuro', () => {
    const p = pilha.registrar([], banco('antes'), 'Pagamento')
    const r = pilha.desfazer(p, [], banco('agora'))!

    expect(nome(r.alvo.estado)).toBe('antes')
    expect(r.alvo.rotulo).toBe('Pagamento')
    expect(r.passado).toHaveLength(0)
    expect(nome(r.futuro[0].estado)).toBe('agora')
  })

  it('desfaz em ordem inversa quando há vários passos', () => {
    let p: Passo[] = []
    p = pilha.registrar(p, banco('v1'), 'um')
    p = pilha.registrar(p, banco('v2'), 'dois')

    const primeiro = pilha.desfazer(p, [], banco('v3'))!
    expect(nome(primeiro.alvo.estado)).toBe('v2')

    const segundo = pilha.desfazer(primeiro.passado, primeiro.futuro, primeiro.alvo.estado)!
    expect(nome(segundo.alvo.estado)).toBe('v1')
  })
})

describe('pilha.refazer', () => {
  it('devolve null com futuro vazio', () => {
    expect(pilha.refazer([], [], banco('atual'))).toBeNull()
  })

  it('é o espelho do desfazer — ida e volta caem no mesmo lugar', () => {
    const p = pilha.registrar([], banco('antes'), 'Pagamento')
    const desfeito = pilha.desfazer(p, [], banco('depois'))!
    const refeito = pilha.refazer(desfeito.passado, desfeito.futuro, desfeito.alvo.estado)!

    expect(nome(refeito.alvo.estado)).toBe('depois')
    expect(refeito.futuro).toHaveLength(0)
    expect(nome(refeito.passado[0].estado)).toBe('antes')
  })

  it('preserva o rótulo através do ciclo', () => {
    const p = pilha.registrar([], banco('a'), 'Item movido')
    const d = pilha.desfazer(p, [], banco('b'))!
    const r = pilha.refazer(d.passado, d.futuro, d.alvo.estado)!
    expect(r.alvo.rotulo).toBe('Item movido')
  })
})

describe('caminho novo depois de desfazer', () => {
  it('o futuro é descartado por quem chama, não pela pilha', () => {
    // `registrar` não conhece o futuro: quem o zera é o hook, na mesma ação.
    // Este teste trava o contrato — se `registrar` passar a mexer no futuro,
    // a responsabilidade terá mudado de lugar.
    const p = pilha.registrar([], banco('a'), 'x')
    expect(p).toHaveLength(1)
    expect(Object.keys(p[0])).toEqual(['estado', 'rotulo'])
  })
})
