/**
 * Máscara de horário ao vivo para o campo "Horário" da Agenda: uma faixa
 * completa "09:00-18:30" (hora de início e de fim, cada uma com minuto).
 *
 * Funciona como o teclado da maquininha, bloco por bloco (hora, minuto, hora,
 * minuto), cada um fechando sozinho assim que fica claro que nenhum dígito a
 * mais caberia:
 *  - Hora: 1 dígito de 3 a 9 fecha na hora ("9" → hora 9h, não dá pra virar
 *    "9X" válido). Começando com 0/1/2, espera o segundo dígito (00-23).
 *  - Minuto: mesma regra, mas o teto é 59 — 1 dígito de 6 a 9 fecha sozinho.
 * Isso é o que permite digitar "930" e já sair "9:30" em vez de travar
 * esperando um segundo dígito que nunca viria.
 */
interface Block {
  digits: string
  /** true assim que o bloco não aceita mais dígito. */
  done: boolean
}

/** Decide se um bloco de 1 dígito já fecha sozinho, dado o teto (23 ou 59). */
function closesAlone(firstDigit: string, max: number): boolean {
  // Só existe segundo dígito válido se o número formado por "firstDigit + 0..9"
  // puder ficar <= max para algum dígito — ou seja, firstDigit*10 <= max.
  return Number(firstDigit) * 10 > max
}

function pushDigit(block: Block, digit: string, max: number): Block {
  if (block.done) return block
  const digits = block.digits + digit

  if (digits.length === 1) {
    return closesAlone(digits, max) ? { digits, done: true } : { digits, done: false }
  }
  // Segundo dígito: sempre fecha o bloco. Se estourasse o teto, o dígito é
  // descartado e o bloco fecha só com o primeiro (ex.: "2" + "9" → fica "2").
  const proposto = Number(digits) > max ? block.digits : digits
  return { digits: proposto, done: true }
}

export function digitsToTimeRange(raw: string): string {
  const clean = raw.replace(/\D/g, '')

  const hIni: Block = { digits: '', done: false }
  const mIni: Block = { digits: '', done: false }
  const hFim: Block = { digits: '', done: false }
  const mFim: Block = { digits: '', done: false }
  const sequence: [Block, number][] = [
    [hIni, 23],
    [mIni, 59],
    [hFim, 23],
    [mFim, 59],
  ]

  let i = 0
  for (const d of clean) {
    while (i < 4 && sequence[i][0].done) i++
    if (i >= 4) break
    const [block, max] = sequence[i]
    sequence[i][0] = pushDigit(block, d, max)
  }

  const [hI, mI, hF, mF] = sequence.map(([b]) => b.digits)

  let out = hI
  if (mI) out += `:${mI}`
  if (hF) out += `-${hF}`
  if (mF) out += `:${mF}`
  return out
}
