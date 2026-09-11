import { describe, expect, it } from 'vitest'
import {
  GENESIS,
  hashReceipt,
  isValidCnpj,
  isValidCpf,
  isValidDoc,
  lastHash,
  maskCnpj,
  maskCpf,
  maskDoc,
  nextNumber,
  valorPorExtenso,
  verifyChain,
} from './receipt'
import type { Receipt } from './types'

describe('valor por extenso', () => {
  it.each([
    [1, 'um real'],
    [2, 'dois reais'],
    [15, 'quinze reais'],
    [100, 'cem reais'],
    [130, 'cento e trinta reais'],
    [1000, 'mil reais'],
    [1200, 'mil e duzentos reais'],
    [1240, 'mil, duzentos e quarenta reais'],
    [2500, 'dois mil e quinhentos reais'],
  ])('%s → %s', (valor, esperado) => {
    expect(valorPorExtenso(valor)).toBe(esperado)
  })

  it('escreve os centavos', () => {
    expect(valorPorExtenso(1240.5)).toBe('mil, duzentos e quarenta reais e cinquenta centavos')
    expect(valorPorExtenso(0.01)).toBe('zero reais e um centavo')
  })

  it('não perde centavo por arredondamento de ponto flutuante', () => {
    // 0.1 + 0.2 = 0.30000000000000004 — sem arredondar, viraria "zero centavos".
    expect(valorPorExtenso(1929.7)).toContain('setenta centavos')
  })
})

describe('CPF', () => {
  it('formata conforme digita', () => {
    expect(maskCpf('123')).toBe('123')
    expect(maskCpf('1234')).toBe('123.4')
    expect(maskCpf('1234567')).toBe('123.456.7')
    expect(maskCpf('12345678901')).toBe('123.456.789-01')
  })

  it('ignora o que passar de 11 dígitos', () => {
    expect(maskCpf('123456789012345')).toBe('123.456.789-01')
  })

  it('valida os dígitos verificadores', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('529.982.247-26')).toBe(false)
  })

  it('rejeita sequência repetida, que passa na conta mas não existe', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })
})

describe('CNPJ', () => {
  it('formata conforme digita', () => {
    expect(maskCnpj('11')).toBe('11')
    expect(maskCnpj('11222')).toBe('11.222')
    expect(maskCnpj('11222333')).toBe('11.222.333')
    expect(maskCnpj('112223330001')).toBe('11.222.333/0001')
    expect(maskCnpj('11222333000175')).toBe('11.222.333/0001-75')
  })

  it('valida os dígitos verificadores', () => {
    expect(isValidCnpj('11.222.333/0001-75')).toBe(true)
    expect(isValidCnpj('11.222.333/0001-76')).toBe(false)
  })

  it('rejeita sequência repetida e tamanho errado', () => {
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false)
    expect(isValidCnpj('11222333')).toBe(false)
  })

  it('maskDoc e isValidDoc despacham pelo tipo', () => {
    expect(maskDoc('11222333000175', 'cnpj')).toBe('11.222.333/0001-75')
    expect(maskDoc('52998224725', 'cpf')).toBe('529.982.247-25')
    expect(isValidDoc('11222333000175', 'cnpj')).toBe(true)
    expect(isValidDoc('11222333000175', 'cpf')).toBe(false)
  })
})

// ---------------------------------------------------------------------------

const BASE = {
  numero: 1,
  personName: 'Ana Paula',
  personDoc: '52998224725',
  payerName: 'Sthéfany Modas Ltda',
  payerDoc: '11222333000175',
  payerDocType: 'cnpj' as const,
  amount: 1240,
  method: 'Pix' as const,
  period: '2026-09',
  signedAt: '2026-09-10T14:32:00.000Z',
  signature: 'data:image/png;base64,AAAA',
  prevHash: GENESIS,
}

async function recibo(over: Partial<Receipt> & { numero: number; prevHash: string }): Promise<Receipt> {
  const campos = { ...BASE, ...over }
  const hash = await hashReceipt(campos)
  return {
    id: `r${campos.numero}`,
    personId: 'p1',
    entryIds: [],
    amountText: 'mil, duzentos e quarenta reais',
    termo: 'Declaro ter recebido…',
    ...campos,
    hash,
  }
}

describe('cadeia de recibos', () => {
  it('numera em sequência, sem buraco', () => {
    expect(nextNumber([])).toBe(1)
    expect(nextNumber([{ numero: 1 }, { numero: 2 }] as Receipt[])).toBe(3)
  })

  it('o primeiro recibo se ancora na raiz', () => {
    expect(lastHash([])).toBe(GENESIS)
  })

  it('uma cadeia intacta não acusa problema', async () => {
    const r1 = await recibo({ numero: 1, prevHash: GENESIS })
    const r2 = await recibo({ numero: 2, prevHash: r1.hash, amount: 800 })
    expect(await verifyChain([r1, r2])).toEqual([])
  })

  it('detecta valor adulterado depois de assinado', async () => {
    const r1 = await recibo({ numero: 1, prevHash: GENESIS })
    // Alguém abre o backup e troca 1240 por 240, mantendo o hash antigo.
    const forjado = { ...r1, amount: 240 }
    const problemas = await verifyChain([forjado])
    expect(problemas).toContainEqual({ tipo: 'hash', numero: 1 })
  })

  it('adulterar um recibo antigo quebra o elo dos seguintes', async () => {
    const r1 = await recibo({ numero: 1, prevHash: GENESIS })
    const r2 = await recibo({ numero: 2, prevHash: r1.hash })

    // Reemite o r1 com outro valor e um hash coerente — mas o r2 ainda aponta
    // para o hash antigo, e é isso que denuncia a troca.
    const r1Refeito = await recibo({ numero: 1, prevHash: GENESIS, amount: 240 })
    const problemas = await verifyChain([r1Refeito, r2])
    expect(problemas).toContainEqual({ tipo: 'elo', numero: 2 })
  })

  it('detecta recibo removido do meio', async () => {
    const r1 = await recibo({ numero: 1, prevHash: GENESIS })
    const r2 = await recibo({ numero: 2, prevHash: r1.hash })
    const r3 = await recibo({ numero: 3, prevHash: r2.hash })

    const problemas = await verifyChain([r1, r3])
    expect(problemas.some((p) => p.tipo === 'buraco')).toBe(true)
  })

  it('a assinatura entra no hash — trocar o traço é detectado', async () => {
    const r1 = await recibo({ numero: 1, prevHash: GENESIS })
    const outraAssinatura = { ...r1, signature: 'data:image/png;base64,ZZZZ' }
    expect(await verifyChain([outraAssinatura])).toContainEqual({ tipo: 'hash', numero: 1 })
  })

  it('quem pagou entra no hash — trocar o pagador é detectado', async () => {
    const r1 = await recibo({ numero: 1, prevHash: GENESIS })
    // Reatribuir o pagamento a outra empresa depois de assinado mudaria a quem
    // a quitação foi dada — tem que quebrar o hash como qualquer outro campo.
    const outroPagador = { ...r1, payerName: 'Outra Empresa Ltda' }
    expect(await verifyChain([outroPagador])).toContainEqual({ tipo: 'hash', numero: 1 })

    const outroCnpj = { ...r1, payerDoc: '11444777000192' }
    expect(await verifyChain([outroCnpj])).toContainEqual({ tipo: 'hash', numero: 1 })
  })
})
