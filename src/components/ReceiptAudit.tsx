import { useEffect, useState } from 'react'
import { Panel } from './Shell'
import { GuiaRecibos } from './GuiaRecibos'
import { verifyChain, type ChainProblem } from '../lib/receipt'
import type { Receipt } from '../lib/types'

/**
 * Auditoria dos recibos assinados.
 *
 * De nada adianta encadear hashes se ninguém consegue conferir — este painel
 * é o que transforma a cadeia em algo utilizável: responde, em uma frase, se
 * os recibos continuam exatamente como foram assinados. É esta tela que se
 * mostra a um contador ou advogado.
 */
export function ReceiptAudit({
  recibos,
  onVer,
}: {
  recibos: Receipt[]
  onVer: (r: Receipt) => void
}) {
  const [problemas, setProblemas] = useState<ChainProblem[] | null>(null)

  useEffect(() => {
    let vivo = true
    verifyChain(recibos).then((p) => {
      if (vivo) setProblemas(p)
    })
    return () => {
      vivo = false
    }
  }, [recibos])

  const ordenados = [...recibos].sort((a, b) => b.numero - a.numero)
  const total = recibos.reduce((acc, r) => acc + r.amount, 0)
  const intacta = problemas !== null && problemas.length === 0

  return (
    <Panel title="Recibos assinados">
      {recibos.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-ink-faint">
            Nenhum recibo assinado ainda. Ao registrar um pagamento, marque “colher assinatura”
            para a pessoa assinar no seu celular e o recibo ser emitido.
          </p>
          <GuiaRecibos />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* O veredito primeiro: é a única coisa que importa numa conferência. */}
          <div
            className={`flex items-start gap-3 rounded-[14px] border px-4 py-3.5 ${
              problemas === null
                ? 'border-cream-deep bg-cream'
                : intacta
                  ? 'border-paid/20 bg-paid-soft'
                  : 'border-late/25 bg-late-soft'
            }`}
          >
            <span
              className={`mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                problemas === null
                  ? 'bg-white text-ink-dim'
                  : intacta
                    ? 'bg-paid text-white'
                    : 'bg-late text-white'
              }`}
              aria-hidden
            >
              <svg
                viewBox="0 0 14 14"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {intacta ? <path d="M2.5 7.5l3 3 6-6.5" /> : <path d="M7 3v5M7 10.5v.5" />}
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium leading-snug">
                {problemas === null
                  ? 'Conferindo os recibos…'
                  : intacta
                    ? `${recibos.length} ${recibos.length === 1 ? 'recibo íntegro' : 'recibos íntegros'}`
                    : 'Há recibos alterados depois da assinatura'}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                {problemas === null
                  ? 'Recalculando os códigos de verificação.'
                  : intacta
                    ? 'Todos batem com o que foi assinado, na sequência correta e sem faltar nenhum.'
                    : problemas
                        .map((p) =>
                          p.tipo === 'hash'
                            ? `o conteúdo do nº ${p.numero} mudou`
                            : p.tipo === 'elo'
                              ? `o nº ${p.numero} não se liga ao anterior`
                              : `falta um recibo antes do nº ${p.numero}`,
                        )
                        .join('; ')}
                .
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {ordenados.map((r) => (
              <button
                key={r.id}
                onClick={() => onVer(r)}
                className="flex items-center gap-3 rounded-[12px] border border-cream-deep bg-white px-3.5 py-2.5 text-left transition-colors hover:border-blush-200 hover:bg-blush-50/40"
              >
                <span className="w-[46px] shrink-0 font-display text-[14px] font-semibold tabular-nums text-ink-soft">
                  {String(r.numero).padStart(4, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium leading-tight">
                    {r.personName}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-dim">
                    {new Date(r.signedAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {r.method}
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] font-medium tabular-nums">
                  {r.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </button>
            ))}
          </div>

          <p className="border-t border-hair pt-3 text-[12.5px] text-ink-faint">
            {recibos.length} {recibos.length === 1 ? 'recibo' : 'recibos'} ·{' '}
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em pagamentos
            reconhecidos por quem recebeu.
          </p>

          <GuiaRecibos />
        </div>
      )}
    </Panel>
  )
}
