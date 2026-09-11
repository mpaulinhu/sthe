import { useCallback, useEffect, useRef, useState } from 'react'
import type { Database } from './types'

/**
 * Desfazer e refazer (Ctrl+Z / Ctrl+Shift+Z).
 *
 * Guarda fotos inteiras do banco, não a lista de operações. O banco daqui é
 * pequeno — algumas dezenas de registros, e as imagens são strings que as
 * cópias compartilham em vez de duplicar —, então o custo é baixo e a lógica
 * fica honesta: desfazer é voltar ao que existia, sem depender de cada ação
 * saber se inverter.
 *
 * O limite de passos existe porque a alternativa é a memória crescer sem fim
 * numa sessão longa.
 *
 * Nem tudo volta. Recibo assinado é documento: uma vez emitido, desfazer o
 * pagamento que o gerou deixaria o recibo órfão, comprovando algo que o app
 * diz não ter acontecido. Por isso `registrar` recebe o que a ação pode
 * desfazer, e quem emite recibo simplesmente não registra.
 */

export const MAX_PASSOS = 30

export type Passo = { estado: Database; rotulo: string }

/**
 * As três transições da pilha, como funções puras — assim a regra fica
 * testável sem montar React em volta.
 */
export const pilha = {
  /** Empilha o estado atual e descarta o futuro (o caminho novo o invalida). */
  registrar(passado: Passo[], estado: Database, rotulo: string): Passo[] {
    return [...passado, { estado, rotulo }].slice(-MAX_PASSOS)
  },

  /**
   * Tira o último do passado e devolve para onde voltar. `atual` vai para o
   * futuro, para o refazer ter como trazer de volta.
   */
  desfazer(
    passado: Passo[],
    futuro: Passo[],
    atual: Database,
  ): { passado: Passo[]; futuro: Passo[]; alvo: Passo } | null {
    const anterior = passado[passado.length - 1]
    if (!anterior) return null
    return {
      passado: passado.slice(0, -1),
      futuro: [...futuro, { estado: atual, rotulo: anterior.rotulo }],
      alvo: anterior,
    }
  },

  /** O espelho do desfazer. */
  refazer(
    passado: Passo[],
    futuro: Passo[],
    atual: Database,
  ): { passado: Passo[]; futuro: Passo[]; alvo: Passo } | null {
    const proximo = futuro[futuro.length - 1]
    if (!proximo) return null
    return {
      passado: [...passado, { estado: atual, rotulo: proximo.rotulo }],
      futuro: futuro.slice(0, -1),
      alvo: proximo,
    }
  },
}

export function useDesfazer(
  db: Database,
  aplicar: (d: Database) => void,
  avisar: (msg: string) => void,
) {
  const passado = useRef<Passo[]>([])
  const futuro = useRef<Passo[]>([])

  // Só serve para a interface saber se mostra os botões — a fonte da verdade
  // são as refs, que não precisam causar render a cada mudança.
  const [temPassado, setTemPassado] = useState(false)
  const [temFuturo, setTemFuturo] = useState(false)

  // `db` muda a cada render; a ref deixa `registrar` ler o valor atual sem
  // ser recriada, o que reinstalaria o ouvinte de teclado toda vez.
  const dbRef = useRef(db)
  dbRef.current = db

  function sincronizar() {
    setTemPassado(passado.current.length > 0)
    setTemFuturo(futuro.current.length > 0)
  }

  /**
   * Marca o estado atual como ponto de retorno. Chame ANTES de alterar o
   * banco, passando o nome da ação ("Pagamento", "Item movido") — ele aparece
   * no aviso do desfazer.
   */
  const registrar = useCallback((rotulo: string) => {
    passado.current = pilha.registrar(passado.current, dbRef.current, rotulo)
    // Um caminho novo apaga o futuro: refazer o que foi descartado levaria a
    // um estado que nunca existiu.
    futuro.current = []
    sincronizar()
  }, [])

  const desfazer = useCallback(() => {
    const r = pilha.desfazer(passado.current, futuro.current, dbRef.current)
    if (!r) return
    passado.current = r.passado
    futuro.current = r.futuro
    aplicar(r.alvo.estado)
    sincronizar()
    avisar(`Desfeito: ${r.alvo.rotulo.toLowerCase()}.`)
  }, [aplicar, avisar])

  const refazer = useCallback(() => {
    const r = pilha.refazer(passado.current, futuro.current, dbRef.current)
    if (!r) return
    passado.current = r.passado
    futuro.current = r.futuro
    aplicar(r.alvo.estado)
    sincronizar()
    avisar(`Refeito: ${r.alvo.rotulo.toLowerCase()}.`)
  }, [aplicar, avisar])

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return

      // Dentro de um campo de texto, Ctrl+Z é do campo: quem está digitando
      // espera desfazer a palavra, não o banco inteiro.
      const alvo = e.target as HTMLElement | null
      const editando =
        alvo?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo?.tagName ?? '')
      if (editando) return

      e.preventDefault()
      if (e.shiftKey) refazer()
      else desfazer()
    }

    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [desfazer, refazer])

  /**
   * Apaga o histórico inteiro.
   *
   * Chamado quando acontece algo que não pode ser revertido — hoje, emitir
   * recibo assinado. Não basta o recibo "não registrar": o pagamento que veio
   * antes registrou, e um Ctrl+Z depois da assinatura desfaria justamente o
   * pagamento que o documento comprova, deixando o recibo órfão. Zerar aqui é
   * o que garante que nada anterior à assinatura volte.
   */
  const esquecer = useCallback(() => {
    passado.current = []
    futuro.current = []
    sincronizar()
  }, [])

  return { registrar, esquecer, desfazer, refazer, temPassado, temFuturo }
}
