import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { nuvemAtiva } from './firebase'
import { observarUsuario } from './auth'
import { escutarNuvem, lerDaNuvem, nuvemTemDados, salvarNaNuvem } from './cloud'
import { loadDb, saveDb } from './storage'
import type { Database } from './types'

export type EstadoNuvem =
  /** Sem credencial: app roda só neste aparelho, como sempre foi. */
  | { modo: 'local' }
  /** Conferindo se já existe sessão aberta. */
  | { modo: 'carregando' }
  /** Precisa entrar. */
  | { modo: 'deslogado' }
  /** Logado e sincronizando. */
  | { modo: 'pronto'; usuario: User }

/**
 * Une o banco local com o da nuvem.
 *
 * O app continua escrevendo no localStorage sempre — é o que faz ele abrir
 * rápido, funcionar sem rede e continuar inteiro se o Firebase estiver fora.
 * A nuvem entra por cima: ao logar, puxa o que está lá; a cada mudança local,
 * empurra. Outro aparelho que altere algo chega pelo listener.
 */
export function useCloudDb() {
  const [db, setDb] = useState<Database>(() => loadDb())
  const [estado, setEstado] = useState<EstadoNuvem>(
    nuvemAtiva ? { modo: 'carregando' } : { modo: 'local' },
  )

  /**
   * Evita o eco: quando a nuvem nos entrega dados, gravamos no estado — e esse
   * mesmo estado dispara o efeito de salvar, que mandaria tudo de volta para a
   * nuvem sem necessidade. Esta trava pula exatamente uma volta.
   */
  const vindoDaNuvem = useRef(false)

  /** Enquanto não terminamos a primeira leitura, não empurramos nada. */
  const prontoParaEmpurrar = useRef(false)

  // Sessão: quem está logado agora.
  useEffect(() => {
    if (!nuvemAtiva) return
    return observarUsuario((usuario) => {
      setEstado(usuario ? { modo: 'pronto', usuario } : { modo: 'deslogado' })
      if (!usuario) prontoParaEmpurrar.current = false
    })
  }, [])

  // Primeira carga depois do login: nuvem manda, a não ser que ela esteja
  // vazia e este aparelho tenha dados — aí o local sobe (primeira migração).
  useEffect(() => {
    if (estado.modo !== 'pronto') return
    let vivo = true

    void (async () => {
      const local = loadDb()
      const temNaNuvem = await nuvemTemDados()

      if (!temNaNuvem && local.people.length > 0) {
        await salvarNaNuvem(local)
      } else {
        const daNuvem = await lerDaNuvem()
        if (!vivo) return
        vindoDaNuvem.current = true
        setDb(daNuvem)
        saveDb(daNuvem)
      }

      if (vivo) prontoParaEmpurrar.current = true
    })()

    return () => {
      vivo = false
    }
  }, [estado.modo])

  // Mudanças feitas em outro aparelho.
  useEffect(() => {
    if (estado.modo !== 'pronto') return
    return escutarNuvem((daNuvem) => {
      vindoDaNuvem.current = true
      setDb(daNuvem)
      saveDb(daNuvem)
    })
  }, [estado.modo])

  // Salva local sempre; empurra para a nuvem quando logado.
  useEffect(() => {
    saveDb(db)

    if (vindoDaNuvem.current) {
      vindoDaNuvem.current = false
      return
    }
    if (estado.modo !== 'pronto' || !prontoParaEmpurrar.current) return

    void salvarNaNuvem(db).catch(() => {
      // Sem rede o local já guardou; a próxima mudança com conexão reenvia.
    })
  }, [db, estado.modo])

  const atualizar = useCallback((fn: (d: Database) => Database) => setDb(fn), [])

  return { db, setDb: atualizar, estado }
}
