import { Sheet } from './Sheet'
import { competenceOf, formatMoney, formatPeriod, formatShortDate } from '../lib/calc'
import type { Proporcional } from '../lib/calc'
import type { Person } from '../lib/types'

/**
 * De onde saiu o valor proporcional.
 *
 * Existe porque o número de um mês de entrada ou saída não é redondo e não se
 * explica sozinho: quem olha "R$ 400,00" para um salário de R$ 2.000 precisa
 * saber que foram 6 dias trabalhados, não um desconto qualquer. Mostrar a
 * conta é o que permite conferir sem refazer na calculadora — e é o que ela
 * vai repetir se alguém da equipe perguntar.
 *
 * Só aparece quando há proporcional. Mês cheio não tem conta para mostrar.
 */
export function CalculoSheet({
  person,
  proporcional,
  period,
  onClose,
}: {
  person: Person
  proporcional: Proporcional
  /** Mês de pagamento — o trabalhado é o anterior (regime de mês vencido). */
  period: string
  onClose: () => void
}) {
  const competencia = competenceOf(period)
  const dataLimite = proporcional.motivo === 'saida' ? person.leftAt : person.hiredAt
  const diaria = person.baseAmount / proporcional.base

  return (
    <Sheet
      title="Como chegamos nesse valor"
      subtitle={`${person.name} · ${formatPeriod(competencia).toLowerCase()}`}
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="min-h-[44px] flex-1 rounded-[11px] bg-ink px-4 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover"
        >
          Entendi
        </button>
      }
    >
      {/* O motivo primeiro: sem saber que ela entrou no meio do mês, a conta
          abaixo não faz sentido nenhum. */}
      <div className="rounded-[12px] border border-butterfly-200 bg-butterfly-50 px-3.5 py-3">
        <p className="text-[13px] leading-relaxed text-butterfly-700">
          {proporcional.motivo === 'saida' ? (
            <>
              <strong className="font-medium">{person.name.split(' ')[0]} saiu</strong> em{' '}
              {dataLimite ? formatShortDate(dataLimite) : '—'}, então trabalhou parte de{' '}
              {formatPeriod(competencia).toLowerCase()}.
            </>
          ) : proporcional.motivo === 'ambos' ? (
            <>
              <strong className="font-medium">{person.name.split(' ')[0]}</strong> entrou e saiu
              dentro de {formatPeriod(competencia).toLowerCase()}.
            </>
          ) : (
            <>
              <strong className="font-medium">{person.name.split(' ')[0]} entrou</strong> em{' '}
              {dataLimite ? formatShortDate(dataLimite) : '—'}, então trabalhou parte de{' '}
              {formatPeriod(competencia).toLowerCase()}.
            </>
          )}
        </p>
      </div>

      {/* A conta linha a linha, na ordem em que se faz no papel. */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-[14px] border border-cream-deep">
        <Linha rotulo="Salário do mês" valor={formatMoney(person.baseAmount)} />
        <Linha
          rotulo={`Dividido por ${proporcional.base} dias`}
          valor={formatMoney(diaria)}
          nota="valor de um dia"
        />
        <Linha
          rotulo={`Multiplicado por ${proporcional.dias} ${proporcional.dias === 1 ? 'dia' : 'dias'}`}
          valor={formatMoney(proporcional.valor)}
          nota="dias trabalhados"
          destaque
        />
      </div>

      <p className="text-[12.5px] leading-relaxed text-ink-faint">
        A folha usa mês comercial de <strong className="font-medium">30 dias</strong>, independente
        de o mês ter 28, 30 ou 31 — é o padrão da CLT, e é o que faz entrar no dia 15 valer o mesmo
        em fevereiro e em março. Sábados e domingos entram na conta, porque o descanso semanal é
        remunerado.
      </p>

      {/* Quando o dinheiro cai. O regime de mês vencido é a parte que mais
          confunde: o valor é de um mês e sai no seguinte. */}
      <div className="rounded-[12px] border border-cream-deep bg-cream px-3.5 py-3">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Este valor é o trabalho de{' '}
          <strong className="font-medium">{formatPeriod(competencia).toLowerCase()}</strong>, e sai
          no pagamento de{' '}
          <strong className="font-medium">{formatPeriod(period).toLowerCase()}</strong>.
        </p>
      </div>

      <p className="text-[12px] leading-relaxed text-ink-dim">
        Se vocês combinaram outro valor, é só ajustar na hora de lançar — o app sugere, não decide.
      </p>
    </Sheet>
  )
}

function Linha({
  rotulo,
  valor,
  nota,
  destaque,
}: {
  rotulo: string
  valor: string
  nota?: string
  destaque?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-cream-deep px-3.5 py-3 last:border-b-0 ${
        destaque ? 'bg-butterfly-50' : ''
      }`}
    >
      <div className="min-w-0">
        <p className={`text-[13.5px] ${destaque ? 'font-medium text-ink' : 'text-ink-soft'}`}>
          {rotulo}
        </p>
        {nota ? <p className="mt-0.5 text-[11.5px] text-ink-dim">{nota}</p> : null}
      </div>
      <p
        className={`shrink-0 tabular-nums ${
          destaque
            ? 'font-display text-[18px] font-semibold text-butterfly-600'
            : 'text-[14px] text-ink-soft'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}
