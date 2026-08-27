import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-cream-deep bg-white shadow-[0_1px_2px_rgba(26,29,33,0.04),0_8px_24px_-16px_rgba(26,29,33,0.18)] ${className}`}>
      {children}
    </div>
  )
}

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger'
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
  title?: string
}

export function Button({
  children,
  onClick,
  variant = 'quiet',
  type = 'button',
  className = '',
  disabled,
  title,
}: ButtonProps) {
  const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-butterfly-500 text-white hover:bg-butterfly-600 shadow-[0_1px_2px_rgba(27,79,138,0.3)]',
    ghost:
      'bg-butterfly-50 text-butterfly-600 hover:bg-butterfly-100 border border-butterfly-100',
    quiet: 'bg-white text-ink-soft hover:bg-cream border border-cream-deep hover:text-ink',
    danger: 'bg-white text-late hover:bg-late-soft border border-cream-deep',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butterfly-500 disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-snug text-ink-faint">{hint}</span> : null}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-cream-deep bg-cream px-3.5 py-2.5 text-sm text-ink transition-colors placeholder:text-ink-faint focus:border-butterfly-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-butterfly-50'

export function StatusPill({ status }: { status: 'pago' | 'pendente' | 'atrasado' }) {
  const map = {
    pago: { text: 'Pago', cls: 'bg-paid-soft text-paid' },
    pendente: { text: 'A pagar', cls: 'bg-due-soft text-due' },
    atrasado: { text: 'Atrasado', cls: 'bg-late-soft text-late' },
  }
  const { text, cls } = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {text}
    </span>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <ButterflyMark className="h-10 w-10 opacity-30" />
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>
      {action}
    </div>
  )
}

export function ButterflyMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <path
        d="M24 30c-2.5 5-7.5 9-13 9-4 0-7-2.5-7-6.5 0-6 5-10.5 11-13.5C20 17 23 15 24 12c1 3 4 5 9 7 6 3 11 7.5 11 13.5 0 4-3 6.5-7 6.5-5.5 0-10.5-4-13-9Z"
        fill="currentColor"
        className="text-butterfly-500"
      />
      <path
        d="M24 12v22"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="text-butterfly-700"
      />
      <path
        d="M23 12c-1-3-3-5-5.5-6M25 12c1-3 3-5 5.5-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="text-butterfly-700"
      />
    </svg>
  )
}
