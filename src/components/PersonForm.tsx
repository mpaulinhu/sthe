import { useState } from 'react'
import { Modal } from './Modal'
import { Button, Field, inputClass } from './Primitives'
import { CONTRACT_LABEL, type ContractType, type Person } from '../lib/types'
import { uid } from '../lib/storage'

export function PersonForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Person
  onSave: (person: Person) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [contract, setContract] = useState<ContractType>(initial?.contract ?? 'fixo')
  const [baseAmount, setBaseAmount] = useState(String(initial?.baseAmount ?? ''))
  const [payDay, setPayDay] = useState(String(initial?.payDay ?? 5))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')

  function submit() {
    if (!name.trim()) {
      setError('Coloque pelo menos o nome.')
      return
    }
    const day = Number(payDay)
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      role: role.trim(),
      contract,
      baseAmount: Number(baseAmount.replace(',', '.')) || 0,
      payDay: day >= 1 && day <= 31 ? day : 5,
      active: initial?.active ?? true,
      notes: notes.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  const baseLabel =
    contract === 'fixo' ? 'Salário mensal' : contract === 'diarista' ? 'Valor da diária' : 'Valor de referência'

  return (
    <Modal
      title={initial ? 'Editar pessoa' : 'Nova pessoa'}
      subtitle="Quem trabalha com você e como o pagamento funciona."
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Nome">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="Ex: Ana Paula"
            autoFocus
          />
        </Field>

        <Field label="Função" hint="Opcional — ajuda a lembrar quem é quem.">
          <input
            className={inputClass}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ex: Atendimento, Costura, Social media"
          />
        </Field>

        <Field label="Como recebe">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CONTRACT_LABEL) as ContractType[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setContract(c)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  contract === c
                    ? 'border-butterfly-400 bg-butterfly-50 text-butterfly-600'
                    : 'border-cream-deep bg-white text-ink-soft hover:bg-cream'
                }`}
              >
                {CONTRACT_LABEL[c]}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={baseLabel} hint="Pode deixar 0 se varia todo mês.">
            <input
              className={inputClass}
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
          <Field label="Dia de pagar" hint="Serve para avisar de atraso.">
            <input
              className={inputClass}
              value={payDay}
              onChange={(e) => setPayDay(e.target.value)}
              inputMode="numeric"
              placeholder="5"
            />
          </Field>
        </div>

        <Field label="Observações">
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Chave PIX, combinados, horário..."
          />
        </Field>

        {error ? <p className="text-sm font-medium text-late">{error}</p> : null}

        <div className="mt-1 flex gap-2">
          <Button type="submit" variant="primary" className="flex-1">
            {initial ? 'Salvar alterações' : 'Adicionar pessoa'}
          </Button>
          <Button onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  )
}
