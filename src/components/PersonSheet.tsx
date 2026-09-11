import { useMemo, useState } from 'react'
import { Sheet, Label, Segmented, fieldClass } from './Sheet'
import { MoneyInput } from './MoneyInput'
import { centsToNumber, numberToCents } from '../lib/money'
import { formatShortDate, resolvePayDate } from '../lib/calc'
import {
  CONTRACT_SHORT,
  PAYMENT_METHODS,
  type ContractType,
  type PayDayMode,
  type PaymentMethod,
  type Person,
} from '../lib/types'
import { uid } from '../lib/storage'
import { isValidCpf, maskCpf, onlyDigits } from '../lib/receipt'

const CONTRACTS: { id: ContractType; label: string }[] = [
  { id: 'fixo', label: CONTRACT_SHORT.fixo },
  { id: 'diarista', label: CONTRACT_SHORT.diarista },
  { id: 'freelancer', label: CONTRACT_SHORT.freelancer },
]

const PAY_DAY_MODES: { id: PayDayMode; label: string }[] = [
  { id: 'fixo', label: 'Dia fixo' },
  { id: 'util', label: 'Dia útil' },
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
  period,
  workDays,
  onSave,
  onArchive,
  onReactivate,
  onClose,
  onError,
}: {
  initial?: Person
  /** Mês exibido em Pagamentos — usado só para a prévia de "cai em tal dia". */
  period: string
  /** Calendário de dias úteis da empresa (Configurações), para resolver o modo 'util'. */
  workDays: number[]
  onSave: (person: Person) => void
  onArchive?: () => void
  /** Presente só quando `initial.active` é false — volta a pessoa pro banco ativo. */
  onReactivate?: () => void
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [contract, setContract] = useState<ContractType>(initial?.contract ?? 'fixo')
  const [cents, setCents] = useState(numberToCents(initial?.baseAmount ?? 0))
  const [payDay, setPayDay] = useState(initial ? String(initial.payDay) : '')
  const [payDayMode, setPayDayMode] = useState<PayDayMode>(initial?.payDayMode ?? 'fixo')
  const [method, setMethod] = useState<PaymentMethod>(initial?.method ?? 'Pix')
  const [doc, setDoc] = useState(initial?.doc ? maskCpf(initial.doc) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const docLimpo = onlyDigits(doc)
  const docErrado = docLimpo.length === 11 && !isValidCpf(docLimpo)

  const diaDigitado = Math.min(31, Math.max(1, Number(payDay) || 5))

  // Prévia de em que dia isso cai no mês aberto — é o que torna visível, na
  // hora do cadastro, que "dia 31" ou "5º dia útil" nem sempre significa o
  // que parece: o mês pode ser mais curto, ou não ter dias úteis suficientes.
  const dataResolvida = useMemo(
    () => resolvePayDate(period, { payDay: diaDigitado, payDayMode }, workDays),
    [period, diaDigitado, payDayMode, workDays],
  )
  const diaResolvido = Number(dataResolvida.slice(8, 10))
  const ajustado = payDayMode === 'fixo' ? diaResolvido !== diaDigitado : null

  function confirm() {
    if (!name.trim()) {
      onError('Falta o nome.')
      return
    }
    // CPF é opcional aqui (dá para preencher na hora de assinar), mas se foi
    // digitado tem que estar certo — guardar um número inválido no cadastro
    // significaria emitir recibos com identificação errada.
    if (docLimpo && !isValidCpf(docLimpo)) {
      onError('Confira o CPF — os dígitos não batem.')
      return
    }
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      role: role.trim(),
      contract,
      baseAmount: centsToNumber(cents),
      payDay: diaDigitado,
      payDayMode,
      method,
      doc: docLimpo || undefined,
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
        <Label>Tipo de contrato</Label>
        <Segmented options={CONTRACTS} value={contract} onChange={setContract} />
      </div>

      <label className="flex flex-col gap-[7px]">
        <Label>{BASE_LABEL[contract]}</Label>
        <MoneyInput cents={cents} onChange={setCents} label={BASE_LABEL[contract]} />
        <span className="text-[12px] leading-snug text-ink-dim">{BASE_HINT[contract]}</span>
      </label>

      <div className="flex flex-col gap-2">
        <Label>Dia de pagar</Label>
        <Segmented options={PAY_DAY_MODES} value={payDayMode} onChange={setPayDayMode} size="sm" />

        <div className="flex items-center gap-3">
          <div className="flex w-[90px] flex-col gap-[7px]">
            <input
              value={payDay}
              onChange={(e) => setPayDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
              placeholder="05"
              aria-label={payDayMode === 'util' ? 'Nº do dia útil' : 'Dia do mês'}
              className={`${fieldClass} text-[15px] tabular-nums`}
            />
          </div>
          <span className="text-[12.5px] leading-snug text-ink-faint">
            {payDayMode === 'util'
              ? `${diaDigitado}º dia útil do mês`
              : `todo dia ${diaDigitado}`}
          </span>
        </div>

        {/* Prévia sempre visível, não só quando ajusta: mostra em que dia real
            isso cai neste mês — "5º dia útil" ou "dia 31" não são óbvios de
            cabeça, e é melhor ela ver antes de salvar do que descobrir depois
            que a pessoa "sumiu" da lista de vencimentos do mês. */}
        <p className={`text-[12px] leading-snug ${ajustado ? 'text-due' : 'text-ink-dim'}`}>
          {ajustado
            ? `Este mês não tem dia ${diaDigitado} — cai em ${formatShortDate(dataResolvida)}.`
            : `Neste mês, cai em ${formatShortDate(dataResolvida)}.`}
        </p>
      </div>

      {/* A forma habitual vira o padrão ao pagar e alimenta o resumo de
          "quanto separar em dinheiro" na lista. */}
      <div className="flex flex-col gap-2">
        <Label>Como ela recebe</Label>
        <Segmented
          size="sm"
          value={method}
          onChange={setMethod}
          options={PAYMENT_METHODS.map((m) => ({ id: m, label: m }))}
        />
      </div>

      {/* Guardado aqui para não ser pedido toda vez que ela assinar um recibo.
          É o que identifica quem recebeu, e sem ele o recibo perde força. */}
      <label className="flex flex-col gap-[7px]">
        <Label optional>CPF</Label>
        <input
          value={doc}
          onChange={(e) => setDoc(maskCpf(e.target.value))}
          inputMode="numeric"
          placeholder="000.000.000-00"
          aria-invalid={docErrado}
          className={`${fieldClass} tabular-nums ${docErrado ? 'border-late' : ''}`}
        />
        <span className={`text-[12px] leading-snug ${docErrado ? 'text-late' : 'text-ink-dim'}`}>
          {docErrado
            ? 'Esse CPF não é válido — confira os números.'
            : 'Usado nos recibos assinados. Dá para preencher depois, na hora de assinar.'}
        </span>
      </label>

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

      {initial && onArchive && initial.active ? (
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

      {initial && onReactivate && !initial.active ? (
        <button
          type="button"
          onClick={onReactivate}
          className="self-center text-[13px] font-medium text-butterfly-600 underline-offset-4 transition-colors hover:underline"
        >
          Voltou a trabalhar aqui
        </button>
      ) : null}
    </Sheet>
  )
}

/** Isolado para não colidir com a função `confirm` do componente. */
function confirm_(msg: string): boolean {
  return window.confirm(msg)
}
