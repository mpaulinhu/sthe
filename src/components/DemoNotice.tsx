import { useEffect, useState } from 'react'

const KEY = 'sthe.demo-avisado'

/**
 * Aviso da versão publicada. O site está num endereço público e sem login —
 * qualquer pessoa com o link abre. Não há risco de vazar dado (tudo fica no
 * navegador de quem acessa), mas é preciso deixar claro que isto é uma
 * demonstração, e não o lugar de guardar a folha de pagamento de verdade.
 */
export function DemoNotice() {
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setAberto(true)
    } catch {
      // Navegador bloqueando storage: mostra assim mesmo, é só um aviso.
      setAberto(true)
    }
  }, [])

  function fechar() {
    setAberto(false)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* sem storage, o aviso volta na próxima visita — tudo bem */
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(26,29,33,0.28)] p-0 [animation:fadeIn_.18s_ease] sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-titulo"
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
      >
        <h2 id="demo-titulo" className="font-display text-[22px] font-semibold">
          Esta é uma versão de demonstração
        </h2>

        <div className="mt-3 flex flex-col gap-3 text-[13.5px] leading-relaxed text-ink-soft">
          <p>
            O endereço é público e não tem senha — qualquer pessoa com o link abre esta
            tela. Use para conhecer o sistema, não para guardar dados de verdade.
          </p>
          <p>
            O que você digitar fica <strong className="font-semibold text-ink">só neste
            navegador</strong>: ninguém mais vê, mas também não acompanha você em outro
            aparelho, e some se limpar os dados do navegador.
          </p>
        </div>

        <button
          onClick={fechar}
          className="mt-5 min-h-[44px] w-full rounded-[11px] bg-ink px-4 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover"
        >
          Entendi, quero ver
        </button>
      </div>
    </div>
  )
}
