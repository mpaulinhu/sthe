import type { PaymentMethod, Receipt } from './types'

/**
 * Integridade da cadeia de recibos.
 *
 * O objetivo aqui é probatório, não criptográfico-militar: um recibo eletrônico
 * só vale em disputa se for difícil sustentar que "foi forjado depois". Duas
 * coisas dão essa força:
 *
 *  1. Cada recibo guarda um `hash` do próprio conteúdo — incluindo o hash do
 *     recibo anterior. Alterar um recibo antigo quebra a corrente de todos os
 *     seguintes, e isso é detectável por `verifyChain`. Não impede a edição,
 *     mas impede que ela passe despercebida — que é o que importa.
 *  2. A numeração é sequencial e sem buraco: some um recibo, e o vão aparece.
 *
 * Isso implementa o padrão de "assinatura eletrônica simples" da Lei
 * 14.063/2020 — vale como prova, e o peso dela cresce com a qualidade das
 * evidências associadas (identificação por CPF, data/hora, aceite expresso).
 */

/**
 * SHA-256 do texto, em hexadecimal. Usa a Web Crypto do navegador, que existe
 * em qualquer contexto seguro (https ou localhost).
 */
export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Campos que entram no hash — a "impressão digital" do recibo. */
export interface ReceiptFingerprint {
  numero: number
  personName: string
  personDoc: string
  /** Quem pagou entra no hash: faz parte do que foi assinado. */
  payerName: string
  payerDoc: string
  amount: number
  method: PaymentMethod
  period: string
  signedAt: string
  signature: string
  prevHash: string
}

/**
 * Monta o texto canônico que será hasheado. A ordem dos campos é fixa e
 * explícita de propósito: `JSON.stringify` de um objeto não garante ordem
 * estável entre versões, e um hash que muda sozinho invalidaria a cadeia
 * inteira sem ninguém ter mexido em nada.
 */
export function canonicalText(f: ReceiptFingerprint): string {
  return [
    f.numero,
    f.personName,
    f.personDoc,
    f.payerName,
    f.payerDoc,
    f.amount.toFixed(2),
    f.method,
    f.period,
    f.signedAt,
    // A assinatura é longa; o que importa é que qualquer alteração no traço
    // mude o hash, então entra inteira.
    f.signature,
    f.prevHash,
  ].join('|')
}

export async function hashReceipt(f: ReceiptFingerprint): Promise<string> {
  return sha256(canonicalText(f))
}

/** Hash do recibo anterior, ou a raiz da cadeia se este for o primeiro. */
export const GENESIS = 'genesis'

export function nextNumber(recibos: Receipt[]): number {
  return recibos.reduce((max, r) => Math.max(max, r.numero), 0) + 1
}

export function lastHash(recibos: Receipt[]): string {
  if (recibos.length === 0) return GENESIS
  const ultimo = [...recibos].sort((a, b) => a.numero - b.numero).at(-1)
  return ultimo?.hash ?? GENESIS
}

export type ChainProblem =
  | { tipo: 'hash'; numero: number }
  | { tipo: 'elo'; numero: number }
  | { tipo: 'buraco'; numero: number }

/**
 * Reconfere a cadeia inteira: recalcula o hash de cada recibo, confirma que o
 * elo aponta para o anterior e que não falta número no meio. É o que responde,
 * em uma tela, à pergunta "esses recibos foram mexidos depois de assinados?".
 */
export async function verifyChain(recibos: Receipt[]): Promise<ChainProblem[]> {
  const ordenados = [...recibos].sort((a, b) => a.numero - b.numero)
  const problemas: ChainProblem[] = []
  let anterior = GENESIS

  for (const [i, r] of ordenados.entries()) {
    if (r.numero !== i + 1) problemas.push({ tipo: 'buraco', numero: r.numero })
    if (r.prevHash !== anterior) problemas.push({ tipo: 'elo', numero: r.numero })

    const recalculado = await hashReceipt({
      numero: r.numero,
      personName: r.personName,
      personDoc: r.personDoc,
      payerName: r.payerName,
      payerDoc: r.payerDoc,
      amount: r.amount,
      method: r.method,
      period: r.period,
      signedAt: r.signedAt,
      signature: r.signature,
      prevHash: r.prevHash,
    })
    if (recalculado !== r.hash) problemas.push({ tipo: 'hash', numero: r.numero })

    anterior = r.hash
  }

  return problemas
}

