import { describe, expect, it } from 'vitest'
import { calcularHoraExtra, formatarMinutos, lerTempo, minutosPorExtenso } from './horas'

describe('calcularHoraExtra', () => {
  it('divide o salário pelas horas do mês', () => {
    // R$ 2.200 em 220h dá uma hora redonda de R$ 10 — o exemplo de holerite.
    const r = calcularHoraExtra(2200, 60, 0, 220)
    expect(r.hora).toBe(10)
    expect(r.total).toBe(10)
  })

  it('aplica o adicional de 50%', () => {
    const r = calcularHoraExtra(2200, 60, 50, 220)
    expect(r.horaComAdicional).toBe(15)
    expect(r.total).toBe(15)
  })

  it('100% é o dobro da hora normal', () => {
    const r = calcularHoraExtra(2200, 60, 100, 220)
    expect(r.horaComAdicional).toBe(20)
  })

  it('200% é o triplo — o adicional soma sobre a hora, não substitui', () => {
    // 200% de adicional = hora + 2× hora = 3× hora. Confundir isso com
    // "duas vezes" pagaria a menos.
    const r = calcularHoraExtra(2200, 60, 200, 220)
    expect(r.horaComAdicional).toBe(30)
  })

  it('conta minutos, não só horas inteiras', () => {
    // 30 minutos a 50% sobre hora de R$ 10 = metade de R$ 15.
    const r = calcularHoraExtra(2200, 30, 50, 220)
    expect(r.total).toBe(7.5)
  })

  it('minuto avulso não é perdido', () => {
    // Um minuto a 100% sobre hora de R$ 10: R$ 20/60 = R$ 0,33.
    const r = calcularHoraExtra(2200, 1, 100, 220)
    expect(r.total).toBe(0.33)
  })

  it('respeita a jornada de 200h', () => {
    // Mesma pessoa, jornada menor: a hora vale mais.
    const r = calcularHoraExtra(2200, 60, 0, 200)
    expect(r.hora).toBe(11)
  })

  it('divisor inválido cai no padrão em vez de estourar', () => {
    // Configuração zerada devolveria Infinity e pagaria um valor absurdo.
    expect(calcularHoraExtra(2200, 60, 0, 0).horasMes).toBe(220)
    expect(calcularHoraExtra(2200, 60, 0, -5).total).toBe(10)
  })

  it('minutos negativos viram zero, nunca desconto', () => {
    expect(calcularHoraExtra(2200, -60, 50, 220).total).toBe(0)
  })

  it('arredonda uma vez só, no fim', () => {
    // Salário quebrado: arredondar a hora primeiro daria outro total, e a
    // diferença é o que não fecha numa conferência à mão.
    const r = calcularHoraExtra(3333.33, 100, 50, 220)
    // 3333.33/220 = 15.1515… → ×1.5 = 22.7272… → /60×100 = 37.8787…
    expect(r.total).toBe(37.88)
  })
})

describe('lerTempo', () => {
  it('número solto é lido como horas', () => {
    // Quem digita "2" quer dizer duas horas, não dois minutos.
    expect(lerTempo('2')).toBe(120)
  })

  it('aceita hora:minuto', () => {
    expect(lerTempo('1:30')).toBe(90)
    expect(lerTempo('0:25')).toBe(25)
  })

  it('aceita o formato com h', () => {
    expect(lerTempo('1h30')).toBe(90)
    expect(lerTempo('2h')).toBe(120)
  })

  it('aceita horas decimais, com vírgula ou ponto', () => {
    expect(lerTempo('1,5')).toBe(90)
    expect(lerTempo('1.5')).toBe(90)
    expect(lerTempo('0,25')).toBe(15)
  })

  it('ignora espaços e maiúsculas', () => {
    expect(lerTempo(' 1H30 ')).toBe(90)
  })

  it('devolve null no que não dá para entender', () => {
    // Zero silencioso viraria hora extra não paga.
    expect(lerTempo('')).toBeNull()
    expect(lerTempo('abc')).toBeNull()
    expect(lerTempo('1:99')).toBeNull()
  })
})

describe('formatarMinutos', () => {
  it('mostra horas e minutos', () => {
    expect(formatarMinutos(90)).toBe('1h30')
    expect(formatarMinutos(120)).toBe('2h')
    expect(formatarMinutos(45)).toBe('45min')
  })

  it('preenche o minuto com zero à esquerda', () => {
    // "1h5" seria lido como uma hora e cinquenta.
    expect(formatarMinutos(65)).toBe('1h05')
  })
})

describe('minutosPorExtenso', () => {
  it('escreve por extenso para o recibo', () => {
    expect(minutosPorExtenso(90)).toBe('1 hora e 30 minutos')
    expect(minutosPorExtenso(120)).toBe('2 horas')
    expect(minutosPorExtenso(1)).toBe('1 minuto')
  })

  it('não devolve vazio quando não há tempo', () => {
    expect(minutosPorExtenso(0)).toBe('0 minutos')
  })
})
