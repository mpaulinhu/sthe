/**
 * Formatação de dinheiro no padrão brasileiro, pensada para digitação ao vivo.
 *
 * A pessoa digita só os números e o valor se monta da direita para a esquerda,
 * como numa maquininha de cartão: 1 → 0,01 · 15 → 0,15 · 150 → 1,50 · 15000 → 150,00.
 * Assim ela nunca precisa se preocupar com vírgula, ponto de milhar ou centavos.
 */

/** Centavos (inteiro) → "1.234,56". Sem o "R$" — o campo já mostra o prefixo. */
export function centsToDisplay(cents: number): string {
  const safe = Math.max(0, Math.round(cents))
  const reais = Math.floor(safe / 100)
  const centavos = safe % 100
  return `${reais.toLocaleString('pt-BR')},${String(centavos).padStart(2, '0')}`
}

/** Extrai só os dígitos do que foi digitado e interpreta como centavos. */
export function digitsToCents(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  // Corta zeros à esquerda para não estourar em digitação longa.
  return Number(digits.slice(0, 12))
}

/** Centavos → número em reais, para salvar no banco (ex: 150050 → 1500.5). */
export function centsToNumber(cents: number): number {
  return Math.round(cents) / 100
}

/** Número em reais → centavos, para carregar um valor já salvo (ex: 1500.5 → 150050). */
export function numberToCents(value: number): number {
  return Math.round((Number(value) || 0) * 100)
}

/** Valor salvo → texto pronto para o input (ex: 1500.5 → "1.500,50"). */
export function numberToDisplay(value: number): string {
  if (!value) return ''
  return centsToDisplay(numberToCents(value))
}
