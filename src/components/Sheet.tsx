import { useEffect, type ReactNode } from 'react'

/**
 * Painel lateral. No desktop entra pela direita (428px); no celular vira um
 * bottom sheet de largura total, como pede o handoff.
 */
export function Sheet({
  title,
  subtitle,
  footer,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  footer: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-stretch sm:justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(26,29,33,0.28)] [animation:fadeIn_.18s_ease]"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-[-24px_0_60px_-30px_rgba(26,29,33,0.4)] [animation:sheetIn_.22s_cubic-bezier(.2,.7,.3,1)] sm:h-full sm:max-h-none sm:w-[428px] sm:rounded-none"
      >
        <header className="flex items-start gap-3 border-b border-cream-deep px-6 pb-[18px] pt-[22px]">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[22px] font-semibold tracking-[0.01em]">{title}</h2>
            {subtitle ? <p className="mt-1 text-[13px] text-ink-faint">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex rounded-[9px] p-[7px] text-ink-faint transition-colors hover:bg-cream-deep hover:text-ink"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-[15px] w-[15px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-[26px] pt-[22px]">
          {children}
        </div>

        <footer className="flex items-center gap-2.5 border-t border-cream-deep bg-surface-sunken px-6 py-4">
          {footer}
        </footer>
      </div>
    </div>
  )
}

/** Campo de texto padrão do sheet. */
export const fieldClass =
  'w-full rounded-[11px] border border-cream-deep bg-cream px-[13px] py-[11px] text-[14.5px] outline-none transition-colors focus:border-butterfly-200 focus:bg-white'

export function Label({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return (
    <span className="text-[13.5px] font-medium">
      {children}
      {optional ? <span className="font-normal text-ink-dim"> · opcional</span> : null}
    </span>
  )
}

/** Trilho de opções mutuamente exclusivas (Como ela recebe / Como pagou). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'md' | 'sm'
}) {
  return (
    <div className="flex gap-1.5 rounded-xl border border-cream-deep bg-cream p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`flex-1 rounded-[9px] py-[9px] font-medium transition-colors ${
            size === 'sm' ? 'px-1 text-[12.5px]' : 'px-1.5 text-[13px]'
          } ${value === o.id ? 'bg-white text-ink' : 'text-ink-faint hover:text-ink-soft'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
