import { useState } from 'react'
import { Modal } from './Modal'
import { Button, Field, inputClass } from './Primitives'
import { KIND_HINT, KIND_LABEL, type Entry, type EntryKind, type Person } from '../lib/types'
import { uid } from '../lib/storage'
import { formatPeriod } from '../lib/calc'

function defaultDate(period: string, payDay: number): string {
  const [y, m] = period.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const day = Math.min(Math.max(payDay, 1), last)
  return `${period}-${String(day).padStart(2, '0')}`
}

export function EntryForm({
  person,
  period,
  initial,
  onSave,
  onClose,
}: {
  person: Person
  period: string
  initial?: Entry
  onSave: (entry: Entry) => void
  onClose: () => void
}) {
  const [kind, setKind] = useState<EntryKind>(
    initial?.kind ?? (person.contract === 'fixo' ? 'salario' : 'servico'),
  )
  const [amount, setAmount] = useState(
    String(initial?.amount ?? (person.contract === 'fixo' ? person.baseAmount || '' : person.baseAmount || '')),
  )
  const [date, setDate] = useState(initial?.date ?? defaultDate(period, person.payDay))
  const [paid, setPaid] = useState(initial?.paid ?? false)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState('')

  function submit() {
    const value = Number(amount.replace(',', '.'))
    if (!value || value <= 0) {
      setError('Coloque um valor maior que zero.')
      return
    }
    onSave({
      id: initial?.id ?? uid(),
      personId: person.id,
      period,
      kind,
      amount: value,
      date,
      paid,
      description: description.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  const kinds = Object.keys(KIND_LABEL) as EntryKind[]

  return (
    <Modal
      title={initial ? 'Editar lançamento' : `Lançamento para ${person.name}`}
      subtitle={`Competência: ${formatPeriod(period)}`}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Tipo" hint={KIND_HINT[kind]}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  kind === k
                    ? 'border-butterfly-400 bg-butterfly-50 text-butterfly-600'
                    : 'border-cream-deep bg-white text-ink-soft hover:bg-cream'
                }`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor">
            <input
              className={inputClass}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setError('')
              }}
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
            />
          </Field>
          <Field label="Data">
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Descrição" hint="Opcional — o que foi feito, referência do serviço.">
          <input
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: 3 diárias da semana, PIX enviado"
          />
        </Field>

        <button
          type="button"
          onClick={() => setPaid(!paid)}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
            paid ? 'border-paid/30 bg-paid-soft' : 'border-cream-deep bg-cream hover:bg-cream-deep'
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
              paid ? 'border-paid bg-paid text-white' : 'border-ink-faint bg-white'
            }`}
          >
            {paid ? (
              <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2.5 7.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>
          <span>
            <span className={`block text-sm font-semibold ${paid ? 'text-paid' : 'text-ink'}`}>
              {paid ? 'Já foi pago' : 'Ainda não paguei'}
            </span>
            <span className="block text-xs text-ink-soft">Toque para mudar.</span>
          </span>
        </button>

        {error ? <p className="text-sm font-medium text-late">{error}</p> : null}

        <div className="mt-1 flex gap-2">
          <Button type="submit" variant="primary" className="flex-1">
            {initial ? 'Salvar' : 'Adicionar lançamento'}
          </Button>
          <Button onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  )
}
