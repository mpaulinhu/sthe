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
  /** Conferindo se já existe sessão aberta, ou fazendo a primeira carga. */
  | { modo: 'carregando' }
  /** Precisa entrar. */
  | { modo: 'deslogado' }
  /** Logado e sincronizando. */
  | { modo: 'pronto'; usuario: User }

/** Espera esse tanto de silêncio antes de mandar para a nuvem. */
const ESPERA_ANTES_DE_SALVAR = 800

/**
 * Traduz a falha para algo acionável. `permission-denied` é de longe o erro
 * mais provável aqui e tem causa quase sempre única: o uid não está na
 * coleção `autorizados`, ou as regras publicadas não são as do repositório.
 */
function descreverErro(err: unknown): string {
  const codigo = (err as { code?: string })?.code ?? ''
  if (codigo === 'permission-denied') {
    return 'Sem permissão para gravar na nuvem. Confira se seu usuário está em "autorizados" e se as regras foram publicadas.'
  }
  if (codigo === 'unavailable') {
    return 'Sem conexão com a nuvem. Os dados estão salvos neste aparelho.'
  }
  return 'Não consegui sincronizar com a nuvem. Os dados estão salvos neste aparelho.'
}

/**
 * Une o banco local com o da nuvem.
 *
 * O app continua escrevendo no localStorage sempre — é o que faz ele abrir
 * rápido, funcionar sem rede e continuar inteiro se o Firebase estiver fora.
 * A nuvem entra por cima: ao logar, concilia com o que está lá; a cada
 * mudança local, empurra. Outro aparelho que altere algo chega pelo listener.
 *
 * A ordem importa e é sequencial de propósito: primeiro a conciliação da
 * primeira carga termina, e só então o listener é ligado. Ligar os dois ao
 * mesmo tempo criava uma corrida em que o listener chegava com a nuvem ainda
 * vazia e apagava os dados deste aparelho antes de eles subirem.
 */
export function useCloudDb() {
  const [db, setDb] = useState<Database>(() => loadDb())
  const [estado, setEstado] = useState<EstadoNuvem>(
    nuvemAtiva ? { modo: 'carregando' } : { modo: 'local' },
  )

  /** Usuário logado, quando há. Separado do estado para o efeito não repetir. */
  const [usuario, setUsuario] = useState<User | null>(null)

  /**
   * Última falha de sincronização, para a tela poder dizer que parou. Sem
   * isso, "salvou mas não subiu" vira um problema invisível — que é
   * justamente o pior tipo num app de folha de pagamento.
   */
  const [erroNuvem, setErroNuvem] = useState('')

  /**
   * Só empurra para a nuvem o que o usuário mudou — nunca o que acabou de
   * chegar dela. Sem isso o dado volta em eco e uma escrita vira duas.
   */
  const podeEmpurrar = useRef(false)

  /** Cancela o envio anterior quando ela ainda está digitando. */
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Quem está logado agora.
  useEffect(() => {
    if (!nuvemAtiva) return
    return observarUsuario((u) => {
      setUsuario(u)
      if (!u) {
        podeEmpurrar.current = false
        setEstado({ modo: 'deslogado' })
      }
    })
  }, [])

  // Primeira carga e escuta, em sequência.
  useEffect(() => {
    if (!usuario) return
    let vivo = true
    let pararDeEscutar: (() => void) | undefined

    void (async () => {
      try {
        const local = loadDb()
        const temNaNuvem = await nuvemTemDados()
        if (!vivo) return

        // Nuvem vazia e este aparelho com dados: é a primeira vez: sobe o que
        // existe aqui em vez de apagar tudo com o vazio de lá.
        if (!temNaNuvem && local.people.length > 0) {
          await salvarNaNuvem(local)
          if (!vivo) return
          setDb(local)
        } else {
          const daNuvem = await lerDaNuvem()
          if (!vivo) return
          setDb(daNuvem)
          saveDb(daNuvem)
        }

        setEstado({ modo: 'pronto', usuario })
        setErroNuvem('')
        podeEmpurrar.current = true

        // Só agora: com a conciliação terminada, o que chegar é mudança de
        // verdade feita em outro aparelho.
        pararDeEscutar = escutarNuvem((daNuvem) => {
          if (!vivo) return
          podeEmpurrar.current = false
          setDb(daNuvem)
          saveDb(daNuvem)
          podeEmpurrar.current = true
        })
      } catch (err) {
        // Sem rede ou regra negando: segue com o que há neste aparelho, em vez
        // de deixar a pessoa presa numa tela de carregamento. Mas o erro vai
        // para o console: silenciar isso esconde exatamente o caso em que a
        // nuvem parou de receber e ninguém percebe.
        console.error('[STHE] Falha ao sincronizar com a nuvem:', err)
        if (vivo) {
          setEstado({ modo: 'pronto', usuario })
          setErroNuvem(descreverErro(err))
        }
      }
    })()

    return () => {
      vivo = false
      pararDeEscutar?.()
    }
  }, [usuario])

  // Local sempre; nuvem com um respiro, para não escrever a cada tecla.
  useEffect(() => {
    saveDb(db)

    if (!podeEmpurrar.current) return

    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void salvarNaNuvem(db)
        .then(() => setErroNuvem(''))
        .catch((err) => {
          // O local já guardou; a próxima mudança com conexão reenvia. O aviso
          // existe para "não está sincronizando" ser visível em vez de virar
          // um mistério silencioso.
          console.error('[STHE] Falha ao enviar para a nuvem:', err)
          setErroNuvem(descreverErro(err))
        })
    }, ESPERA_ANTES_DE_SALVAR)

    return () => clearTimeout(timer.current)
  }, [db])

  const atualizar = useCallback((fn: (d: Database) => Database) => setDb(fn), [])

  return { db, setDb: atualizar, estado, erroNuvem }
}
