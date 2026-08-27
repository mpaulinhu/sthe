import { useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { PersonRow } from './components/PersonRow'
import { PersonSheet } from './components/PersonSheet'
import { ValueSheet, type ValueResult } from './components/ValueSheet'
import { Toast } from './components/Toast'
import { DemoNotice } from './components/DemoNotice'
import { ButterflyMark } from './components/Primitives'
import { exportDb, loadDb, parseImportedDb, saveDb, uid } from './lib/storage'
import { centsToNumber } from './lib/money'
import {
  buildGroups,
  buildRepeatedEntries,
  currentPeriod,
  formatMoney,
  formatPeriod,
  monthStats,
  shiftPeriod,
  sortSummaries,
  statusOf,
  summarizePerson,
  type FilterKey,
  type SortKey,
} from './lib/calc'
import {
  KIND_EFFECT,
  KIND_LABEL,
  type ContractType,
  type Database,
  type Entry,
  type Person,
} from './lib/types'

const FILTROS: { id: FilterKey; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'atraso', label: 'Em atraso' },
  { id: 'apagar', label: 'A pagar' },
  { id: 'pagos', label: 'Pagos' },
]

/**
 * Filtro por forma de contratação. É uma dimensão separada do status: ela pode
 * ver "só os diaristas que estão em atraso", por exemplo. Fica escondido
 * enquanto houver só um tipo cadastrado — aí não teria o que filtrar.
 */
const TIPOS: { id: ContractType | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todo mundo' },
  { id: 'fixo', label: 'Fixos' },
  { id: 'diarista', label: 'Diaristas' },
  { id: 'freelancer', label: 'Freelas' },
]

const ORDENS: { id: SortKey; label: string }[] = [
  { id: 'vencimento', label: 'Vencimento' },
  { id: 'valor', label: 'Maior valor' },
  { id: 'nome', label: 'Nome' },
]

type SheetState =
  | { mode: 'pagar' | 'lancar'; person: Person }
  | { mode: 'pessoa'; person?: Person }
  | null

