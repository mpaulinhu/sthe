import { useState } from 'react'
import { PageHeader, Panel } from '../components/Shell'
import { Label, Segmented, fieldClass } from '../components/Sheet'
import { isValidDoc, maskDoc, onlyDigits } from '../lib/receipt'
import type { Company } from '../lib/types'
import type { Tema } from '../lib/theme'

const DOC_LABEL = { cnpj: 'CNPJ', cpf: 'CPF' } as const
const DOC_PLACEHOLDER = { cnpj: '00.000.000/0000-00', cpf: '000.000.000-00' } as const

/** Domingo a sábado, na ordem de `Date.getDay()` — é o índice que `workDays` guarda. */
const DIAS_SEMANA = [
  { dia: 0, label: 'D' },
  { dia: 1, label: 'S' },
  { dia: 2, label: 'T' },
  { dia: 3, label: 'Q' },
  { dia: 4, label: 'Q' },
  { dia: 5, label: 'S' },
  { dia: 6, label: 'S' },
]

/**
 * Configurações de quem paga.
 *
 * Estes dados existem por causa do recibo: ele identifica duas partes, e sem
 * o lado de quem paga o documento fica pela metade. Ficam numa tela própria,
 * preenchidos uma vez, em vez de serem pedidos a cada pagamento.
 */
