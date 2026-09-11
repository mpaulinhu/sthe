import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader, PlusIcon, PrimaryButton, Vazio } from '../components/Shell'
import { CONTRACT_AVATAR, CONTRACT_LABEL, type ContractType, type Person } from '../lib/types'
import { formatMoney, payDayLabel } from '../lib/calc'

const TIPOS: { id: ContractType | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todo mundo' },
  { id: 'fixo', label: 'Fixos' },
  { id: 'diarista', label: 'Diaristas' },
  { id: 'freelancer', label: 'Freelas' },
]

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Banco de cadastro: todo mundo que já trabalhou ou trabalha, independente de
 * mês. Diferente de Pagamentos (que mostra quem está visível NESTE mês),
 * aqui aparece todo mundo — inclusive quem já saiu, para poder reativar.
 */
export function EquipePage({
  people,
  onNovaPessoa,
  onEditar,
  onArquivar,
  onReativar,
  onExcluir,
}: {
  people: Person[]
  onNovaPessoa: () => void
  onEditar: (p: Person) => void
  onArquivar: (id: string) => void
  onReativar: (id: string) => void
  onExcluir: (id: string) => void
}) {
  const [tipo, setTipo] = useState<ContractType | 'todos'>('todos')

  const ordenadas = useMemo(
    () => [...people].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [people],
  )

  const visiveis = useMemo(
    () => ordenadas.filter((p) => tipo === 'todos' || p.contract === tipo),
    [ordenadas, tipo],
  )

  const ativos = visiveis.filter((p) => p.active)
  const inativos = visiveis.filter((p) => !p.active)

  const contagemPorTipo = useMemo(() => {
    const acc = { fixo: 0, diarista: 0, freelancer: 0 } as Record<ContractType, number>
    people.forEach((p) => {
      acc[p.contract] += 1
    })
    return acc
  }, [people])

  const mostrarFiltroTipo =
    (Object.keys(contagemPorTipo) as ContractType[]).filter((t) => contagemPorTipo[t] > 0).length > 1

  return (
    <>
      <PageHeader
        kicker="Equipe"
        title="Quem trabalha com você"
        subtitle="O cadastro de todo mundo — fixo, freela ou diarista — independente do mês."
        aside={
          <PrimaryButton onClick={onNovaPessoa}>
            <PlusIcon />
            <span className="hidden sm:inline">Nova pessoa</span>
          </PrimaryButton>
        }
      />

      {people.length === 0 ? (
        <Vazio
          titulo="Comece cadastrando quem trabalha com você"
          texto="Cadastre cada pessoa uma vez, com o valor e o dia de pagar. Depois, em Pagamentos, é só escolher quem entra em cada mês."
          acao={
            <PrimaryButton onClick={onNovaPessoa} className="mt-3">
              Adicionar primeira pessoa
            </PrimaryButton>
          }
        />
      ) : (
        <>
          {mostrarFiltroTipo ? (
            <div className="flex flex-wrap items-center gap-1.5 pb-5">
              {TIPOS.filter((t) => t.id === 'todos' || contagemPorTipo[t.id] > 0).map((t) => {
                const ativo = tipo === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    aria-pressed={ativo}
                    className={`rounded-full border px-3 py-[5px] text-[12.5px] font-medium transition-all duration-200 ${
                      ativo
                        ? 'border-blush-300 bg-blush-100 text-blush-600'
                        : 'border-blush-100 bg-white/70 text-ink-faint hover:border-blush-200 hover:text-ink-soft'
                    }`}
                  >
                    {t.label}
                    {t.id !== 'todos' ? (
                      <span className={ativo ? 'text-blush-500' : 'text-ink-dim'}>
                        {' '}
                        {contagemPorTipo[t.id]}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="flex flex-col gap-2.5">
            {ativos.map((p, i) => (
              <PersonCard
                key={p.id}
                person={p}
                index={i}
                onClick={() => onEditar(p)}
                onEditar={() => onEditar(p)}
                onArquivar={() => onArquivar(p.id)}
                onExcluir={() => onExcluir(p.id)}
              />
            ))}
          </div>

          {inativos.length > 0 ? (
            <section className="mt-8">
              <div className="flex items-center gap-2.5 px-0.5 pb-3">
                <span className="h-2 w-2 rounded-full bg-ink-dim" aria-hidden />
                <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-ink-soft">
                  Não trabalham mais aqui
                </h2>
                <span className="rounded-full bg-blush-50 px-1.5 py-px text-[11px] font-medium text-ink-faint">
                  {inativos.length}
                </span>
                <span
                  className="h-px flex-1 bg-gradient-to-r from-cream-deep to-transparent"
                  aria-hidden
                />
              </div>
              <div className="flex flex-col gap-2.5">
                {inativos.map((p, i) => (
                  <PersonCard
                    key={p.id}
                    person={p}
                    index={i}
                    onClick={() => onEditar(p)}
                    onEditar={() => onEditar(p)}
                    onReativar={() => onReativar(p.id)}
                    onExcluir={() => onExcluir(p.id)}
                    inativo
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </>
  )
}

function PersonCard({
  person,
  index,
  onClick,
  onEditar,
  onArquivar,
  onReativar,
  onExcluir,
  inativo,
}: {
  person: Person
  index: number
  onClick: () => void
  onEditar: () => void
  onArquivar?: () => void
  onReativar?: () => void
  onExcluir: () => void
  inativo?: boolean
}) {
  return (
    <div
      className={`rise-in group relative flex items-center gap-3.5 rounded-[18px] border border-blush-100 bg-white pl-[18px] pr-3 py-4 shadow-petal transition-all duration-300 hover:-translate-y-px hover:border-blush-200 hover:shadow-lift ${
        inativo ? 'opacity-60' : ''
      }`}
      style={{ ['--i' as string]: index }}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
        <span
          className={`flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ring-4 ${CONTRACT_AVATAR[person.contract]}`}
          aria-hidden
        >
          {initials(person.name)}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[17px] font-semibold leading-tight">{person.name}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">
            {person.role ? `${person.role} · ` : ''}
            {CONTRACT_LABEL[person.contract]}
            {person.method ? ` · ${person.method}` : ''}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {person.baseAmount > 0 ? (
            <p className="font-display text-[15px] font-semibold tabular-nums text-ink">
              {formatMoney(person.baseAmount)}
            </p>
          ) : null}
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-dim">
            {inativo ? 'inativo' : payDayLabel(person)}
          </p>
        </div>
      </button>

      <PersonCardMenu
        person={person}
        inativo={inativo}
        onEditar={onEditar}
        onArquivar={onArquivar}
        onReativar={onReativar}
        onExcluir={onExcluir}
      />
    </div>
  )
}

function PersonCardMenu({
  person,
  inativo,
  onEditar,
  onArquivar,
  onReativar,
  onExcluir,
}: {
  person: Person
  inativo?: boolean
  onEditar: () => void
  onArquivar?: () => void
  onReativar?: () => void
  onExcluir: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function onFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', onFora)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onFora)
      document.removeEventListener('keydown', onEsc)
    }
  }, [aberto])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label={`Mais ações para ${person.name}`}
        aria-expanded={aberto}
        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-dim transition-colors hover:bg-blush-50 hover:text-blush-500"
      >
        <svg viewBox="0 0 16 16" className="h-[17px] w-[17px]" fill="currentColor" aria-hidden>
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {aberto ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-10 w-[184px] overflow-hidden rounded-[14px] border border-blush-100 bg-white py-1.5 shadow-lift [animation:fadeIn_.15s_ease]"
        >
          <button
            role="menuitem"
            onClick={() => {
              setAberto(false)
              onEditar()
            }}
            className="flex w-full items-center px-3.5 py-2.5 text-left text-[13.5px] text-ink-soft transition-colors hover:bg-blush-50"
          >
            Editar
          </button>

          {!inativo && onArquivar ? (
            <button
              role="menuitem"
              onClick={() => {
                setAberto(false)
                if (window.confirm(`Tirar ${person.name} da lista? O histórico continua salvo.`)) {
                  onArquivar()
                }
              }}
              className="flex w-full items-center px-3.5 py-2.5 text-left text-[13.5px] text-ink-soft transition-colors hover:bg-blush-50"
            >
              Não trabalha mais aqui
            </button>
          ) : null}

          {inativo && onReativar ? (
            <button
              role="menuitem"
              onClick={() => {
                setAberto(false)
                onReativar()
              }}
              className="flex w-full items-center px-3.5 py-2.5 text-left text-[13.5px] text-butterfly-600 transition-colors hover:bg-blush-50"
            >
              Voltou a trabalhar aqui
            </button>
          ) : null}

          <div className="my-1 h-px bg-hair" />

          <button
            role="menuitem"
            onClick={() => {
              setAberto(false)
              if (
                window.confirm(
                  `Excluir ${person.name} para sempre? Isso apaga o cadastro, os lançamentos e os recibos dela. Não dá para desfazer.`,
                )
              ) {
                onExcluir()
              }
            }}
            className="flex w-full items-center px-3.5 py-2.5 text-left text-[13.5px] font-medium text-late transition-colors hover:bg-late-soft"
          >
            Excluir
          </button>
        </div>
      ) : null}
    </div>
  )
}
