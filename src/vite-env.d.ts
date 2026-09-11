/// <reference types="vite/client" />

/** Verdadeiro só no build publicado no GitHub Pages (ver vite.config.ts). */
declare const __DEMO__: boolean

/** Credenciais do Firebase — ver `.env.example`. Ausentes = app roda só local. */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
