import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDbOrThrow } from './firebase'
import {
  EMPTY_COMPANY,
  type AgendaItem,
  type Company,
  type Database,
  type Entry,
  type MonthMembership,
  type Person,
  type Receipt,
} from './types'

/**
 * Sincronização do banco com o Firestore.
 *
 * Cada registro é um documento próprio, e não um item dentro de uma lista
 * gigante. Três motivos, em ordem de importância:
 *
 * 1. O teto de 1 MB por documento. Com fotos de perfil (~40 KB cada), umas
 *    vinte pessoas numa lista só já estourariam — e a gravação falharia
 *    inteira, não só a pessoa nova.
 * 2. Escrever uma pessoa não reescreve as outras. Na lista única, dois
 *    aparelhos editando pessoas diferentes ao mesmo tempo faziam um
 *    sobrescrever o trabalho do outro.
 * 3. É o modelo para o qual o Firestore foi desenhado.
 *
 * `company` é a exceção: é um registro só, então continua sendo um documento
 * só (`config/company`).
 */

/** Coleções de lista, com o id de cada documento. */
const LISTAS = {
  people: (p: Person) => p.id,
  entries: (e: Entry) => e.id,
  agenda: (a: AgendaItem) => a.id,
  recibos: (r: Receipt) => r.id,
  // Não tem id próprio: a identidade é quem participa de qual mês. Barra não
  // pode aparecer em id de documento, então o separador é `__`.
  monthMemberships: (m: MonthMembership) => `${m.personId}__${m.period}`,
} as const

type Lista = keyof typeof LISTAS

const COMPANY_DOC = ['config', 'company'] as const

function colRef(lista: Lista) {
  return collection(getDbOrThrow(), lista)
}

function companyRef() {
  return doc(getDbOrThrow(), ...COMPANY_DOC)
}

/**
 * O Firestore rejeita `undefined` em qualquer campo — e os tipos do app estão
 * cheios de opcionais (`method`, `doc`, `photo`, `payDayMode`, `receiptImage`).
 * Uma pessoa sem foto bastava para a gravação inteira falhar.
 *
 * Passar pelo JSON resolve porque `JSON.stringify` descarta chaves com
 * `undefined`, e de quebra garante que só vai tipo serializável — o banco todo
 * já é feito de objetos simples vindos do localStorage.
 *
 * Exportada para ter teste próprio: um campo opcional novo em `types.ts`
 * quebraria a sincronização inteira de novo, e em silêncio.
 */
export function semUndefined<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor))
}

/**
 * Grava o banco inteiro, em lote.
 *
 * O lote importa por dois motivos: é atômico (ou entra tudo, ou nada — nunca
 * um estado pela metade) e conta como uma operação de rede só. Cada lote do
 * Firestore aceita 500 escritas, então listas maiores são partidas.
 *
 * Documentos que sumiram do app são apagados: sem isso, excluir uma pessoa
 * aqui a deixaria viva na nuvem e ela voltaria na próxima leitura.
 */
export async function salvarNaNuvem(db: Database): Promise<void> {
  const alvo: Record<Lista, { id: string; dado: unknown }[]> = {
    people: db.people.map((p) => ({ id: LISTAS.people(p), dado: p })),
    entries: db.entries.map((e) => ({ id: LISTAS.entries(e), dado: e })),
    agenda: db.agenda.map((a) => ({ id: LISTAS.agenda(a), dado: a })),
    recibos: db.recibos.map((r) => ({ id: LISTAS.recibos(r), dado: r })),
    monthMemberships: db.monthMemberships.map((m) => ({
      id: LISTAS.monthMemberships(m),
      dado: m,
    })),
  }

  const existentes = await Promise.all(
    (Object.keys(LISTAS) as Lista[]).map(async (lista) => {
      const snap = await getDocs(colRef(lista))
      return [lista, new Set(snap.docs.map((d) => d.id))] as const
    }),
  )
  const idsNaNuvem = new Map(existentes)

  const firestore = getDbOrThrow()
  let lote = writeBatch(firestore)
  let noLote = 0
  const lotes = [lote]

  const escrever = (fn: (b: ReturnType<typeof writeBatch>) => void) => {
    if (noLote >= 500) {
      lote = writeBatch(firestore)
      lotes.push(lote)
      noLote = 0
    }
    fn(lote)
    noLote++
  }

  for (const lista of Object.keys(LISTAS) as Lista[]) {
    const itens = alvo[lista]
    const naNuvem = idsNaNuvem.get(lista) ?? new Set<string>()
    const idsAgora = new Set(itens.map((i) => i.id))

    for (const { id, dado } of itens) {
      escrever((b) => b.set(doc(colRef(lista), id), semUndefined(dado) as object))
    }
    for (const id of naNuvem) {
      if (!idsAgora.has(id)) escrever((b) => b.delete(doc(colRef(lista), id)))
    }
  }

  escrever((b) => b.set(companyRef(), semUndefined(db.company)))

  await Promise.all(lotes.map((l) => l.commit()))
}

