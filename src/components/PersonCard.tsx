import { useState } from 'react'
import { Button, Card, StatusPill } from './Primitives'
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

  const status = quitado ? 'pago' : atrasado ? 'atrasado' : 'pendente'
  const progress = total > 0 ? Math.min(100, (pago / total) * 100) : 0

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start gap-4 p-5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
            quitado ? 'bg-paid-soft text-paid' : 'bg-butterfly-50 text-butterfly-600'
          }`}
          aria-hidden
        >
          {initials(person.name)}
        </span>

        <div className="min-w-40 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="font-display text-lg leading-tight text-ink">{person.name}</h3>
            <StatusPill status={status} />
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            {person.role ? `${person.role} · ` : ''}
            {CONTRACT_LABEL[person.contract]}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            {quitado ? 'Total do mês' : 'Falta pagar'}
          </p>
          <p
            className={`font-display text-2xl leading-tight ${
              quitado ? 'text-paid' : atrasado ? 'text-late' : 'text-ink'
            }`}
          >
            {formatMoney(quitado ? total : falta)}
          </p>
        </div>
      </div>

      {total > 0 ? (
        <div className="px-5 pb-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
            <div
              className={`h-full rounded-full transition-all duration-500 ${quitado ? 'bg-paid' : 'bg-butterfly-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Pago {formatMoney(pago)} de {formatMoney(total)}
            {entries.length > 0 ? ` · ${entries.length} lançamento${entries.length > 1 ? 's' : ''}` : ''}
          </p>
        </div>
      ) : (
        <p className="px-5 pb-4 text-xs text-ink-faint">Nenhum lançamento neste mês.</p>
      )}

      <div className="no-print flex flex-wrap items-center gap-2 border-t border-cream-deep bg-cream/60 px-5 py-3">
        {falta > 0 ? (
          <Button
            variant="primary"
            onClick={onQuitar}
            title="Marca tudo que está pendente como pago"
            className="order-1 grow sm:grow-0"
          >
            Quitar {formatMoney(falta)}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onAddEntry} className="order-2">
          + Lançamento
        </Button>
        {entries.length > 0 ? (
          <Button onClick={() => setOpen(!open)} aria-expanded={open} className="order-3">
            {open ? 'Ocultar' : 'Ver detalhes'}
          </Button>
        ) : null}
        <Button onClick={onEditPerson} className="order-4 ml-auto">
          Editar
        </Button>
      </div>

      {open && entries.length > 0 ? (
        <ul className="divide-y divide-cream-deep border-t border-cream-deep">
          {entries.map((e) => {
            const effect = KIND_EFFECT[e.kind]
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <button
                  onClick={() => onToggleEntry(e)}
                  aria-label={e.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                  className={`no-print flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    e.paid ? 'border-paid bg-paid text-white' : 'border-ink-faint bg-white hover:border-butterfly-400'
                  }`}
                >
                  {e.paid ? (
                    <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M2.5 7.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>

                <div className="min-w-32 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {KIND_LABEL[e.kind]}
                    {e.description ? <span className="font-normal text-ink-soft"> · {e.description}</span> : null}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {formatDate(e.date)}
                    {e.kind === 'adiantamento' ? ' · abate do total do mês' : ''}
                  </p>
                </div>

                <span
                  className={`text-sm font-semibold tabular-nums ${
                    effect === 'abate' ? 'text-late' : e.paid ? 'text-paid' : 'text-ink'
                  }`}
                >
                  {effect === 'abate' ? '−' : ''}
                  {formatMoney(e.amount)}
                </span>

                <span className="no-print flex gap-1">
                  <button
                    onClick={() => onEditEntry(e)}
                    aria-label="Editar lançamento"
                    className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-cream hover:text-ink"
                  >
                    <svg viewBox="0 0 18 18" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 2.5l3.5 3.5L6 15.5H2.5V12L12 2.5Z" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteEntry(e)}
                    aria-label="Excluir lançamento"
                    className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-late-soft hover:text-late"
                  >
                    <svg viewBox="0 0 18 18" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 5h12M7 5V3h4v2M6 5l.6 10h4.8L12 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </Card>
  )
}
