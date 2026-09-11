import { Sheet } from './Sheet'
import type { Entry } from '../lib/types'

/**
 * Reabre o comprovante que ela anexou ao pagar (print do Pix, foto do
 * dinheiro). A imagem já fica salva no lançamento (`Entry.receiptImage`,
 * uma data URL comprimida) desde que foi anexada — só faltava um jeito de
 * vê-la de novo depois, em vez de ela sumir dentro do dado sem tela própria.
 */
export function ProofSheet({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  return (
    <Sheet
      title="Comprovante do pagamento"
      subtitle={entry.receiptName || 'Anexado ao lançar o pagamento'}
      onClose={onClose}
      footer={
        <a
          href={entry.receiptImage}
          download={entry.receiptName || 'comprovante.jpg'}
          className="min-h-[44px] flex-1 rounded-[11px] bg-ink px-4 py-3 text-center text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover"
        >
          Baixar
        </a>
      }
    >
      <div className="rounded-[14px] border border-cream-deep bg-cream p-2">
        <img
          src={entry.receiptImage}
          alt="Comprovante do pagamento"
          className="w-full rounded-[10px] border border-cream-deep bg-white"
        />
      </div>
    </Sheet>
  )
}