/** Lê o banco inteiro da nuvem. Coleção ausente vira lista vazia. */
export async function lerDaNuvem(): Promise<Database> {
  const [company, people, entries, agenda, memberships, recibos] = await Promise.all([
    getDoc(companyRef()),
    getDocs(colRef('people')),
    getDocs(colRef('entries')),
    getDocs(colRef('agenda')),
    getDocs(colRef('monthMemberships')),
    getDocs(colRef('recibos')),
  ])

  return {
    version: 7,
    company: company.exists()
      ? { ...EMPTY_COMPANY, ...(company.data() as Company) }
      : EMPTY_COMPANY,
    people: people.docs.map((d) => d.data() as Person),
    entries: entries.docs.map((d) => d.data() as Entry),
    agenda: agenda.docs.map((d) => d.data() as AgendaItem),
    monthMemberships: memberships.docs.map((d) => d.data() as MonthMembership),
    recibos: recibos.docs.map((d) => d.data() as Receipt),
  }
}

/** Existe algum dado na nuvem? Decide se a primeira entrada sobe o que há aqui. */
export async function nuvemTemDados(): Promise<boolean> {
  const people = await getDocs(colRef('people'))
  return !people.empty
}

/**
 * Escuta mudanças feitas em outros aparelhos.
 *
 * Dois cuidados que evitam trabalho à toa:
 *
 * - O Firestore entrega um snapshot inicial assim que o listener é
 *   registrado. Isso é o estado que acabamos de ler, não uma mudança —
 *   ignorar a primeira entrega evita reler tudo logo na abertura.
 * - `hasPendingWrites` marca o eco da nossa própria escrita, que volta pelo
 *   listener. Reagir a ele só reescreveria o que já temos.
 */
export function escutarNuvem(aoMudar: (db: Database) => void): Unsubscribe {
  const jaChegou = new Set<string>()

  const reagir = (chave: string, temEscritaPendente: boolean) => {
    if (!jaChegou.has(chave)) {
      jaChegou.add(chave)
      return
    }
    if (temEscritaPendente) return
    void lerDaNuvem().then(aoMudar)
  }

  const paradas: Unsubscribe[] = [
    ...(Object.keys(LISTAS) as Lista[]).map((lista) =>
      onSnapshot(colRef(lista), (snap) => reagir(lista, snap.metadata.hasPendingWrites)),
    ),
    onSnapshot(companyRef(), (snap) => reagir('company', snap.metadata.hasPendingWrites)),
  ]

  return () => paradas.forEach((parar) => parar())
}

/**
 * Apaga o formato antigo (um documento por coleção, dentro de `sthe/`), usado
 * antes de cada registro virar seu próprio documento. Roda uma vez, depois de
 * os dados já terem sido migrados para o formato novo.
 */
export async function limparFormatoAntigo(): Promise<void> {
  const antigos = ['company', 'people', 'entries', 'agenda', 'monthMemberships', 'recibos']
  await Promise.all(
    antigos.map((nome) => deleteDoc(doc(getDbOrThrow(), 'sthe', nome)).catch(() => {})),
  )
}

/** Lê o formato antigo, para migrar o que já estava na nuvem. */
export async function lerFormatoAntigo(): Promise<Database | null> {
  const people = await getDoc(doc(getDbOrThrow(), 'sthe', 'people'))
  if (!people.exists()) return null

  const [company, entries, agenda, memberships, recibos] = await Promise.all(
    ['company', 'entries', 'agenda', 'monthMemberships', 'recibos'].map((nome) =>
      getDoc(doc(getDbOrThrow(), 'sthe', nome)),
    ),
  )

  return {
    version: 7,
    company: company.exists()
      ? { ...EMPTY_COMPANY, ...(company.data() as Company) }
      : EMPTY_COMPANY,
    people: people.data()?.itens ?? [],
    entries: entries.exists() ? (entries.data().itens ?? []) : [],
    agenda: agenda.exists() ? (agenda.data().itens ?? []) : [],
    monthMemberships: memberships.exists() ? (memberships.data().itens ?? []) : [],
    recibos: recibos.exists() ? (recibos.data().itens ?? []) : [],
  }
}
