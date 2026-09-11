import { useMemo, useState } from 'react'
import { Panel } from './Shell'
import { formatMoney, formatPeriod } from '../lib/calc'
import { downloadReceipt, renderReceipt } from '../lib/receiptImage'
import type { Receipt } from '../lib/types'

/**
 * Arquivo de recibos da empresa.
 *
 * A via de quem paga tem que ficar guardada em algum lugar: mandar a imagem
 * para a funcionária e não guardar nada seria ficar sem a própria prova. Os
 * recibos já vivem no banco; esta tela é o que os torna alcançáveis — dá para
 * folhear por mês e baixar de novo a qualquer momento, um a um ou o mês todo.
 */
export function ReceiptArchive({
  recibos,
  onVer,
  onError,
  onDone,
}: {
  recibos: Receipt[]
  onVer: (r: Receipt) => void
  onError: (msg: string) => void
  onDone: (msg: string) => void
}) {
  const [baixando, setBaixando] = useState(false)

  // Agrupado por competência, do mês mais recente para o mais antigo — é como
  // se procura um recibo ("o de setembro"), não por ordem de emissão.
  const meses = useMemo(() => {
    const mapa = new Map<string, Receipt[]>()
    for (const r of recibos) {
      const lista = mapa.get(r.period)
      if (lista) lista.push(r)
      else mapa.set(r.period, [r])
    }
    return [...mapa.entries()]
      .map(([period, itens]) => ({
        period,
        itens: itens.sort((a, b) => b.numero - a.numero),
        total: itens.reduce((acc, r) => acc + r.amount, 0),
      }))
      .sort((a, b) => b.period.localeCompare(a.period))
  }, [recibos])

  /**
   * Baixa vários de uma vez. Os downloads são disparados em sequência com uma
   * folga entre eles: navegador engasga (e chega a bloquear) quando recebe
   * muitos `a.click()` no mesmo instante.
   */
  async function baixarLote(itens: Receipt[], rotulo: string) {
    setBaixando(true)
    try {
      for (const r of itens) {
        downloadReceipt(await renderReceipt(r), r)
        await new Promise((ok) => setTimeout(ok, 350))
      }
      onDone(`${itens.length} ${itens.length === 1 ? 'recibo baixado' : 'recibos baixados'} · ${rotulo}`)
    } catch {
      onError('Não consegui gerar todos os recibos.')
    } finally {
      setBaixando(false)
    }
  }

  if (recibos.length === 0) return null

  return (
    <Panel
      title="Arquivo de recibos"
      action={
        <button
          onClick={() => void baixarLote(recibos, 'todos')}
          disabled={baixando}
          className="rounded-[9px] border border-cream-deep bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-cream disabled:opacity-40"
        >
          {baixando ? 'Baixando…' : 'Baixar todos'}
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        {meses.map((m) => (
          <section key={m.period}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h3 className="text-[13px] font-medium">{formatPeriod(m.period)}</h3>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-[12.5px] tabular-nums text-ink-faint">
                  {formatMoney(m.total)}
                </span>
                <button
                  onClick={() => void baixarLote(m.itens, formatPeriod(m.period))}
                  disabled={baixando}
                  className="rounded-md text-[12px] text-ink-dim underline-offset-4 transition-colors hover:text-blush-500 hover:underline disabled:opacity-40"
                >
                  baixar o mês
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {m.itens.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-[11px] border border-cream-deep bg-white px-3 py-2.5"
                >
                  <span className="w-[42px] shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-soft">
                    {String(r.numero).padStart(4, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium leading-tight">
                      {r.personName}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-dim">
                      {new Date(r.signedAt).toLocaleDateString('pt-BR')} · {r.method}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-medium tabular-nums">
                    {formatMoney(r.amount)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => onVer(r)}
                      className="rounded-[8px] px-2 py-1.5 text-[12px] text-ink-faint transition-colors hover:bg-cream hover:text-ink-soft"
                    >
                      ver
                    </button>
                    <button
                      onClick={() => void baixarLote([r], `nº ${String(r.numero).padStart(4, '0')}`)}
                      disabled={baixando}
                      aria-label={`Baixar recibo ${r.numero}`}
                      className="rounded-[8px] p-1.5 text-ink-faint transition-colors hover:bg-cream hover:text-ink-soft disabled:opacity-40"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className="h-[14px] w-[14px]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M8 2.5v7.5M8 10l-2.8-2.8M8 10l2.8-2.8" />
                        <path d="M2.8 11v1.7a.8.8 0 00.8.8h8.8a.8.8 0 00.8-.8V11" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  )
}
