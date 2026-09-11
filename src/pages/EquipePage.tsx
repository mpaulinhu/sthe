import { useMemo, useState } from 'react'
import { PageHeader, PlusIcon, PrimaryButton, Vazio } from '../components/Shell'
import {
  CONTRACT_AVATAR,
  CONTRACT_LABEL,
  CONTRACT_TEXT,
  type ContractType,
  type Person,
} from '../lib/types'
import { formatMoney, payDayLabel } from '../lib/calc'
import { Avatar } from '../components/Avatar'
import { ItemMenu, MenuAcoes, SeparadorMenu } from '../components/MenuAcoes'

const TIPOS: { id: ContractType | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todo mundo' },
  { id: 'fixo', label: 'Fixos' },
  { id: 'diarista', label: 'Diaristas' },
  { id: 'freelancer', label: 'Freelas' },
]

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
  onVerFoto,
}: {
  people: Person[]
  onNovaPessoa: () => void
  onEditar: (p: Person) => void
  onArquivar: (id: string) => void
  onReativar: (id: string) => void
  onExcluir: (id: string) => void
  onVerFoto: (p: Person) => void
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
                onVerFoto={() => onVerFoto(p)}
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
                    onVerFoto={() => onVerFoto(p)}
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
  onVerFoto,
  inativo,
}: {
  person: Person
  index: number
  onClick: () => void
  onEditar: () => void
  onArquivar?: () => void
  onReativar?: () => void
  onExcluir: () => void
  onVerFoto: () => void
  inativo?: boolean
}) {
  // O menu vive aqui, e não dentro do próprio menu, porque é o card que
  // precisa subir: `rise-in` é uma animação, e animação cria contexto de
  // empilhamento — o z-index do menu só valia dentro do card, então o card
  // seguinte passava por cima e cortava a lista de ações ao meio.
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div
      className={`rise-in group relative flex items-center gap-3.5 rounded-[18px] border border-blush-100 bg-white pl-[18px] pr-3 py-4 shadow-petal transition-all duration-300 hover:-translate-y-px hover:border-blush-200 hover:shadow-lift ${
        inativo ? 'opacity-60' : ''
      } ${menuAberto ? 'z-20' : ''}`}
      style={{ ['--i' as string]: index }}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
        <Avatar
          person={person}
          tone={CONTRACT_AVATAR[person.contract]}
          onVerFoto={onVerFoto}
        />

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[17px] font-semibold leading-tight">{person.name}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">
            {person.role ? `${person.role} · ` : ''}
            <span className={CONTRACT_TEXT[person.contract] || undefined}>
              {CONTRACT_LABEL[person.contract]}
            </span>
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
        aberto={menuAberto}
        setAberto={setMenuAberto}
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
  aberto,
  setAberto,
  onEditar,
  onArquivar,
  onReativar,
  onExcluir,
}: {
  person: Person
  inativo?: boolean
  aberto: boolean
  setAberto: (v: boolean) => void
  onEditar: () => void
  onArquivar?: () => void
  onReativar?: () => void
  onExcluir: () => void
}) {
  return (
    <MenuAcoes rotulo={person.name} aberto={aberto} setAberto={setAberto}>
      <ItemMenu onClick={onEditar}>Editar</ItemMenu>

      {!inativo && onArquivar ? (
        <ItemMenu
          onClick={() => {
            if (window.confirm(`Tirar ${person.name} da lista? O histórico continua salvo.`)) {
              onArquivar()
            }
          }}
        >
          Não trabalha mais aqui
        </ItemMenu>
      ) : null}

      {inativo && onReativar ? (
        <ItemMenu destaque onClick={onReativar}>
          Voltou a trabalhar aqui
        </ItemMenu>
      ) : null}

      <SeparadorMenu />

      <ItemMenu
        perigo
        onClick={() => {
          if (
            window.confirm(
              `Excluir ${person.name} para sempre? Isso apaga o cadastro, os lançamentos e os recibos dela. Não dá para desfazer.`,
            )
          ) {
            onExcluir()
          }
        }}
      >
        Excluir
      </ItemMenu>
    </MenuAcoes>
  )
}
