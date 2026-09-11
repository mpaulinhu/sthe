import { describe, expect, it } from 'vitest'
import { digitsToTimeRange } from './timeRange'

describe('digitsToTimeRange', () => {
  it('hora começando em 0-2 espera o segundo dígito', () => {
    expect(digitsToTimeRange('0')).toBe('0')
    expect(digitsToTimeRange('09')).toBe('09')
    expect(digitsToTimeRange('093')).toBe('09:3')
    expect(digitsToTimeRange('0930')).toBe('09:30')
  })

  it('hora começando em 3-9 fecha sozinha, sem esperar 2º dígito', () => {
    // O caso que motivou o ajuste: "930" precisa virar "9:30", não travar
    // esperando um segundo dígito de hora que nunca seria válido (nenhuma
    // hora "9X" cabe em 00-23).
    expect(digitsToTimeRange('9')).toBe('9')
    expect(digitsToTimeRange('930')).toBe('9:30')
    expect(digitsToTimeRange('9301800')).toBe('9:30-18:00')
  })

  it('monta a faixa completa hh:mm-hh:mm', () => {
    expect(digitsToTimeRange('09301')).toBe('09:30-1')
    expect(digitsToTimeRange('0930180')).toBe('09:30-18:0')
    expect(digitsToTimeRange('09301800')).toBe('09:30-18:00')
  })

  it('ignora tudo que não é dígito', () => {
    expect(digitsToTimeRange('09:30-18:00')).toBe('09:30-18:00')
    expect(digitsToTimeRange('09h30')).toBe('09:30')
  })

  it('hora trava em 23, minuto trava em 59', () => {
    // "2" + "9" estouraria 29 > 23 — o "9" é descartado, sobra só a hora "2".
    expect(digitsToTimeRange('29')).toBe('2')
    // Minuto "5" + "9" fica 59, ainda válido.
    expect(digitsToTimeRange('0959')).toBe('09:59')
    // Minuto "5" + "9" de novo mas começando de um dígito que já fecharia (6-9)
    expect(digitsToTimeRange('097')).toBe('09:7')
  })

  it('corta além do 4º bloco (hh:mm-hh:mm completo)', () => {
    expect(digitsToTimeRange('093018001234')).toBe('09:30-18:00')
  })

  it('string vazia fica vazia', () => {
    expect(digitsToTimeRange('')).toBe('')
  })
})
