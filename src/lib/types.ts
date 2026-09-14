export type ContractType = 'fixo' | 'freelancer' | 'diarista'

/** Como o pagamento é (ou foi) feito. */
export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Transferência' | 'Cartão'

export const PAYMENT_METHODS: PaymentMethod[] = ['Pix', 'Dinheiro', 'Transferência', 'Cartão']

/**
 * Como o dia de pagar é contado: 'fixo' é um número de calendário (todo dia
 * 5, por exemplo) e cai no último dia do mês quando ele é mais curto (31 em
 * abril vira 30). 'util' conta dias úteis a partir do 1º do mês, usando o
 * calendário de dias de trabalho definido em `Company.workDays` — o mesmo
 * para toda a equipe, porque é a empresa que define a semana de trabalho,
 * não cada pessoa.
 */
export type PayDayMode = 'fixo' | 'util'

export interface Person {
  id: string
  name: string
  role: string
  contract: ContractType
  /** Valor base mensal (fixo) ou valor de referência da diária. Freelancer pode ser 0. */
  baseAmount: number
  /** Dia do mês (modo 'fixo') ou o Nº do dia útil (modo 'util'). Sempre 1-31. */
  payDay: number
  /** Como `payDay` deve ser interpretado. Ausente = 'fixo', para não quebrar cadastros antigos. */
  payDayMode?: PayDayMode
  /**
   * Adiantamento no meio do mês.
   *
   * Ausente quando a pessoa recebe de uma vez só — que é o caso mais comum, e
   * por isso o campo é opcional em vez de um `temVale: false` em todo cadastro.
   *
   * O valor é percentual do salário, não um número em reais: assim um aumento
   * não deixa o vale defasado sem ninguém perceber.
   */
  advance?: {
    /** Dia do mês, ou o Nº do dia útil — mesma leitura de `payDay`. */
    day: number
    mode?: PayDayMode
    /** Quanto do salário sai adiantado. 1 a 99. */
    percent: number
  }
  /**
   * Como essa pessoa costuma receber. Vira o padrão ao pagar (dá para trocar
   * na hora sem mexer no cadastro) e alimenta o resumo de quanto separar em
   * dinheiro vivo. Opcional: quem nunca definiu fica sem forma padrão.
   */
  method?: PaymentMethod
  /**
   * CPF (só dígitos). Fica no cadastro para não ter que perguntar toda vez que
   * ela for assinar um recibo — é o que identifica quem assinou, e sem ele o
   * recibo perde boa parte do valor probatório.
   */
  doc?: string
  /**
   * Foto de perfil (data URL JPEG, já recortada em quadrado e comprimida por
   * `compressAvatar`). Opcional: sem foto, o avatar mostra as iniciais do nome.
   */
  photo?: string
  /**
   * Data de admissão (YYYY-MM-DD), opcional.
   *
   * Diferente de `createdAt`, que é quando o cadastro foi criado no app —
   * alguém que trabalha há dois anos pode ter sido cadastrada ontem. É esta
   * data que diz se o primeiro mês foi cheio ou proporcional.
   */
  hiredAt?: string
  /**
   * Último dia de trabalho (YYYY-MM-DD), opcional. Marca o mês da saída como
   * proporcional — e, ao contrário de `inactivatedAt`, é uma data combinada
   * que pode estar no futuro (aviso prévio já acertado).
   */
  leftAt?: string
  active: boolean
  /** Quando ela deixou de trabalhar aqui — só existe se `active` for false. */
  inactivatedAt?: string
  notes: string
  createdAt: string
}

export type EntryKind =
  | 'salario'
  | 'diaria'
  | 'servico'
  | 'extra'
  | 'reembolso'
  | 'vale'
  | 'desconto'

export interface Entry {
  id: string
  personId: string
  /** Competência YYYY-MM — a que mês de trabalho esse lançamento pertence. */
  period: string
  kind: EntryKind
  amount: number
  /** Data em que foi (ou está previsto) o pagamento. ISO YYYY-MM-DD. */
  date: string
  paid: boolean
  description: string
  /** Forma de pagamento, preenchida quando o lançamento é quitado. */
  method?: PaymentMethod
  /** Nome do arquivo do comprovante anexado — usado como rótulo na lista. */
  receiptName?: string
  /**
   * O comprovante em si (data URL JPEG já comprimido por `compressImage`).
   * Fica junto do lançamento porque é a prova do lado de quem pagou; a prova
   * do lado de quem recebeu é o `recibos`, abaixo.
   */
  receiptImage?: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Recibo assinado
// ---------------------------------------------------------------------------

/**
 * O aceite de quem recebeu: ela assina com o dedo na tela do celular, na hora
 * do pagamento.
 *
 * Os valores ficam **congelados** aqui de propósito — nome, valor e período
 * são copiados no momento da assinatura em vez de lidos do cadastro depois.
 * Um recibo tem que continuar dizendo exatamente o que ela viu quando assinou,
 * mesmo que o lançamento seja editado ou a pessoa renomeada mais tarde.
 *
 * Isto não é assinatura digital com certificado (ICP-Brasil) — é o equivalente
 * eletrônico do recibo de papel: prova de que ela assinou, quanto, e quando.
 */
export interface Receipt {
  id: string
  /** Sequencial, começando em 1 e sem buraco — recibo nº 7 de 2026. */
  numero: number
  personId: string
  /** Competência YYYY-MM a que o pagamento se refere. */
  period: string
  /** Lançamentos quitados por este pagamento — liga o recibo ao que ele cobre. */
  entryIds: string[]
  /** Traço da assinatura (data URL PNG, fundo transparente). */
  signature: string

