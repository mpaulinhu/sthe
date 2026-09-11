/**
 * Compressão de imagem para caber no localStorage.
 *
 * O banco inteiro vive em localStorage (~5 MB, e como é string, um binário em
 * base64 ainda infla ~33%). Uma foto de celular tem 3–8 MB — guardar uma só já
 * estouraria tudo. Por isso toda imagem passa por aqui antes de ser salva:
 * reduz para caber num quadro de `MAX_SIDE`px e vai baixando a qualidade até
 * entrar no orçamento.
 *
 * Comprovante de Pix é print de tela com texto grande: sobrevive bem a essa
 * compressão — o que importa é conseguir ler valor, nome e horário.
 */

/** Maior lado da imagem depois de reduzida. Suficiente para ler um print. */
const MAX_SIDE = 1400

/** Orçamento por comprovante, já em base64 (o que de fato ocupa o storage). */
const MAX_BYTES = 320 * 1024

/** Da melhor para a pior — para na primeira que couber no orçamento. */
const QUALITIES = [0.72, 0.6, 0.48, 0.38, 0.3]

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não consegui abrir essa imagem.'))
    }
    img.src = url
  })
}

/** Proporção mantida; só encolhe (nunca amplia uma foto pequena). */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  const escala = Math.min(1, max / Math.max(w, h))
  return { w: Math.round(w * escala), h: Math.round(h * escala) }
}

/**
 * Lê um arquivo de imagem e devolve um data URL JPEG já reduzido.
 * Rejeita se nem na pior qualidade couber no orçamento — melhor avisar do que
 * salvar algo que vai estourar o localStorage e derrubar o banco inteiro.
 */
export async function compressImage(file: Blob): Promise<string> {
  const img = await loadImage(file)
  const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight, MAX_SIDE)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não consegui processar essa imagem.')

  // Fundo branco: PNG com transparência viraria preto ao converter para JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  for (const q of QUALITIES) {
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length <= MAX_BYTES) return url
  }

  throw new Error('Essa imagem é pesada demais. Tente um print menor.')
}

/** Tamanho aproximado, em KB, de um data URL — para mostrar o uso do storage. */
export function dataUrlKb(dataUrl: string): number {
  return Math.round(dataUrl.length / 1024)
}

/** Maior lado de uma foto de perfil — quadrada, pequena, sem precisar de detalhe de print. */
const AVATAR_SIDE = 240

/** Orçamento bem menor que o de comprovante: dezenas de avatares vivem juntos nas listas. */
const AVATAR_MAX_BYTES = 40 * 1024

/**
 * Lê um arquivo de imagem e devolve um data URL JPEG quadrado (recorte
 * centrado) e pequeno — para foto de perfil, não para comprovante. Recortar
 * já na compressão evita salvar uma foto retangular inteira e deixar o
 * enquadramento redondo do avatar cortando ela de forma imprevisível.
 */
export async function compressAvatar(file: Blob): Promise<string> {
  const img = await loadImage(file)
  const lado = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - lado) / 2
  const sy = (img.naturalHeight - lado) / 2
  const tamanho = Math.min(AVATAR_SIDE, lado)

  const canvas = document.createElement('canvas')
  canvas.width = tamanho
  canvas.height = tamanho
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não consegui processar essa imagem.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, tamanho, tamanho)
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, tamanho, tamanho)

  for (const q of QUALITIES) {
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length <= AVATAR_MAX_BYTES) return url
  }

  throw new Error('Essa imagem é pesada demais. Tente outra foto.')
}
