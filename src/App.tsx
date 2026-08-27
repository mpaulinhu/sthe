import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ButterflyMark, Card, EmptyState } from './components/Primitives'
import { PersonCard } from './components/PersonCard'
import { PersonForm } from './components/PersonForm'
import { EntryForm } from './components/EntryForm'
import { exportDb, loadDb, parseImportedDb, saveDb } from './lib/storage'
import {
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
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveDb(db)
  }, [db])

  const summaries = useMemo(
    () =>
      db.people
        .filter((p) => p.active)
        .map((p) => summarizePerson(p, db.entries, period))
        .sort((a, b) => {
          if (a.atrasado !== b.atrasado) return a.atrasado ? -1 : 1
          if (a.quitado !== b.quitado) return a.quitado ? 1 : -1
          return a.person.payDay - b.person.payDay || a.person.name.localeCompare(b.person.name)
        }),
    [db, period],
  )

  const month = useMemo(() => summarizeMonth(summaries), [summaries])

  const visible = summaries.filter((s) =>
    filter === 'pendentes' ? !s.quitado : filter === 'quitados' ? s.quitado : true,
  )

  function upsertPerson(person: Person) {
    setDb((d) => ({
      ...d,
      people: d.people.some((p) => p.id === person.id)
        ? d.people.map((p) => (p.id === person.id ? person : p))
        : [...d.people, person],
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

  const activeCount = db.people.filter((p) => p.active).length

  return (
    <div className="min-h-full">
      <header className="no-print border-b border-cream-deep bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-4 sm:gap-3 sm:px-6">
          <ButterflyMark className="h-8 w-8 shrink-0" />
          <div className="mr-auto">
            <h1 className="font-display text-xl leading-none tracking-tight text-ink">STHE</h1>
            <p className="mt-1 text-xs text-ink-soft">Controle de pagamentos</p>
          </div>
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
          <Button
            onClick={() => fileRef.current?.click()}
            title="Restaurar um backup"
            className="px-3 sm:px-4"
          >
            Importar
          </Button>
          <Button
            onClick={() => exportDb(db)}
            title="Baixar uma cópia de segurança"
            className="px-3 sm:px-4"
          >
            Backup
          </Button>
          <Button
            variant="primary"
            onClick={() => setPersonForm({ open: true })}
            className="px-3 sm:px-4"
          >
            + Pessoa
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="no-print mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-cream-deep bg-white p-1">
            <button
              onClick={() => setPeriod(shiftPeriod(period, -1))}
              aria-label="Mês anterior"
              className="rounded-lg px-2.5 py-1.5 text-ink-soft transition-colors hover:bg-cream hover:text-ink"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="min-w-36 text-center text-sm font-semibold text-ink">{formatPeriod(period)}</span>
            <button
              onClick={() => setPeriod(shiftPeriod(period, 1))}
              aria-label="Próximo mês"
              className="rounded-lg px-2.5 py-1.5 text-ink-soft transition-colors hover:bg-cream hover:text-ink"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {period !== currentPeriod() ? (
            <Button onClick={() => setPeriod(currentPeriod())}>Mês atual</Button>
          ) : null}

          <div className="ml-auto flex gap-1 rounded-xl border border-cream-deep bg-white p-1">
            {(['todos', 'pendentes', 'quitados'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  filter === f ? 'bg-butterfly-50 text-butterfly-600' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <Card className="mb-6 overflow-hidden">
          <div className="grid grid-cols-2 divide-cream-deep sm:grid-cols-4 sm:divide-x">
            <Stat label="Total do mês" value={formatMoney(month.total)} />
            <Stat label="Já pago" value={formatMoney(month.pago)} tone="paid" />
            <Stat label="Falta pagar" value={formatMoney(month.falta)} tone={month.falta > 0 ? 'due' : 'muted'} />
            <Stat
              label="Pessoas"
              value={`${month.pessoasQuitadas} de ${summaries.length}`}
              caption={
                month.pessoasAtrasadas > 0
                  ? `${month.pessoasAtrasadas} em atraso`
                  : month.pessoasPendentes > 0
                    ? `${month.pessoasPendentes} pendente${month.pessoasPendentes > 1 ? 's' : ''}`
                    : 'tudo em dia'
              }
              tone={month.pessoasAtrasadas > 0 ? 'late' : 'muted'}
            />
          </div>
        </Card>

        {activeCount === 0 ? (
          <Card>
            <EmptyState
              title="Comece adicionando quem trabalha com você"
              description="Cadastre cada pessoa uma vez, com o valor e o dia de pagar. Depois é só lançar os pagamentos de cada mês e marcar o que já saiu."
              action={
                <Button variant="primary" onClick={() => setPersonForm({ open: true })}>
                  Adicionar primeira pessoa
                </Button>
              }
            />
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState
              title="Nada por aqui neste filtro"
              description={
                filter === 'quitados'
                  ? 'Ninguém está com o mês quitado ainda.'
                  : 'Todo mundo já está pago neste mês.'
              }
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
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

        <p className="no-print mt-8 text-center text-xs leading-relaxed text-ink-faint">
          Os dados ficam salvos neste navegador, neste computador.
          <br />
          Use o botão <strong className="font-semibold">Backup</strong> de vez em quando para não perder nada.
        </p>
      </main>

      {personForm.open ? (
        <PersonForm
          initial={personForm.person}
          onSave={upsertPerson}
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
    </div>
  )
}

function Stat({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string
  value: string
  caption?: string
  tone?: 'default' | 'paid' | 'due' | 'late' | 'muted'
}) {
  const toneClass = {
    default: 'text-ink',
    paid: 'text-paid',
    due: 'text-due',
    late: 'text-late',
    muted: 'text-ink',
  }[tone]
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 font-display text-xl leading-tight tabular-nums sm:text-2xl ${toneClass}`}>{value}</p>
      {caption ? <p className="mt-0.5 text-xs text-ink-soft">{caption}</p> : null}
    </div>
  )
}
