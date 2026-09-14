import {
  formatMoney,
  formatShortDate,
  monthAbbr,
  proportionalForPeriod,
  type PersonSummary,
} from '../lib/calc'
import {
  CONTRACT_AVATAR,
  CONTRACT_LABEL,
  CONTRACT_TEXT,
  KIND_EFFECT,
  KIND_LABEL,
  type Entry,
  type Person,
  type Receipt,
} from '../lib/types'
import { Avatar } from './Avatar'

/** Cor do anel do avatar conforme a situação — dá leitura de status à distância. */
const AVATAR_RING = {
  pago: 'bg-paid-soft text-paid ring-paid/15',
  atraso: 'bg-late-soft text-late ring-late/15',
} as const

export function PersonRow({
  summary,
  period,
  open,
  discreet,
  index = 0,
  selecionada,
  recibos = [],
  onSelecionar,
  onToggle,
  onPagar,
  onLancar,
  onEditar,
  onToggleEntry,
  onVerRecibo,
  onVerComprovante,
  onVerFoto,
  onVerCalculo,
  onAssinarDepois,
}: {
  summary: PersonSummary
  period: string
  open: boolean
  discreet: boolean
  /** Posição na lista — só para escalonar a animação de entrada. */
  index?: number
  /** `undefined` quando a linha não é selecionável (nada a pagar). */
  selecionada?: boolean
  /** Recibos assinados desta pessoa neste mês. */
  recibos?: Receipt[]
  onSelecionar?: () => void
  onToggle: () => void
  onPagar: () => void
  onLancar: () => void
  onEditar: () => void
  onToggleEntry: (entry: Entry) => void
  onVerRecibo?: (r: Receipt) => void
  onVerComprovante?: (entry: Entry) => void
  onVerFoto?: (p: Person) => void
  /** Abre a explicação do proporcional. Sem ela, o selo não aparece. */
  onVerCalculo?: () => void
  /** Reconhecer o recebimento depois de já ter marcado como pago sem assinar na hora. */
  onAssinarDepois?: (entry: Entry) => void
}) {
  const { person, entries, total, pago, falta, quitado, atrasado, venceu } = summary

  // "Modo discreto": esconde todo valor, para ela abrir a tela na frente da equipe.
  const val = (v: number) => (discreet ? '••••' : formatMoney(v))

  // A descrição é texto livre e costuma conter valor ("9 diárias × R$ 130,00").
  // Sem mascarar isso, o modo discreto vazaria justamente o que quer esconder.
  const desc = (t: string) => (discreet ? t.replace(/R\$\s?[\d.,]+/g, '••••') : t)

  const semLancamento = total === 0 && entries.length === 0

  // Mês de entrada ou saída tem valor proporcional; mês cheio devolve null e
  // o selo não aparece.
  const proporcional = proportionalForPeriod(person, period)
  // Sem lançamento não há dívida — mas se o dia de pagar já passou, isso
  // costuma ser esquecimento, e precisa chamar atenção em vez de parecer
  // "a pagar" (que sugere, falsamente, que já existe um valor combinado).
  const esquecido = semLancamento && venceu

  const status = semLancamento
    ? esquecido
      ? 'falta lançar'
      : 'sem lançamento'
    : quitado
      ? 'pago'
      : atrasado
        ? 'em atraso'
        : 'a pagar'

  const statusColor = quitado
    ? 'text-paid'
    : atrasado || esquecido
      ? 'text-late'
      : 'text-ink-faint'
  const parcial = falta > 0 && pago > 0
  const progresso = total > 0 ? Math.min(100, (pago / total) * 100) : 0

  // Status (pago/atrasado) tem prioridade sobre o tipo de contrato — é a
  // informação que pede ação agora. Só em repouso o avatar volta a indicar
  // se é fixo, freela ou diarista.
  const tomAvatar = quitado
    ? AVATAR_RING.pago
    : atrasado || esquecido
      ? AVATAR_RING.atraso
      : CONTRACT_AVATAR[person.contract]

  // Quais lançamentos já têm assinatura de recebimento — vira selo na linha.
  const assinados = new Set(recibos.flatMap((r) => r.entryIds))

  // Fio de status na borda esquerda: leitura periférica, sem pesar o card.
  const fio = quitado
    ? 'before:bg-paid'
    : atrasado || esquecido
      ? 'before:bg-late'
      : falta > 0
        ? 'before:bg-due'
        : 'before:bg-transparent'

  return (
    <article
      className={`rise-in group relative overflow-hidden rounded-[18px] border bg-white shadow-petal transition-all duration-300 hover:-translate-y-px hover:shadow-lift
        before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-r-full before:transition-colors ${fio} ${
          selecionada
            ? 'border-butterfly-300 ring-1 ring-butterfly-200'
            : open
              ? 'border-blush-200 shadow-lift'
              : 'border-blush-100 hover:border-blush-200'
        }`}
      style={{ ['--i' as string]: index }}
    >
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 px-[18px] py-4 sm:flex-nowrap">
        {onSelecionar ? (
          <button
            onClick={onSelecionar}
            role="checkbox"
            aria-checked={!!selecionada}
            aria-label={`Selecionar ${person.name} para pagar`}
            className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md border transition-all ${
              selecionada
                ? 'border-butterfly-500 bg-butterfly-500 text-white'
                : 'border-line bg-white hover:border-butterfly-300'
            }`}
          >
            <svg
              viewBox="0 0 14 14"
              className="h-2.5 w-2.5"
              style={{ opacity: selecionada ? 1 : 0 }}
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
        ) : null}

        {/* A data que vem primeiro: o vale enquanto ele não chegou, o salário
            depois. Mostrar as duas na mesma linha carregaria demais — o que
            ela precisa saber é o que vem agora. O rótulo "vale" identifica
            qual das duas está ali. */}
        <div className="w-[36px] shrink-0 text-center">
          <p
            className={`font-display text-[17px] font-semibold leading-none tabular-nums ${
              atrasado || esquecido ? 'text-late' : 'text-ink-soft'
            }`}
          >
            {summary.proximaData.slice(8, 10)}
          </p>
          <p
            className={`mt-1 text-[9.5px] font-medium uppercase tracking-[0.1em] ${
              summary.proximaEhVale ? 'text-butterfly-500' : 'text-ink-dim'
            }`}
          >
            {summary.proximaEhVale ? 'vale' : monthAbbr(period)}
          </p>
        </div>

        <Avatar
          person={person}
          tone={tomAvatar}
          onVerFoto={onVerFoto ? () => onVerFoto(person) : undefined}
        />

        <div className="min-w-0 flex-1 basis-[45%] sm:basis-auto">
          <h3 className="font-display text-[19px] font-semibold leading-tight">{person.name}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">
            {person.role ? `${person.role} · ` : ''}
            <span className={CONTRACT_TEXT[person.contract] || undefined}>
              {CONTRACT_LABEL[person.contract]}
            </span>
            {/* O vale como informação secundária: aparece com o DIA dele
                sempre que ainda há vale a pagar, inclusive quando o destaque
                ao lado do nome está mostrando o salário atrasado. É o que
                deixa as duas datas visíveis sem uma fingir ser a outra. */}
            {summary.faltaVale > 0 ? (
              <span className="text-butterfly-500">
                {' · '}vale dia {Number(summary.dataVale.slice(8, 10))} ·{' '}
                {formatMoney(summary.faltaVale)}
              </span>
            ) : null}
            {/* A forma aparece só enquanto há o que pagar: depois de quitado
                ela vira ruído, e o detalhe já mostra como cada parte saiu. */}
            {person.method && falta > 0 ? (
              <span className="text-blush-500"> · {person.method}</span>
            ) : null}
          </p>

          {/* Mês de entrada ou saída: o valor não é o salário cheio, e um
              número quebrado sem explicação parece erro. O selo abre a conta.
              Só existe quando há proporcional — mês cheio não tem o que
              explicar. */}
          {proporcional && onVerCalculo ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onVerCalculo()
              }}
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-butterfly-200 bg-butterfly-50 py-[3px] pl-2 pr-2.5 text-[11.5px] font-medium text-butterfly-600 transition-colors hover:bg-butterfly-100"
            >
              <svg viewBox="0 0 14 14" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <circle cx="7" cy="7" r="5.5" />
                <path d="M7 6.2v4M7 4.1v.6" strokeLinecap="round" />
              </svg>
              {proporcional.dias} de {proporcional.base} dias · ver conta
            </button>
          ) : null}
        </div>

        {/* No mobile o valor e as ações dividem a segunda linha inteira (valor
            à esquerda, botão à direita); no desktop voltam a ser duas colunas
            à direita do nome. */}
        <div className="flex flex-1 basis-full items-center justify-between gap-3 sm:flex-none sm:basis-auto sm:justify-end">
          <div className="text-left sm:min-w-[118px] sm:text-right">
            <p
              className={`font-display text-[19px] font-semibold leading-tight tracking-[-0.02em] tabular-nums ${
                quitado ? 'text-paid' : 'text-ink'
              }`}
            >
              {semLancamento ? '—' : val(quitado ? total : falta)}
            </p>
            <p
              className={`mt-1 text-[10.5px] font-medium uppercase tracking-[0.09em] ${statusColor}`}
            >
              {status}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
          {/* "Pagar" é discreto em repouso e sólido no hover: sete botões
              sólidos ao mesmo tempo virariam a mancha dominante da tela. */}
          {falta > 0 ? (
            <button
              onClick={onPagar}
              className="rounded-[11px] border border-butterfly-100 bg-butterfly-50 px-4 py-2 text-[13px] font-medium text-butterfly-600 transition-all duration-200 hover:border-butterfly-500 hover:bg-butterfly-500 hover:text-white hover:shadow-[0_6px_14px_-6px_rgba(44,111,181,0.7)]"
            >
              Pagar
            </button>
          ) : esquecido ? (
            // A ação óbvia de quem venceu sem nada lançado é lançar o valor —
            // deixar isso a um clique evita ter que abrir os detalhes.
            <button
              onClick={onLancar}
              className="rounded-[11px] border border-blush-200 bg-white px-3.5 py-2 text-[13px] font-medium text-blush-600 transition-colors hover:bg-blush-50"
            >
              Lançar
            </button>
          ) : null}
          <button
            onClick={onToggle}
            aria-label="Detalhes"
            aria-expanded={open}
            className="flex rounded-[10px] p-2 text-ink-dim transition-colors hover:bg-blush-50 hover:text-blush-500"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-[15px] w-[15px] transition-transform duration-300"
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
      </div>

      {/* Alinhada ao nome (não à borda do card): a barra pertence à pessoa,
          e começar junto do texto deixa isso óbvio. O recuo acompanha a soma
          das colunas do dia (36px) e do avatar (40px) mais os dois gaps. */}
      {parcial ? (
        <div className="-mt-1 px-[18px] pb-4 sm:pl-[116px]">
          <div className="h-[5px] w-full max-w-[340px] overflow-hidden rounded-full bg-cream-deep">
            <div
              className="h-full rounded-full bg-gradient-to-r from-butterfly-400 to-butterfly-600 transition-[width] duration-700 ease-out"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p className="mt-2 text-[11.5px] text-ink-faint">
            já pago <span className="font-medium text-ink-soft">{val(pago)}</span> de {val(total)}
          </p>
        </div>
      ) : null}

      {open ? (
        <div className="rounded-b-[17px] border-t border-hair bg-gradient-to-b from-blush-50/50 to-transparent [animation:fadeIn_.22s_ease]">
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
                    <p className="mt-0.5 text-[11.5px] text-ink-dim">{sub}</p>

                    {/* Chips numa linha própria, fora do texto corrido: no
                        celular um link sublinhado dentro de uma frase pequena
                        é um alvo de toque ruim — aqui cada ação tem sua área
                        clicável inteira, alta o bastante pro dedo. */}
                    {e.receiptImage || assinados.has(e.id) || (e.paid && efeito !== 'abate' && onAssinarDepois) ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {e.receiptImage ? (
                          <button
                            type="button"
                            onClick={() => onVerComprovante?.(e)}
                            className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-cream-deep bg-white px-2.5 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-butterfly-200 hover:bg-butterfly-50 hover:text-butterfly-600"
                          >
                            <svg
                              viewBox="0 0 14 14"
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M4 2.5h6l2 2v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
                              <path d="M9.5 2.5v2.5H12" />
                            </svg>
                            Comprovante
                          </button>
                        ) : null}

                        {assinados.has(e.id) ? (
                          <span className="inline-flex min-h-[30px] items-center gap-1 rounded-full bg-paid-soft px-2.5 text-[11.5px] font-medium text-paid">
                            <svg
                              viewBox="0 0 12 12"
                              className="h-2.5 w-2.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M2 6.3l2.6 2.6L10 3.2" />
                            </svg>
                            Assinado
                          </span>
                        ) : e.paid && efeito !== 'abate' && onAssinarDepois ? (
                          // Ela pagou sem colher assinatura na hora (ou desmarcou
                          // de propósito) — este é o jeito de reconhecer o
                          // recebimento depois, sem precisar desfazer o pagamento.
                          <button
                            type="button"
                            onClick={() => onAssinarDepois(e)}
                            className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-butterfly-100 bg-butterfly-50 px-2.5 text-[11.5px] font-medium text-butterfly-600 transition-colors hover:border-butterfly-300 hover:bg-butterfly-100"
                          >
                            <svg
                              viewBox="0 0 14 14"
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              aria-hidden
                            >
                              <path d="M2.5 10.5 9 4l1.5 1.5-6.5 6.5H2.5v-1.5Z" />
                              <path d="M8 5l1 1" />
                            </svg>
                            Assinar recibo
                          </button>
                        ) : null}
                      </div>
                    ) : null}
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

          {/* Recibos assinados do mês: é onde ela reabre para reenviar, e a
              prova de que aquele pagamento foi reconhecido por quem recebeu. */}
          {recibos.length > 0 ? (
            <div className="flex flex-col gap-1.5 border-b border-hair px-[18px] py-3">
              {recibos.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onVerRecibo?.(r)}
                  className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left transition-colors hover:bg-white"
                >
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-paid-soft text-paid">
                    <svg
                      viewBox="0 0 14 14"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3.5 2h7v10l-3.5-2-3.5 2V2Z" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-tight">
                      Recibo nº {String(r.numero).padStart(4, '0')} · {val(r.amount)}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-dim">
                      assinado em{' '}
                      {new Date(r.signedAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-faint">ver</span>
                </button>
              ))}
            </div>
          ) : null}

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
