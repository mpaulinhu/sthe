import { useState } from 'react'
import { Sheet, Label, Segmented, fieldClass } from './Sheet'
import { MoneyInput } from './MoneyInput'
import { formatMoney } from '../lib/calc'
import { centsToNumber, numberToCents } from '../lib/money'
import { compressImage, dataUrlKb } from '../lib/image'
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
  /** Comprovante já comprimido (data URL), quando ela anexou um. */
  receiptImage: string
  /** Só no modo 'pagar': seguir para a tela de assinatura depois de registrar. */
  colherAssinatura: boolean
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
  const base = numberToCents(person.baseAmount)
  // Quem tem vale recebe em duas etapas. O campo já vem com a etapa certa: o
  // vale enquanto ele não fechou, o restante depois — assim ela confirma em vez
  // de calcular de cabeça quanto ainda falta de cada parte.
  const sugestao = numberToCents(summary.sugestaoPagamento)
  const faltaVale = numberToCents(summary.faltaVale)
  const pagandoVale = faltaVale > 0 && sugestao === faltaVale && faltaVale < falta

  const kindInicial = defaultKindFor(person.contract)

  // Ao lançar, já vem preenchido com o valor combinado no cadastro (salário
  // mensal, diária ou referência) — é para isso que aquele campo existe.
  // Ela só ajusta quando o mês foge do padrão, em vez de redigitar sempre.
  const [cents, setCents] = useState(mode === 'pagar' ? sugestao : base)
  const [kind, setKind] = useState<EntryKind>(kindInicial)
  // A forma habitual da pessoa já vem escolhida — trocar aqui vale só para
  // este pagamento, sem mexer no cadastro dela.
  const [method, setMethod] = useState<PaymentMethod>(person.method ?? 'Pix')
  const [date, setDate] = useState(todayIso())
  const [obs, setObs] = useState('')
  const [receiptName, setReceiptName] = useState('')
  const [receiptImage, setReceiptImage] = useState('')
  const [comprimindo, setComprimindo] = useState(false)
  // Ao pagar, colher a assinatura é o padrão — é o que dá valor de recibo ao
  // registro. Dá para desmarcar quando ela não está presente na hora.
  const [colherAssinatura, setColherAssinatura] = useState(true)

  const isPagar = mode === 'pagar'

  async function anexar(file: File | undefined) {
    if (!file) return
    setComprimindo(true)
    try {
      setReceiptImage(await compressImage(file))
      setReceiptName(file.name)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Não consegui anexar essa imagem.')
    } finally {
      setComprimindo(false)
    }
  }

  function confirm() {
    if (cents <= 0) {
      onError('Coloque um valor.')
      return
    }
    onConfirm({
      cents,
      kind,
      method,
      date,
      obs,
      receiptName,
      receiptImage,
      colherAssinatura: isPagar && colherAssinatura,
    })
  }

  return (
    <Sheet
      title={isPagar && pagandoVale ? 'Pagar o vale' : isPagar ? 'Registrar pagamento' : 'Lançar valor'}
      subtitle={
        // Dizer qual etapa está sendo paga evita a dúvida de olhar um valor
        // menor que o do mês e não saber se faltou alguma coisa.
        isPagar && pagandoVale
          ? `${person.name} · vale de ${formatMoney(summary.valorVale)} · sobra ${formatMoney(summary.falta - summary.faltaVale)} para depois`
          : `${person.name}${summary.falta > 0 ? ` · falta ${formatMoney(summary.falta)}` : ''}`
      }
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
                onClick={() => {
                  // O valor base só vale para o tipo padrão da pessoa. Trocar
                  // para vale/desconto/reembolso zera, para ela não confirmar
                  // sem querer um desconto do tamanho do salário.
                  if (k !== kind) setCents(k === kindInicial ? base : 0)
                  setKind(k)
                }}
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

        {/* Atalhos de diária: o valor base é de UM dia, e ela quase sempre
            lança vários de uma vez. Multiplicar aqui evita conta de cabeça. */}
        {!isPagar && person.contract === 'diarista' && base > 0 && kind === 'diaria' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12.5px] text-ink-dim">
              {formatMoney(person.baseAmount)} por dia ·
            </span>
            {[1, 5, 10, 20, 22].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setCents(base * n)
                  if (!obs.trim()) setObs(`${n} ${n === 1 ? 'diária' : 'diárias'}`)
                }}
                className="rounded-[9px] border border-cream-deep bg-white px-2.5 py-[5px] text-[12.5px] text-ink-soft transition-colors hover:bg-cream"
              >
                {n}×
              </button>
            ))}
          </div>
        ) : null}

        {isPagar && falta > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {/* O vale vem primeiro quando ainda está em aberto: é a etapa que
                ela está pagando agora, e deixá-lo depois de "Tudo" faria o
                atalho mais provável ser o segundo da fila. */}
            {faltaVale > 0 && faltaVale < falta ? (
              <button
                type="button"
                onClick={() => setCents(faltaVale)}
                className="rounded-[9px] border border-butterfly-200 bg-butterfly-50 px-[11px] py-[7px] text-[12.5px] font-medium text-butterfly-600 transition-colors hover:bg-butterfly-100"
              >
                Vale · {formatMoney(summary.faltaVale)}
              </button>
            ) : null}
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
        <Label optional>Comprovante do pagamento</Label>

        {receiptImage ? (
          // Preview: é a confirmação de que anexou o print certo — sem isso ela
          // só veria um nome de arquivo e descobriria o erro tarde demais.
          <div className="flex items-start gap-3 rounded-xl border border-cream-deep bg-cream p-2.5">
            <img
              src={receiptImage}
              alt="Comprovante anexado"
              className="h-[68px] w-[68px] shrink-0 rounded-lg border border-cream-deep object-cover"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-[13px] font-medium">{receiptName}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-dim">
                {dataUrlKb(receiptImage)} KB · guardado no aparelho
              </p>
              <button
                type="button"
                onClick={() => {
                  setReceiptImage('')
                  setReceiptName('')
                }}
                className="mt-1.5 rounded-md text-[12px] text-ink-faint underline-offset-4 transition-colors hover:text-late hover:underline"
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <label
            className={`flex items-center gap-2.5 rounded-xl border border-dashed border-line bg-cream p-[13px] text-[13.5px] text-ink-soft transition-colors ${
              comprimindo
                ? 'cursor-wait opacity-60'
                : 'cursor-pointer hover:border-butterfly-200 hover:bg-butterfly-50'
            }`}
          >
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
              {comprimindo ? 'Preparando a imagem…' : 'Anexar print do Pix ou foto'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={comprimindo}
              onChange={(e) => {
                void anexar(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>

      {/* Só ao pagar: lançar um valor previsto não tem o que assinar ainda. */}
      {isPagar ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={colherAssinatura}
          aria-label="Colher assinatura de recebimento"
          onClick={() => setColherAssinatura((v) => !v)}
          className="flex items-start gap-2.5 rounded-[12px] border border-cream-deep bg-cream px-3.5 py-3 text-left transition-colors hover:border-butterfly-200"
        >
          <span
            className={`mt-px flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md border transition-colors ${
              colherAssinatura
                ? 'border-butterfly-500 bg-butterfly-500 text-white'
                : 'border-line bg-white'
            }`}
          >
            <svg
              viewBox="0 0 14 14"
              className="h-2.5 w-2.5"
              style={{ opacity: colherAssinatura ? 1 : 0 }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2.5 7.5l3 3 6-6.5" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium leading-snug">
              Colher assinatura de recebimento
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-ink-dim">
              {colherAssinatura
                ? 'Ela assina no seu celular e o recibo é emitido na hora.'
                : 'Sem assinatura, fica só o seu registro do pagamento.'}
            </span>
          </span>
        </button>
      ) : null}

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
