import { describe, expect, it } from 'vitest'
import { centsToDisplay, centsToNumber, digitsToCents, numberToCents, numberToDisplay } from './money'

describe('digitação ao vivo', () => {
  it('monta o valor da direita para a esquerda, como maquininha', () => {
    const passos = ['1', '15', '150', '1500', '15000']
    const vistos = passos.map((p) => centsToDisplay(digitsToCents(p)))
    expect(vistos).toEqual(['0,01', '0,15', '1,50', '15,00', '150,00'])
  })

  it('coloca ponto de milhar sozinho', () => {
    expect(centsToDisplay(digitsToCents('150000'))).toBe('1.500,00')
    expect(centsToDisplay(digitsToCents('12345678'))).toBe('123.456,78')
  })

  it('ignora o que não é número', () => {
    expect(digitsToCents('R$ 1.500,00')).toBe(150000)
    expect(digitsToCents('abc')).toBe(0)
    expect(digitsToCents('')).toBe(0)
  })

  it('apagar tudo volta para zero', () => {
    expect(centsToDisplay(digitsToCents(''))).toBe('0,00')
  })
})

describe('conversão para salvar e carregar', () => {
  it('centavos viram reais com duas casas', () => {
    expect(centsToNumber(150050)).toBe(1500.5)
    expect(centsToNumber(1)).toBe(0.01)
  })

  it('valor salvo volta formatado para o campo', () => {
    expect(numberToDisplay(1500.5)).toBe('1.500,50')
    expect(numberToDisplay(2000)).toBe('2.000,00')
  })

  it('campo vazio quando o valor é zero', () => {
    expect(numberToDisplay(0)).toBe('')
  })

  it('ida e volta não perde centavo', () => {
    for (const v of [0.01, 0.99, 150.5, 2000, 12345.67]) {
      expect(centsToNumber(numberToCents(v))).toBe(v)
    }
  })

  it('não aceita valor negativo', () => {
    expect(centsToDisplay(-500)).toBe('0,00')
  })
})
