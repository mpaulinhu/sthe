import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Menu de três pontos.
 *
 * Nasceu nos cards da Equipe e virou componente quando a lista de acessos
 * precisou do mesmo gesto — o que estava resolvido ali (fechar ao clicar
 * fora, Escape, e virar para cima quando não há espaço abaixo) não deveria
 * ser reescrito de memória no segundo lugar.
 *
 * Quem usa decide se o estado de aberto vive aqui dentro ou fora: nos cards
 * da Equipe ele precisa subir, porque `rise-in` é uma animação e animação
 * cria contexto de empilhamento — o z-index do menu só vale dentro do card, e
 * sem o card inteiro subir junto o próximo passa por cima e corta a lista de
 * ações ao meio.
 */

/** O bastante para o menu caber; abaixo disso ele abre para cima. */
const ALTURA_MENU = 180

export function MenuAcoes({
  rotulo,
  aberto: abertoFora,
  setAberto: setAbertoFora,
  children,
}: {
  /** Vai no aria-label — diga de que item são as ações. */
  rotulo: string
  /** Só quando o estado precisa viver fora (ver nota sobre empilhamento). */
  aberto?: boolean
  setAberto?: (v: boolean) => void
  /** Os itens: use `ItemMenu` e `SeparadorMenu`. */
  children: ReactNode
}) {
  const [abertoDentro, setAbertoDentro] = useState(false)
  const aberto = abertoFora ?? abertoDentro
  const setAberto = setAbertoFora ?? setAbertoDentro

  const ref = useRef<HTMLDivElement>(null)
  const [paraCima, setParaCima] = useState(false)

  useEffect(() => {
    if (!aberto) return
    function onFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', onFora)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onFora)
      document.removeEventListener('keydown', onEsc)
    }
  }, [aberto, setAberto])

  function alternar() {
    // Mede antes de abrir: no último item da lista o menu sairia pela borda de
    // baixo da janela, e a última ação ficaria fora de alcance.
    if (!aberto && ref.current) {
      const { bottom } = ref.current.getBoundingClientRect()
      setParaCima(window.innerHeight - bottom < ALTURA_MENU)
    }
    setAberto(!aberto)
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={alternar}
        aria-label={`Mais ações para ${rotulo}`}
        aria-expanded={aberto}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-dim transition-colors hover:bg-blush-50 hover:text-blush-500"
      >
        <svg viewBox="0 0 16 16" className="h-[17px] w-[17px]" fill="currentColor" aria-hidden>
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {aberto ? (
        <div
          role="menu"
          onClick={() => setAberto(false)}
          className={`absolute right-0 z-10 w-[196px] overflow-hidden rounded-[14px] border border-blush-100 bg-white py-1.5 shadow-lift [animation:fadeIn_.15s_ease] ${
            paraCima ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]'
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

/** Uma ação do menu. `perigo` pinta de vermelho o que não tem volta. */
export function ItemMenu({
  onClick,
  perigo,
  destaque,
  children,
}: {
  onClick: () => void
  perigo?: boolean
  destaque?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center px-3.5 py-2.5 text-left text-[13.5px] transition-colors ${
        perigo
          ? 'font-medium text-late hover:bg-late-soft'
          : destaque
            ? 'text-butterfly-600 hover:bg-blush-50'
            : 'text-ink-soft hover:bg-blush-50'
      }`}
    >
      {children}
    </button>
  )
}

export function SeparadorMenu() {
  return <div className="my-1 h-px bg-hair" />
}
