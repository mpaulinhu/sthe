import { useMemo, useState } from 'react'
import { PageHeader, PlusIcon, PrimaryButton, Chevron } from '../components/Shell'
import { Sheet, Label, Segmented, fieldClass } from '../components/Sheet'
import {
  addDays,
  addMonths,
  agendaOfDay,
  monthGrid,
  todayIso,
  weekdayAbbr,
  weekOf,
} from '../lib/business'
import { digitsToTimeRange } from '../lib/timeRange'
import type { AgendaItem, Person } from '../lib/types'
import { uid } from '../lib/storage'

export function AgendaPage({
  agenda,
  people,
  onSave,
  onDelete,
  onError,
}: {
  agenda: AgendaItem[]
  people: Person[]
  onSave: (s: AgendaItem) => void
  onDelete: (id: string) => void
  onError: (msg: string) => void
}) {
  // Duas leituras da mesma agenda: a semana serve para tocar o dia a dia
  // (quem trabalha quando, o que fazer amanhã); o mês serve para enxergar
  // volume e planejar — onde estão os buracos, onde a semana está cheia.
  const [modo, setModo] = useState<'semana' | 'mes'>('semana')
  const [ancora, setAncora] = useState(todayIso)
  const [editando, setEditando] = useState<{ item?: AgendaItem; date: string } | null>(null)

  const dias = useMemo(
    () => (modo === 'semana' ? weekOf(ancora) : monthGrid(ancora)),
    [ancora, modo],
  )
  const hoje = todayIso()
  const temAlgo = agenda.some((it) => dias.includes(it.date))

  /** O mês da âncora — no modo mensal, os dias das pontas são dos vizinhos. */
  const mesAncora = ancora.slice(0, 7)

  const rotulo = useMemo(() => {
    if (modo === 'mes') {
      const [y, m] = ancora.split('-').map(Number)
      const nome = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
      return nome.charAt(0).toUpperCase() + nome.slice(1)
    }
    const [ini, fim] = [dias[0], dias[dias.length - 1]]
    const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
    return `${fmt(ini)} — ${fmt(fim)}`
  }, [dias, modo, ancora])

  function andar(passo: -1 | 1) {
    setAncora((atual) =>
      modo === 'semana' ? addDays(atual, passo * 7) : addMonths(atual, passo),
    )
  }

  return (
    <>
      <PageHeader
        kicker="Agenda"
        title={modo === 'semana' ? 'Agenda da semana' : 'Agenda do mês'}
        subtitle="Turnos da equipe e compromissos do dia a dia, tudo num lugar só."
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[168px]">
              <Segmented
                value={modo}
                onChange={setModo}
                size="sm"
                options={[
                  { id: 'semana' as const, label: 'Semana' },
                  { id: 'mes' as const, label: 'Mês' },
                ]}
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-blush-100 bg-white/70 p-1 backdrop-blur-sm">
              <button
                onClick={() => andar(-1)}
                aria-label={modo === 'semana' ? 'Semana anterior' : 'Mês anterior'}
                className="flex rounded-[9px] p-1.5 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
              >
                <Chevron dir="left" />
              </button>
              <span className="min-w-[124px] text-center font-display text-[15px] font-semibold tabular-nums">
                {rotulo}
              </span>
              <button
                onClick={() => andar(1)}
                aria-label={modo === 'semana' ? 'Próxima semana' : 'Próximo mês'}
                className="flex rounded-[9px] p-1.5 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
              >
                <Chevron dir="right" />
              </button>
            </div>

            {/* Só aparece fora do período atual: é atalho, não decoração. */}
            {!dias.includes(hoje) ? (
              <button
                onClick={() => setAncora(todayIso())}
                className="min-h-[36px] rounded-[10px] border border-blush-100 bg-white/70 px-3 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-blush-50 hover:text-blush-600"
              >
                Hoje
              </button>
            ) : null}

            <PrimaryButton onClick={() => setEditando({ date: hoje })}>
              <PlusIcon />
              <span className="hidden sm:inline">Novo item</span>
            </PrimaryButton>
          </div>
        }
      />

      {/* Duas formas para o mesmo mês. Grade de 7 colunas a partir de `sm`,
          que é onde ela cabe sem espremer. No celular, 7 colunas ficariam com
          ~50px cada — ilegíveis, e a rolagem lateral que resolveria isso é
          invisível para quem não sabe que ela existe. Ali o mês vira lista dos
          dias que têm algo, que é como se lê agenda em tela estreita. */}
      {modo === 'mes' ? (
        <>
        <ListaMes
          dias={dias}
          agenda={agenda}
          hoje={hoje}
          mesAncora={mesAncora}
          people={people}
          onAbrir={(item, date) => setEditando({ item, date })}
        />
        <div className="hidden sm:block">
          <div>
            <div className="mb-1.5 grid grid-cols-7 gap-px">
              {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
                <span
                  key={d}
                  className="text-center text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-dim"
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[20px] border border-blush-100 bg-blush-100 shadow-petal">
              {dias.map((dia, i) => (
                <CelulaMes
                  key={dia}
                  dia={dia}
                  indice={i}
                  itens={agendaOfDay(agenda, dia)}
                  ehHoje={dia === hoje}
                  doMes={dia.slice(0, 7) === mesAncora}
                  onAbrir={(item) => setEditando({ item, date: dia })}
                  onAdicionar={() => setEditando({ date: dia })}
                />
              ))}
            </div>
          </div>
        </div>
        </>
      ) : (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7 lg:gap-px lg:overflow-hidden lg:rounded-[20px] lg:border lg:border-blush-100 lg:bg-blush-100 lg:shadow-petal">
        {dias.map((dia, i) => {
          const doDia = agendaOfDay(agenda, dia)
          const ehHoje = dia === hoje
          const fimDeSemana = i === 0 || i === 6

          return (
            <div
              key={dia}
              className={`rise-in flex min-h-[168px] flex-col rounded-2xl lg:rounded-none ${
                ehHoje ? 'bg-blush-50' : fimDeSemana ? 'bg-surface-sunken' : 'bg-white'
              } ${ehHoje ? 'ring-1 ring-inset ring-blush-200 lg:ring-0' : 'border border-blush-100 lg:border-0'}`}
              style={{ ['--i' as string]: i }}
            >
              <div
                className={`flex items-baseline justify-between gap-2 px-3.5 pt-3 ${
                  ehHoje ? 'border-b-2 border-blush-400 pb-2.5' : 'pb-3'
                }`}
              >
                <span
                  className={`text-[10.5px] font-medium uppercase tracking-[0.12em] ${
                    ehHoje ? 'text-blush-600' : 'text-ink-dim'
                  }`}
                >
                  {weekdayAbbr(dia)}
                </span>
                <span
                  className={`font-display text-[19px] font-semibold tabular-nums ${
                    ehHoje ? 'text-blush-600' : 'text-ink-soft'
                  }`}
                >
                  {dia.slice(8, 10)}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2.5">
                {doDia.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setEditando({ item: it, date: dia })}
                    className="rounded-lg border-l-2 border-blush-400 bg-blush-50/60 py-1.5 pl-2.5 pr-2 text-left transition-colors hover:bg-blush-50"
                  >
                    {it.time ? (
                      <p className="text-[11.5px] font-semibold tabular-nums text-blush-600">
                        {it.time}
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-[13px] leading-tight">{it.title}</p>
                    {it.personIds.length > 0 ? (
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-faint">
                        {it.personIds
                          .map((id) => people.find((p) => p.id === id)?.name.split(' ')[0])
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    ) : null}
                  </button>
                ))}

                {/* Discreto mas sempre presente: esconder atrás de hover
                    deixaria a ação invisível no celular. */}
                <button
                  onClick={() => setEditando({ date: dia })}
                  aria-label={`Adicionar item em ${dia.slice(8, 10)}`}
                  className="mt-auto rounded-lg border border-dashed border-blush-200/70 py-1.5 text-[11.5px] text-ink-dim transition-colors hover:border-blush-300 hover:bg-blush-50 hover:text-blush-600"
                >
                  + item
                </button>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {!temAlgo ? (
        <p className="mt-5 text-center text-[13px] text-ink-faint">
          {modo === 'semana'
            ? 'Nada nesta semana. Clique em “+ item” num dia para anotar um turno ou um compromisso.'
            : 'Nada neste mês. Clique num dia para anotar um turno ou um compromisso.'}
        </p>
      ) : null}

      {editando ? (
        <AgendaItemSheet
          initial={editando.item}
          date={editando.date}
          people={people}
          onSave={(it) => {
            onSave(it)
            setEditando(null)
          }}
          onDelete={
            editando.item
              ? () => {
                  onDelete(editando.item!.id)
                  setEditando(null)
                }
              : undefined
          }
          onClose={() => setEditando(null)}
          onError={onError}
        />
      ) : null}
    </>
  )
}

/**
 * O mês no celular: só os dias que têm algo, em lista.
 *
 * Uma grade de 7 colunas numa tela de 390px daria células de ~50px — não cabe
 * nem o horário. E a alternativa (rolar de lado) é invisível para quem não
 * sabe que existe. A lista mostra a mesma informação no formato que a tela
 * comporta, com data por extenso em vez de posição na grade.
 *
 * Dias vazios não entram: numa lista eles seriam 20 linhas em branco, enquanto
 * na grade o vazio é informação (dá para ver de relance onde há folga).
 */
function ListaMes({
  dias,
  agenda,
  hoje,
  mesAncora,
  people,
  onAbrir,
}: {
  dias: string[]
  agenda: AgendaItem[]
  hoje: string
  mesAncora: string
  people: Person[]
  onAbrir: (item: AgendaItem, date: string) => void
}) {
  // Só os dias do mês em foco: os vizinhos que completam a grade apareceriam
  // aqui como "31 de agosto" no meio da lista de setembro, sem contexto.
  const comItens = dias
    .filter((d) => d.slice(0, 7) === mesAncora)
    .map((d) => ({ dia: d, itens: agendaOfDay(agenda, d) }))
    .filter(({ itens }) => itens.length > 0)

  if (comItens.length === 0) return null

  return (
    <div className="flex flex-col gap-2 sm:hidden">
      {comItens.map(({ dia, itens }, i) => {
        const ehHoje = dia === hoje
        return (
          <div
            key={dia}
            className={`rise-in overflow-hidden rounded-2xl border bg-white ${
              ehHoje ? 'border-blush-200 ring-1 ring-inset ring-blush-200' : 'border-blush-100'
            }`}
            style={{ ['--i' as string]: i }}
          >
            <div
              className={`flex items-baseline gap-2 px-3.5 py-2 ${
                ehHoje ? 'bg-blush-50' : 'bg-surface-sunken'
              }`}
            >
              <span
                className={`font-display text-[16px] font-semibold tabular-nums ${
                  ehHoje ? 'text-blush-600' : 'text-ink-soft'
                }`}
              >
                {Number(dia.slice(8, 10))}
              </span>
              <span
                className={`text-[11px] font-medium uppercase tracking-[0.12em] ${
                  ehHoje ? 'text-blush-600' : 'text-ink-dim'
                }`}
              >
                {weekdayAbbr(dia)}
                {ehHoje ? ' · hoje' : ''}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 p-2.5">
              {itens.map((it) => (
                <button
                  key={it.id}
                  onClick={() => onAbrir(it, dia)}
                  className="rounded-lg border-l-2 border-blush-400 bg-blush-50/60 py-1.5 pl-2.5 pr-2 text-left transition-colors hover:bg-blush-50"
                >
                  {it.time ? (
                    <p className="text-[11.5px] font-semibold tabular-nums text-blush-600">
                      {it.time}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[13px] leading-tight">{it.title}</p>
                  {it.personIds.length > 0 ? (
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-faint">
                      {it.personIds
                        .map((id) => people.find((p) => p.id === id)?.name.split(' ')[0])
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Um dia na grade do mês.
 *
 * Cabe menos que na semana, então o item mostra só horário e título — sem a
 * linha de quem participa. Acima de três itens vira "+N", para uma segunda
 * sem compromisso não empurrar a grade inteira para baixo.
 */
function CelulaMes({
  dia,
  indice,
  itens,
  ehHoje,
  doMes,
  onAbrir,
  onAdicionar,
}: {
  dia: string
  indice: number
  itens: AgendaItem[]
  ehHoje: boolean
  doMes: boolean
  onAbrir: (item: AgendaItem) => void
  onAdicionar: () => void
}) {
  const VISIVEIS = 3
  const sobra = itens.length - VISIVEIS
  const mostrados = sobra > 0 ? itens.slice(0, VISIVEIS) : itens

  return (
    <div
      className={`rise-in flex min-h-[104px] flex-col ${
        ehHoje ? 'bg-blush-50' : doMes ? 'bg-white' : 'bg-surface-sunken'
      }`}
      style={{ ['--i' as string]: indice % 7 }}
    >
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span
          className={`font-display text-[13px] font-semibold tabular-nums ${
            ehHoje
              ? 'flex h-[22px] w-[22px] items-center justify-center rounded-full bg-blush-400 text-white'
              : doMes
                ? 'text-ink-soft'
                : 'text-ink-dim'
          }`}
        >
          {Number(dia.slice(8, 10))}
        </span>
        {/* Sem rótulo visível: o alvo é a célula inteira, este "+" só marca
            onde clicar quando o dia está vazio. */}
        <button
          onClick={onAdicionar}
          aria-label={`Adicionar item em ${dia}`}
          className="rounded-md px-1 text-[13px] leading-none text-ink-dim transition-colors hover:bg-blush-100 hover:text-blush-600"
        >
          +
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 px-1.5 pb-1.5 pt-1">
        {mostrados.map((it) => (
          <button
            key={it.id}
            onClick={() => onAbrir(it)}
            title={[it.time, it.title].filter(Boolean).join(' · ')}
            className="rounded border-l-2 border-blush-400 bg-blush-50/70 py-[3px] pl-1.5 pr-1 text-left transition-colors hover:bg-blush-100"
          >
            <p className="truncate text-[11px] leading-tight">
              {it.time ? (
                <span className="font-semibold tabular-nums text-blush-600">
                  {it.time.slice(0, 5)}{' '}
                </span>
              ) : null}
              {it.title}
            </p>
          </button>
        ))}

        {sobra > 0 ? (
          <button
            onClick={() => onAbrir(itens[VISIVEIS])}
            className="rounded px-1.5 py-[2px] text-left text-[10.5px] font-medium text-ink-faint transition-colors hover:text-blush-600"
          >
            +{sobra} {sobra === 1 ? 'item' : 'itens'}
          </button>
        ) : null}

        {/* Área clicável no vazio: no mês a célula é pequena demais para
            depender de um botão tracejado como na semana. */}
        {itens.length === 0 ? (
          <button
            onClick={onAdicionar}
            aria-label={`Adicionar item em ${dia}`}
            className="flex-1 rounded transition-colors hover:bg-blush-50/60"
          />
        ) : null}
      </div>
    </div>
  )
}

function AgendaItemSheet({
  initial,
  date: dateInicial,
  people,
  onSave,
  onDelete,
  onClose,
  onError,
}: {
  initial?: AgendaItem
  date: string
  people: Person[]
  onSave: (it: AgendaItem) => void
  onDelete?: () => void
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [time, setTime] = useState(initial?.time ?? '')
  const [date, setDate] = useState(initial?.date ?? dateInicial)
  const [personIds, setPersonIds] = useState<string[]>(initial?.personIds ?? [])

  function toggle(id: string) {
    setPersonIds((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    )
  }

  function confirm() {
    if (!title.trim()) {
      onError('Falta o que fazer.')
      return
    }
    onSave({
      id: initial?.id ?? uid(),
      date,
      title: title.trim(),
      time: time.trim(),
      personIds,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <Sheet
      title={initial ? 'Editar item' : 'Novo item'}
      subtitle="Um turno de equipe ou um lembrete do dia a dia da empresa."
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
            onClick={confirm}
            className="min-h-[44px] flex-1 rounded-[11px] bg-ink px-4 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover"
          >
            {initial ? 'Salvar' : 'Adicionar'}
          </button>
        </>
      }
    >
      <label className="flex flex-col gap-[7px]">
        <Label>O que é</Label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ex: Loja Centro · Buscar roupas no Brás · Entrega de tecidos"
          className={fieldClass}
          autoFocus
        />
      </label>

      <div className="flex gap-3">
        <label className="flex w-[150px] flex-col gap-[7px]">
          <Label optional>Horário</Label>
          <input
            value={time}
            onChange={(e) => setTime(digitsToTimeRange(e.target.value))}
            inputMode="numeric"
            placeholder="09:00-18:00"
            aria-label="Horário"
            className={`${fieldClass} tabular-nums`}
          />
        </label>
        <label className="flex flex-1 flex-col gap-[7px]">
          <Label>Dia</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <Label optional>Com quem</Label>
        <div className="flex flex-wrap gap-1.5">
          {people.length === 0 ? (
            <p className="text-[12.5px] text-ink-dim">
              Cadastre a equipe na aba Pagamentos para marcar alguém aqui.
            </p>
          ) : (
            people.map((p) => {
              const ativo = personIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={ativo}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    ativo
                      ? 'border-blush-300 bg-blush-100 text-blush-600'
                      : 'border-blush-100 bg-white text-ink-faint hover:border-blush-200 hover:text-ink-soft'
                  }`}
                >
                  {p.name.split(' ')[0]}
                </button>
              )
            })
          )}
        </div>
      </div>

      {initial && onDelete ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Excluir este item?')) onDelete()
          }}
          className="self-center text-[13px] text-ink-dim underline-offset-4 transition-colors hover:text-late hover:underline"
        >
          Excluir
        </button>
      ) : null}
    </Sheet>
  )
}
