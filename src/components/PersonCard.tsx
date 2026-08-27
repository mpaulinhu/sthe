import { useState } from 'react'
import { formatDate, formatMoney, type PersonSummary } from '../lib/calc'
import { CONTRACT_LABEL, KIND_EFFECT, KIND_LABEL, type Entry } from '../lib/types'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function PersonCard({
  summary,
  onAddEntry,
  onEditPerson,
  onEditEntry,
  onToggleEntry,
  onDeleteEntry,
  onQuitar,
}: {
  summary: PersonSummary
  onAddEntry: () => void
  onEditPerson: () => void
  onEditEntry: (entry: Entry) => void
  onToggleEntry: (entry: Entry) => void
  onDeleteEntry: (entry: Entry) => void
  onQuitar: () => void
}) {
  const [open, setOpen] = useState(false)
  const { person, entries, total, pago, falta, quitado, atrasado } = summary

  const progress = total > 0 ? Math.min(100, (pago / total) * 100) : 0

  return (
    <article className="overflow-hidden rounded-2xl border border-cream-deep bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
            quitado ? 'bg-paid-soft text-paid' : 'bg-cream-deep text-ink-soft'
          }`}
          aria-hidden
        >
          {initials(person.name)}
        </span>

        <div className="min-w-0 flex-1 basis-[60%] sm:basis-auto">
          <h3 className="font-display text-[17px] leading-snug text-ink">{person.name}</h3>
          <p className="truncate text-[13px] text-ink-faint">
            {person.role ? `${person.role} · ` : ''}
            {CONTRACT_LABEL[person.contract]}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {total === 0 ? (
            <span className="text-[13px] text-ink-faint">sem lançamento</span>
          ) : quitado ? (
            <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-paid">
              <Check className="h-4 w-4" />
              <span className="tabular-nums">{formatMoney(total)}</span>
            </span>
          ) : (
            <>
              <p className="font-display text-xl leading-none tabular-nums text-ink">
                {formatMoney(falta)}
              </p>
              <p
                className={`mt-1 text-[11px] uppercase tracking-wide ${
                  atrasado ? 'font-medium text-late' : 'text-ink-faint'
                }`}
              >
                {atrasado ? 'em atraso' : 'a pagar'}
              </p>
            </>
          )}
        </div>
      </div>

      {total > 0 && !quitado && pago > 0 ? (
        <div className="px-5 pb-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-cream-deep">
            <div
              className="h-full rounded-full bg-butterfly-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] text-ink-faint">
            já pago {formatMoney(pago)} de {formatMoney(total)}
          </p>
        </div>
      ) : null}

      <div className="no-print flex items-center gap-1 border-t border-cream-deep/70 px-3 py-2">
        {falta > 0 ? (
          <Action onClick={onQuitar} emphasis>
            <span className="sm:hidden">Já paguei</span>
            <span className="hidden sm:inline">Marcar como pago</span>
          </Action>
        ) : null}
        <Action onClick={onAddEntry}>Lançar</Action>
        {entries.length > 0 ? (
          <Action onClick={() => setOpen(!open)} expanded={open}>
            {open ? 'Fechar' : 'Detalhes'}
          </Action>
        ) : null}
        <Action onClick={onEditPerson} className="ml-auto">
          Editar
        </Action>
      </div>

      {open ? (
        <div className="border-t border-cream-deep/70 bg-cream/40">
          {person.notes ? (
            <p className="border-b border-cream-deep/70 px-5 py-3 text-[13px] leading-relaxed text-ink-soft">
              {person.notes}
            </p>
          ) : null}

          <ul className="divide-y divide-cream-deep/70">
            {entries.map((e) => {
              const abate = KIND_EFFECT[e.kind] === 'abate'
              return (
                <li key={e.id} className="group flex items-center gap-3 px-5 py-3">
                  <button
                    onClick={() => onToggleEntry(e)}
                    aria-label={e.paid ? 'Desmarcar pagamento' : 'Marcar como pago'}
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                      e.paid
                        ? 'border-paid bg-paid text-white'
                        : 'border-ink-faint/50 bg-white hover:border-butterfly-400'
                    }`}
                  >
                    {e.paid ? <Check className="h-2.5 w-2.5" /> : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">
                      {KIND_LABEL[e.kind]}
                      {e.description ? (
                        <span className="text-ink-faint"> · {e.description}</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-ink-faint">
                      {formatDate(e.date)}
                      {e.kind === 'adiantamento' ? ' · abate do total' : ''}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-[13px] font-medium tabular-nums ${
                      abate ? 'text-late' : e.paid ? 'text-paid' : 'text-ink'
                    }`}
                  >
                    {abate ? '−' : ''}
                    {formatMoney(e.amount)}
                  </span>

                  {/* Sempre visível no toque; discreto até o hover no mouse. */}
                  <span className="flex shrink-0 gap-0.5 transition-opacity focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0">
                    <IconButton onClick={() => onEditEntry(e)} label="Editar lançamento">
                      <path d="M12 2.5l3.5 3.5L6 15.5H2.5V12L12 2.5Z" />
                    </IconButton>
                    <IconButton onClick={() => onDeleteEntry(e)} label="Excluir lançamento" danger>
                      <path d="M3 5h12M7 5V3h4v2M6 5l.6 10h4.8L12 5" />
                    </IconButton>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

function Action({
  children,
  onClick,
  emphasis,
  expanded,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  emphasis?: boolean
  expanded?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={expanded}
      className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
        emphasis
          ? 'text-butterfly-600 hover:bg-butterfly-50'
          : 'text-ink-faint hover:bg-cream-deep hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`rounded-md p-1.5 text-ink-faint transition-colors ${
        danger ? 'hover:bg-late-soft hover:text-late' : 'hover:bg-cream-deep hover:text-ink'
      }`}
    >
      <svg
        viewBox="0 0 18 18"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  )
}

function Check({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2.5 7.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
