import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Campo de assinatura a dedo.
 *
 * Usa Pointer Events (não touch/mouse separados) porque é o único que cobre
 * dedo, caneta e mouse com o mesmo código — e `setPointerCapture` mantém o
 * traço mesmo quando o dedo escorrega para fora do quadro, que é comum numa
 * assinatura rápida.
 *
 * O canvas é desenhado no tamanho real do aparelho (`devicePixelRatio`) e só
 * exibido menor — sem isso a assinatura sai serrilhada no celular, e um traço
 * borrado é exatamente o que enfraquece o recibo.
 */
export function SignaturePad({
  onChange,
  disabled,
}: {
  /** Recebe o PNG (data URL) a cada traço, ou '' quando limpo. */
  onChange: (dataUrl: string) => void
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desenhando = useRef(false)
  const ultimo = useRef<{ x: number; y: number } | null>(null)
  const [temTraco, setTemTraco] = useState(false)

  /**
   * Prepara a resolução real do canvas. Roda na montagem e a cada resize —
   * girar o aparelho muda a largura do quadro.
   *
   * Redimensionar um canvas apaga o desenho E zera o contexto (espessura, cor
   * e escala voltam ao padrão), por isso só mexe quando o tamanho mudou de
   * verdade: no celular a barra do navegador some ao rolar e dispara `resize`
   * sem que nada tenha mudado, o que apagaria a assinatura no meio.
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      // Enquanto o sheet desliza o quadro ainda não tem largura: medir aqui
      // daria zero e o canvas ficaria sem área para desenhar.
      if (rect.width === 0) return

      const dpr = window.devicePixelRatio || 1
      const w = Math.round(rect.width * dpr)
      const h = Math.round(rect.height * dpr)
      if (canvas.width === w && canvas.height === h) return

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1a1d21'
    }

    setup()

    // `ResizeObserver` em vez de só o `resize` da janela: o quadro nasce dentro
    // de um painel que desliza, e sua largura final chega depois da montagem —
    // o evento da janela nunca dispara nesse caso, e o canvas ficaria com a
    // medida errada.
    const ro = new ResizeObserver(setup)
    ro.observe(canvas)
    window.addEventListener('resize', setup)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', setup)
    }
  }, [])

  const terminar = useCallback(() => {
    if (!desenhando.current) return
    desenhando.current = false
    ultimo.current = null
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }, [onChange])

  /**
   * O traço.
   *
   * Ouvintes nativos em vez dos `onPointer*` do React por causa de uma
   * exigência do toque: `preventDefault` num ouvinte de toque só tem efeito se
   * ele foi registrado com `passive: false`, e o React registra os dele como
   * passivos. Sem isso o navegador do celular trata o gesto como rolagem, o
   * traço nunca começa, e a pessoa fica riscando o dedo numa tela que não
   * responde.
   *
   * O `pointermove`/`pointerup` ficam na janela, não no canvas: numa
   * assinatura rápida o dedo sai do quadro o tempo todo, e com o ouvinte preso
   * ao elemento a linha morreria na borda.
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || disabled) return

    const posicao = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    function comecar(e: PointerEvent) {
      e.preventDefault()
      desenhando.current = true
      ultimo.current = posicao(e)

      // Um toque seco (sem arrastar) também deve marcar: um ponto é assinatura
      // válida para quem só encosta o dedo.
      const ctx = canvas!.getContext('2d')
      const p = ultimo.current
      if (ctx && p) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2)
        ctx.fillStyle = '#1a1d21'
        ctx.fill()
      }
      setTemTraco(true)
    }

    function mover(e: PointerEvent) {
      if (!desenhando.current) return
      e.preventDefault()
      const ctx = canvas!.getContext('2d')
      const de = ultimo.current
      if (!ctx || !de) return

      const para = posicao(e)
      ctx.beginPath()
      ctx.moveTo(de.x, de.y)
      ctx.lineTo(para.x, para.y)
      ctx.stroke()
      ultimo.current = para
    }

    canvas.addEventListener('pointerdown', comecar, { passive: false })
    window.addEventListener('pointermove', mover, { passive: false })
    window.addEventListener('pointerup', terminar)
    window.addEventListener('pointercancel', terminar)
    return () => {
      canvas.removeEventListener('pointerdown', comecar)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', terminar)
      window.removeEventListener('pointercancel', terminar)
    }
  }, [disabled, terminar])

  function limpar() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTemTraco(false)
    onChange('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative overflow-hidden rounded-[14px] border-2 border-dashed transition-colors ${
          temTraco ? 'border-butterfly-200 bg-white' : 'border-line bg-cream'
        }`}
      >
        <canvas
          ref={canvasRef}
          // `touch-none` desliga o scroll/zoom por gesto dentro do quadro —
          // sem isso não dá para assinar no celular, a página rola junto. Os
          // ouvintes ficam no efeito acima, não aqui (ver nota sobre passive).
          className="block h-[168px] w-full touch-none"
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
          aria-label="Campo de assinatura"
        />

        {/* Linha e legenda de recibo — some assim que o traço começa, para não
            atrapalhar a leitura da assinatura.

            Quando o quadro está travado a legenda diz por quê: antes, quem
            tentasse assinar sem o CPF preenchido riscava o dedo numa tela
            morta, sem nada na própria tela explicando o que faltava. */}
        {!temTraco ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[38px] flex flex-col items-center gap-2 px-8">
            <div className="h-px w-full bg-line" />
            <span className="text-center text-[12px] leading-snug text-ink-dim">
              {disabled ? 'Preencha o CPF acima para liberar a assinatura' : 'Assine aqui com o dedo'}
            </span>
          </div>
        ) : null}
      </div>

      {temTraco ? (
        <button
          type="button"
          onClick={limpar}
          className="self-start rounded-[9px] px-2.5 py-1.5 text-[12.5px] text-ink-faint transition-colors hover:bg-cream-deep hover:text-ink-soft"
        >
          Limpar e assinar de novo
        </button>
      ) : null}
    </div>
  )
}
