import { useId } from 'react'
import { centsToDisplay, centsToNumber, digitsToCents, numberToCents } from '../lib/money'

/**
 * Campo de dinheiro que se formata enquanto a pessoa digita.
 * Ela digita só números; a vírgula e o ponto de milhar aparecem sozinhos.
 */
export function MoneyInput({
  value,
  onChange,
  autoFocus,
  placeholder = '0,00',
  size = 'md',
  label,
}: {
  /** Valor em reais (ex: 1500.5). */
  value: number
  onChange: (value: number) => void
  autoFocus?: boolean
  placeholder?: string
  size?: 'md' | 'lg'
  label?: string
}) {
  const id = useId()
  const display = value ? centsToDisplay(numberToCents(value)) : ''

  const big = size === 'lg'

  return (
    <div className="relative">
      <span
        className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-medium ${
          big ? 'text-base' : 'text-sm'
        } ${value ? 'text-ink-soft' : 'text-ink-faint'}`}
        aria-hidden
      >
        R$
      </span>
      <input
        id={id}
        aria-label={label}
        className={`w-full rounded-xl border border-cream-deep bg-cream py-2.5 pl-11 pr-3.5 text-right tabular-nums text-ink transition-colors placeholder:text-ink-faint focus:border-butterfly-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-butterfly-50 ${
          big ? 'text-lg font-semibold' : 'text-sm'
        }`}
        value={display}
        onChange={(e) => onChange(centsToNumber(digitsToCents(e.target.value)))}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  )
}
