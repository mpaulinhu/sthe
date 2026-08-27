import { Modal } from './Modal'
import { formatMoney, formatPeriod, shiftPeriod, summarizeMonth, summarizePerson } from '../lib/calc'
import type { Database } from '../lib/types'

const MESES = 6

/** Resumo dos últimos meses, para ela ver o quanto costuma gastar. */
export function HistoryModal({
  db,
  currentPeriod,
  onClose,
}: {
  db: Database
  currentPeriod: string
  onClose: () => void
}) {
  const periodos = Array.from({ length: MESES }, (_, i) => shiftPeriod(currentPeriod, -i)).reverse()

  const linhas = periodos.map((p) => {
    const resumo = summarizeMonth(
      db.people.filter((x) => x.active).map((x) => summarizePerson(x, db.entries, p)),
    )
    return { periodo: p, ...resumo }
  })

  const maior = Math.max(...linhas.map((l) => l.total), 1)
  const comMovimento = linhas.filter((l) => l.total > 0)
  const media = comMovimento.length
    ? comMovimento.reduce((acc, l) => acc + l.total, 0) / comMovimento.length
    : 0

  return (
    <Modal title="Resumo dos meses" subtitle={`Últimos ${MESES} meses`} onClose={onClose}>
      {comMovimento.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">
          Ainda não há lançamentos suficientes para montar um resumo.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {linhas.map((l) => {
              const atual = l.periodo === currentPeriod
              return (
                <li key={l.periodo}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span
                      className={`text-sm ${atual ? 'font-semibold text-ink' : 'text-ink-soft'}`}
                    >
                      {formatPeriod(l.periodo)}
                      {atual ? ' · atual' : ''}
                    </span>
                    <span
                      className={`text-sm tabular-nums ${
                        l.total > 0 ? 'font-semibold text-ink' : 'text-ink-faint'
                      }`}
                    >
                      {l.total > 0 ? formatMoney(l.total) : '—'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-cream-deep">
                    <div className="flex h-full">
                      <div
                        className="h-full bg-paid transition-all duration-500"
                        style={{ width: `${(l.pago / maior) * 100}%` }}
                        title={`Pago: ${formatMoney(l.pago)}`}
                      />
                      <div
                        className="h-full bg-due/60 transition-all duration-500"
                        style={{ width: `${(l.falta / maior) * 100}%` }}
                        title={`Falta: ${formatMoney(l.falta)}`}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-5 flex items-center gap-4 border-t border-cream-deep pt-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-paid" aria-hidden /> pago
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-due/60" aria-hidden /> em aberto
            </span>
            <span className="ml-auto">
              Média por mês: <strong className="font-semibold text-ink">{formatMoney(media)}</strong>
            </span>
          </div>
        </>
      )}
    </Modal>
  )
}
