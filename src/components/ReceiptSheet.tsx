import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { downloadReceipt, renderReceipt } from '../lib/receiptImage'
import type { Receipt } from '../lib/types'

/**
 * O recibo pronto, logo depois da assinatura.
 *
 * Mostra a imagem final — a mesma que vai ser salva ou enviada — em vez de uma
 * versão em HTML "parecida": ver na tela exatamente o arquivo que ela vai
 * mandar evita a surpresa de o recibo sair diferente do que ela conferiu.
 */
export function ReceiptSheet({
  recibo,
  onClose,
  onError,
}: {
  recibo: Receipt
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [imagem, setImagem] = useState('')

  useEffect(() => {
    let vivo = true
    renderReceipt(recibo)
      .then((url) => {
        if (vivo) setImagem(url)
      })
      .catch(() => onError('Não consegui montar a imagem do recibo.'))
    return () => {
      vivo = false
    }
  }, [recibo, onError])

  async function compartilhar() {
    if (!imagem) return
    const arquivo = await dataUrlParaArquivo(imagem, recibo)

    // `navigator.share` com arquivo é o caminho nativo no celular: abre a
    // bandeja do sistema e a pessoa escolhe o WhatsApp dela. Onde não existe
    // (desktop, navegador antigo), cai no download, que resolve o mesmo.
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({
          files: [arquivo],
          title: `Recibo nº ${String(recibo.numero).padStart(4, '0')}`,
        })
        return
      } catch {
        // Cancelar o compartilhamento não é erro — não faz nada.
        return
      }
    }
    downloadReceipt(imagem, recibo)
  }

  return (
    <Sheet
      title="Recibo emitido"
      subtitle={`Nº ${String(recibo.numero).padStart(4, '0')} · ${recibo.personName}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={() => imagem && downloadReceipt(imagem, recibo)}
            disabled={!imagem}
            className="min-h-[44px] rounded-[11px] border border-cream-deep bg-white px-[15px] py-[11px] text-[14px] text-ink-soft transition-colors hover:bg-cream disabled:opacity-40"
          >
            Salvar
          </button>
          <button
            onClick={() => void compartilhar()}
            disabled={!imagem}
            className="min-h-[44px] flex-1 rounded-[11px] bg-ink px-4 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover disabled:opacity-40"
          >
            Enviar para {recibo.personName.split(' ')[0]}
          </button>
        </>
      }
    >
      <div className="rounded-[14px] border border-cream-deep bg-cream p-2">
        {imagem ? (
          <img
            src={imagem}
            alt={`Recibo número ${recibo.numero}`}
            className="w-full rounded-[10px] border border-cream-deep bg-white"
          />
        ) : (
          <div className="flex h-[320px] items-center justify-center text-[13px] text-ink-dim">
            Montando o recibo…
          </div>
        )}
      </div>

      <div className="rounded-[12px] border border-cream-deep bg-cream px-3.5 py-3">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">Sua via já está guardada.</span> Este recibo
          fica arquivado no aplicativo — em <span className="font-medium">Relatórios</span> você
          reabre e baixa de novo quando quiser, inclusive o mês inteiro de uma vez. O botão
          “Salvar” aqui é só para levar uma cópia para fora, no seu computador.
        </p>
      </div>

      <p className="text-[12px] leading-relaxed text-ink-dim">
        Mande a via de {recibo.personName.split(' ')[0]} para ela — assim as duas partes ficam
        com o mesmo documento.
      </p>
    </Sheet>
  )
}

async function dataUrlParaArquivo(dataUrl: string, recibo: Receipt): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob()
  const nome = recibo.personName.split(' ')[0].toLowerCase()
  return new File([blob], `recibo-${String(recibo.numero).padStart(4, '0')}-${nome}.png`, {
    type: 'image/png',
  })
}
