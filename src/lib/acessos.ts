import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { configFirebase, getAuthOrThrow, getDbOrThrow } from './firebase'

/**
 * Quem pode entrar no app.
 *
 * São dois portões, e os dois precisam passar: a conta existir no Firebase
 * Authentication (e-mail e senha) e o uid dela estar na coleção `autorizados`.
 * Criar conta sozinho não dá acesso a nada — e é isso que mantém o app público
 * na internet sem virar porta aberta.
 *
 * Convidar é privilégio de quem já está dentro: a regra de escrita em
 * `autorizados` exige que quem escreve já esteja na lista (ver
 * `firestore.rules`). Um estranho que criasse conta ficaria sem conseguir se
 * autorizar, que é o ponto.
 */

export type Acesso = {
  uid: string
  nome: string
  email: string
  /** Quem convidou. Guardado para a lista conseguir dizer de onde veio o acesso. */
  convidadoPor?: string
}

const COLECAO = 'autorizados'

function colecao() {
  return collection(getDbOrThrow(), COLECAO)
}

/** Lista quem tem acesso, e avisa a cada mudança. */
export function observarAcessos(
  aoMudar: (lista: Acesso[]) => void,
  aoFalhar: (err: unknown) => void,
): () => void {
  return onSnapshot(
    colecao(),
    (snap) => {
      const lista = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Acesso, 'uid'>) }))
      lista.sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'))
      aoMudar(lista)
    },
    aoFalhar,
  )
}

/** Leitura avulsa — usada na confirmação antes de remover o último acesso. */
export async function contarAcessos(): Promise<number> {
  const snap = await getDocs(colecao())
  return snap.size
}

/**
 * Completa a própria entrada quando ela veio incompleta.
 *
 * Os primeiros acessos foram criados à mão no Console do Firebase, onde só o
 * uid é obrigatório — esses documentos podem estar sem `nome` ou sem `email`,
 * e a lista fica mostrando uma linha pela metade. Aqui a entrada de quem está
 * logado é preenchida com o e-mail real da conta, que é a fonte certa.
 *
 * Só mexe na entrada do próprio usuário (é o único e-mail que temos como
 * saber) e só no que está faltando: `merge` preserva o que já foi preenchido.
 */
export async function completarMinhaEntrada(
  uid: string,
  email: string,
  atual: Acesso | undefined,
): Promise<void> {
  if (!email) return
  const faltaEmail = !atual?.email
  const faltaNome = !atual?.nome
  if (!faltaEmail && !faltaNome) return

  const remendo: Record<string, string> = {}
  if (faltaEmail) remendo.email = email
  // Sem nome, o trecho antes do @ é um palpite melhor do que deixar vazio.
  if (faltaNome) remendo.nome = email.split('@')[0]

  await setDoc(doc(colecao(), uid), remendo, { merge: true })
}

/**
 * Cria o login e já autoriza.
 *
 * O `createUserWithEmailAndPassword` troca a sessão ativa para a conta recém
 * criada — se fosse chamado na instância principal, você sairia do seu próprio
 * login no meio do convite. Por isso ele roda numa **instância secundária**,
 * com o mesmo projeto mas sessão própria e descartável: a conta nasce lá, o
 * uid é lido, e a instância é destruída em seguida. A sua sessão nunca é
 * tocada.
 */
export async function convidar(
  nome: string,
  email: string,
  senha: string,
  convidadoPor: string,
): Promise<Acesso> {
  let secundario: FirebaseApp | undefined
  try {
    secundario = initializeApp(configFirebase, `convite-${Date.now()}`)
    const authSecundario = getAuth(secundario)
    const cred = await createUserWithEmailAndPassword(authSecundario, email.trim(), senha)
    const uid = cred.user.uid

    // Sai da sessão secundária antes de destruí-la, para não deixar o token
    // da pessoa convidada guardado neste navegador.
    await authSecundario.signOut()

    const acesso: Acesso = { uid, nome: nome.trim(), email: email.trim(), convidadoPor }
    await setDoc(doc(colecao(), uid), {
      nome: acesso.nome,
      email: acesso.email,
      convidadoPor,
      criadoEm: serverTimestamp(),
    })
    return acesso
  } finally {
    if (secundario) await deleteApp(secundario)
  }
}

/**
 * Tira o acesso.
 *
 * A conta continua existindo no Authentication — apagar login exige privilégio
 * de administrador, que só existe num servidor. Mas sem o documento em
 * `autorizados` as regras negam tudo: a pessoa até consegue digitar a senha e
 * não vê dado nenhum, que é o efeito que importa.
 */
export async function removerAcesso(uid: string): Promise<void> {
  await deleteDoc(doc(colecao(), uid))
}

/**
 * Troca o nome de exibição de um acesso.
 *
 * O e-mail não é editável aqui de propósito: ele é a identidade do login no
 * Authentication, e mudá-lo só no Firestore faria a lista mostrar um endereço
 * que não é o usado para entrar.
 */
export async function renomearAcesso(uid: string, nome: string): Promise<void> {
  await setDoc(doc(colecao(), uid), { nome: nome.trim() }, { merge: true })
}

/** Dispara o e-mail de redefinição do próprio Firebase. */
export async function enviarRedefinicao(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuthOrThrow(), email.trim())
}

/**
 * Troca a senha de quem está logado.
 *
 * O Firebase recusa quando a sessão é antiga (`auth/requires-recent-login`) —
 * é proteção contra alguém trocar a senha num aparelho deixado aberto. Nesse
 * caso a saída é sair e entrar de novo; a tela explica isso.
 */
export async function trocarMinhaSenha(nova: string): Promise<void> {
  const usuario = getAuthOrThrow().currentUser
  if (!usuario) throw new Error('Sessão expirada. Entre de novo.')
  await updatePassword(usuario, nova)
}

/** Mensagens do Firebase são técnicas demais para a tela. */
const ERROS: Record<string, string> = {
  'auth/email-already-in-use': 'Esse e-mail já tem conta. Se a pessoa perdeu o acesso, use "Reenviar senha".',
  'auth/invalid-email': 'Esse e-mail não parece válido.',
  'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
  'auth/requires-recent-login': 'Por segurança, saia e entre de novo antes de trocar a senha.',
  'auth/user-not-found': 'Não achei conta com esse e-mail.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem conexão. Confira a internet e tente de novo.',
  'permission-denied': 'Você não tem permissão para isso.',
  unavailable: 'Sem conexão com a nuvem agora.',
}

export function erroDeAcesso(err: unknown): string {
  const codigo = (err as { code?: string })?.code ?? ''
  if (ERROS[codigo]) return ERROS[codigo]
  const msg = (err as { message?: string })?.message
  return msg && !msg.startsWith('Firebase:') ? msg : 'Não consegui completar. Tente de novo.'
}
