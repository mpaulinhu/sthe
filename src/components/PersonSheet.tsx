import { useMemo, useState } from 'react'
import { Sheet, Label, Segmented, fieldClass } from './Sheet'
import { MoneyInput } from './MoneyInput'
import { centsToNumber, numberToCents } from '../lib/money'
import { formatMoney, formatShortDate, resolvePayDate } from '../lib/calc'
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
import { compressAvatar } from '../lib/image'
import { initials } from './Avatar'

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
  // Vale: opcional, e por isso começa desligado em quem nunca teve um.
  const [temVale, setTemVale] = useState(Boolean(initial?.advance))
  const [valeDia, setValeDia] = useState(initial?.advance ? String(initial.advance.day) : '20')
  const [valeModo, setValeModo] = useState<PayDayMode>(initial?.advance?.mode ?? 'fixo')
  const [valePercent, setValePercent] = useState(
    initial?.advance ? String(initial.advance.percent) : '40',
  )
  const [method, setMethod] = useState<PaymentMethod>(initial?.method ?? 'Pix')
  const [doc, setDoc] = useState(initial?.doc ? maskCpf(initial.doc) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [photo, setPhoto] = useState(initial?.photo ?? '')
  const [carregandoFoto, setCarregandoFoto] = useState(false)

  const docLimpo = onlyDigits(doc)
  const docErrado = docLimpo.length === 11 && !isValidCpf(docLimpo)

  async function escolherFoto(file: File | undefined) {
    if (!file) return
    setCarregandoFoto(true)
    try {
      setPhoto(await compressAvatar(file))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Não consegui usar essa foto.')
    } finally {
      setCarregandoFoto(false)
    }
  }

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
      advance: temVale
        ? {
            day: Math.min(31, Math.max(1, Number(valeDia) || 20)),
            mode: valeModo,
            percent: Math.min(99, Math.max(1, Number(valePercent) || 40)),
          }
        : undefined,
      method,
      doc: docLimpo || undefined,
      photo: photo || undefined,
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
      {/* Foto ao lado do nome: é a identidade da pessoa, e junto do campo que
          a nomeia fica óbvio a quem ela pertence — além de aproveitar a
          largura que o campo de nome sozinho desperdiçaria. */}
      <div className="flex items-end gap-3.5">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <label
            className={`relative flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full ring-4 ring-blush-200/50 transition-colors ${
              carregandoFoto ? 'cursor-wait opacity-60' : 'cursor-pointer'
            } ${photo ? '' : 'border border-dashed border-line bg-cream hover:border-butterfly-200 hover:bg-butterfly-50'}`}
          >
            {photo ? (
              <img src={photo} alt="" aria-hidden className="h-full w-full object-cover" />
            ) : name.trim() ? (
              <span className="text-[17px] font-semibold text-blush-600">
                {initials(name)}
              </span>
            ) : (
              <svg
                viewBox="0 0 20 20"
                className="h-5 w-5 text-ink-faint"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="10" cy="7" r="3" />
                <path d="M4 16.5c0-2.8 2.7-4.5 6-4.5s6 1.7 6 4.5" />
              </svg>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={carregandoFoto}
              onChange={(e) => {
                void escolherFoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => (photo ? setPhoto('') : undefined)}
            className={`text-[11.5px] transition-colors ${
              photo
                ? 'text-ink-faint hover:text-late hover:underline'
                : 'cursor-default text-ink-dim'
            }`}
            disabled={!photo}
          >
            {carregandoFoto ? 'carregando…' : photo ? 'remover' : 'foto'}
          </button>
        </div>

        <label className="flex min-w-0 flex-1 flex-col gap-[7px] pb-[22px]">
          <Label>Nome</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Ana Paula Ribeiro"
            className={fieldClass}
            autoFocus
          />
        </label>
      </div>

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

      {/* Vale: um segundo pagamento no meio do mês.
          Percentual do salário, não valor em reais — assim um aumento não
          deixa o adiantamento defasado sem ninguém perceber. */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setTemVale(!temVale)}
          aria-pressed={temVale}
          className="flex items-center gap-2.5 self-start text-left"
        >
          <span
            className={`flex h-[22px] w-[38px] shrink-0 items-center rounded-full px-[3px] transition-colors ${
              temVale ? 'bg-butterfly-500' : 'bg-cream-deep'
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                temVale ? 'translate-x-[16px]' : ''
              }`}
            />
          </span>
          <span className="text-[13.5px] text-ink-soft">Paga vale no meio do mês</span>
        </button>

        {temVale ? (
          <div className="mt-1 flex flex-col gap-3 rounded-[12px] border border-cream-deep bg-cream px-3.5 py-3">
            <Segmented options={PAY_DAY_MODES} value={valeModo} onChange={setValeModo} size="sm" />

            <div className="flex items-center gap-3">
              <div className="w-[80px]">
                <input
                  value={valeDia}
                  onChange={(e) => setValeDia(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  inputMode="numeric"
                  placeholder="20"
                  aria-label={valeModo === 'util' ? 'Nº do dia útil do vale' : 'Dia do vale'}
                  className={`${fieldClass} text-[15px] tabular-nums`}
                />
              </div>
              <span className="text-[12.5px] leading-snug text-ink-faint">
                {valeModo === 'util'
                  ? `${Number(valeDia) || 20}º dia útil`
                  : `todo dia ${Number(valeDia) || 20}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-[80px]">
                <input
                  value={valePercent}
                  onChange={(e) => setValePercent(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  inputMode="numeric"
                  placeholder="40"
                  aria-label="Percentual do salário no vale"
                  className={`${fieldClass} text-[15px] tabular-nums`}
                />
              </div>
              <span className="text-[12.5px] leading-snug text-ink-faint">
                % do salário
                {centsToNumber(cents) > 0 ? (
                  <strong className="ml-1 font-medium text-ink-soft">
                    {formatMoney(
                      Math.round(centsToNumber(cents) * ((Number(valePercent) || 0) / 100) * 100) / 100,
                    )}
                  </strong>
                ) : null}
              </span>
            </div>
          </div>
        ) : null}
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
