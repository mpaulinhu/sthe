import { useMemo, useState } from 'react'
import { Sheet, Label, fieldClass } from './Sheet'
import { formatMoney } from '../lib/calc'
import {
  calcularHoraExtra,
  formatarMinutos,
  lerTempo,
  MOTIVO_PERCENTUAL,
  PERCENTUAIS_COMUNS,
} from '../lib/horas'
import { DEFAULT_MONTHLY_HOURS, type Company, type Person } from '../lib/types'

/**
 * Lançamento de hora extra.
 *
 * Sheet próprio, e não mais um tipo dentro do "Lançar valor", porque aqui o
 * que se digita não é o dinheiro — é o tempo e o percentual. O valor é
 * consequência, e mostrá-lo sendo calculado ao vivo é o que evita a conta na
 * calculadora do celular antes de vir para o app.
 */
export function HoraExtraSheet({
  person,
  company,
  onConfirm,
  onClose,
  onError,
}: {
  person: Person
  company: Company
  onConfirm: (r: { valor: number; descricao: string }) => void
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [tempo, setTempo] = useState('')
  const [percentual, setPercentual] = useState(50)
  const [percentualLivre, setPercentualLivre] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))

  const horasMes = company.monthlyHours || DEFAULT_MONTHLY_HOURS
  const minutos = lerTempo(tempo)

  const conta = useMemo(
    () =>
      minutos !== null
        ? calcularHoraExtra(person.baseAmount, minutos, percentual, horasMes)
        : null,
    [minutos, percentual, person.baseAmount, horasMes],
  )

  /** Escolher um atalho limpa o campo livre, e vice-versa — só um vale. */
  function escolherAtalho(p: number) {
    setPercentual(p)
    setPercentualLivre('')
  }

  function digitarLivre(texto: string) {
    const limpo = texto.replace(/\D/g, '').slice(0, 3)
    setPercentualLivre(limpo)
    if (limpo) setPercentual(Number(limpo))
  }

  function confirmar() {
    if (minutos === null) {
      return onError('Não entendi o tempo. Use 1:30, 1h30 ou 1,5.')
    }
    if (minutos === 0) return onError('Coloque quanto tempo ela trabalhou a mais.')
    if (!conta || conta.total <= 0) return onError('O valor ficou zerado — confira o salário dela.')

    onConfirm({
      valor: conta.total,
      // A descrição carrega a conta para o histórico: quem abrir o lançamento
      // meses depois consegue conferir sem refazer nada.
      descricao: `${formatarMinutos(minutos)} a ${percentual}% · ${data.slice(8, 10)}/${data.slice(5, 7)}`,
    })
  }

  const semSalario = person.baseAmount <= 0

  return (
    <Sheet
      title="Hora extra"
      subtitle={`${person.name} · hora normal de ${formatMoney(person.baseAmount / horasMes)}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-[11px] border border-cream-deep bg-white px-[15px] py-[11px] text-[14px] text-ink-soft transition-colors hover:bg-cream"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={semSalario}
            className="min-h-[44px] flex-1 rounded-[11px] bg-ink px-4 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {conta ? `Lançar ${formatMoney(conta.total)}` : 'Lançar'}
          </button>
        </>
      }
    >
      {semSalario ? (
        <div className="rounded-[12px] border border-due/30 bg-due-soft px-3.5 py-3">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            {person.name.split(' ')[0]} não tem salário no cadastro, e a hora extra é calculada a
            partir dele. Preencha o valor dela primeiro.
          </p>
        </div>
      ) : null}

      <label className="flex flex-col gap-[7px]">
        <Label>Quanto tempo a mais</Label>
        <input
          value={tempo}
          onChange={(e) => setTempo(e.target.value)}
          placeholder="1:30"
          inputMode="text"
          autoFocus
          aria-label="Tempo trabalhado a mais"
          className={`${fieldClass} text-[16px] tabular-nums ${
            tempo && minutos === null ? 'border-late' : ''
          }`}
        />
        <span
          className={`text-[12px] leading-snug ${
            tempo && minutos === null ? 'text-late' : 'text-ink-dim'
          }`}
        >
          {tempo && minutos === null
            ? 'Não entendi. Use 1:30, 1h30, 90 minutos ou 1,5.'
            : minutos !== null
              ? `${formatarMinutos(minutos)} de trabalho a mais.`
              : 'Pode escrever 1:30, 1h30 ou 1,5 — tudo dá uma hora e meia.'}
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <Label>Adicional sobre a hora</Label>
        <div className="flex flex-wrap gap-1.5">
          {PERCENTUAIS_COMUNS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => escolherAtalho(p)}
              aria-pressed={percentual === p && !percentualLivre}
              className={`rounded-[10px] border px-3 py-2 text-[13px] font-medium transition-colors ${
                percentual === p && !percentualLivre
                  ? 'border-butterfly-300 bg-butterfly-50 text-butterfly-600'
                  : 'border-cream-deep bg-white text-ink-soft hover:bg-cream'
              }`}
            >
              {p}%
              <span className="ml-1.5 text-[11px] font-normal text-ink-dim">
                {MOTIVO_PERCENTUAL[p]}
              </span>
            </button>
          ))}

          <div className="flex items-center gap-1.5">
            <input
              value={percentualLivre}
              onChange={(e) => digitarLivre(e.target.value)}
              placeholder="outro"
              inputMode="numeric"
              aria-label="Outro percentual"
              className={`${fieldClass} w-[84px] text-[13px] tabular-nums`}
            />
            <span className="text-[13px] text-ink-faint">%</span>
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-[7px]">
        <Label>Dia em que aconteceu</Label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={fieldClass}
        />
      </label>

      {/* A conta aberta, atualizando a cada tecla. É o que dispensa a
          calculadora e deixa o valor conferível antes de virar lançamento. */}
      {conta && conta.minutos > 0 ? (
        <div className="overflow-hidden rounded-[14px] border border-cream-deep">
          <Linha
            rotulo={`Salário ÷ ${conta.horasMes}h`}
            valor={formatMoney(conta.hora)}
            nota="valor da hora normal"
          />
          <Linha
            rotulo={`+ ${conta.percentual}% de adicional`}
            valor={formatMoney(conta.horaComAdicional)}
            nota="hora extra"
          />
          <Linha
            rotulo={`× ${formatarMinutos(conta.minutos)}`}
            valor={formatMoney(conta.total)}
            nota="total a pagar"
            destaque
          />
        </div>
      ) : null}

      <p className="text-[12px] leading-relaxed text-ink-dim">
        A hora normal sai de {conta?.horasMes ?? horasMes} horas no mês, ajustável em
        Configurações. O adicional soma sobre ela: 100% quer dizer o dobro da hora, não o dobro do
        salário.
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
      className={`flex items-baseline justify-between gap-3 border-b border-cream-deep px-3.5 py-2.5 last:border-b-0 ${
        destaque ? 'bg-butterfly-50' : ''
      }`}
    >
      <div className="min-w-0">
        <p className={`text-[13px] ${destaque ? 'font-medium text-ink' : 'text-ink-soft'}`}>
          {rotulo}
        </p>
        {nota ? <p className="mt-0.5 text-[11px] text-ink-dim">{nota}</p> : null}
      </div>
      <p
        className={`shrink-0 tabular-nums ${
          destaque
            ? 'font-display text-[17px] font-semibold text-butterfly-600'
            : 'text-[13.5px] text-ink-soft'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}