// ---------------------------------------------------------------------------
// Valor por extenso
// ---------------------------------------------------------------------------

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete',
  'dezoito', 'dezenove',
]
const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta',
  'oitenta', 'noventa',
]
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
]

function ateNovecentos(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const partes: string[] = []
  const c = Math.floor(n / 100)
  const resto = n % 100
  if (c > 0) partes.push(CENTENAS[c])
  if (resto > 0) {
    if (resto < 20) partes.push(UNIDADES[resto])
    else {
      const d = Math.floor(resto / 10)
      const u = resto % 10
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d])
    }
  }
  return partes.join(' e ')
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  const milhoes = Math.floor(n / 1_000_000)
  const milhares = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000

  const partes: string[] = []
  if (milhoes > 0) {
    partes.push(`${ateNovecentos(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}`)
  }
  if (milhares > 0) {
    partes.push(milhares === 1 ? 'mil' : `${ateNovecentos(milhares)} mil`)
  }
  if (resto > 0) partes.push(ateNovecentos(resto))

  if (partes.length === 1) return partes[0]

  // "mil e duzentos" (com "e") quando o resto é redondo ou menor que cem;
  // "mil, duzentos e quarenta" (com vírgula) quando ele já tem o próprio "e".
  const ultima = partes.at(-1) as string
  const inicio = partes.slice(0, -1).join(', ')
  const conjuncao = resto > 0 && resto < 100 ? ' e ' : resto % 100 === 0 ? ' e ' : ', '
  return `${inicio}${conjuncao}${ultima}`
}

/**
 * "R$ 1.240,50" → "mil, duzentos e quarenta reais e cinquenta centavos".
 * Recibo sem valor por extenso é frágil: um dígito alterado passa despercebido,
 * e é justamente o que se contesta numa disputa.
 */
export function valorPorExtenso(valor: number): string {
  const inteiro = Math.floor(Math.abs(valor))
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100)

  const reais = `${inteiroPorExtenso(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}`
  if (centavos === 0) return reais

  const cent = `${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`
  return `${reais} e ${cent}`
}

// ---------------------------------------------------------------------------
// CPF
// ---------------------------------------------------------------------------

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, '')
}

/** Máscara viva: 123.456.789-01, formatada conforme digita. */
export function maskCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Máscara viva de CNPJ: 12.345.678/0001-90. */
export function maskCnpj(v: string): string {
  const d = onlyDigits(v).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/**
 * Valida os dígitos verificadores do CNPJ. Mesmo raciocínio do CPF: um número
 * errado identificando quem paga enfraquece o recibo inteiro.
 */
export function isValidCnpj(v: string): boolean {
  const d = onlyDigits(v)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  // Pesos do CNPJ: começam em 5 (e 6 para o segundo dígito) e descem até 2,
  // reiniciando em 9 — é a regra da Receita, não uma sequência arbitrária.
  const digito = (ate: number): number => {
    let peso = ate - 7
    let soma = 0
    for (let i = ate - 1; i >= 0; i--) {
      soma += Number(d[i]) * peso
      peso = peso === 9 ? 2 : peso + 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  return digito(12) === Number(d[12]) && digito(13) === Number(d[13])
}

/** Máscara conforme o tipo de documento de quem paga. */
export function maskDoc(v: string, tipo: 'cnpj' | 'cpf'): string {
  return tipo === 'cnpj' ? maskCnpj(v) : maskCpf(v)
}

export function isValidDoc(v: string, tipo: 'cnpj' | 'cpf'): boolean {
  return tipo === 'cnpj' ? isValidCnpj(v) : isValidCpf(v)
}

/**
 * Valida os dois dígitos verificadores. Um CPF digitado errado no recibo
 * enfraquece exatamente aquilo que ele deveria provar — quem assinou.
 */
export function isValidCpf(v: string): boolean {
  const d = onlyDigits(v)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false

  const digito = (ate: number): number => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}
