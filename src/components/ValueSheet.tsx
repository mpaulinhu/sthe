import { useState } from 'react'
import { Sheet, Label, Segmented, fieldClass } from './Sheet'
import { MoneyInput } from './MoneyInput'
import { formatMoney } from '../lib/calc'
import { centsToNumber, numberToCents } from '../lib/money'
import {
  KIND_HINT,
  KIND_LABEL,
  KIND_ORDER,
  PAYMENT_METHODS,
  defaultKindFor,
  type EntryKind,
  type PaymentMethod,
  type Person,
} from '../lib/types'
import type { PersonSummary } from '../lib/calc'

export interface ValueResult {
  cents: number
  kind: EntryKind
  method: PaymentMethod
  date: string
  obs: string
  receiptName: string
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Sheet de valor em dois modos:
 *  - 'pagar'  → registra um pagamento; vem pré-preenchido com o que falta
 *  - 'lancar' → cria um lançamento novo, com o seletor de tipo no topo
 */
export function ValueSheet({
  mode,
  person,
  summary,
  onConfirm,
  onClose,
  onError,
}: {
  mode: 'pagar' | 'lancar'
  person: Person
  summary: PersonSummary
  onConfirm: (r: ValueResult) => void
  onClose: () => void
  onError: (msg: string) => void
}) {
  const falta = numberToCents(summary.falta)

  const [cents, setCents] = useState(mode === 'pagar' ? falta : 0)
  const [kind, setKind] = useState<EntryKind>(defaultKindFor(person.contract))
  const [method, setMethod] = useState<PaymentMethod>('Pix')
  const [date, setDate] = useState(todayIso())
  const [obs, setObs] = useState('')
  const [receiptName, setReceiptName] = useState('')

  const isPagar = mode === 'pagar'

  function confirm() {
    if (cents <= 0) {
      onError('Coloque um valor.')
      return
    }
    onConfirm({ cents, kind, method, date, obs, receiptName })
  }

  return (
    <Sheet
      title={isPagar ? 'Registrar pagamento' : 'Lançar valor'}
      subtitle={`${person.name}${summary.falta > 0 ? ` · falta ${formatMoney(summary.falta)}` : ''}`}
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
            {isPagar ? 'Confirmar' : 'Lançar'} {formatMoney(centsToNumber(cents))}
          </button>
        </>
      }
    >
      {!isPagar ? (
        <div className="flex flex-col gap-2">
          <Label>Tipo de lançamento</Label>
          <div className="flex flex-wrap gap-1.5">
            {KIND_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`rounded-full border px-3 py-2 text-[13px] font-medium transition-colors ${
                  kind === k
                    ? 'border-butterfly-200 bg-butterfly-50 text-butterfly-600'
                    : 'border-cream-deep bg-white text-ink-faint hover:text-ink-soft'
                }`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <p className="text-[12.5px] leading-normal text-ink-dim">{KIND_HINT[kind]}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label>{isPagar ? 'Quanto você pagou' : 'Valor'}</Label>
        <MoneyInput cents={cents} onChange={setCents} autoFocus label="Valor" variant="display" />
        {isPagar && falta > 0 ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setCents(falta)}
              className="rounded-[9px] border border-cream-deep bg-white px-[11px] py-[7px] text-[12.5px] text-ink-soft transition-colors hover:bg-cream"
            >
              Tudo · {formatMoney(summary.falta)}
            </button>
            <button
              type="button"
              onClick={() => setCents(Math.round(falta / 2))}
              className="rounded-[9px] border border-cream-deep bg-white px-[11px] py-[7px] text-[12.5px] text-ink-soft transition-colors hover:bg-cream"
            >
              Metade
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Como pagou</Label>
        <Segmented
          size="sm"
          value={method}
          onChange={setMethod}
          options={PAYMENT_METHODS.map((m) => ({ id: m, label: m }))}
        />
      </div>

      <label className="flex flex-col gap-[7px]">
        <Label>Data</Label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={fieldClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <Label optional>Comprovante</Label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-line bg-cream p-[13px] text-[13.5px] text-ink-soft transition-colors hover:border-butterfly-200 hover:bg-butterfly-50">
          <svg
            viewBox="0 0 18 18"
            className="h-4 w-4 shrink-0 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M9 12.5V4M9 4L5.5 7.5M9 4l3.5 3.5" />
            <path d="M3 12.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5" />
          </svg>
          <span className="min-w-0 flex-1 truncate">
            {receiptName || 'Anexar foto ou PDF'}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setReceiptName(e.target.files?.[0]?.name ?? '')}
          />
        </label>
      </div>

      <label className="flex flex-col gap-[7px]">
        <Label optional>Observação</Label>
        <textarea
          rows={2}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="ex: 3 diárias da semana passada"
          className={`${fieldClass} resize-none text-[14px] leading-normal`}
        />
      </label>
    </Sheet>
  )
}
