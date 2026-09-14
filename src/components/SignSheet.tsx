import { useMemo, useState } from 'react'
import { Sheet, Label, fieldClass } from './Sheet'
import { SignaturePad } from './SignaturePad'
import {
  formatMoney,
  formatPeriod,
  proportionalForPeriod,
  type Proporcional,
} from '../lib/calc'
import {
  isValidCpf,
  maskCpf,
  maskDoc,
  numeroPorExtenso,
  onlyDigits,
  valorPorExtenso,
} from '../lib/receipt'
import type { Company, Entry, PaymentMethod, Person } from '../lib/types'

export interface SignResult {
  signature: string
  doc: string
  termo: string
  amountText: string
  /** Marca o CPF para ser salvo no cadastro, evitando redigitar no mês seguinte. */
  guardarDoc: boolean
}

/**
 * O texto que ela lê e assina.
 *
 * É deliberadamente formal e específico: um recibo eletrônico vale como prova
 * na medida em que o aceite é inequívoco. Ele nomeia quem recebeu, quanto, a
 * que se refere, e declara a quitação daquele valor — a mesma estrutura de um
 * recibo de papel, que é o que um juiz espera reconhecer.
 */
/** "2026-10-20" → "20/10/2026". O termo não usa formato abreviado. */
function formatarData(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

export function montarTermo(
  nome: string,
  doc: string,
  valor: number,
  method: PaymentMethod,
  period: string,
  payer: Company,
  quita: boolean,
  saldoRestante: number,
  proporcional?: Proporcional | null,
  horasExtras?: Entry[],
): string {
  // Quem pagou entra no termo por nome e documento. Um recibo que não diz de
  // quem o dinheiro veio prova pouco — e é justamente essa parte que estava
  // chumbada no código antes.
  const de = payer.name
    ? `de ${payer.name}${payer.doc ? `, inscrita no ${payer.docType === 'cnpj' ? 'CNPJ' : 'CPF'} nº ${maskDoc(payer.doc, payer.docType)}` : ''}, `
    : ''

  // Um vale/adiantamento não quita o mês — dizer "plena e geral quitação"
  // nesse caso é juridicamente falso e enfraquece o recibo se for contestado.
  // A quitação declarada precisa ser só do valor recebido agora, com o saldo
  // do período explicitamente em aberto.
  const quitacao = quita
    ? 'dando plena e geral quitação do valor ora recebido'
    : `dando quitação apenas do valor ora recebido, a título de adiantamento, ` +
      `permanecendo em aberto o saldo de ${formatMoney(saldoRestante)} referente ao período`

  // Valor proporcional precisa dizer por quê. Um recibo de R$ 1.066,67 para
  // quem ganha R$ 2.000 levanta dúvida em qualquer conferência futura — e a
  // dúvida é o que enfraquece o documento. Declarar a base de cálculo no
  // próprio termo é o que torna o valor verificável anos depois, sem depender
  // de ninguém lembrar o que houve.
  const proporcionalidade = proporcional
    ? ` O valor corresponde ao período proporcional de ${proporcional.dias} ` +
      `(${numeroPorExtenso(proporcional.dias)}) dias sobre o mês comercial de ` +
      `${proporcional.base} dias, em razão ${
        proporcional.motivo === 'saida'
          ? 'do encerramento do vínculo'
          : proporcional.motivo === 'ambos'
            ? 'do início e do encerramento do vínculo'
            : 'do início do vínculo'
      } no curso do período.`
    : ''

  // Horas extras discriminadas. Um recibo que soma tudo num valor só não
  // permite conferir depois quantas horas foram pagas e a que percentual —
  // e é exatamente isso que se questiona numa divergência sobre jornada.
  const extras = (horasExtras ?? []).filter((e) => e.amount > 0)
  const totalExtras = extras.reduce((acc, e) => acc + e.amount, 0)
  const detalheExtras = extras.length
    ? ` Do valor acima, ${formatMoney(totalExtras)} (${valorPorExtenso(totalExtras)}) ` +
      `referem-se a horas extras: ${extras
        .map((e) => `${e.description || 'hora extra'} em ${formatarData(e.date)}`)
        .join('; ')}.`
    : ''

  return (
    `Eu, ${nome}, inscrita(o) no CPF nº ${maskCpf(doc)}, DECLARO ter recebido ` +
    `${de}a quantia de ${formatMoney(valor)} (${valorPorExtenso(valor)}), ` +
    `por meio de ${method}, referente aos serviços prestados no período de ` +
    `${formatPeriod(period)}, ${quitacao}.${proporcionalidade}${detalheExtras} ` +
    `Confirmo que a assinatura abaixo é de meu próprio punho e que assino ` +
    `eletronicamente, de forma livre e consciente, nos termos da Lei nº 14.063/2020.`
  )
}

/**
 * Etapa final do pagamento: a funcionária assina no celular confirmando que
 * recebeu. Separada do `ValueSheet` de propósito — este é o momento em que o
 * aparelho troca de mão, então a tela mostra só o que ela precisa ver e
 * nenhum controle que ela possa mexer sem querer.
 */
export function SignSheet({
  person,
  valor,
  method,
  period,
  company,
  quita,
  saldoRestante,
  horasExtras,
  onConfirm,
  onClose,
  onError,
  onIrParaConfig,
}: {
  person: Person
  valor: number
  method: PaymentMethod
  period: string
  company: Company
  /** Se este pagamento quita tudo que faltava no período, ou é parcial (vale). */
  quita: boolean
  /** Quanto ainda falta depois deste pagamento — só relevante quando parcial. */
  saldoRestante: number
  /** Horas extras cobertas por este pagamento, para o termo poder discriminá-las. */
  horasExtras?: Entry[]
  onConfirm: (r: SignResult) => void
  onClose: () => void
  onError: (msg: string) => void
  /** Atalho para preencher os dados de quem paga sem perder o pagamento. */
  onIrParaConfig: () => void
}) {
  const [signature, setSignature] = useState('')
  const [doc, setDoc] = useState(person.doc ? maskCpf(person.doc) : '')
  const [leu, setLeu] = useState(false)

  const docLimpo = onlyDigits(doc)
  const docOk = isValidCpf(docLimpo)

  // Calcula aqui em vez de receber por prop: o sheet já tem a pessoa e o mês,
  // que é tudo de que a conta precisa — e menos uma prop para alguém esquecer
  // de passar num caminho novo, deixando o recibo sem a justificativa.
  //
  // Só entra no termo quando o valor pago de fato corresponde ao proporcional:
  // num vale, ou num acerto ajustado à mão, declarar a base de cálculo seria
  // descrever uma conta que não foi a usada.
  const proporcionalDoMes = proportionalForPeriod(person, period)
  const proporcional =
    proporcionalDoMes && Math.abs(proporcionalDoMes.valor - valor) < 0.01
      ? proporcionalDoMes
      : null
  // Só mostra o erro depois que ela completou os 11 dígitos — reclamar de CPF
  // inválido enquanto ainda está digitando é ruído.
  const docErrado = docLimpo.length === 11 && !docOk

  const termo = useMemo(
    () =>
      docOk
        ? montarTermo(
            person.name,
            docLimpo,
            valor,
            method,
            period,
            company,
            quita,
            saldoRestante,
            proporcional,
            horasExtras,
          )
        : '',
    [
      person.name,
      docLimpo,
      docOk,
      valor,
      method,
      period,
      company,
      quita,
      saldoRestante,
      proporcional,
      horasExtras,
    ],
  )

  const pronto = docOk && leu && signature !== ''

  function confirmar() {
    if (!docOk) return onError('Confira o CPF — os dígitos não batem.')
    if (!leu) return onError('É preciso marcar a confirmação de leitura.')
    if (!signature) return onError('Falta a assinatura.')
    onConfirm({
      signature,
      doc: docLimpo,
      termo,
      amountText: valorPorExtenso(valor),
      guardarDoc: person.doc !== docLimpo,
    })
  }

  return (
    <Sheet
      title="Assinatura de recebimento"
      subtitle="Entregue o celular para quem está recebendo."
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
            onClick={confirmar}
            disabled={!pronto}
            className="min-h-[44px] flex-1 rounded-[11px] bg-ink px-4 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Assinar e emitir recibo
          </button>
        </>
      }
    >
      {/* O valor em destaque: é a primeira coisa que ela precisa conferir, e
          precisa ser legível de relance, com o aparelho já na mão dela. */}
      <div className="rounded-[16px] border border-blush-100 bg-gradient-to-b from-blush-50/70 to-white px-4 py-[18px] text-center">
        <p className="text-[12.5px] text-ink-faint">{person.name} está recebendo</p>
        <p className="mt-1.5 font-display text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
          {formatMoney(valor)}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">
          {valorPorExtenso(valor)}
        </p>
        <p className="mt-2.5 text-[12px] text-ink-faint">
          {method} · {formatPeriod(period)}
        </p>
        {!quita ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-due-soft px-2.5 py-1 text-[11.5px] font-medium text-due">
            Adiantamento · falta {formatMoney(saldoRestante)}
          </p>
        ) : null}
      </div>

      {/* Sem os dados de quem paga o recibo sai identificando só um lado. Não
          bloqueia a assinatura — o pagamento já aconteceu —, mas avisa e leva
          direto ao lugar de resolver. */}
      {!company.name ? (
        <div className="rounded-[12px] border border-late/25 bg-late-soft px-3.5 py-3">
          <p className="text-[13px] font-medium">Falta dizer quem está pagando</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            O recibo vai sair sem identificar o pagador, o que enfraquece a comprovação.
          </p>
          <button
            type="button"
            onClick={onIrParaConfig}
            className="mt-2 text-[12.5px] font-medium text-butterfly-600 underline-offset-4 hover:underline"
          >
            Preencher em Configurações
          </button>
        </div>
      ) : null}

      <label className="flex flex-col gap-[7px]">
        <Label>CPF de quem está recebendo</Label>
        <input
          value={doc}
          onChange={(e) => setDoc(maskCpf(e.target.value))}
          inputMode="numeric"
          placeholder="000.000.000-00"
          aria-invalid={docErrado}
          className={`${fieldClass} ${docErrado ? 'border-late' : ''}`}
        />
        <span className={`text-[12px] ${docErrado ? 'text-late' : 'text-ink-dim'}`}>
          {docErrado
            ? 'Esse CPF não é válido — confira os números.'
            : 'Identifica quem assinou. Fica guardado para os próximos meses.'}
        </span>
      </label>

      {/* O termo só aparece com o CPF válido, porque ele cita o número dentro
          do texto — mostrar antes seria exibir uma declaração incompleta. */}
      <div className="flex flex-col gap-2">
        <Label>Termo de quitação</Label>
        {termo ? (
          <div className="max-h-[152px] overflow-y-auto rounded-[12px] border border-cream-deep bg-cream px-3.5 py-3">
            <p className="text-[12.5px] leading-relaxed text-ink-soft">{termo}</p>
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-line bg-cream px-3.5 py-3">
            <p className="text-[12.5px] leading-relaxed text-ink-dim">
              Preencha o CPF acima para o termo ser gerado com os dados de quem recebe.
            </p>
          </div>
        )}

        <button
          type="button"
          role="checkbox"
          aria-checked={leu}
          aria-label="Li o termo acima e confirmo que recebi o valor"
          disabled={!termo}
          onClick={() => setLeu((v) => !v)}
          className="flex items-start gap-2.5 rounded-[11px] px-1 py-1.5 text-left transition-colors disabled:opacity-40"
        >
          <span
            className={`mt-px flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md border transition-colors ${
              leu ? 'border-butterfly-500 bg-butterfly-500 text-white' : 'border-line bg-white'
            }`}
          >
            <svg
              viewBox="0 0 14 14"
              className="h-2.5 w-2.5"
              style={{ opacity: leu ? 1 : 0 }}
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
          <span className="text-[13px] leading-snug text-ink-soft">
            Li o termo acima, confirmo que os dados estão corretos e que recebi o valor.
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Assinatura</Label>
        <SignaturePad onChange={setSignature} disabled={!termo} />
        <p className="text-[11.5px] leading-relaxed text-ink-dim">
          Data, hora e um código de verificação são registrados junto da assinatura. O recibo
          é gerado na hora e pode ser enviado para {person.name.split(' ')[0]} em seguida.
        </p>
      </div>
    </Sheet>
  )
}
