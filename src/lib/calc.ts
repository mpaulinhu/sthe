import {
  DEFAULT_WORK_DAYS,
  KIND_EFFECT,
  defaultKindFor,
  type Entry,
  type MonthMembership,
  type Person,
} from './types'

export interface PersonSummary {
  person: Person
  entries: Entry[]
  /** Total bruto devido no mês: salário + serviços + extras - descontos. */
  total: number
  /** Quanto já saiu do bolso dela (qualquer lançamento marcado como pago). */
  pago: number
  /** Quanto ainda falta pagar. Nunca negativo. */
  falta: number
  /** Já pagou tudo que devia neste mês. */
  quitado: boolean
  /** Tem algo pendente com data já vencida. */
  atrasado: boolean
  /**
   * O dia combinado de pagamento já passou. Diferente de `atrasado`, que exige
   * dívida em aberto: serve para avisar de quem venceu e não teve nada lançado.
   */
  venceu: boolean
  /**
   * A data real de pagamento neste período (YYYY-MM-DD), já resolvendo o modo
   * fixo/dia útil — é o que a lista deve exibir e ordenar, nunca `person.payDay`
   * cru, que pode apontar para um dia que não existe neste mês.
   */
  dataPagamento: string
  /**
   * A data do adiantamento neste período, ou '' quando a pessoa não tem vale.
   * Separada de `dataPagamento` porque as duas convivem: o vale sai no meio do
   * mês e o salário no dia combinado.
   */
  dataVale: string
  /** Quanto sai no vale (percentual do salário). Zero quando não há vale. */
  valorVale: number
  /**
   * A próxima data que importa: o vale enquanto ele não saiu, o salário depois
   * disso. É o que a lista mostra — duas datas na mesma linha poluiriam, e o
   * que a pessoa precisa saber é "o que vem agora".
   */
  proximaData: string
  /** `true` quando `proximaData` é a do vale, para a lista poder rotular. */
  proximaEhVale: boolean
  /**
   * Quanto falta para fechar o vale, considerando o que já foi pago no mês.
   *
   * O que já saiu abate do vale primeiro: quem paga R$ 300 de um vale de
   * R$ 800 ainda deve R$ 500 de vale, não R$ 800. Zero quando não há vale ou
   * quando ele já foi coberto.
   */
  faltaVale: number
  /**
   * O valor que o campo de pagamento deve trazer pronto: o que falta do vale
   * enquanto ele não fechou, o restante do mês depois disso. É a diferença
   * entre digitar o número toda vez e só confirmar.
   */
  sugestaoPagamento: number
}

export interface MonthSummary {
  total: number
  pago: number
  falta: number
  pessoasQuitadas: number
  pessoasPendentes: number
  pessoasAtrasadas: number
}

export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1 + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number)
  const name = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Quem deve aparecer na lista de um mês — a regra muda por tipo de contrato:
 *
 *  - Fixo: aparece em todo mês entre o cadastro e (se ela saiu) a saída. É
 *    recorrente por natureza, então "existir naquele mês" já basta, mesmo
 *    sem lançamento ainda.
 *  - Diarista/freelancer: nunca aparece só por estar cadastrada — cadastro é
 *    responsabilidade da aba Equipe, não desta lista. Aparece no mês em que
 *    teve lançamento de verdade, ou num mês em que foi manualmente
 *    adicionada via `memberships` (botão "Adicionar ao mês"), que é o único
 *    caminho para trazer alguém pra cá, seja pela primeira vez ou de volta.
 *
 * `active: false` sem `inactivatedAt` (cadastros antigos, de antes desse
 * campo existir) trata como "sempre esteve fora" para não ressuscitar
 * alguém que ela já tinha tirado da lista de propósito.
 */
export function peopleVisibleInPeriod(
  people: Person[],
  entries: Entry[],
  period: string,
  memberships: MonthMembership[] = [],
): Person[] {
  const comLancamento = new Set(
    entries.filter((e) => e.period === period).map((e) => e.personId),
  )
  const comMembership = new Set(
    memberships.filter((m) => m.period === period).map((m) => m.personId),
  )

  return people.filter((p) => {
    if (p.contract !== 'fixo') {
      return comLancamento.has(p.id) || comMembership.has(p.id)
    }

    const desde = p.createdAt.slice(0, 7)
    if (period < desde) return false

    if (!p.active) {
      if (!p.inactivatedAt) return false
      const ate = p.inactivatedAt.slice(0, 7)
      return period <= ate
    }

    return true
  })
}

