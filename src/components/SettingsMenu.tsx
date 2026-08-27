import { useEffect, useRef, useState } from 'react'

/**
 * Menu discreto no canto do cabeçalho. Guarda as ações que ela quase nunca usa
 * (backup, restaurar) para que a tela principal fique só com o que importa.
 */
export function SettingsMenu({
  onExport,
  onImport,
  onOpenHistory,
}: {
  onExport: () => void
  onImport: () => void
  onOpenHistory: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item =
    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-cream hover:text-ink'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Mais opções"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          open ? 'bg-cream-deep text-ink' : 'text-ink-faint hover:bg-cream hover:text-ink'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
          <circle cx="10" cy="4" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="10" cy="16" r="1.6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-2xl border border-cream-deep bg-white py-1.5 shadow-[0_4px_12px_-4px_rgba(26,29,33,0.12),0_16px_40px_-16px_rgba(26,29,33,0.25)]"
        >
          <button
            className={item}
            role="menuitem"
            onClick={() => {
              onOpenHistory()
              setOpen(false)
            }}
          >
            <Icon path="M3 10a7 7 0 1 0 2-4.9M3 3v3h3" />
            Resumo dos meses
          </button>

          <div className="my-1.5 border-t border-cream-deep" />

          <p className="px-4 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Cópia de segurança
          </p>
          <button
            className={item}
            role="menuitem"
            onClick={() => {
              onExport()
              setOpen(false)
            }}
          >
            <Icon path="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M3.5 15.5h13" />
            Baixar meus dados
          </button>
          <button
            className={item}
            role="menuitem"
            onClick={() => {
              onImport()
              setOpen(false)
            }}
          >
            <Icon path="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M3.5 15.5h13" />
            Restaurar backup
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-ink-faint"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  )
}
