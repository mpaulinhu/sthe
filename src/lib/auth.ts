import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { getAuthOrThrow } from './firebase'

/**
 * Login por e-mail e senha.
 *
 * Não há tela de cadastro: as contas são criadas à mão no Console do Firebase.
 * Um app de folha de pagamento não deve aceitar quem chegar — quem pode entrar
 * é decidido fora dele, e a lista `autorizados` no Firestore é o segundo
 * portão (ver `firestore.rules`).
 */

/** Mensagens do Firebase são em inglês e técnicas demais para a tela. */
const ERROS: Record<string, string> = {
  'auth/invalid-email': 'Esse e-mail não parece válido.',
  'auth/user-disabled': 'Essa conta está desativada.',
  'auth/user-not-found': 'E-mail ou senha não conferem.',
  'auth/wrong-password': 'E-mail ou senha não conferem.',
  'auth/invalid-credential': 'E-mail ou senha não conferem.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem conexão. Confira a internet e tente de novo.',
}

export function mensagemDeErro(err: unknown): string {
  const codigo = (err as { code?: string })?.code ?? ''
  return ERROS[codigo] ?? 'Não consegui entrar. Tente de novo.'
}

/**
 * `browserLocalPersistence` mantém a sessão aberta entre visitas — ela não
 * deveria digitar a senha toda vez que abre o app no celular.
 */
export async function entrar(email: string, senha: string): Promise<void> {
  const auth = getAuthOrThrow()
  await setPersistence(auth, browserLocalPersistence)
  await signInWithEmailAndPassword(auth, email.trim(), senha)
}

export async function sair(): Promise<void> {
  await signOut(getAuthOrThrow())
}

/** Avisa quem está logado (ou `null`) agora e a cada mudança. */
export function observarUsuario(aoMudar: (u: User | null) => void): () => void {
  return onAuthStateChanged(getAuthOrThrow(), aoMudar)
}
