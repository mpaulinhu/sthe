import { describe, expect, it } from 'vitest'
import { montarTermo } from '../components/SignSheet'
import type { Company } from './types'
import type { Proporcional } from './calc'

/**
 * O termo é o texto do recibo — o que a pessoa lê antes de assinar e o que
 * um terceiro leria numa conferência. Cada afirmação dele precisa ser
 * verdadeira, e é isso que estes testes travam.
 */

const EMPRESA: Company = {
  name: 'Sthe Modas Ltda',
  doc: '11222333000181',
  docType: 'cnpj',
  tradeName: '',
  address: '',
  workDays: [1, 2, 3, 4, 5],
}

const prop = (over: Partial<Proporcional> = {}): Proporcional => ({
  dias: 16,
  base: 30,
  valor: 1066.67,
  motivo: 'admissao',
  ...over,
})

function termo(valor: number, quita: boolean, saldo: number, p?: Proporcional | null) {
  // `formatMoney` usa espaço não-quebrável entre "R$" e o número (é o que o
  // Intl produz em pt-BR). Normalizar aqui deixa os testes legíveis sem
  // esconder o formato real.
  return montarTermo(
    'Ana Silva',
    '11144477735',
    valor,
    'Pix',
    '2026-10',
    EMPRESA,
    quita,
    saldo,
    p,
  ).replace(/ /g, ' ')
}

describe('montarTermo — identificação das partes', () => {
  it('nomeia quem recebe, com CPF formatado', () => {
    const t = termo(2000, true, 0)
    expect(t).toContain('Eu, Ana Silva, inscrita(o) no CPF nº 111.444.777-35')
  })

  it('nomeia quem paga, com o documento', () => {
    const t = termo(2000, true, 0)
    expect(t).toContain('de Sthe Modas Ltda')
    expect(t).toContain('CNPJ nº 11.222.333/0001-81')
  })

  it('traz o valor por extenso — um dígito alterado não passa despercebido', () => {
    const t = termo(2000, true, 0)
    expect(t).toContain('R$ 2.000,00')
    expect(t).toContain('dois mil reais')
  })
})

describe('montarTermo — quitação', () => {
  it('pagamento que fecha o mês dá quitação plena', () => {
    expect(termo(2000, true, 0)).toContain('plena e geral quitação')
  })

  it('vale NÃO dá quitação plena e declara o saldo em aberto', () => {
    // Dizer "plena e geral quitação" num adiantamento é falso, e é o que
    // derrubaria o recibo se ele fosse contestado.
    const t = termo(800, false, 1200)
    expect(t).not.toContain('plena e geral quitação')
    expect(t).toContain('a título de adiantamento')
    expect(t).toContain('R$ 1.200,00')
  })
})

describe('montarTermo — proporcional', () => {
  it('declara a base de cálculo quando o valor é proporcional', () => {
    // Sem isto, um recibo de R$ 1.066,67 para quem ganha R$ 2.000 levanta
    // dúvida em qualquer conferência futura.
    const t = termo(1066.67, true, 0, prop())
    expect(t).toContain('16 (dezesseis) dias')
    expect(t).toContain('mês comercial de 30 dias')
    expect(t).toContain('início do vínculo')
  })

  it('diz o motivo certo na saída', () => {
    const t = termo(1000, true, 0, prop({ motivo: 'saida', dias: 15, valor: 1000 }))
    expect(t).toContain('encerramento do vínculo')
    expect(t).not.toContain('início do vínculo')
  })

  it('cobre entrada e saída no mesmo mês', () => {
    const t = termo(500, true, 0, prop({ motivo: 'ambos' }))
    expect(t).toContain('início e do encerramento do vínculo')
  })

  it('mês cheio não menciona proporcionalidade', () => {
    const t = termo(2000, true, 0, null)
    expect(t).not.toContain('proporcional')
    expect(t).not.toContain('mês comercial')
  })

  it('o número de dias vai por extenso, como o valor', () => {
    expect(termo(1, true, 0, prop({ dias: 1 }))).toContain('1 (um) dias')
    expect(termo(1, true, 0, prop({ dias: 21 }))).toContain('21 (vinte e um) dias')
  })
})

describe('montarTermo — validade da assinatura eletrônica', () => {
  it('cita a lei que dá valor ao aceite eletrônico', () => {
    expect(termo(2000, true, 0)).toContain('Lei nº 14.063/2020')
  })

  it('declara que a assinatura é de próprio punho e consciente', () => {
    const t = termo(2000, true, 0)
    expect(t).toContain('de meu próprio punho')
    expect(t).toContain('livre e consciente')
  })
})
