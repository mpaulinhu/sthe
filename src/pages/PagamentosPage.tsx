import type { ReactNode } from 'react'
import {
  PageHeader,
  Panel,
  PlusIcon,
  PrimaryButton,
  StatCell,
  StatRow,
  Vazio,
} from '../components/Shell'
import { PersonRow } from '../components/PersonRow'
import {
  formatPeriod,
  formatShortDate,
  shiftPeriod,
  type FilterKey,
  type Group,
  type MethodSlice,
  type MonthStats,
  type PersonSummary,
  type SortKey,
} from '../lib/calc'
import { payrollByRole } from '../lib/business'
import type { ContractType, Database, Entry, Person, Receipt } from '../lib/types'

const FILTROS: { id: FilterKey; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'atraso', label: 'Em atraso' },
  { id: 'apagar', label: 'A pagar' },
  { id: 'pagos', label: 'Pagos' },
]

const TIPOS: { id: ContractType | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todo mundo' },
  { id: 'fixo', label: 'Fixos' },
  { id: 'diarista', label: 'Diaristas' },
  { id: 'freelancer', label: 'Freelas' },
]

const ORDENS: { id: SortKey; label: string }[] = [
  { id: 'vencimento', label: 'Vencimento' },
  { id: 'valor', label: 'Maior valor' },
  { id: 'nome', label: 'Nome' },
]