export default function App() {
  const [db, setDb] = useState<Database>(() => loadDb())
  const [period, setPeriod] = useState(currentPeriod)
  const [filtro, setFiltro] = useState<FilterKey>('todos')
  const [tipo, setTipo] = useState<ContractType | 'todos'>('todos')
  const [sort, setSort] = useState<SortKey>('vencimento')
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState('')
  const [discreet, setDiscreet] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveDb(db)
  }, [db])

  const people = useMemo(() => db.people.filter((p) => p.active), [db.people])

  const summaries = useMemo(
    () => sortSummaries(people.map((p) => summarizePerson(p, db.entries, period)), sort),
    [people, db.entries, period, sort],
  )

  const stats = useMemo(() => monthStats(summaries), [summaries])

  // Os dois filtros se combinam e valem só para a LISTA. O resumo do mês lá em
  // cima continua somando todo mundo de propósito: é a resposta de "quanto
  // falta pagar no total" — se ele mudasse junto, ela perderia essa visão.
  const visiveis = useMemo(
    () =>
      summaries
        .filter((s) => filtro === 'todos' || statusOf(s) === filtro)
        .filter((s) => tipo === 'todos' || s.person.contract === tipo),
    [summaries, filtro, tipo],
  )

  const grupos = useMemo(() => buildGroups(visiveis), [visiveis])

  const mesVazio = summaries.every((s) => s.entries.length === 0)
  const repetiveis = useMemo(
    () =>
      mesVazio && people.length > 0
        ? buildRepeatedEntries(db.entries, shiftPeriod(period, -1), period, people, uid)
        : [],
    [mesVazio, db.entries, period, people],
  )

  // Quantas pessoas há de cada tipo — alimenta a contagem nos chips e decide
  // se vale mostrar o filtro (com um tipo só, não há o que separar).
  const contagemPorTipo = useMemo(() => {
    const acc = { fixo: 0, diarista: 0, freelancer: 0 } as Record<ContractType, number>
    people.forEach((p) => {
      acc[p.contract] += 1
    })
    return acc
  }, [people])

  const tiposPresentes = (Object.keys(contagemPorTipo) as ContractType[]).filter(
    (t) => contagemPorTipo[t] > 0,
  )
  const mostrarFiltroTipo = tiposPresentes.length > 1

  const progressoMes = stats.total > 0 ? Math.min(100, (stats.pago / stats.total) * 100) : 0
  const ehMesAtual = period === currentPeriod()
  const val = (v: number) => (discreet ? '••••' : formatMoney(v))

  function flash(msg: string) {
    setToast(msg)
  }

  function upsertPerson(person: Person) {
    setDb((d) => ({
      ...d,
      people: d.people.some((p) => p.id === person.id)
        ? d.people.map((p) => (p.id === person.id ? person : p))
        : [...d.people, person],
    }))
    const editando = db.people.some((p) => p.id === person.id)
    setSheet(null)
    flash(editando ? 'Dados atualizados.' : `${person.name.split(' ')[0]} entrou na lista.`)
  }

  function archivePerson(id: string) {
    const alvo = db.people.find((p) => p.id === id)
    setDb((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === id ? { ...p, active: false } : p)),
    }))
    setSheet(null)
    if (alvo) flash(`${alvo.name.split(' ')[0]} saiu da lista.`)
  }

  function toggleEntry(entry: Entry) {
    setDb((d) => ({
      ...d,
      entries: d.entries.map((e) => (e.id === entry.id ? { ...e, paid: !e.paid } : e)),
    }))
  }

  /**
   * Registra um pagamento. Se o valor cobre tudo que falta, quita os lançamentos
   * em aberto (guardando data e forma). Se cobre só parte, cria um "vale" já
   * pago — que abate do que falta sem inflar o total do mês.
   */
  function registrarPagamento(person: Person, r: ValueResult) {
    const resumo = summaries.find((s) => s.person.id === person.id)
    if (!resumo) return
    const valor = centsToNumber(r.cents)
    const quita = valor >= resumo.falta

    setDb((d) => {
      if (quita) {
        return {
          ...d,
          entries: d.entries.map((e) =>
            e.personId === person.id &&
            e.period === period &&
            !e.paid &&
            KIND_EFFECT[e.kind] !== 'abate'
              ? { ...e, paid: true, date: r.date, method: r.method, receiptName: r.receiptName || e.receiptName }
              : e,
          ),
        }
      }
      const vale: Entry = {
        id: uid(),
        personId: person.id,
        period,
        kind: 'vale',
        amount: valor,
        date: r.date,
        paid: true,
        description: r.obs.trim(),
        method: r.method,
        receiptName: r.receiptName || undefined,
        createdAt: new Date().toISOString(),
      }
      return { ...d, entries: [...d.entries, vale] }
    })

    setSheet(null)
    flash(
      quita
        ? `${person.name.split(' ')[0]} está quitada — ${formatMoney(valor)}`
        : `${formatMoney(valor)} registrado · falta ${formatMoney(resumo.falta - valor)}`,
    )
  }

  function lancarValor(person: Person, r: ValueResult) {
    const valor = centsToNumber(r.cents)
    const novo: Entry = {
      id: uid(),
      personId: person.id,
      period,
      kind: r.kind,
      amount: valor,
      date: r.date,
      paid: false,
      description: r.obs.trim(),
      receiptName: r.receiptName || undefined,
      createdAt: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, entries: [...d.entries, novo] }))
    setSheet(null)
    flash(`${KIND_LABEL[r.kind]} de ${formatMoney(valor)} lançado.`)
  }

  function repetirMesAnterior() {
    setDb((d) => ({ ...d, entries: [...d.entries, ...repetiveis] }))
    flash(`${repetiveis.length} lançamentos trazidos.`)
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseImportedDb(String(reader.result))
        if (window.confirm('Isso substitui os dados atuais. Continuar?')) {
          setDb(imported)
          flash('Dados restaurados.')
        }
      } catch {
        flash('Não consegui ler esse arquivo.')
      }
    }
    reader.readAsText(file)
  }

  const alvoSummary =
    sheet && sheet.mode !== 'pessoa'
      ? summaries.find((s) => s.person.id === sheet.person.id)
      : undefined

  return (
    <div className="flex min-h-screen items-stretch bg-cream text-[15px] text-ink">
      <Sidebar onExport={() => exportDb(db)} />

      <main className="flex min-w-0 flex-1 flex-col">
        {/*
          A barra atravessa a tela toda (fundo e borda), mas o conteúdo interno
          usa a mesma coluna de 1040px do corpo — senão o "Nova pessoa" fica
          jogado no canto, longe da lista, em telas largas.
        */}
        <header className="sticky top-0 z-20 border-b border-cream-deep bg-[rgba(250,248,244,0.88)] backdrop-blur-[10px]">
          <div className="mx-auto flex w-full max-w-[1040px] items-center gap-3.5 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPeriod(shiftPeriod(period, -1))}
              aria-label="Mês anterior"
              className="flex rounded-[9px] p-1.5 text-ink-faint transition-colors hover:bg-cream-deep hover:text-ink"
            >
              <Chevron dir="left" />
            </button>
            <h1 className="min-w-[130px] text-center font-display text-[23px] font-semibold tracking-[0.01em] sm:min-w-[172px]">
              {formatPeriod(period)}
            </h1>
            <button
              onClick={() => setPeriod(shiftPeriod(period, 1))}
              aria-label="Próximo mês"
              className="flex rounded-[9px] p-1.5 text-ink-faint transition-colors hover:bg-cream-deep hover:text-ink"
            >
              <Chevron dir="right" />
            </button>
          </div>

          {!ehMesAtual ? (
            <button
              onClick={() => setPeriod(currentPeriod())}
              className="hidden rounded-lg px-2.5 py-[5px] text-[12.5px] font-medium text-butterfly-500 transition-colors hover:bg-butterfly-50 sm:block"
            >
              voltar para hoje
            </button>
          ) : null}

          <div className="ml-auto flex items-center gap-2.5">
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => setDiscreet(!discreet)}
              aria-pressed={discreet}
              title={discreet ? 'Mostrar valores' : 'Esconder valores'}
              className={`flex rounded-[9px] p-2 transition-colors ${
                discreet ? 'bg-cream-deep text-ink' : 'text-ink-faint hover:bg-cream-deep hover:text-ink'
              }`}
            >
              <EyeIcon off={discreet} />
            </button>
            <button
              onClick={() => setSheet({ mode: 'pessoa' })}
              className="flex items-center gap-[7px] rounded-[11px] bg-ink px-[15px] py-[9px] text-[14px] font-medium text-cream transition-colors hover:bg-ink-hover"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M8 3.5v9M3.5 8h9" />
              </svg>
              <span className="hidden sm:inline">Nova pessoa</span>
            </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1040px] px-5 pb-16 pt-[34px] sm:px-8">
          <section className="flex flex-wrap items-end gap-x-10 gap-y-6 border-b border-cream-deep pb-[26px]">
            <div className="min-w-[260px]">
              <p className="mb-1.5 text-[12px] uppercase tracking-[0.1em] text-ink-faint">
                Falta pagar
              </p>
              <p className="text-[44px] font-semibold leading-none tracking-[-0.025em] tabular-nums">
                {val(stats.falta)}
              </p>
              <div className="mt-4 h-[5px] w-[300px] max-w-full overflow-hidden rounded-full bg-cream-deep">
                <div
                  className="h-full rounded-full bg-butterfly-500 transition-[width] duration-500"
                  style={{ width: `${progressoMes}%` }}
                />
              </div>
              <p className="mt-[9px] text-[13px] text-ink-faint">
                {val(stats.pago)} já pago de {val(stats.total)}
              </p>
            </div>

            <div className="flex gap-[34px] pb-1">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[12px] uppercase tracking-[0.1em] text-late">
                  <span className="h-1.5 w-1.5 rounded-full bg-late" aria-hidden />
                  Em atraso
                </p>
                <p className="text-[21px] font-semibold leading-tight tracking-[-0.015em] tabular-nums text-late">
                  {val(stats.atrasoTotal)}
                </p>
                <p className="mt-1 text-[13px] text-ink-faint">
                  {stats.atrasoCount} {stats.atrasoCount === 1 ? 'pessoa' : 'pessoas'}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] uppercase tracking-[0.1em] text-ink-faint">
                  Próximo
                </p>
                <p className="text-[21px] font-semibold leading-tight tracking-[-0.015em] tabular-nums">
                  {stats.proximo ? val(stats.proximo.falta) : '—'}
                </p>
                <p className="mt-1 text-[13px] text-ink-faint">
                  {stats.proximo
                    ? `dia ${stats.proximo.person.payDay} · ${stats.proximo.person.name.split(' ')[0]}`
                    : 'nada a vencer'}
                </p>
              </div>
            </div>
          </section>

          {repetiveis.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-butterfly-100 bg-butterfly-50/60 px-5 py-4">
              <p className="flex-1 text-[13.5px] leading-relaxed text-ink-soft">
                Repetir os pagamentos de {formatPeriod(shiftPeriod(period, -1)).toLowerCase()}?{' '}
                <span className="text-ink-dim">
                  {repetiveis.length} lançamentos, como não pagos.
                </span>
              </p>
              <button
                onClick={repetirMesAnterior}
                className="rounded-[10px] bg-ink px-3.5 py-2 text-[13.5px] font-medium text-cream transition-colors hover:bg-ink-hover"
              >
                Repetir
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 pb-2 pt-5">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                aria-pressed={filtro === f.id}
                className={`rounded-[9px] px-[13px] py-[7px] text-[13.5px] font-medium transition-colors ${
                  filtro === f.id ? 'bg-ink text-cream' : 'text-ink-faint hover:text-ink-soft'
                }`}
              >
                {f.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1">
              <span className="hidden text-[12px] text-ink-dim sm:inline">ordenar por</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Ordenar por"
                className="cursor-pointer rounded-[9px] border-0 bg-transparent py-[7px] pl-1 pr-1 text-[13px] font-medium text-ink-soft outline-none transition-colors hover:text-ink"
              >
                {ORDENS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mostrarFiltroTipo ? (
            <div className="flex flex-wrap items-center gap-1.5 pb-3.5">
              {TIPOS.filter((t) => t.id === 'todos' || contagemPorTipo[t.id] > 0).map((t) => {
                const ativo = tipo === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    aria-pressed={ativo}
                    className={`rounded-full border px-3 py-[5px] text-[12.5px] font-medium transition-colors ${
                      ativo
                        ? 'border-butterfly-200 bg-butterfly-50 text-butterfly-600'
                        : 'border-cream-deep bg-white text-ink-faint hover:text-ink-soft'
                    }`}
                  >
                    {t.label}
                    {t.id !== 'todos' ? (
                      <span className={ativo ? 'text-butterfly-500' : 'text-ink-dim'}>
                        {' '}
                        {contagemPorTipo[t.id]}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          {people.length === 0 || grupos.length === 0 ? (
            <Vazio
              titulo={
                people.length === 0
                  ? 'Comece adicionando quem trabalha com você'
                  : 'Nada por aqui neste filtro'
              }
              texto={
                people.length === 0
                  ? 'Cadastre cada pessoa uma vez, com o valor e o dia de pagar. Depois é só lançar os pagamentos do mês e marcar o que já saiu.'
                  : tipo !== 'todos' && filtro !== 'todos'
                    ? 'Nenhuma pessoa desse tipo nesta situação. Troque um dos dois filtros.'
                    : 'Troque o filtro para ver as outras pessoas.'
              }
              acao={
                people.length === 0 ? (
                  <button
                    onClick={() => setSheet({ mode: 'pessoa' })}
                    className="mt-2 rounded-[11px] bg-ink px-[15px] py-[9px] text-[14px] font-medium text-cream transition-colors hover:bg-ink-hover"
                  >
                    Adicionar primeira pessoa
                  </button>
                ) : null
              }
            />
          ) : (
            grupos.map((g) => (
              <section key={g.key} className="mb-[30px]">
                <div className="flex items-center gap-2 px-0.5 pb-2.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: g.cor }}
                    aria-hidden
                  />
                  <h2 className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                    {g.titulo}
                  </h2>
                  <span className="text-[12px] text-ink-dim">{g.items.length}</span>
                  <span className="h-px flex-1 bg-cream-deep" aria-hidden />
                  <span className="text-[13px] tabular-nums text-ink-faint">{val(g.soma)}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {g.items.map((s) => (
                    <PersonRow
                      key={s.person.id}
                      summary={s}
                      period={period}
                      discreet={discreet}
                      open={!!abertos[s.person.id]}
                      onToggle={() =>
                        setAbertos((a) => ({ ...a, [s.person.id]: !a[s.person.id] }))
                      }
                      onPagar={() => setSheet({ mode: 'pagar', person: s.person })}
                      onLancar={() => setSheet({ mode: 'lancar', person: s.person })}
                      onEditar={() => setSheet({ mode: 'pessoa', person: s.person })}
                      onToggleEntry={toggleEntry}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          <div className="flex justify-center pt-2 lg:hidden">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-[12.5px] text-ink-dim underline-offset-4 hover:underline"
            >
              Restaurar backup
            </button>
          </div>
        </div>
      </main>

      {sheet?.mode === 'pessoa' ? (
        <PersonSheet
          initial={sheet.person}
          onSave={upsertPerson}
          onArchive={sheet.person ? () => archivePerson(sheet.person!.id) : undefined}
          onClose={() => setSheet(null)}
          onError={flash}
        />
      ) : null}

      {sheet && sheet.mode !== 'pessoa' && alvoSummary ? (
        <ValueSheet
          mode={sheet.mode}
          person={sheet.person}
          summary={alvoSummary}
          onConfirm={(r) =>
            sheet.mode === 'pagar'
              ? registrarPagamento(sheet.person, r)
              : lancarValor(sheet.person, r)
          }
          onClose={() => setSheet(null)}
          onError={flash}
        />
      ) : null}

      <Toast message={toast} onDone={() => setToast('')} />

      {__DEMO__ ? <DemoNotice /> : null}
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
    </svg>
  )
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M1.5 9S4.5 3.5 9 3.5 16.5 9 16.5 9 13.5 14.5 9 14.5 1.5 9 1.5 9Z" />
      <circle cx="9" cy="9" r="2.5" />
      {off ? <path d="M3 15L15 3" /> : null}
    </svg>
  )
}

function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string
  texto: string
  acao?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-[70px] text-center">
      <ButterflyMark className="h-[34px] w-[34px] opacity-25" />
      <h3 className="mt-1 font-display text-[19px] font-semibold">{titulo}</h3>
      <p className="max-w-[320px] text-[13.5px] leading-relaxed text-ink-faint">{texto}</p>
      {acao}
    </div>
  )
}
