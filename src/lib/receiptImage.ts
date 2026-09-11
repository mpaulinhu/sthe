import { formatMoney, formatPeriod } from './calc'
import { maskCpf, maskDoc } from './receipt'
import type { Receipt } from './types'

/**
 * Desenha o recibo como imagem PNG, pronta para salvar ou mandar no WhatsApp.
 *
 * É canvas, e não `html2canvas` ou impressão do navegador, por dois motivos:
 * não acrescenta dependência ao projeto, e o resultado é idêntico em qualquer
 * aparelho — um recibo que sai diferente conforme o celular perde justamente a
 * credibilidade que deveria ter.
 */

const W = 1080
const PAD = 72
const TINTA = '#1a1d21'
const SUAVE = '#6b7280'
const LINHA = '#e5e0d8'

interface Cursor {
  ctx: CanvasRenderingContext2D
  y: number
}

/** Quebra o texto na largura disponível e devolve as linhas. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of text.split(' ')) {
    const teste = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(teste).width > max && atual) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = teste
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}

function texto(
  c: Cursor,
  text: string,
  opts: { size: number; color?: string; weight?: string; lh?: number; center?: boolean } = {
    size: 26,
  },
): void {
  const { ctx } = c
  const { size, color = TINTA, weight = '400', lh = 1.5, center = false } = opts
  ctx.font = `${weight} ${size}px "Nunito", "Segoe UI", system-ui, sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = center ? 'center' : 'left'
  const x = center ? W / 2 : PAD

  for (const linha of wrap(ctx, text, W - PAD * 2)) {
    c.y += size * lh
    ctx.fillText(linha, x, c.y)
  }
}

function regua(c: Cursor, espaco = 32): void {
  c.y += espaco
  c.ctx.strokeStyle = LINHA
  c.ctx.lineWidth = 1
  c.ctx.beginPath()
  c.ctx.moveTo(PAD, c.y)
  c.ctx.lineTo(W - PAD, c.y)
  c.ctx.stroke()
  c.y += espaco / 2
}

function carregar(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não consegui desenhar a assinatura.'))
    img.src = dataUrl
  })
}

function dataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Desenha o recibo e devolve o PNG em data URL. */
export async function renderReceipt(recibo: Receipt): Promise<string> {
  // Primeira passada num canvas descartável só para medir a altura final —
  // o texto do termo quebra em um número variável de linhas.
  const medida = document.createElement('canvas').getContext('2d')
  if (!medida) throw new Error('Não consegui gerar o recibo.')
  medida.font = `400 24px "Nunito", system-ui, sans-serif`
  const linhasTermo = wrap(medida, recibo.termo, W - PAD * 2).length

  const H = 1180 + linhasTermo * 36

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não consegui gerar o recibo.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Faixa superior, para o recibo se identificar de longe na galeria de fotos.
  ctx.fillStyle = '#fdf2f5'
  ctx.fillRect(0, 0, W, 8)

  const c: Cursor = { ctx, y: 56 }

  texto(c, 'RECIBO DE PAGAMENTO', { size: 22, color: SUAVE, weight: '700' })
  texto(c, `Nº ${String(recibo.numero).padStart(4, '0')}`, {
    size: 46,
    weight: '700',
    lh: 1.35,
  })

  regua(c)

  texto(c, 'RECEBI DE', { size: 19, color: SUAVE, weight: '700' })
  if (recibo.payerName) {
    texto(c, recibo.payerName, { size: 27, lh: 1.35 })
    if (recibo.payerDoc) {
      texto(c, `${recibo.payerDocType === 'cnpj' ? 'CNPJ' : 'CPF'} ${maskDoc(recibo.payerDoc, recibo.payerDocType)}`, {
        size: 23,
        color: SUAVE,
        lh: 1.4,
      })
    }
  } else {
    // Recibo emitido antes de Configurações existir, ou com o campo em branco.
    // Dizer isso é melhor do que inventar um nome: o leitor precisa saber que
    // a identificação do pagador não foi registrada.
    texto(c, 'Pagador não identificado', { size: 25, color: SUAVE, lh: 1.35 })
  }

  c.y += 14
  texto(c, 'VALOR', { size: 19, color: SUAVE, weight: '700' })
  texto(c, formatMoney(recibo.amount), { size: 54, weight: '700', lh: 1.25 })
  texto(c, recibo.amountText, { size: 24, color: SUAVE, lh: 1.4 })

  c.y += 14
  texto(c, 'REFERENTE A', { size: 19, color: SUAVE, weight: '700' })
  texto(c, `Serviços prestados em ${formatPeriod(recibo.period)}`, { size: 27, lh: 1.35 })
  texto(c, `Forma de pagamento: ${recibo.method}`, { size: 24, color: SUAVE, lh: 1.4 })

  regua(c)

  texto(c, 'DECLARAÇÃO', { size: 19, color: SUAVE, weight: '700' })
  texto(c, recibo.termo, { size: 24, lh: 1.5 })

  regua(c)

  // Assinatura sobre a linha, como num recibo de papel.
  const assinatura = await carregar(recibo.signature)
  const altura = 150
  const largura = Math.min(
    W - PAD * 2,
    (assinatura.naturalWidth / assinatura.naturalHeight) * altura,
  )
  c.y += 20
  ctx.drawImage(assinatura, PAD, c.y, largura, altura)
  c.y += altura + 12

  ctx.strokeStyle = TINTA
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PAD, c.y)
  ctx.lineTo(PAD + 520, c.y)
  ctx.stroke()

  texto(c, recibo.personName, { size: 27, weight: '700', lh: 1.4 })
  texto(c, `CPF ${maskCpf(recibo.personDoc)}`, { size: 23, color: SUAVE, lh: 1.35 })

  regua(c)

  texto(c, `Assinado eletronicamente em ${dataHora(recibo.signedAt)}`, {
    size: 22,
    color: SUAVE,
    lh: 1.45,
  })
  texto(c, `Código de verificação: ${recibo.hash.slice(0, 32).toUpperCase()}`, {
    size: 20,
    color: SUAVE,
    lh: 1.5,
  })
  texto(
    c,
    'Documento assinado por assinatura eletrônica, nos termos do art. 4º, II, da Lei nº 14.063/2020. ' +
      'A autenticidade pode ser conferida pelo código acima no aplicativo emissor.',
    { size: 19, color: SUAVE, lh: 1.5 },
  )

  return canvas.toDataURL('image/png')
}

/** Dispara o download do recibo já renderizado. */
export function downloadReceipt(dataUrl: string, recibo: Receipt): void {
  const a = document.createElement('a')
  a.href = dataUrl
  const nome = recibo.personName.split(' ')[0].toLowerCase()
  a.download = `recibo-${String(recibo.numero).padStart(4, '0')}-${nome}-${recibo.period}.png`
  a.click()
}
