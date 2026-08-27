import { useState } from 'react'
import { Sheet, Label, Segmented, fieldClass } from './Sheet'
import { MoneyInput } from './MoneyInput'
import { centsToNumber, numberToCents } from '../lib/money'
import { CONTRACT_SHORT, type ContractType, type Person } from '../lib/types'
import { uid } from '../lib/storage'

const CONTRACTS: { id: ContractType; label: string }[] = [
  { id: 'fixo', label: CONTRACT_SHORT.fixo },
  { id: 'diarista', label: CONTRACT_SHORT.diarista },
  { id: 'freelancer', label: CONTRACT_SHORT.freelancer },
]

const BASE_LABEL: Record<ContractType, string> = {
  fixo: 'Salário mensal',
  diarista: 'Valor da diária',
  freelancer: 'Valor de referência',
}

/** Explica para que o valor serve: ele pré-preenche o lançamento depois. */
const BASE_HINT: Record<ContractType, string> = {
  fixo: 'Já vem preenchido ao lançar o salário do mês.',
  diarista: 'Valor de um dia. Ao lançar, dá para multiplicar pelos dias.',
  freelancer: 'Sugestão ao lançar. Pode deixar vazio se varia sempre.',
}

export function PersonSheet({
  initial,
  onSave,
  onArchive,
  onClose,
  onError,
}: {
  initial?: Person
  onSave: (person: Person) => void
  onArchive?: () => void
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [contract, setContract] = useState<ContractType>(initial?.contract ?? 'fixo')
  const [cents, setCents] = useState(numberToCents(initial?.baseAmount ?? 0))
  const [payDay, setPayDay] = useState(initial ? String(initial.payDay) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function confirm() {
    if (!name.trim()) {
      onError('Falta o nome.')
      return
    }
    const dia = Math.min(31, Math.max(1, Number(payDay) || 5))
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      role: role.trim(),
      contract,
      baseAmount: centsToNumber(cents),
      payDay: dia,
      active: initial?.active ?? true,
      notes: notes.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <Sheet
      title={initial ? 'Editar pessoa' : 'Nova pessoa'}
      subtitle={initial ? initial.name : 'Quem trabalha com você e como recebe.'}
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
            {initial ? 'Salvar' : 'Adicionar pessoa'}
          </button>
        </>
      }
    >
      <label className="flex flex-col gap-[7px]">
        <Label>Nome</Label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Ana Paula Ribeiro"
          className={fieldClass}
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-[7px]">
        <Label>Função</Label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="ex: Atendimento"
          className={fieldClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <Label>Como ela recebe</Label>
        <Segmented options={CONTRACTS} value={contract} onChange={setContract} />
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-[7px]">
          <Label>{BASE_LABEL[contract]}</Label>
          <MoneyInput cents={cents} onChange={setCents} label={BASE_LABEL[contract]} />
          <span className="text-[12px] leading-snug text-ink-dim">{BASE_HINT[contract]}</span>
        </label>
        <label className="flex w-[120px] flex-col gap-[7px]">
          <Label>Dia de pagar</Label>
          <input
            value={payDay}
            onChange={(e) => setPayDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            inputMode="numeric"
            placeholder="05"
            className={`${fieldClass} text-[15px] tabular-nums`}
          />
        </label>
      </div>

      <label className="flex flex-col gap-[7px]">
        <Label optional>Observação</Label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ex: chave PIX, combinados"
          className={`${fieldClass} resize-none text-[14px] leading-normal`}
        />
      </label>

      {initial && onArchive ? (
        <button
          type="button"
          onClick={() => {
            if (confirm_(`Tirar ${initial.name} da lista? O histórico continua salvo.`)) {
              onArchive()
            }
          }}
          className="self-center text-[13px] text-ink-dim underline-offset-4 transition-colors hover:text-late hover:underline"
        >
          Não trabalha mais aqui
        </button>
      ) : null}
    </Sheet>
  )
}

/** Isolado para não colidir com a função `confirm` do componente. */
function confirm_(msg: string): boolean {
  return window.confirm(msg)
}