export function summarizePerson(
  person: Person,
  allEntries: Entry[],
  period: string,
  workDays: number[] = DEFAULT_WORK_DAYS,
): PersonSummary {
  const entries = allEntries
    .filter((e) => e.personId === person.id && e.period === period)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Divide os lançamentos em três papéis:
  //   cobra   → o que ela deve no mês (salário, serviço, extra)
  //   abate   → o que reduz essa dívida (desconto)
  //   antecipa→ parte da dívida paga antes da data (adiantamento)
  const cobrancas = entries.filter((e) => KIND_EFFECT[e.kind] === 'soma')
  const abatimentos = entries.filter((e) => KIND_EFFECT[e.kind] === 'abate')
  const adiantamentos = entries.filter((e) => KIND_EFFECT[e.kind] === 'antecipa')

  const somaTudo = (list: Entry[]) => list.reduce((acc, e) => acc + e.amount, 0)

  const total = somaTudo(cobrancas) - somaTudo(abatimentos)

  // Dinheiro que já saiu por cobranças quitadas, menos os descontos já aplicados.
  const pagoPorCobrancas = somaTudo(cobrancas.filter((e) => e.paid)) - somaTudo(abatimentos.filter((e) => e.paid))

  // O adiantamento é uma parcela do que já está sendo cobrado. Ele só acrescenta
  // desembolso enquanto sobrar cobrança em aberto para ele cobrir — quando ela
  // quita o salário cheio, esse valor já está embutido nele.
  const emAberto = Math.max(0, total - pagoPorCobrancas)
  const adiantadoQueAindaConta = Math.min(somaTudo(adiantamentos.filter((e) => e.paid)), emAberto)

  const pago = Math.max(0, pagoPorCobrancas + adiantadoQueAindaConta)
  const falta = Math.max(0, total - pago)

  // "Atrasado" olha o dia combinado de pagamento da pessoa, não a data de cada
  // lançamento: é assim que ela pensa ("a Ana recebe dia 5 e hoje é 27"). Usa
  // a data real resolvida (não o número cru do cadastro) — um "dia 31"
  // cadastrado não pode vencer cedo demais num mês que só tem 30.
  const dataPagamento = resolvePayDate(period, person, workDays)
  const dataVale = resolveAdvanceDate(period, person, workDays)
  const valorVale = advanceAmount(person)
  // O que já foi pago no mês abate do vale primeiro: é a ordem em que o
  // dinheiro sai na vida real, e sem isso um pagamento parcial deixaria o
  // vale "inteiro em aberto" mesmo já tendo sido coberto.
  const faltaVale = valorVale > 0 ? Math.max(0, Math.min(valorVale, total) - pago) : 0
  const hoje = todayIso()
  const mesAtual = hoje.slice(0, 7)
  let venceu: boolean
  if (period < mesAtual) venceu = true
  else if (period > mesAtual) venceu = false
  else venceu = dataPagamento < hoje

  const atrasado = falta > 0 && venceu

  /** Qual das duas datas a linha destaca — ver nota no retorno. */
  const proxima = (() => {
    const semVale = { data: dataPagamento, ehVale: false }
    if (atrasado || !dataVale || faltaVale <= 0) return semVale

    // Fora do mês corrente não há "hoje" que sirva de corte: no mês passado
    // tudo já venceu, no futuro nada venceu. Nos dois casos o que importa é
    // só qual das duas cai antes.
    const valeAindaVem = period === mesAtual ? hoje <= dataVale : true
    if (!valeAindaVem) return semVale
    return dataVale <= dataPagamento ? { data: dataVale, ehVale: true } : semVale
  })()

  return {
    person,
    entries,
    total,
    pago,
    falta,
    dataPagamento,
    dataVale,
    valorVale,
    // O vale só é "a próxima" enquanto ainda não chegou o dia dele. Depois
    // disso o que interessa é o salário, mesmo que o vale não tenha sido pago
    // — atraso é assunto de `atrasado`, não da data que a lista mostra.
    // A data em destaque é a próxima conta a vencer, e precisa explicar o
    // status ao lado dela.
    //
    // Com atraso é sempre a do salário: mostrar o vale (futuro) colado num
    // alerta vermelho faz parecer que o vale é que está atrasado.
    //
    // Sem atraso, vence a MENOR das duas datas ainda por chegar — não basta
    // perguntar "o vale já passou?", porque o vale pode cair antes do salário
    // (vale dia 20, salário dia 5 do mês seguinte é arranjo comum). Comparar
    // as duas é o que faz a lista mostrar de fato o que vem primeiro.
    proximaData: proxima.data,
    proximaEhVale: proxima.ehVale,
    faltaVale,
    // Enquanto o vale não fechou, é ele que o campo sugere — mesmo depois do
    // dia dele ter passado: um vale atrasado continua sendo a próxima conta a
    // acertar, e sugerir o mês inteiro aqui esconderia isso.
    sugestaoPagamento: faltaVale > 0 ? Math.min(faltaVale, falta) : falta,
    quitado: total > 0 && falta === 0,
    atrasado,
    venceu,
  }
}

