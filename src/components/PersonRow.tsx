import { formatMoney, formatShortDate, monthAbbr, type PersonSummary } from '../lib/calc'
import { CONTRACT_LABEL, KIND_EFFECT, KIND_LABEL, type Entry } from '../lib/types'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function PersonRow({
  summary,
  period,
  open,
  discreet,
  onToggle,
  onPagar,
  onLancar,
  onEditar,
  onToggleEntry,
}: {
  summary: PersonSummary
  period: string
  open: boolean
  discreet: boolean
  onToggle: () => void
  onPagar: () => void
  onLancar: () => void
  onEditar: () => void
  onToggleEntry: (entry: Entry) => void
}) {
  const { person, entries, total, pago, falta, quitado, atrasado } = summary

  // "Modo discreto": esconde todo valor, para ela abrir a tela na frente da equipe.
  const val = (v: number) => (discreet ? '••••' : formatMoney(v))

  // A descrição é texto livre e costuma conter valor ("9 diárias × R$ 130,00").
  // Sem mascarar isso, o modo discreto vazaria justamente o que quer esconder.
  const desc = (t: string) => (discreet ? t.replace(/R\$\s?[\d.,]+/g, '••••') : t)

  const semLancamento = total === 0 && entries.length === 0
  const status = semLancamento
    ? 'sem lançamento'
    : quitado
      ? 'pago'
      : atrasado
        ? 'em atraso'
        : 'a pagar'

  const statusColor = quitado ? 'text-paid' : atrasado ? 'text-late' : 'text-ink-faint'
  const parcial = falta > 0 && pago > 0
  const progresso = total > 0 ? Math.min(100, (pago / total) * 100) : 0

  return (
    <article className="rounded-2xl border border-cream-deep bg-white shadow-[0_1px_2px_rgba(26,29,33,0.03)]">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 px-[18px] py-[15px] sm:flex-nowrap">
        <div className="w-[34px] shrink-0 text-center">
          <p
            className={`text-[16px] font-semibold leading-none tabular-nums ${
              atrasado ? 'text-late' : 'text-ink-faint'
            }`}
          >
            {String(person.payDay).padStart(2, '0')}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-ink-dim">
            {monthAbbr(period)}
          </p>
        </div>

        <span
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold ${
            quitado ? 'bg-paid-soft text-paid' : 'bg-cream-deep text-ink-soft'
          }`}
          aria-hidden
        >
          {initials(person.name)}
        </span>

        <div className="min-w-0 flex-1 basis-[45%] sm:basis-auto">
          <h3 className="font-display text-[18.5px] font-semibold leading-tight tracking-[0.005em]">
            {person.name}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-ink-faint">
            {person.role ? `${person.role} · ` : ''}
            {CONTRACT_LABEL[person.contract]}
          </p>
        </div>

        <div className="shrink-0 text-right sm:min-w-[118px]">
          <p
            className={`text-[18px] font-semibold leading-tight tracking-[-0.015em] tabular-nums ${
              quitado ? 'text-paid' : 'text-ink'
            }`}
          >
            {semLancamento ? '—' : val(quitado ? total : falta)}
          </p>
          <p className={`mt-[3px] text-[11px] uppercase tracking-[0.07em] ${statusColor}`}>
            {status}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {falta > 0 ? (
            <button
              onClick={onPagar}
              className="rounded-[10px] border border-butterfly-100 bg-butterfly-50 px-3.5 py-2 text-[13.5px] font-medium text-butterfly-500 transition-colors hover:bg-butterfly-100"
            >
              Pagar
            </button>
          ) : null}
          <button
            onClick={onToggle}
            aria-label="Detalhes"
            aria-expanded={open}
            className="flex rounded-[9px] p-2 text-ink-dim transition-colors hover:bg-cream-deep hover:text-ink-soft"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-[15px] w-[15px] transition-transform duration-200"
              style={{ transform: open ? 'rotate(180deg)' : undefined }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3.5 6L8 10.5 12.5 6" />
            </svg>
          </button>
        </div>
      </div>

      {parcial ? (
        <div className="px-[18px] pb-[15px]">
          <div className="h-1 overflow-hidden rounded-full bg-cream-deep">
            <div
              className="h-full rounded-full bg-butterfly-500 transition-[width] duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p className="mt-[7px] text-[12px] text-ink-faint">
            já pago {val(pago)} de {val(total)}
          </p>
        </div>
      ) : null}

      {open ? (
        <div className="rounded-b-[15px] border-t border-hair bg-surface-sunken">
          <div className="flex flex-col">
            {entries.map((e) => {
              const efeito = KIND_EFFECT[e.kind]
              const sub = [
                formatShortDate(e.date),
                e.paid ? `pago${e.method ? ` no ${e.method.toLowerCase()}` : ''}` : 'a pagar',
                efeito === 'antecipa' ? 'abate do total' : null,
              ]
                .filter(Boolean)
                .join(' · ')

              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 border-b border-hair px-[18px] py-3"
                >
                  <button
                    onClick={() => onToggleEntry(e)}
                    aria-label={e.paid ? 'Desmarcar pagamento' : 'Marcar como pago'}
                    className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                      e.paid ? 'border-paid bg-paid text-white' : 'border-line bg-white hover:border-butterfly-200'
                    }`}
                  >
                    <svg
                      viewBox="0 0 14 14"
                      className="h-2.5 w-2.5"
                      style={{ opacity: e.paid ? 1 : 0 }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M2.5 7.5l3 3 6-6.5" />
                    </svg>
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px]">
                      {KIND_LABEL[e.kind]}
                      {e.description ? ` · ${desc(e.description)}` : ''}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-dim">
                      {sub}
                      {e.receiptName ? ' · com comprovante' : ''}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-[13.5px] font-medium tabular-nums ${
                      efeito === 'abate' ? 'text-late' : e.paid ? 'text-paid' : 'text-ink'
                    }`}
                  >
                    {efeito === 'abate' ? '− ' : ''}
                    {val(e.amount)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-1 px-3.5 py-2.5">
            <button
              onClick={onLancar}
              className="rounded-[9px] px-[11px] py-[7px] text-[13px] font-medium text-ink-soft transition-colors hover:bg-cream-deep"
            >
              Lançar valor
            </button>
            <button
              onClick={onEditar}
              className="rounded-[9px] px-[11px] py-[7px] text-[13px] text-ink-faint transition-colors hover:bg-cream-deep hover:text-ink-soft"
            >
              Editar pessoa
            </button>
            {person.notes ? (
              <span className="ml-auto hidden truncate pr-1.5 text-[12.5px] text-ink-dim sm:block">
                {desc(person.notes)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}
