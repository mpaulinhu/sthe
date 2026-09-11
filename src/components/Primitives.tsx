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
    primary: 'bg-ink text-cream hover:bg-ink-soft',
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
    <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <ButterflyMark className="h-10 w-10 opacity-30" />
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>
      {action}
    </div>
  )
}

/**
 * A borboleta da marca, redesenhada a partir da logo da cliente: asas em
 * degradê (a de cima maior e mais aberta, a de baixo em gota), corpo fino e
 * antenas curvas. O gradiente recebe um id único por instância — dois SVGs na
 * mesma página não podem disputar o mesmo `id`.
 */
let markSeq = 0

export function ButterflyMark({ className = 'h-7 w-7' }: { className?: string }) {
  const gid = `bfly-${(markSeq = (markSeq + 1) % 1e6)}`

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id={gid} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b9ad9" />
          <stop offset="0.55" stopColor="#2c6fb5" />
          <stop offset="1" stopColor="#143a66" />
        </linearGradient>
      </defs>

      {/* Asas de perfil, como na logo: o par esquerdo aberto e maior, o direito
          recuado — dá a inclinação de bicho pousado em vez de brasão simétrico.
          Todas as asas nascem no eixo do corpo (x≈24), sem folga flutuando. */}
      <path
        d="M23.4 22.2C20.3 15.8 15.6 10.4 10.8 8.6 7.3 7.3 4.9 9 5.4 12.6c.7 4.7 5.4 9.6 11.4 11.9 2.5 1 4.8 1.5 6.6 1.6Z"
        fill={`url(#${gid})`}
      />
      <path
        d="M23.6 25.4c-1.6 5.4-4.7 9.9-8.3 11-2.6.8-4.4-.7-4.1-3.5.4-3.6 4-7.4 9-9.2 1.5-.6 2.7-.9 3.6-.9Z"
        fill={`url(#${gid})`}
        opacity="0.78"
      />
      <path
        d="M24.6 22.4c2.9-6 7.1-11 11.4-12.7 3.1-1.2 5.3.3 4.9 3.6-.6 4.3-4.8 8.8-10.2 10.9-2.2.9-4.3 1.4-5.9 1.5Z"
        fill={`url(#${gid})`}
        opacity="0.88"
      />
      <path
        d="M24.5 25.5c1.5 4.9 4.2 9 7.5 10 2.4.7 4-.6 3.7-3.2-.4-3.3-3.6-6.8-8.1-8.4-1.3-.5-2.3-.7-3.1-.7Z"
        fill={`url(#${gid})`}
        opacity="0.66"
      />

      {/* Corpo: fuso fino que afina até a ponta. */}
      <path
        d="M24 17.8c.8 0 1.3.85 1.3 2.3 0 2.9-.5 7.2-1.3 10.9-.8-3.7-1.3-8-1.3-10.9 0-1.45.5-2.3 1.3-2.3Z"
        fill="#143a66"
      />
      {/* Antenas: finas, abrindo para fora, com a bolinha na ponta. */}
      <path
        d="M23.4 18.4c-1.6-2.3-3.6-3.9-5.8-4.6M24.6 18.4c1.5-2.4 3.4-4.1 5.6-5"
        stroke="#143a66"
        strokeWidth="0.95"
        strokeLinecap="round"
      />
      <circle cx="17.3" cy="13.6" r="0.95" fill="#143a66" />
      <circle cx="30.5" cy="13.2" r="0.95" fill="#143a66" />
    </svg>
  )
}
