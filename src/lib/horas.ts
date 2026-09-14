import { DEFAULT_MONTHLY_HOURS } from './types'

/**
 * Horas extras.
 *
 * A conta é a da folha: o salário dividido pelas horas do mês dá o valor da
 * hora normal, o percentual acrescenta o adicional, e o total é isso vezes o
 * tempo trabalhado a mais.
 *
 * Tudo aqui trabalha em MINUTOS. Hora extra raramente é redonda — "uma hora e
 * quarenta" é o caso comum, não a exceção —, e guardar 1,6667 h introduziria
 * um arredondamento a cada passo. Minutos são inteiros e exatos; o
 * arredondamento acontece uma vez só, no fim, sobre o dinheiro.
 */

/** Percentuais que viram atalho na tela. O resto vai no campo livre. */
export const PERCENTUAIS_COMUNS = [50, 100, 200] as const

/** O que cada percentual costuma significar — vira dica na interface. */
export const MOTIVO_PERCENTUAL: Record<number, string> = {
  50: 'dia comum',
  100: 'domingo ou feriado',
  200: 'dobro',
}

export interface ValorHoraExtra {
  /** Valor de uma hora normal de trabalho. */
  hora: number
  /** Valor de uma hora já com o adicional aplicado. */
  horaComAdicional: number
  /** Minutos trabalhados a mais. */
  minutos: number
  /** O total a pagar, arredondado ao centavo. */
  total: number
  /** O percentual usado, ecoado para a tela poder explicar a conta. */
  percentual: number
  /** As horas do mês usadas como divisor. */
  horasMes: number
}

/**
 * Quanto pagar por um tempo extra.
 *
 * `minutos` aceita qualquer valor — 90 é uma hora e meia, 25 é vinte e cinco
 * minutos. `percentual` é o adicional sobre a hora normal: 50 significa uma
 * vez e meia, 100 significa o dobro.
 */
export function calcularHoraExtra(
  salario: number,
  minutos: number,
  percentual: number,
  horasMes: number = DEFAULT_MONTHLY_HOURS,
): ValorHoraExtra {
  // Divisor zero ou negativo viria de configuração inválida; cair no padrão é
  // melhor que devolver Infinity e pagar um valor absurdo.
  const divisor = horasMes > 0 ? horasMes : DEFAULT_MONTHLY_HOURS

  const hora = salario / divisor
  const horaComAdicional = hora * (1 + percentual / 100)
  const minutosValidos = Math.max(0, minutos)
  const total = (horaComAdicional / 60) * minutosValidos

  return {
    hora,
    horaComAdicional,
    minutos: minutosValidos,
    // Arredonda só aqui: no meio da conta, cada arredondamento viraria
    // centavos perdidos que não fecham com a conferência à mão.
    total: Math.round(total * 100) / 100,
    percentual,
    horasMes: divisor,
  }
}

/** 90 → "1h30". Formato curto, para caber na linha da lista. */
export function formatarMinutos(minutos: number): string {
  const h = Math.floor(Math.abs(minutos) / 60)
  const m = Math.abs(minutos) % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/** 90 → "1 hora e 30 minutos". Por extenso, para o recibo. */
export function minutosPorExtenso(minutos: number): string {
  const h = Math.floor(Math.abs(minutos) / 60)
  const m = Math.abs(minutos) % 60
  const partes: string[] = []
  if (h > 0) partes.push(`${h} ${h === 1 ? 'hora' : 'horas'}`)
  if (m > 0) partes.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`)
  if (partes.length === 0) return '0 minutos'
  return partes.join(' e ')
}

/**
 * Lê o tempo digitado e devolve minutos.
 *
 * Aceita as formas que alguém usaria naturalmente: "1:30", "1h30", "90",
 * "1,5". O número solto é lido como HORAS, não minutos — quem digita "2"
 * querendo dizer duas horas é o caso comum; quem quer 2 minutos escreve
 * "0:02".
 *
 * Devolve `null` quando não dá para entender, em vez de chutar zero: um
 * zero silencioso viraria hora extra não paga.
 */
export function lerTempo(texto: string): number | null {
  const limpo = texto.trim().toLowerCase().replace(/\s/g, '')
  if (!limpo) return null

  // "1:30" ou "1h30" — horas e minutos separados.
  const separado = limpo.match(/^(\d{1,3})[:h](\d{1,2})?$/)
  if (separado) {
    const h = Number(separado[1])
    const m = Number(separado[2] ?? 0)
    if (m > 59) return null
    return h * 60 + m
  }

  // "1,5" ou "1.5" — horas decimais.
  const decimal = limpo.match(/^(\d{1,3})[.,](\d{1,2})$/)
  if (decimal) {
    const horas = Number(`${decimal[1]}.${decimal[2]}`)
    return Math.round(horas * 60)
  }

  // "2" — horas inteiras.
  const inteiro = limpo.match(/^(\d{1,3})$/)
  if (inteiro) return Number(inteiro[1]) * 60

  return null
}
