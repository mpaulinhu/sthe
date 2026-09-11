import { useMemo, useState } from 'react'
import { PageHeader, PlusIcon, PrimaryButton, Chevron } from '../components/Shell'
import { Sheet, Label, fieldClass } from '../components/Sheet'
import { addDays, agendaOfDay, todayIso, weekdayAbbr, weekOf } from '../lib/business'
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
  // A agenda anda por semana, não por mês: é assim que se lê tanto uma
  // escala de turno quanto uma lista de "o que fazer nos próximos dias".
  const [ancora, setAncora] = useState(todayIso)
  const [editando, setEditando] = useState<{ item?: AgendaItem; date: string } | null>(null)

  const dias = useMemo(() => weekOf(ancora), [ancora])
  const hoje = todayIso()
  const temAlgo = agenda.some((it) => dias.includes(it.date))

  const rotulo = useMemo(() => {
    const [ini, fim] = [dias[0], dias[6]]
    const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
    return `${fmt(ini)} — ${fmt(fim)}`
  }, [dias])

  return (
    <>
      <PageHeader
        kicker="Agenda"
        title="Agenda da semana"
        subtitle="Turnos da equipe e compromissos do dia a dia, tudo num lugar só."
        aside={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-blush-100 bg-white/70 p-1 backdrop-blur-sm">
              <button
                onClick={() => setAncora(addDays(ancora, -7))}
                aria-label="Semana anterior"
                className="flex rounded-[9px] p-1.5 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
              >
                <Chevron dir="left" />
              </button>
              <span className="min-w-[124px] text-center font-display text-[15px] font-semibold tabular-nums">
                {rotulo}
              </span>
              <button
                onClick={() => setAncora(addDays(ancora, 7))}
                aria-label="Próxima semana"
                className="flex rounded-[9px] p-1.5 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
              >
                <Chevron dir="right" />
              </button>
            </div>
            <PrimaryButton onClick={() => setEditando({ date: hoje })}>
              <PlusIcon />
              <span className="hidden sm:inline">Novo item</span>
            </PrimaryButton>
          </div>
        }
      />

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

      {!temAlgo ? (
        <p className="mt-5 text-center text-[13px] text-ink-faint">
          Nada nesta semana. Clique em “+ item” num dia para anotar um turno ou um compromisso.
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
