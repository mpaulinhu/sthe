import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Arrastar um item da agenda de um dia para outro.
 *
 * Usa eventos de ponteiro em vez do arrastar-e-soltar nativo do HTML por um
 * motivo prático: o nativo não existe em toque — no celular o gesto
 * simplesmente não acontece. Ponteiro cobre mouse, toque e caneta com o mesmo
 * código.
 *
 * O dia de destino sai de `elementFromPoint` sobre um atributo no DOM, e não
 * de eventos de entrada/saída em cada célula: com o ponteiro capturado, a
 * célula de baixo não recebe `pointerenter`, então perguntar "o que está sob
 * o dedo" é o caminho que funciona nos dois mundos.
 */

/** Marca a célula de um dia como alvo. O valor é a data ISO. */
export const ATRIBUTO_DIA = 'data-dia-alvo'

/** Abaixo disto é toque, não arrasto — evita roubar o clique de abrir o item. */
const LIMIAR_PX = 6

type Arrasto = {
  id: string
  /** Dia sob o ponteiro agora, ou `null` fora de qualquer célula. */
  alvo: string | null
  /** Alt (ou Option) pressionado: solta como cópia em vez de mover. */
  duplicando: boolean
  x: number
  y: number
}

function diaSobOPonto(x: number, y: number): string | null {
  const alvo = document.elementFromPoint(x, y)
  return alvo?.closest(`[${ATRIBUTO_DIA}]`)?.getAttribute(ATRIBUTO_DIA) ?? null
}

export function useArrastar(
  aoSoltar: (id: string, date: string, duplicar: boolean) => void,
) {
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)

  // O gesto em curso vive numa ref: os ouvintes de window são registrados uma
  // vez e precisam enxergar o valor atual sem serem recriados a cada pixel.
  const atual = useRef<{
    id: string
    origem: string
    x0: number
    y0: number
    passouLimiar: boolean
  } | null>(null)

  const comecar = useCallback(
    (e: React.PointerEvent, id: string, origem: string) => {
      // Só botão principal: o direito abre menu de contexto, e o do meio cola.
      if (e.button !== 0) return
      atual.current = { id, origem, x0: e.clientX, y0: e.clientY, passouLimiar: false }
    },
    [],
  )

  useEffect(() => {
    function mover(e: PointerEvent) {
      const g = atual.current
      if (!g) return

      if (!g.passouLimiar) {
        const dist = Math.hypot(e.clientX - g.x0, e.clientY - g.y0)
        if (dist < LIMIAR_PX) return
        g.passouLimiar = true
      }

      // A partir daqui é arrasto de verdade: sem isto, o navegador rola a
      // página no celular em vez de mover o item.
      e.preventDefault()

      setArrasto({
        id: g.id,
        alvo: diaSobOPonto(e.clientX, e.clientY),
        duplicando: e.altKey,
        x: e.clientX,
        y: e.clientY,
      })
    }

    function soltar(e: PointerEvent) {
      const g = atual.current
      atual.current = null
      setArrasto(null)
      if (!g?.passouLimiar) return // foi clique, não arrasto — deixa passar

      const destino = diaSobOPonto(e.clientX, e.clientY)
      if (destino && destino !== g.origem) aoSoltar(g.id, destino, e.altKey)
    }

    function cancelar() {
      atual.current = null
      setArrasto(null)
    }

    function tecla(e: KeyboardEvent) {
      // Alt apertado ou solto no meio do gesto muda copiar↔mover ao vivo.
      if (e.key !== 'Alt' || !atual.current?.passouLimiar) return
      setArrasto((a) => (a ? { ...a, duplicando: e.type === 'keydown' } : a))
    }

    // `passive: false` é o que permite o `preventDefault` que trava a rolagem.
    window.addEventListener('pointermove', mover, { passive: false })
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', cancelar)
    window.addEventListener('keydown', tecla)
    window.addEventListener('keyup', tecla)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', cancelar)
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('keyup', tecla)
    }
  }, [aoSoltar])

  return { arrasto, comecar }
}
