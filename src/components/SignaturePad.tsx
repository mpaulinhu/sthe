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

  // Prepara a resolução real do canvas. Roda uma vez e a cada resize, porque
  // girar o aparelho muda a largura do quadro.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      // Redimensionar o canvas apaga o conteúdo — por isso só faz quando o
      // tamanho realmente mudou, para não apagar uma assinatura em andamento.
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
    window.addEventListener('resize', setup)
    return () => window.removeEventListener('resize', setup)
  }, [])

  const posicao = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function comecar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    // Sem isso, arrastar o dedo no canvas rola a página em vez de assinar.
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    desenhando.current = true
    ultimo.current = posicao(e)
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current || disabled) return
    e.preventDefault()
    const ctx = e.currentTarget.getContext('2d')
    const de = ultimo.current
    if (!ctx || !de) return

    const para = posicao(e)
    ctx.beginPath()
    ctx.moveTo(de.x, de.y)
    ctx.lineTo(para.x, para.y)
    ctx.stroke()
    ultimo.current = para
    if (!temTraco) setTemTraco(true)
  }

  const terminar = useCallback(() => {
    if (!desenhando.current) return
    desenhando.current = false
    ultimo.current = null
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }, [onChange])

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
          onPointerDown={comecar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          // `touch-none` desliga o scroll/zoom por gesto dentro do quadro —
          // sem isso não dá para assinar no celular, a página rola junto.
          className="block h-[168px] w-full touch-none"
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
          aria-label="Campo de assinatura"
        />

        {/* Linha e legenda de recibo — some assim que o traço começa, para não
            atrapalhar a leitura da assinatura. */}
        {!temTraco ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[38px] flex flex-col items-center gap-2 px-8">
            <div className="h-px w-full bg-line" />
            <span className="text-[12px] text-ink-dim">Assine aqui com o dedo</span>
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