export function PagamentosPage({
  db,
  period,
  summaries,
  grupos,
  stats,
  filtro,
  setFiltro,
  tipo,
  setTipo,
  sort,
  setSort,
  contagemPorTipo,
  abertos,
  setAbertos,
  selecionados,
  onSelecionar,
  onSelecionarTodos,
  onPagarSelecionados,
  porForma,
  repetiveis,
  onRepetir,
  discreet,
  val,
  aside,
  onAdicionarAoMes,
  onIrParaEquipe,
  onPagar,
  onLancar,
  onEditar,
  onToggleEntry,
  onVerRecibo,
}: {
  db: Database
  period: string
  summaries: PersonSummary[]
  grupos: Group[]
  stats: MonthStats
  filtro: FilterKey
  setFiltro: (f: FilterKey) => void
  tipo: ContractType | 'todos'
  setTipo: (t: ContractType | 'todos') => void
  sort: SortKey
  setSort: (s: SortKey) => void
  contagemPorTipo: Record<ContractType, number>
  abertos: Record<string, boolean>
  setAbertos: (fn: (a: Record<string, boolean>) => Record<string, boolean>) => void
  selecionados: string[]
  onSelecionar: (id: string) => void
  onSelecionarTodos: (ids: string[]) => void
  onPagarSelecionados: () => void
  porForma: MethodSlice[]
  repetiveis: Entry[]
  onRepetir: () => void
  discreet: boolean
  val: (v: number) => string
  aside: ReactNode
  onAdicionarAoMes: () => void
  onIrParaEquipe: () => void
  onPagar: (p: Person) => void
  onLancar: (p: Person) => void
  onEditar: (p: Person) => void
  onToggleEntry: (e: Entry) => void
  onVerRecibo: (r: Receipt) => void
}) {
  // Cadastro vazio de verdade (nunca cadastrou ninguém) é diferente de "mês
  // sem ninguém visível" — só freelancers sem lançamento neste mês, ou
  // alguém que já saiu mas trabalhou em meses anteriores, ainda contam como
  // "tem gente cadastrada", só não aparecem agora.
  const semCadastroNenhum = db.people.length === 0
  const progressoMes = stats.total > 0 ? Math.min(100, (stats.pago / stats.total) * 100) : 0
  const mostrarFiltroTipo =
    (Object.keys(contagemPorTipo) as ContractType[]).filter((t) => contagemPorTipo[t] > 0).length > 1

  // Quem ainda vai vencer, em ordem — alimenta o painel da direita. Ordena
  // pela data real do mês (não o número cru do cadastro), senão um "dia 31"
  // que virou dia 30 apareceria fora de ordem.
  const proximos = summaries
    .filter((s) => s.falta > 0 && !s.atrasado)
    .sort((a, b) => a.dataPagamento.localeCompare(b.dataPagamento))
    .slice(0, 5)

  const porFuncao = payrollByRole(db, period).slice(0, 7)
  const maiorFuncao = porFuncao[0]?.total ?? 0

  const contagem: Record<FilterKey, number> = {
    todos: summaries.length,
    atraso: summaries.filter((s) => s.atrasado).length,
    apagar: summaries.filter((s) => !s.quitado && !s.atrasado).length,
    pagos: summaries.filter((s) => s.quitado).length,
  }

  // Só entra no lote quem tem valor em aberto — e apenas entre os visíveis,
  // para "marcar todos" nunca alcançar alguém escondido pelo filtro.
  const selecionaveis = grupos.flatMap((g) => g.items).filter((s) => s.falta > 0)
  const selecaoValida = selecionaveis.filter((s) => selecionados.includes(s.person.id))
  const temSelecao = selecaoValida.length > 0
  const todosMarcados = selecionaveis.length > 0 && selecaoValida.length === selecionaveis.length
  const totalSelecionado = selecaoValida.reduce((acc, s) => acc + s.falta, 0)

  return (
    <>
      <PageHeader
        kicker={`Pagamentos · ${formatPeriod(period)}`}
        title="Pagamentos da equipe"
        subtitle="Quem recebe quanto, quando vence e o que já saiu do caixa."
        aside={
          <div className="flex items-center gap-2">
            {aside}
            {!semCadastroNenhum ? (
              <PrimaryButton onClick={onAdicionarAoMes}>
                <PlusIcon />
                <span className="hidden sm:inline">Adicionar ao mês</span>
              </PrimaryButton>
            ) : null}
          </div>
        }
      />

      {semCadastroNenhum ? (
        <Vazio
          titulo="Comece cadastrando quem trabalha com você"
          texto="O cadastro completo fica na aba Equipe. Depois, aqui em Pagamentos, é só escolher quem entra em cada mês e lançar os valores."
          acao={
            <PrimaryButton onClick={onIrParaEquipe} className="mt-3">
              Ir para Equipe
            </PrimaryButton>
          }
        />
      ) : summaries.length === 0 ? (
        <Vazio
          titulo="Ninguém neste mês"
          texto="Freelancers e diaristas só aparecem no mês em que você lançar algo pra eles, ou quando você os adiciona manualmente ao mês."
          acao={
            <PrimaryButton onClick={onAdicionarAoMes} className="mt-3">
              Adicionar ao mês
            </PrimaryButton>
          }
        />
      ) : (
        <>
          <StatRow>
            {/* A barra vive dentro do indicador principal: ela mede exatamente
                o que aquele número diz, e separada virava um elemento órfão. */}
            <StatCell
              index={0}
              lead
              label="Falta pagar"
              value={val(stats.falta)}
              sub={
                <>
                  <span className="font-medium text-ink-soft">{val(stats.pago)}</span> já pago de{' '}
                  {val(stats.total)} · {progressoMes.toFixed(0)}% da folha
                </>
              }
            >
              <div className="relative mt-5 h-[7px] w-full max-w-[340px] overflow-hidden rounded-full bg-blush-100">
                <div
                  className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-butterfly-400 to-butterfly-600 transition-[width] duration-700 ease-out"
                  style={{ width: `${progressoMes}%` }}
                >
                  {progressoMes > 4 ? (
                    <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent [animation:sheen_2.4s_ease-in-out_.6s]" />
                  ) : null}
                </div>
              </div>
            </StatCell>
            <StatCell
              index={1}
              label="Em atraso"
              value={val(stats.atrasoTotal)}
              tone={stats.atrasoCount > 0 ? 'late' : 'ink'}
              dot={stats.atrasoCount > 0 ? 'bg-late' : undefined}
              sub={`${stats.atrasoCount} ${stats.atrasoCount === 1 ? 'pessoa esperando' : 'pessoas esperando'}`}
            />
            <StatCell
              index={2}
              label="Próximo"
              value={stats.proximo ? `Dia ${stats.proximo.dataPagamento.slice(8, 10)}` : '—'}
              sub={
                stats.proximo
                  ? `${stats.proximo.person.name.split(' ')[0]} · ${val(stats.proximo.falta)}`
                  : 'nada a vencer'
              }
            />
            <StatCell
              index={3}
              label="Já pago"
              value={val(stats.pago)}
              tone="paid"
              sub={`${stats.pessoasQuitadas} de ${summaries.length} ${summaries.length === 1 ? 'pessoa' : 'pessoas'}`}
            />
          </StatRow>

          {repetiveis.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-butterfly-100 bg-butterfly-50/50 px-5 py-4">
              <p className="flex-1 text-[13.5px] leading-relaxed text-ink-soft">
                Repetir os pagamentos de {formatPeriod(shiftPeriod(period, -1)).toLowerCase()}?{' '}
                <span className="text-ink-dim">
                  {repetiveis.length} lançamentos, como não pagos.
                </span>
              </p>
              <button
                onClick={onRepetir}
                className="rounded-[11px] bg-butterfly-500 px-4 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-butterfly-600"
              >
                Repetir
              </button>
            </div>
          ) : null}

          {/* "Quanto separar de cada forma" — responde de bate-pronto quanto
              de dinheiro vivo ela precisa sacar antes de sair pagando. */}
          {porForma.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px]">
              <span className="text-[11px] font-medium uppercase tracking-[0.13em] text-ink-dim">
                Separar
              </span>
              {porForma.map((f) => (
                <span
                  key={f.method}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-blush-100 bg-white/70 py-1 pl-3 pr-3 backdrop-blur-sm"
                >
                  <span className="text-ink-soft">{f.method}</span>
                  <span className="font-display font-semibold tabular-nums">{val(f.total)}</span>
                  <span className="text-[11.5px] text-ink-dim">
                    {f.pessoas} {f.pessoas === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 pb-3">
                <div className="flex gap-1 rounded-[13px] border border-blush-100 bg-white/70 p-1 backdrop-blur-sm">
                  {FILTROS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFiltro(f.id)}
                      aria-pressed={filtro === f.id}
                      className={`rounded-[9px] px-[13px] py-[7px] text-[13px] font-medium transition-all duration-200 ${
                        filtro === f.id
                          ? 'bg-ink text-cream shadow-sm'
                          : 'text-ink-faint hover:bg-blush-50 hover:text-ink-soft'
                      }`}
                    >
                      {f.label}
                      <span
                        className={`ml-1.5 tabular-nums ${
                          filtro === f.id ? 'text-cream/60' : 'text-ink-dim'
                        }`}
                      >
                        {contagem[f.id]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="ml-auto flex items-center gap-1">
                  <span className="hidden text-[12px] text-ink-dim sm:inline">ordenar por</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    aria-label="Ordenar por"
                    className="cursor-pointer rounded-[9px] border-0 bg-transparent py-[7px] pl-1 pr-1 text-[13px] font-medium text-ink-soft outline-none transition-colors hover:text-ink"
                  >
                    {ORDENS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {mostrarFiltroTipo ? (
                <div className="flex flex-wrap items-center gap-1.5 pb-3.5">
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

              {/* Barra de lote: aparece quando há alguém marcado, e some
                  sozinha ao pagar. Cada pessoa é quitada pela forma do
                  próprio cadastro, então não há nada a perguntar aqui. */}
              {selecionaveis.length > 0 ? (
                <div
                  className={`mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3 transition-all duration-200 ${
                    temSelecao
                      ? 'border-butterfly-200 bg-butterfly-50/70'
                      : 'border-blush-100 bg-white/60'
                  }`}
                >
                  <button
                    onClick={() =>
                      onSelecionarTodos(
                        todosMarcados ? [] : selecionaveis.map((s) => s.person.id),
                      )
                    }
                    className="text-[13px] font-medium text-ink-soft underline-offset-4 transition-colors hover:text-butterfly-600 hover:underline"
                  >
                    {todosMarcados ? 'Desmarcar todos' : `Marcar os ${selecionaveis.length}`}
                  </button>

                  {temSelecao ? (
                    <>
                      <span className="text-[13px] text-ink-faint">
                        {selecaoValida.length}{' '}
                        {selecaoValida.length === 1 ? 'marcada' : 'marcadas'}
                      </span>
                      <button
                        onClick={onPagarSelecionados}
                        className="ml-auto rounded-[11px] bg-butterfly-500 px-4 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-butterfly-600"
                      >
                        Pagar {val(totalSelecionado)}
                      </button>
                    </>
                  ) : (
                    <span className="ml-auto text-[12.5px] text-ink-dim">
                      marque para pagar várias de uma vez
                    </span>
                  )}
                </div>
              ) : null}

              {grupos.length === 0 ? (
                <Vazio
                  titulo="Nada por aqui neste filtro"
                  texto={
                    tipo !== 'todos' && filtro !== 'todos'
                      ? 'Nenhuma pessoa desse tipo nesta situação. Troque um dos dois filtros.'
                      : 'Troque o filtro para ver as outras pessoas.'
                  }
                />
              ) : (
                grupos.map((g, gi) => (
                  <section key={g.key} className="mb-8">
                    <div className="flex items-center gap-2.5 px-0.5 pb-3">
                      <span
                        className="h-2 w-2 rounded-full ring-4"
                        style={{ background: g.cor, ['--tw-ring-color' as string]: `${g.cor}1f` }}
                        aria-hidden
                      />
                      <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-ink-soft">
                        {g.titulo}
                      </h2>
                      <span className="rounded-full bg-blush-50 px-1.5 py-px text-[11px] font-medium text-ink-faint">
                        {g.items.length}
                      </span>
                      <span
                        className="h-px flex-1 bg-gradient-to-r from-cream-deep to-transparent"
                        aria-hidden
                      />
                      <span className="font-display text-[13.5px] font-medium tabular-nums text-ink-faint">
                        {val(g.soma)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {g.items.map((s, i) => (
                        <PersonRow
                          key={s.person.id}
                          index={gi * 4 + i}
                          summary={s}
                          period={period}
                          discreet={discreet}
                          selecionada={selecionados.includes(s.person.id)}
                          onSelecionar={s.falta > 0 ? () => onSelecionar(s.person.id) : undefined}
                          open={!!abertos[s.person.id]}
                          onToggle={() =>
                            setAbertos((a) => ({ ...a, [s.person.id]: !a[s.person.id] }))
                          }
                          onPagar={() => onPagar(s.person)}
                          onLancar={() => onLancar(s.person)}
                          onEditar={() => onEditar(s.person)}
                          onToggleEntry={onToggleEntry}
                          recibos={db.recibos.filter(
                            (r) => r.personId === s.person.id && r.period === period,
                          )}
                          onVerRecibo={onVerRecibo}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>

            <div className="flex flex-col gap-5">
              <Panel title="Próximos vencimentos">
                {proximos.length === 0 ? (
                  <p className="py-3 text-[13px] leading-relaxed text-ink-faint">
                    Ninguém a vencer. Tudo que estava em aberto já foi pago ou está atrasado.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {proximos.map((s) => (
                      <button
                        key={s.person.id}
                        onClick={() => onPagar(s.person)}
                        className="flex items-baseline justify-between gap-3 border-b border-hair py-3 text-left transition-colors last:border-0 hover:bg-blush-50/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-display text-[15px] font-semibold leading-tight">
                            {s.person.name}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                            dia {formatShortDate(s.dataPagamento).slice(0, 2)}
                            {s.person.role ? ` · ${s.person.role}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-[13.5px] font-medium tabular-nums">
                          {val(s.falta)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Panel>

              {porFuncao.length > 0 ? (
                <Panel title="Folha por função">
                  <div className="flex flex-col gap-3.5">
                    {porFuncao.map((f) => (
                      <div key={f.role}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[13px] text-ink-soft">{f.role}</span>
                          <span className="shrink-0 text-[13px] font-medium tabular-nums">
                            {val(f.total)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blush-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-butterfly-400 to-butterfly-600 transition-[width] duration-700"
                            style={{
                              width: `${maiorFuncao > 0 ? (f.total / maiorFuncao) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}
            </div>
          </div>
        </>
      )}
    </>
  )
}