  // --- Congelados no momento da assinatura (ver comentário acima) ----------
  /** Nome como estava no cadastro na hora de assinar. */
  personName: string
  /** CPF de quem assinou — identificação inequívoca, exigida ao assinar. */
  personDoc: string
  /** Quem pagou, como estava em Configurações na hora — congelado junto. */
  payerName: string
  payerDoc: string
  payerDocType: 'cnpj' | 'cpf'
  /** Valor exato que ela viu na tela ao assinar. */
  amount: number
  /** O mesmo valor por extenso, como num recibo de papel. */
  amountText: string
  method: PaymentMethod
  /** O texto de quitação exato que ela leu antes de assinar. */
  termo: string
  /** Momento exato da assinatura (ISO completo, com hora e fuso). */
  signedAt: string

  // --- Cadeia de integridade (ver `receipt.ts`) ----------------------------
  /** SHA-256 deste recibo, incluindo `prevHash`. */
  hash: string
  /** Hash do recibo anterior — é o que encadeia e torna adulteração visível. */
  prevHash: string
}

/**
 * Quem paga — aparece no "Recebi de" de todo recibo.
 *
 * Um recibo identifica duas partes: quem recebeu (a funcionária, via CPF e
 * assinatura) e quem pagou. Sem estes dados o documento fica pela metade, e é
 * por isso que eles não podem ser chutados em código: ficam aqui, preenchidos
 * uma vez em Configurações.
 */
export interface Company {
  /** Razão social ou nome de quem paga. */
  name: string
  /** CNPJ (só dígitos) quando é empresa; CPF quando é pessoa física. */
  doc: string
  /** 'cnpj' | 'cpf' — muda o rótulo e a validação do documento. */
  docType: 'cnpj' | 'cpf'
  /** Nome fantasia / como a loja é conhecida. Opcional, só decora o recibo. */
  tradeName: string
  /** Endereço em uma linha. Opcional, mas reforça a identificação. */
  address: string
  /**
   * Quais dias da semana contam como dia de trabalho — índice de
   * `Date.getDay()` (0 = domingo … 6 = sábado). Único para toda a empresa:
   * é o que alimenta a contagem de "Nº dia útil" de qualquer pessoa cujo
   * pagamento use esse modo, sem cada uma ter seu próprio calendário.
   */
  workDays: number[]
  /**
   * Horas de trabalho no mês — o divisor que transforma salário em valor da
   * hora. Ausente usa o padrão de 220h.
   *
   * É da empresa e não de cada pessoa porque a jornada é a mesma para a
   * equipe: quem trabalha meio período tem salário proporcional, não divisor
   * diferente.
   */
  monthlyHours?: number
}

/** Segunda a sexta — o padrão mais comum, ajustável em Configurações. */
export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5]

/**
 * 220 horas/mês: a jornada de 44h semanais da CLT (8h de segunda a sexta mais
 * 4h no sábado), que é o divisor que aparece em holerite e o que um contador
 * espera ver. Quem trabalha 40h semanais usa 200 — ajustável em Configurações.
 */
export const DEFAULT_MONTHLY_HOURS = 220

export const EMPTY_COMPANY: Company = {
  name: '',
  doc: '',
  docType: 'cnpj',
  tradeName: '',
  address: '',
  workDays: DEFAULT_WORK_DAYS,
  monthlyHours: DEFAULT_MONTHLY_HOURS,
}

