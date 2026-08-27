import { centsToDisplay, digitsToCents } from '../lib/money'

/**
 * Campo de dinheiro com máscara ao vivo: a pessoa digita só dígitos e o valor
 * se monta da direita para a esquerda, como maquininha. O estado guarda
 * **centavos inteiros** — a conversão vive em `lib/money.ts`.
 */
export function MoneyInput({
  cents,
  onChange,
  autoFocus,
  label,
  variant = 'field',
}: {
  cents: number
  onChange: (cents: number) => void
  autoFocus?: boolean
  label?: string
  /** 'display' é o campo grande do sheet; 'field' é o inline do cadastro. */
  variant?: 'display' | 'field'
}) {
  const text = cents ? centsToDisplay(cents) : ''

  if (variant === 'display') {
    return (
      <div className="flex items-baseline gap-2.5 rounded-[14px] border border-cream-deep bg-cream px-[18px] py-4 transition-colors focus-within:border-butterfly-200 focus-within:bg-white">
        <span className="text-[19px] font-medium text-ink-faint">R$</span>
        <input
          aria-label={label}
          value={text}
          onChange={(e) => onChange(digitsToCents(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0,00"
          autoFocus={autoFocus}
          className="min-w-0 flex-1 border-0 bg-transparent text-[30px] font-semibold tracking-[-0.02em] tabular-nums outline-none"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-[11px] border border-cream-deep bg-cream px-[13px] py-[11px] transition-colors focus-within:border-butterfly-200 focus-within:bg-white">
      <span className="text-[13.5px] text-ink-faint">R$</span>
      <input
        aria-label={label}
        value={text}
        onChange={(e) => onChange(digitsToCents(e.target.value))}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        autoFocus={autoFocus}
        className="min-w-0 flex-1 border-0 bg-transparent text-[15px] tabular-nums outline-none"
      />
    </div>
  )
}
