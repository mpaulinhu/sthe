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
    setDoc(ref('company'), semUndefined(db.company)),
    setDoc(ref('people'), { itens: semUndefined(db.people) }),
    setDoc(ref('entries'), { itens: semUndefined(db.entries) }),
    setDoc(ref('agenda'), { itens: semUndefined(db.agenda) }),
    setDoc(ref('monthMemberships'), { itens: semUndefined(db.monthMemberships) }),
    setDoc(ref('recibos'), { itens: semUndefined(db.recibos) }),
  ])
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
 *
 * Dois cuidados que evitam trabalho à toa:
 *
 * - O Firestore entrega um snapshot inicial de cada documento assim que o
 *   listener é registrado. Isso é o estado que acabamos de ler, não uma
 *   mudança — ignorar a primeira entrega de cada documento evita reler tudo
 *   seis vezes logo na abertura.
 * - `hasPendingWrites` marca o eco da nossa própria escrita, que volta pelo
 *   listener. Reagir a ele só reescreveria o que já temos.
 */
export function escutarNuvem(aoMudar: (db: Database) => void): Unsubscribe {
  const jaChegou = new Set<Colecao>()

  const paradas = COLECOES.map((colecao) =>
    onSnapshot(ref(colecao), (snap) => {
      if (!jaChegou.has(colecao)) {
        jaChegou.add(colecao)
        return
      }
      if (snap.metadata.hasPendingWrites) return
      void lerDaNuvem().then(aoMudar)
    }),
  )

  return () => paradas.forEach((parar) => parar())
}
