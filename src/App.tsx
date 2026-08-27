import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ButterflyMark, EmptyState } from './components/Primitives'
import { PersonCard } from './components/PersonCard'
import { PersonForm } from './components/PersonForm'
import { EntryForm } from './components/EntryForm'
import { SettingsMenu } from './components/SettingsMenu'
import { HistoryModal } from './components/HistoryModal'
import { exportDb, loadDb, parseImportedDb, saveDb, uid } from './lib/storage'
import {
  buildRepeatedEntries,
  currentPeriod,
  formatMoney,
  formatPeriod,
  shiftPeriod,
  summarizeMonth,
  summarizePerson,
} from './lib/calc'
import type { Database, Entry, Person } from './lib/types'

type Filter = 'todos' | 'pendentes' | 'quitados'

export default function App() {
  const [db, setDb] = useState<Database>(() => loadDb())
  const [period, setPeriod] = useState(currentPeriod)
  const [filter, setFilter] = useState<Filter>('todos')
  const [personForm, setPersonForm] = useState<{ open: boolean; person?: Person }>({ open: false })
  const [entryForm, setEntryForm] = useState<{ person: Person; entry?: Entry } | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveDb(db)
  }, [db])

  const people = useMemo(() => db.people.filter((p) => p.active), [db.people])

  const summaries = useMemo(
    () =>
      people
        .map((p) => summarizePerson(p, db.entries, period))
        .sort((a, b) => {
          if (a.atrasado !== b.atrasado) return a.atrasado ? -1 : 1
          if (a.quitado !== b.quitado) return a.quitado ? 1 : -1
          return a.person.payDay - b.person.payDay || a.person.name.localeCompare(b.person.name)
        }),
    [people, db.entries, period],
  )

  const month = useMemo(() => summarizeMonth(summaries), [summaries])

  const visible = summaries.filter((s) =>
    filter === 'pendentes' ? !s.quitado : filter === 'quitados' ? s.quitado : true,
  )

  // Mês virado e ainda sem nada lançado: oferece trazer o do mês passado.
  const mesVazio = summaries.every((s) => s.entries.length === 0)
  const repetiveis = useMemo(
    () =>
      mesVazio
        ? buildRepeatedEntries(db.entries, shiftPeriod(period, -1), period, people, uid)
        : [],
    [mesVazio, db.entries, period, people],
  )

  function upsertPerson(person: Person) {
    setDb((d) => ({
      ...d,
      people: d.people.some((p) => p.id === person.id)
        ? d.people.map((p) => (p.id === person.id ? person : p))
        : [...d.people, person],
    }))
  }

  function archivePerson(id: string) {
    setDb((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === id ? { ...p, active: false } : p)),
    }))
  }

  function upsertEntry(entry: Entry) {
    setDb((d) => ({
      ...d,
      entries: d.entries.some((e) => e.id === entry.id)
        ? d.entries.map((e) => (e.id === entry.id ? entry : e))
        : [...d.entries, entry],
    }))
  }

  function toggleEntry(entry: Entry) {
    upsertEntry({ ...entry, paid: !entry.paid })
  }

  function deleteEntry(entry: Entry) {
    if (!confirm('Excluir este lançamento?')) return
    setDb((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entry.id) }))
  }

  function quitarPessoa(personId: string) {
    setDb((d) => ({
      ...d,
      entries: d.entries.map((e) =>
        e.personId === personId && e.period === period && !e.paid ? { ...e, paid: true } : e,
      ),
    }))
  }

  function repetirMesAnterior() {
    setDb((d) => ({ ...d, entries: [...d.entries, ...repetiveis] }))
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseImportedDb(String(reader.result))
        if (confirm('Isso substitui os dados atuais. Continuar?')) setDb(imported)
      } catch {
        alert('Não consegui ler esse arquivo. Use um backup exportado aqui mesmo.')
      }
    }
    reader.readAsText(file)
  }

  const ehMesAtual = period === currentPeriod()

  return (
    <div className="min-h-full">
      <header className="no-print sticky top-0 z-30 border-b border-cream-deep/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-3.5 sm:px-8">
          <ButterflyMark className="h-7 w-7 shrink-0" />
          <h1 className="mr-auto font-display text-lg leading-none tracking-tight text-ink">STHE</h1>

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

          <Button variant="primary" onClick={() => setPersonForm({ open: true })}>
            Nova pessoa
          </Button>

          <SettingsMenu
            onExport={() => exportDb(db)}
            onImport={() => fileRef.current?.click()}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-16 pt-8 sm:px-8">
        {/* Título do mês + o número que importa, sem competir com nada em volta. */}
        <div className="mb-8">
          <div className="no-print mb-1 flex items-center gap-1">
            <button
              onClick={() => setPeriod(shiftPeriod(period, -1))}
              aria-label="Mês anterior"
              className="-ml-1.5 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-cream-deep hover:text-ink"
            >
              <Chevron dir="left" />
            </button>
            <h2 className="font-display text-2xl leading-none text-ink sm:text-3xl">
              {formatPeriod(period)}
            </h2>
            <button
              onClick={() => setPeriod(shiftPeriod(period, 1))}
              aria-label="Próximo mês"
              className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-cream-deep hover:text-ink"
            >
              <Chevron dir="right" />
            </button>
            {!ehMesAtual ? (
              <button
                onClick={() => setPeriod(currentPeriod())}
                className="ml-1 rounded-lg px-2.5 py-1 text-xs font-medium text-butterfly-500 transition-colors hover:bg-butterfly-50"
              >
                voltar para hoje
              </button>
            ) : null}
          </div>

          {people.length > 0 ? (
            <p className="text-[15px] leading-relaxed text-ink-soft">
              {month.falta > 0 ? (
                <>
                  Falta pagar{' '}
                  <strong className="font-semibold tabular-nums text-ink">
                    {formatMoney(month.falta)}
                  </strong>
                  {month.pago > 0 ? (
                    <>
                      {' '}
                      · já saiu{' '}
                      <span className="tabular-nums text-paid">{formatMoney(month.pago)}</span>
                    </>
                  ) : null}
                  {month.pessoasAtrasadas > 0 ? (
                    <>
                      {' '}
                      ·{' '}
                      <span className="font-medium text-late">
                        {month.pessoasAtrasadas} em atraso
                      </span>
                    </>
                  ) : null}
                </>
              ) : month.total > 0 ? (
                <>
                  Tudo pago neste mês ·{' '}
                  <strong className="font-semibold tabular-nums text-ink">
                    {formatMoney(month.total)}
                  </strong>
                </>
              ) : (
                'Nenhum pagamento lançado ainda.'
              )}
            </p>
          ) : null}
        </div>

        {/* Atalho que evita redigitar tudo quando o mês vira. */}
        {repetiveis.length > 0 ? (
          <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-butterfly-100 bg-butterfly-50/60 px-5 py-4">
            <p className="flex-1 text-sm leading-relaxed text-ink-soft">
              Repetir os pagamentos de {formatPeriod(shiftPeriod(period, -1)).toLowerCase()}?{' '}
              <span className="text-ink-faint">
                {repetiveis.length} {repetiveis.length === 1 ? 'lançamento' : 'lançamentos'}, como
                não pagos.
              </span>
            </p>
            <Button variant="primary" onClick={repetirMesAnterior}>
              Repetir
            </Button>
          </div>
        ) : null}

        {people.length > 0 ? (
          <div className="no-print mb-4 flex gap-1">
            {(['todos', 'pendentes', 'quitados'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-ink text-cream'
                    : 'text-ink-faint hover:bg-cream-deep hover:text-ink'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        ) : null}

        {people.length === 0 ? (
          <EmptyState
            title="Comece adicionando quem trabalha com você"
            description="Cadastre cada pessoa uma vez, com o valor e o dia de pagar. Depois é só lançar os pagamentos do mês e marcar o que já saiu."
            action={
              <Button variant="primary" onClick={() => setPersonForm({ open: true })}>
                Adicionar primeira pessoa
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={filter === 'quitados' ? 'Ninguém quitado ainda' : 'Nada pendente'}
            description={
              filter === 'quitados'
                ? 'Quando você marcar alguém como pago, ela aparece aqui.'
                : 'Todo mundo já está pago neste mês.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((s) => (
              <PersonCard
                key={s.person.id}
                summary={s}
                onAddEntry={() => setEntryForm({ person: s.person })}
                onEditPerson={() => setPersonForm({ open: true, person: s.person })}
                onEditEntry={(entry) => setEntryForm({ person: s.person, entry })}
                onToggleEntry={toggleEntry}
                onDeleteEntry={deleteEntry}
                onQuitar={() => quitarPessoa(s.person.id)}
              />
            ))}
          </div>
        )}
      </main>

      {personForm.open ? (
        <PersonForm
          initial={personForm.person}
          onSave={upsertPerson}
          onArchive={
            personForm.person ? () => archivePerson(personForm.person!.id) : undefined
          }
          onClose={() => setPersonForm({ open: false })}
        />
      ) : null}

      {entryForm ? (
        <EntryForm
          person={entryForm.person}
          period={period}
          initial={entryForm.entry}
          onSave={upsertEntry}
          onClose={() => setEntryForm(null)}
        />
      ) : null}

      {historyOpen ? (
        <HistoryModal db={db} currentPeriod={period} onClose={() => setHistoryOpen(false)} />
      ) : null}
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d={dir === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
