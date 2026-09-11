import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { getDbOrThrow } from './firebase'
import { EMPTY_COMPANY, type Database } from './types'

/**
 * Sincronização do banco com o Firestore.
 *
 * O banco é dividido em um documento por coleção lógica, e não num documento
 * único, por causa do teto de 1 MB por documento do Firestore: comprovantes e
 * fotos são data URLs e somam rápido. Separado, cada parte tem seu próprio
 * espaço, e salvar uma lista não reescreve as outras.
 *
 * Todo mundo autorizado compartilha os mesmos documentos — é um negócio só
 * (ver `firestore.rules`).
 */

/** Um documento por chave; `company` é objeto, o resto são listas. */
const COLECOES = ['company', 'people', 'entries', 'agenda', 'monthMemberships', 'recibos'] as const

type Colecao = (typeof COLECOES)[number]

function ref(colecao: Colecao) {
  return doc(getDbOrThrow(), 'sthe', colecao)
}

/**
 * O Firestore não guarda arrays na raiz de um documento, então cada lista vai
 * embrulhada em `{ itens: [...] }`. `company` é objeto e vai direto.
 */
export async function salvarNaNuvem(db: Database): Promise<void> {
  await Promise.all([
    setDoc(ref('company'), db.company),
    setDoc(ref('people'), { itens: db.people }),
    setDoc(ref('entries'), { itens: db.entries }),
    setDoc(ref('agenda'), { itens: db.agenda }),
    setDoc(ref('monthMemberships'), { itens: db.monthMemberships }),
    setDoc(ref('recibos'), { itens: db.recibos }),
  ])
}

/** Lê o banco inteiro da nuvem. Coleção ausente vira lista vazia. */
export async function lerDaNuvem(): Promise<Database> {
  const [company, people, entries, agenda, memberships, recibos] = await Promise.all(
    COLECOES.map((c) => getDoc(ref(c))),
  )

  return {
    version: 7,
    company: company.exists() ? { ...EMPTY_COMPANY, ...company.data() } : EMPTY_COMPANY,
    people: people.exists() ? (people.data().itens ?? []) : [],
    entries: entries.exists() ? (entries.data().itens ?? []) : [],
    agenda: agenda.exists() ? (agenda.data().itens ?? []) : [],
    monthMemberships: memberships.exists() ? (memberships.data().itens ?? []) : [],
    recibos: recibos.exists() ? (recibos.data().itens ?? []) : [],
  }
}

/** Existe algum dado na nuvem? Decide se a primeira entrada oferece migrar. */
export async function nuvemTemDados(): Promise<boolean> {
  const people = await getDoc(ref('people'))
  return people.exists() && (people.data().itens?.length ?? 0) > 0
}

/**
 * Escuta mudanças feitas em outros aparelhos. Um listener por documento: o
 * Firestore não tem "escutar vários documentos avulsos" numa chamada só.
 */
export function escutarNuvem(aoMudar: (db: Database) => void): Unsubscribe {
  const paradas = COLECOES.map((c) =>
    onSnapshot(ref(c), () => {
      void lerDaNuvem().then(aoMudar)
    }),
  )
  return () => paradas.forEach((parar) => parar())
}