export type StatusKey = 'atraso' | 'apagar' | 'pagos'
export type FilterKey = 'todos' | StatusKey
export type SortKey = 'vencimento' | 'valor' | 'nome'

/** Em qual dos três grupos a pessoa cai. Sem lançamento conta como "a pagar". */
export function statusOf(s: PersonSummary): StatusKey {
  if (s.quitado) return 'pagos'
  if (s.atrasado) return 'atraso'
  return 'apagar'
}

export function sortSummaries(list: PersonSummary[], sort: SortKey): PersonSummary[] {
  const byName = (a: PersonSummary, b: PersonSummary) =>
    a.person.name.localeCompare(b.person.name, 'pt-BR')

  return [...list].sort((a, b) => {
    if (sort === 'valor') return b.falta - a.falta || byName(a, b)
    if (sort === 'nome') return byName(a, b)
    // Compara pelo dia do mês da data real (não o mês/ano inteiro): dois
    // períodos diferentes não fazem sentido misturados numa mesma lista, e
    // comparar a data completa ordenaria por mês antes de por dia.
    // Ordena pela data que a linha mostra, senão quem tem vale apareceria
    // fora de lugar em relação ao número exibido ao lado do nome.
    const diaA = Number(a.proximaData.slice(8, 10))
    const diaB = Number(b.proximaData.slice(8, 10))
    return diaA - diaB || byName(a, b)
  })
}

export interface Group {
  key: StatusKey
  titulo: string
  cor: string
  items: PersonSummary[]
  /** Falta a pagar do grupo; no grupo "Pagos", o total já pago. */
  soma: number
}

const GROUP_DEF: { key: StatusKey; titulo: string; cor: string }[] = [
  { key: 'atraso', titulo: 'Em atraso', cor: '#b3452f' },
  { key: 'apagar', titulo: 'A pagar', cor: '#b8862a' },
  { key: 'pagos', titulo: 'Pagos', cor: '#2f7d5c' },
]

/** Grupos na ordem fixa do design, já sem os vazios. */
export function buildGroups(visible: PersonSummary[]): Group[] {
  return GROUP_DEF.map((g) => {
    const items = visible.filter((s) => statusOf(s) === g.key)
    const soma = items.reduce((acc, s) => acc + (g.key === 'pagos' ? s.pago : s.falta), 0)
    return { ...g, items, soma }
  }).filter((g) => g.items.length > 0)
}

export interface MonthStats extends MonthSummary {
  atrasoTotal: number
  atrasoCount: number
  /** Primeira pessoa a vencer entre as que ainda não estão atrasadas. */
  proximo: PersonSummary | null
}

export function monthStats(list: PersonSummary[]): MonthStats {
  const base = summarizeMonth(list)
  const atrasados = list.filter((s) => s.atrasado)
  const aVencer = sortSummaries(
    list.filter((s) => s.falta > 0 && !s.atrasado),
    'vencimento',
  )
  return {
    ...base,
    atrasoTotal: atrasados.reduce((acc, s) => acc + s.falta, 0),
    atrasoCount: atrasados.length,
    proximo: aVencer[0] ?? null,
  }
}