export function ConfiguracoesPage({
  company,
  tema,
  onTrocarTema,
  onSave,
  onError,
}: {
  company: Company
  tema: Tema
  onTrocarTema: (t: Tema) => void
  onSave: (c: Company) => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState(company.name)
  const [docType, setDocType] = useState<'cnpj' | 'cpf'>(company.docType)
  const [doc, setDoc] = useState(company.doc ? maskDoc(company.doc, company.docType) : '')
  const [tradeName, setTradeName] = useState(company.tradeName)
  const [address, setAddress] = useState(company.address)

  const docLimpo = onlyDigits(doc)
  const tamanhoCerto = docLimpo.length === (docType === 'cnpj' ? 14 : 11)
  const docErrado = tamanhoCerto && !isValidDoc(docLimpo, docType)

  const mudou =
    name !== company.name ||
    docLimpo !== company.doc ||
    docType !== company.docType ||
    tradeName !== company.tradeName ||
    address !== company.address

  function salvar() {
    if (!name.trim()) return onError('Falta o nome de quem paga.')
    if (docLimpo && !isValidDoc(docLimpo, docType)) {
      return onError(`Confira o ${DOC_LABEL[docType]} — os dígitos não batem.`)
    }
    onSave({
      ...company,
      name: name.trim(),
      doc: docLimpo,
      docType,
      tradeName: tradeName.trim(),
      address: address.trim(),
    })
  }

  /** Trocar o tipo limpa o número: um CPF não vira CNPJ por reinterpretação. */
  function trocarTipo(t: 'cnpj' | 'cpf') {
    setDocType(t)
    setDoc('')
  }

  // Toggle de dia útil salva na hora — é uma config binária, sem texto para
  // digitar errado, e trava o cálculo de "Nº dia útil" se ficar sem salvar.
  function alternarDia(dia: number) {
    const semEsseDia = company.workDays.filter((d) => d !== dia)
    const jaTinha = semEsseDia.length !== company.workDays.length
    const workDays = jaTinha ? semEsseDia : [...company.workDays, dia].sort()
    if (workDays.length === 0) {
      onError('Marque pelo menos um dia — sem nenhum, não dá para calcular dia útil.')
      return
    }
    onSave({ ...company, workDays })
  }

  const incompleto = !company.name

  return (
    <>
      <PageHeader
        kicker="Configurações"
        title="Dados de quem paga"
        subtitle="Aparecem no campo “Recebi de” de todo recibo assinado. Preencha uma vez — os recibos já emitidos guardam o que estava aqui na época."
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Panel title="Identificação">
          <div className="flex flex-col gap-5">
            {incompleto ? (
              <div className="rounded-[12px] border border-late/25 bg-late-soft px-3.5 py-3">
                <p className="text-[13px] font-medium">Falta preencher</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                  Enquanto isso não estiver preenchido, os recibos saem sem identificar quem
                  pagou — e um recibo assim vale menos como comprovação.
                </p>
              </div>
            ) : null}

            <label className="flex flex-col gap-[7px]">
              <Label>Razão social ou nome completo</Label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Sthéfany Modas Ltda"
                className={fieldClass}
              />
              <span className="text-[12px] leading-snug text-ink-dim">
                O nome oficial, como está no cartão CNPJ ou no documento.
              </span>
            </label>

            <div className="flex flex-col gap-2">
              <Label>Tipo de documento</Label>
              <Segmented
                value={docType}
                onChange={trocarTipo}
                options={[
                  { id: 'cnpj' as const, label: 'Empresa (CNPJ)' },
                  { id: 'cpf' as const, label: 'Pessoa física (CPF)' },
                ]}
              />
            </div>

            <label className="flex flex-col gap-[7px]">
              <Label>{DOC_LABEL[docType]}</Label>
              <input
                value={doc}
                onChange={(e) => setDoc(maskDoc(e.target.value, docType))}
                inputMode="numeric"
                placeholder={DOC_PLACEHOLDER[docType]}
                aria-invalid={docErrado}
                className={`${fieldClass} tabular-nums ${docErrado ? 'border-late' : ''}`}
              />
              <span className={`text-[12px] leading-snug ${docErrado ? 'text-late' : 'text-ink-dim'}`}>
                {docErrado
                  ? `Esse ${DOC_LABEL[docType]} não é válido — confira os números.`
                  : 'Identifica quem pagou no recibo.'}
              </span>
            </label>

            <label className="flex flex-col gap-[7px]">
              <Label optional>Nome fantasia</Label>
              <input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="ex: Sthé Boutique"
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-[7px]">
              <Label optional>Endereço</Label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ex: Rua das Flores, 120 — Centro, São Paulo/SP"
                className={fieldClass}
              />
            </label>

            <button
              onClick={salvar}
              disabled={!mudou}
              className="min-h-[44px] self-start rounded-[11px] bg-ink px-5 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mudou ? 'Salvar dados' : 'Tudo salvo'}
            </button>
          </div>
        </Panel>

        {/* Prévia: mostra como o cabeçalho vai sair no recibo, para ela conferir
            antes de emitir — é mais rápido do que pagar alguém só para ver. */}
        <Panel title="Como vai aparecer no recibo">
          <div className="rounded-[14px] border border-cream-deep bg-white px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Recebi de
            </p>
            {name.trim() ? (
              <>
                <p className="mt-1.5 text-[15px] font-medium leading-snug">{name.trim()}</p>
                {tradeName.trim() ? (
                  <p className="mt-0.5 text-[13px] text-ink-soft">{tradeName.trim()}</p>
                ) : null}
                {docLimpo ? (
                  <p className="mt-1 text-[12.5px] tabular-nums text-ink-faint">
                    {DOC_LABEL[docType]} {maskDoc(docLimpo, docType)}
                  </p>
                ) : null}
                {address.trim() ? (
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-faint">
                    {address.trim()}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">
                Preencha ao lado para ver a prévia.
              </p>
            )}
          </div>

          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
            Mudar estes dados não altera os recibos já emitidos — cada um guarda o que estava
            aqui no momento da assinatura, que é o que faz o documento continuar válido.
          </p>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Dias de trabalho">
          <p className="text-[12.5px] leading-relaxed text-ink-faint">
            Marque os dias da semana em que a empresa funciona. É o calendário usado para contar
            o "Nº dia útil" de quem recebe assim — sábado, domingo e feriados não entram na
            contagem, a não ser que você marque o dia da semana correspondente aqui.
          </p>

          <div className="mt-4 flex gap-2">
            {DIAS_SEMANA.map(({ dia, label }) => {
              const ativo = company.workDays.includes(dia)
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => alternarDia(dia)}
                  aria-pressed={ativo}
                  aria-label={
                    ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dia]
                  }
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-[13.5px] font-semibold transition-colors ${
                    ativo
                      ? 'bg-butterfly-500 text-white'
                      : 'bg-cream text-ink-faint hover:bg-cream-deep hover:text-ink-soft'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-[12px] text-ink-dim">
            Muda na hora — sem precisar salvar.
          </p>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Aparência">
          <p className="text-[12.5px] leading-relaxed text-ink-faint">
            Vale só para este aparelho — o celular pode ficar escuro e o computador claro.
          </p>

          <div className="mt-4 max-w-[340px]">
            <Segmented
              value={tema}
              onChange={onTrocarTema}
              options={[
                { id: 'claro' as const, label: 'Claro' },
                { id: 'escuro' as const, label: 'Escuro' },
                { id: 'sistema' as const, label: 'Automático' },
              ]}
            />
          </div>

          <p className="mt-3 text-[12px] text-ink-dim">
            No automático, acompanha o que o aparelho já estiver usando.
          </p>
        </Panel>
      </div>
    </>
  )
}
