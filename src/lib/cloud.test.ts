import { describe, expect, it } from 'vitest'
import { semUndefined } from './cloud'

/**
 * O Firestore recusa `undefined` em qualquer campo, e o banco do app é cheio
 * de opcionais. Um único `photo: undefined` derrubava a gravação inteira —
 * silenciosamente, porque o erro só aparecia no console.
 */
describe('semUndefined', () => {
  it('remove a chave com undefined em vez de mandar o valor', () => {
    const limpo = semUndefined({ nome: 'Ana', photo: undefined })
    expect(limpo).toEqual({ nome: 'Ana' })
    expect('photo' in limpo).toBe(false)
  })

  it('limpa dentro de listas — é onde as pessoas e lançamentos vivem', () => {
    const limpo = semUndefined({
      itens: [
        { id: '1', nome: 'Ana', method: undefined },
        { id: '2', nome: 'Bia', method: 'Pix' },
      ],
    })

    expect(limpo.itens[0]).toEqual({ id: '1', nome: 'Ana' })
    expect(limpo.itens[1]).toEqual({ id: '2', nome: 'Bia', method: 'Pix' })
  })

  it('preserva o que é valor de verdade, inclusive falsy', () => {
    const limpo = semUndefined({ zero: 0, vazio: '', falso: false, nulo: null })
    expect(limpo).toEqual({ zero: 0, vazio: '', falso: false, nulo: null })
  })

  it('não achata objeto aninhado', () => {
    const limpo = semUndefined({ company: { name: 'Sthé', doc: undefined, workDays: [1, 2] } })
    expect(limpo).toEqual({ company: { name: 'Sthé', workDays: [1, 2] } })
  })
})
