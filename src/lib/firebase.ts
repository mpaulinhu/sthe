import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Conexão com o Firebase.
 *
 * As credenciais vêm do `.env` (ver `.env.example`). Elas não são segredo —
 * vão no bundle que roda no navegador de qualquer jeito. O que protege os
 * dados é o login somado às Security Rules em `firestore.rules`.
 *
 * Tudo aqui é opcional de propósito: sem `.env` configurado o app continua
 * funcionando só no aparelho (localStorage), sem nuvem. Isso mantém o
 * desenvolvimento e os testes rodando sem depender de rede ou credencial.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Só liga a nuvem quando há credencial de verdade — sem isso, modo local. */
export const nuvemAtiva = Boolean(config.apiKey && config.projectId)

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let dbInstance: Firestore | undefined

if (nuvemAtiva) {
  app = initializeApp(config)
  authInstance = getAuth(app)
  dbInstance = getFirestore(app)
}

/** Só chame depois de checar `nuvemAtiva`. */
export function getAuthOrThrow(): Auth {
  if (!authInstance) throw new Error('Firebase não configurado.')
  return authInstance
}

/** Só chame depois de checar `nuvemAtiva`. */
export function getDbOrThrow(): Firestore {
  if (!dbInstance) throw new Error('Firebase não configurado.')
  return dbInstance
}