/** "27/08" — data curta usada na sublinha do lançamento. */
export function formatShortDate(iso: string): string {
  if (!iso) return ''
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

/** Abreviação do mês para a coluna do dia: "AGO". */
export function monthAbbr(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

/**
 * Como o dia de pagar é descrito fora do contexto de um mês específico (no
 * cadastro, na lista de Equipe): "dia 5" para fixo, "5º dia útil" para o
 * outro modo. Não resolve para uma data real — isso é `resolvePayDate`.
 */
export function payDayLabel(person: Pick<Person, 'payDay' | 'payDayMode'>): string {
  return person.payDayMode === 'util' ? `${person.payDay}º dia útil` : `dia ${person.payDay}`
}

/**
 * Monta os lançamentos do mês novo a partir do mês anterior, para ela não ter
 * que redigitar o salário de todo mundo. Copia só o que é recorrente (salário e
 * descontos fixos não entram: desconto e adiantamento são pontuais daquele mês),
 * sempre como "ainda não pago", ajustando a data para o mês de destino.
 */
export function buildRepeatedEntries(
  entries: Entry[],
  fromPeriod: string,
  toPeriod: string,
  people: Person[],
  makeId: () => string,
): Entry[] {
  const jaTem = new Set(entries.filter((e) => e.period === toPeriod).map((e) => e.personId))
  const ativos = new Set(people.filter((p) => p.active).map((p) => p.id))

  return entries
    .filter(
      (e) =>
        e.period === fromPeriod &&
        // Só o que se repete todo mês. Vale, desconto, extra e reembolso são do
        // mês em que aconteceram — repetir criaria cobrança que ela não combinou.
        (e.kind === 'salario' || e.kind === 'servico' || e.kind === 'diaria') &&
        ativos.has(e.personId) &&
        // Quem já tem qualquer lançamento no mês novo fica de fora, para não duplicar.
        !jaTem.has(e.personId),
    )
    .map((e) => ({
      ...e,
      id: makeId(),
      period: toPeriod,
      date: moveDateToPeriod(e.date, toPeriod),
      paid: false,
      createdAt: new Date().toISOString(),
    }))
}

/**
 * Lançamentos que o cadastro já permite adiantar, para o mês pedido. Quem tem
 * valor combinado não deveria precisar redigitar o mesmo número — o app cria
 * sozinho, como "ainda não pago", e ela só mexe quando o mês foge do padrão.
 *
 * Duas portas de entrada, com gatilhos diferentes:
 *
 *  - **Fixo**: entra em todo mês, pelo simples fato de estar na empresa. É a
 *    natureza do salário mensal.
 *  - **Freela/diarista**: entra só no mês em que foi trazido pelo "Adicionar
 *    ao mês" (`memberships`). Adicionar alguém a um mês É o gesto de dizer
 *    "vou pagar essa pessoa aqui" — deixar a linha em "sem lançamento" depois
 *    disso obriga a redigitar um valor que já está no cadastro.
 *
 * Em ambos os casos, só entra quem tem valor base e ainda não tem NENHUM
 * lançamento no mês: se ela já lançou qualquer coisa, respeitamos o que ela
 * fez em vez de acrescentar por cima.
 */
export function buildFixedSalaries(
  entries: Entry[],
  period: string,
  people: Person[],
  makeId: () => string,
  memberships: MonthMembership[] = [],
  workDays: number[] = DEFAULT_WORK_DAYS,
): Entry[] {
  const jaTem = new Set(entries.filter((e) => e.period === period).map((e) => e.personId))
  const noMes = new Set(
    memberships.filter((m) => m.period === period).map((m) => m.personId),
  )

  return people
    .filter((p) => {
      if (!p.active || p.baseAmount <= 0 || jaTem.has(p.id)) return false
      return p.contract === 'fixo' || noMes.has(p.id)
    })
    .map((p) => ({
      id: makeId(),
      personId: p.id,
      period,
      // Cada tipo de contrato lança sob o próprio nome — "salário" para um
      // freelancer sairia errado no recibo e no relatório por função.
      kind: defaultKindFor(p.contract),
      amount: p.baseAmount,
      date: resolvePayDate(period, p, workDays),
      paid: false,
      description: '',
      createdAt: new Date().toISOString(),
    }))
}

/** O dia `day` dentro do período, respeitando meses mais curtos (31 → 28/30). */
function dayInPeriod(period: string, day: number): string {
  const [y, m] = period.split('-').map(Number)
  const ultimoDia = new Date(y, m, 0).getDate()
  return `${period}-${String(Math.min(Math.max(1, day), ultimoDia)).padStart(2, '0')}`
}

/**
 * O Nº-ésimo dia útil do período, contando a partir do dia 1 e usando
 * `workDays` (índices de `Date.getDay()`) como calendário. Se o mês não tiver
 * dias úteis suficientes para chegar em `nth`, cai no último dia útil que
 * existir — nunca estoura para o mês seguinte, que confundiria mais do que
 * ajuda ("5º dia útil" virando dia 2 do mês que vem).
 */
function nthWorkDayInPeriod(period: string, nth: number, workDays: number[]): string {
  const [y, m] = period.split('-').map(Number)
  const ultimoDia = new Date(y, m, 0).getDate()
  const alvo = Math.max(1, nth)

  let contados = 0
  let ultimoUtil = 1
  for (let dia = 1; dia <= ultimoDia; dia++) {
    if (workDays.includes(new Date(y, m - 1, dia).getDay())) {
      contados++
      ultimoUtil = dia
      if (contados === alvo) return `${period}-${String(dia).padStart(2, '0')}`
    }
  }
  // Não tinha dias úteis suficientes no mês — usa o último que existiu.
  return `${period}-${String(ultimoUtil).padStart(2, '0')}`
}

/**
 * A data real de pagamento de `person` dentro do período, resolvendo o modo
 * ('fixo' cai no último dia do mês quando é mais curto; 'util' conta a
 * partir do calendário da empresa). É a mesma regra usada para gerar o
 * lançamento e para exibir o dia na lista — as duas não podem divergir, ou
 * a tela volta a "mentir" um dia que não existe naquele mês.
 */
export function resolvePayDate(
  period: string,
  person: Pick<Person, 'payDay' | 'payDayMode'>,
  workDays: number[] = DEFAULT_WORK_DAYS,
): string {
  return person.payDayMode === 'util'
    ? nthWorkDayInPeriod(period, person.payDay, workDays)
    : dayInPeriod(period, person.payDay)
}

/**
 * A data do adiantamento neste período, ou '' quando a pessoa não tem vale.
 */
export function resolveAdvanceDate(
  period: string,
  person: Pick<Person, 'advance'>,
  workDays: number[] = DEFAULT_WORK_DAYS,
): string {
  const v = person.advance
  if (!v) return ''
  return v.mode === 'util'
    ? nthWorkDayInPeriod(period, v.day, workDays)
    : dayInPeriod(period, v.day)
}

/** Quanto sai no vale: percentual do salário, arredondado ao centavo. */
export function advanceAmount(person: Pick<Person, 'advance' | 'baseAmount'>): number {
  if (!person.advance) return 0
  return Math.round(person.baseAmount * (person.advance.percent / 100) * 100) / 100
}

/** Mantém o dia, troca o mês/ano — respeitando meses mais curtos (31 → 28/30). */
function moveDateToPeriod(iso: string, period: string): string {
  const [y, m] = period.split('-').map(Number)
  const dia = Number(iso?.split('-')[2]) || 1
  const ultimoDia = new Date(y, m, 0).getDate()
  return `${period}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`
}

export interface MethodSlice {
  /** 'Pix', 'Dinheiro'… ou 'Sem forma' para quem não definiu no cadastro. */
  method: string
  total: number
  pessoas: number
}

/**
 * Quanto ainda falta pagar, separado pela forma de pagamento de cada pessoa.
 * Responde "quanto de dinheiro vivo eu preciso separar hoje" — a pergunta que
 * ela hoje só consegue responder somando de cabeça.
 */
export function pendingByMethod(summaries: PersonSummary[]): MethodSlice[] {
  const porForma = new Map<string, { total: number; pessoas: number }>()

  summaries
    .filter((s) => s.falta > 0)
    .forEach((s) => {
      const forma = s.person.method ?? 'Sem forma'
      const atual = porForma.get(forma) ?? { total: 0, pessoas: 0 }
      porForma.set(forma, { total: atual.total + s.falta, pessoas: atual.pessoas + 1 })
    })

  return [...porForma.entries()]
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.total - a.total)
}

export function summarizeMonth(summaries: PersonSummary[]): MonthSummary {
  return summaries.reduce<MonthSummary>(
    (acc, s) => {
      acc.total += s.total
      acc.pago += s.pago
      acc.falta += s.falta
      if (s.quitado) acc.pessoasQuitadas += 1
      else if (s.total > 0 || s.entries.length > 0) acc.pessoasPendentes += 1
      if (s.atrasado) acc.pessoasAtrasadas += 1
      return acc
    },
    { total: 0, pago: 0, falta: 0, pessoasQuitadas: 0, pessoasPendentes: 0, pessoasAtrasadas: 0 },
  )
}