export interface Database {
  version: 7
  /** Dados de quem paga. Começa vazio — Configurações é quem preenche. */
  company: Company
  people: Person[]
  entries: Entry[]
  agenda: AgendaItem[]
  monthMemberships: MonthMembership[]
  recibos: Receipt[]
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

/**
 * Um item da agenda: pode ser um turno de equipe ("Loja Centro, 09:00-18:00,
 * com a Ana") ou um lembrete solto do dia a dia ("buscar roupas no Brás").
 * Um tipo único, sem seletor — hora e pessoas são opcionais e cada item usa
 * só o que precisar, o que evita a pessoa ter que escolher uma categoria
 * antes de anotar algo simples.
 */
export interface AgendaItem {
  id: string
  /** ISO YYYY-MM-DD do dia. */
  date: string
  /** "Loja Centro", "Buscar roupas no Brás"… texto livre. */
  title: string
  /** "09:00-18:00" ou "15:00" — formatado pela máscara do campo. Opcional. */
  time: string
  /** Pessoas envolvidas, quando fizer sentido marcar quem. */
  personIds: string[]
  createdAt: string
}

/**
 * Marca manual de "essa pessoa participa deste mês", usada só para freela e
 * diarista — fixo já é visível pela janela cadastro→saída, não precisa disso.
 * É o que permite "readicionar" ao mês alguém que já trabalhou antes mas não
 * tem lançamento nem foi cadastrada agora (ver `peopleVisibleInPeriod`).
 */
export interface MonthMembership {
  personId: string
  /** Competência YYYY-MM. */
  period: string
}

export const CONTRACT_LABEL: Record<ContractType, string> = {
  fixo: 'Salário fixo',
  diarista: 'Diária',
  freelancer: 'Freelancer',
}

/** Rótulo curto usado no segmented control do cadastro. */
export const CONTRACT_SHORT: Record<ContractType, string> = {
  fixo: 'Fixo',
  diarista: 'Diária',
  freelancer: 'Freela',
}

/**
 * Cor sutil do avatar por tipo de contrato — para bater o olho e já saber se
 * é fixo, freela ou diarista, sem precisar ler o texto abaixo do nome. Fixo
 * fica com o rosé padrão (o neutro da interface); freelancer usa o azul da
 * marca; diarista usa o sálvia, criado só para essa terceira distinção.
 */
export const CONTRACT_AVATAR: Record<ContractType, string> = {
  fixo: 'bg-blush-50 text-blush-600 ring-blush-200/50',
  freelancer: 'bg-butterfly-50 text-butterfly-600 ring-butterfly-200/50',
  diarista: 'bg-sage-50 text-sage-600 ring-sage-600/15',
}

/**
 * Cor do rótulo de tipo de contrato no texto da linha (sublinha do nome).
 * Fixo fica sem cor própria — herda o cinza neutro do texto ao redor, porque
 * é o caso mais comum e colorir o padrão também tiraria força da distinção.
 * Freela e diarista usam as mesmas cores do avatar para a leitura casar.
 */
export const CONTRACT_TEXT: Record<ContractType, string> = {
  fixo: '',
  freelancer: 'text-butterfly-600',
  diarista: 'text-sage-600',
}

export const KIND_LABEL: Record<EntryKind, string> = {
  salario: 'Salário',
  diaria: 'Diária',
  servico: 'Serviço',
  extra: 'Hora extra',
  reembolso: 'Reembolso',
  vale: 'Vale',
  desconto: 'Desconto',
}

export const KIND_HINT: Record<EntryKind, string> = {
  salario: 'O pagamento principal do mês.',
  diaria: 'Dias trabalhados no período.',
  servico: 'Trabalho avulso, freelancer.',
  extra: 'Horas ou plantão a mais, por fora do combinado.',
  reembolso: 'Despesa que ela adiantou e você devolve.',
  vale: 'Parte paga antes da data. Abate do que falta.',
  desconto: 'Falta, material, adiantamento anterior. Reduz o total.',
}

/**
 * Como cada tipo entra na conta do mês:
 *  'soma'     → aumenta o total devido (salário, diária, serviço, extra, reembolso)
 *  'abate'    → reduz o total devido (desconto)
 *  'antecipa' → não muda o total; é uma parcela dele paga antes (vale)
 */
export const KIND_EFFECT: Record<EntryKind, 'soma' | 'abate' | 'antecipa'> = {
  salario: 'soma',
  diaria: 'soma',
  servico: 'soma',
  extra: 'soma',
  reembolso: 'soma',
  vale: 'antecipa',
  desconto: 'abate',
}

/** Ordem em que os tipos aparecem nos chips do sheet "Lançar valor". */
export const KIND_ORDER: EntryKind[] = [
  'salario',
  'diaria',
  'servico',
  'extra',
  'reembolso',
  'vale',
  'desconto',
]

/** Tipo sugerido ao lançar para alguém, conforme como a pessoa recebe. */
export function defaultKindFor(contract: ContractType): EntryKind {
  if (contract === 'fixo') return 'salario'
  if (contract === 'diarista') return 'diaria'
  return 'servico'
}
