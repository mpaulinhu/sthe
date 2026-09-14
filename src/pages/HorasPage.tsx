import { useMemo, useState } from 'react'
import { PageHeader, Panel, Vazio } from '../components/Shell'
import { Label, fieldClass } from '../components/Sheet'
import { formatMoney, formatPeriod, formatShortDate } from '../lib/calc'
import {
  calcularHoraExtra,
  formatarMinutos,
  lerTempo,
  MOTIVO_PERCENTUAL,
  PERCENTUAIS_COMUNS,
} from '../lib/horas'
import { DEFAULT_MONTHLY_HOURS, type Company, type Entry, type Person } from '../lib/types'

/**
 * Horas extras do mês: lançar em cima, conferir embaixo.
 *
 * Seção própria porque hora extra é um fluxo com ritmo diferente do resto —
 * costuma ser lançada avulsa, no fim do dia, para uma pessoa de cada vez, e
 * conferida em bloco antes de fechar o mês. Enfiada dentro dos detalhes de
 * cada pessoa em Pagamentos, o lançamento existia mas ninguém achava, e não
 * havia lugar nenhum para ver o total.
 */
export function HorasPage({
  people,
  entries,
  company,
  period,
  onLancar,
  onExcluir,
  onError,
}: {
  /** Quem pode receber hora extra neste mês. */
  people: Person[]
  entries: Entry[]
  company: Company
  period: string
  onLancar: (person: Person, r: { valor: number; descricao: string; data: string }) => void
  onExcluir: (id: string) => void
  onError: (msg: string) => void
}) {
  const horasMes = company.monthlyHours || DEFAULT_MONTHLY_HOURS

  const [personId, setPersonId] = useState(people[0]?.id ?? '')
  const [tempo, setTempo] = useState('')
  const [percentual, setPercentual] = useState(50)
  const [percentualLivre, setPercentualLivre] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))

  const pessoa = people.find((p) => p.id === personId) ?? people[0]
  const minutos = lerTempo(tempo)

  const conta = useMemo(
    () =>
      pessoa && minutos !== null
        ? calcularHoraExtra(pessoa.baseAmount, minutos, percentual, horasMes)
        : null,
    [pessoa, minutos, percentual, horasMes],
  )

  /** As horas extras já lançadas neste mês, mais recentes primeiro. */
  const lancadas = useMemo(
    () =>
      entries
        .filter((e) => e.period === period && e.kind === 'extra')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, period],
  )

  const total = lancadas.reduce((acc, e) => acc + e.amount, 0)

  function escolherAtalho(p: number) {
    setPercentual(p)
    setPercentualLivre('')
  }

  function digitarLivre(texto: string) {
    const limpo = texto.replace(/\D/g, '').slice(0, 3)
    setPercentualLivre(limpo)
    if (limpo) setPercentual(Number(limpo))
  }

  function lancar() {
    if (!pessoa) return onError('Cadastre alguém na equipe primeiro.')
    if (pessoa.baseAmount <= 0) {
      return onError(`${pessoa.name.split(' ')[0]} não tem salário no cadastro.`)
    }
    if (minutos === null) return onError('Não entendi o tempo. Use 1:30, 1h30 ou 1,5.')
    if (minutos === 0) return onError('Coloque quanto tempo ela trabalhou a mais.')
    if (!conta || conta.total <= 0) return onError('O valor ficou zerado.')

    onLancar(pessoa, {
      valor: conta.total,
      // A conta vai junto para o histórico: quem abrir meses depois confere
      // sem refazer nada.
      descricao: `${formatarMinutos(minutos)} a ${percentual}%`,
      data,
    })

    // Limpa só o tempo: a pessoa e o percentual costumam se repetir quando se
    // lança várias de uma vez.
    setTempo('')
  }

  if (people.length === 0) {
    return (
      <>
        <PageHeader
          kicker="Horas extras"
          title="Horas extras"
          subtitle="Calcula o valor a partir do salário e do tempo trabalhado a mais."
        />
        <Vazio
          titulo="Ninguém na equipe ainda"
          texto="Cadastre quem trabalha com você na aba Equipe. A hora extra é calculada a partir do salário de cada pessoa."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        kicker={`Horas extras · ${formatPeriod(period)}`}
        title="Horas extras"
        subtitle="Digite o tempo e o adicional — o valor sai do salário de cada pessoa."
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="Lançar">
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-[7px]">
              <Label>Quem trabalhou a mais</Label>
              <select
                value={pessoa?.id ?? ''}
                onChange={(e) => setPersonId(e.target.value)}
                className={`${fieldClass} cursor-pointer`}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {pessoa && pessoa.baseAmount > 0 ? (
                <span className="text-[12px] text-ink-dim">
                  Hora normal de {formatMoney(pessoa.baseAmount / horasMes)} · salário{' '}
                  {formatMoney(pessoa.baseAmount)} ÷ {horasMes}h
                </span>
              ) : (
                <span className="text-[12px] text-due">
                  Sem salário no cadastro — a hora extra não tem de onde ser calculada.
                </span>
              )}
            </label>

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-[7px]">
                <Label>Tempo a mais</Label>
                <input
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="1:30 ou 1,5"
                  aria-label="Tempo trabalhado a mais"
                  className={`${fieldClass} text-[16px] tabular-nums ${
                    tempo && minutos === null ? 'border-late' : ''
                  }`}
                />
              </label>
              <label className="flex flex-1 flex-col gap-[7px]">
                <Label>Dia</Label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>

            {/* Só o erro, e só quando há erro. Repetir o tempo traduzido a
                cada tecla ("1h30 de trabalho a mais") não acrescenta nada: a
                conta logo abaixo já mostra o tempo que está sendo usado. */}
            {tempo && minutos === null ? (
              <span className="-mt-2 text-[12px] leading-snug text-late">
                Não entendi. Use 1:30, 1h30, 1,5 ou 2.
              </span>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label>Quanto pagar por hora</Label>
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

            {/* A conta aberta, atualizando a cada tecla — é o que dispensa a
                calculadora antes de vir para o app. */}
            {conta && conta.minutos > 0 ? (
              <div className="overflow-hidden rounded-[14px] border border-cream-deep">
                <LinhaConta
                  rotulo={`Salário ÷ ${conta.horasMes}h`}
                  valor={formatMoney(conta.hora)}
                  nota="valor da hora normal"
                />
                <LinhaConta
                  rotulo={`${conta.percentual}% da hora`}
                  valor={formatMoney(conta.horaComAdicional)}
                  nota="valor da hora extra"
                />
                <LinhaConta
                  rotulo={`× ${formatarMinutos(conta.minutos)}`}
                  valor={formatMoney(conta.total)}
                  nota="total a pagar"
                  destaque
                />
              </div>
            ) : null}

            <button
              onClick={lancar}
              disabled={!conta || conta.total <= 0}
              className="min-h-[46px] self-start rounded-[11px] bg-ink px-5 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {conta && conta.total > 0 ? `Lançar ${formatMoney(conta.total)}` : 'Lançar'}
            </button>
          </div>
        </Panel>

        <Panel
          title="Lançadas neste mês"
          action={
            lancadas.length > 0 ? (
              <span className="font-display text-[15px] font-semibold tabular-nums text-ink-soft">
                {formatMoney(total)}
              </span>
            ) : null
          }
        >
          {lancadas.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-ink-dim">
              Nenhuma hora extra lançada neste mês. O que você lançar aqui entra no total de cada
              pessoa em Pagamentos.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lancadas.map((e, i) => {
                const dono = people.find((p) => p.id === e.personId)
                return (
                  <li
                    key={e.id}
                    className="rise-in flex items-center gap-3 rounded-[14px] border border-cream-deep bg-cream px-3.5 py-3"
                    style={{ ['--i' as string]: i }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium leading-snug">
                        {dono?.name ?? 'Pessoa removida'}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-ink-faint">
                        {e.description || 'hora extra'} · {formatShortDate(e.date)}
                        {e.paid ? <span className="text-paid"> · pago</span> : null}
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-[15px] font-semibold tabular-nums">
                      {formatMoney(e.amount)}
                    </p>
                    {/* Excluir só enquanto não foi pago: apagar um pagamento
                        feito apagaria dinheiro que já saiu. */}
                    {e.paid ? null : (
                      <button
                        onClick={() => {
                          if (window.confirm('Excluir esta hora extra?')) onExcluir(e.id)
                        }}
                        aria-label="Excluir hora extra"
                        className="flex shrink-0 rounded-[9px] p-1.5 text-ink-dim transition-colors hover:bg-late-soft hover:text-late"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          className="h-[15px] w-[15px]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          aria-hidden
                        >
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <p className="mt-4 text-[12px] leading-relaxed text-ink-dim">
            A hora normal sai de {horasMes} horas no mês, ajustável em Configurações. O
            percentual é quanto dessa hora se paga: 100% é a hora cheia, 200% é o dobro dela.
          </p>
        </Panel>
      </div>
    </>
  )
}

function LinhaConta({
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
