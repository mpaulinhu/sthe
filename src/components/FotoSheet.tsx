import { useEffect } from 'react'
import type { Person } from '../lib/types'

/**
 * A foto de perfil em tamanho grande.
 *
 * Não usa o `Sheet` do resto do app de propósito: aqui o conteúdo é a imagem,
 * e o painel branco em volta só competiria com ela. O fundo escuro é o que
 * faz a foto aparecer.
 */
export function FotoSheet({
  person,
  onClose,
}: {
  person: Pick<Person, 'name' | 'photo' | 'role'>
  onClose: () => void
}) {
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onClose])

  if (!person.photo) return null

  // O fundo é preto direto, não `bg-ink/80`: a tinta do tema claro é um roxo
  // escuro que a 80% ainda deixa a página legível atrás, e a foto perde
  // destaque. Aqui o fundo precisa sumir.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${person.name}`}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/75 p-5 backdrop-blur-[3px] [animation:fadeIn_.15s_ease]"
    >
      {/* Para o clique na própria imagem, senão fechar é impossível sem mirar
          fora dela — mas o clique no fundo fecha, que é o gesto esperado. */}
      <img
        src={person.photo}
        alt={`Foto de ${person.name}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[72vh] max-w-full rounded-[20px] object-contain shadow-lift [animation:sheetUp_.22s_ease]"
      />

      <div className="text-center" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-[18px] font-semibold text-white">{person.name}</p>
        {person.role ? <p className="mt-0.5 text-[13px] text-white/70">{person.role}</p> : null}
      </div>

      <button
        onClick={onClose}
        className="min-h-[44px] rounded-[11px] border border-white/25 px-5 text-[14px] text-white transition-colors hover:bg-white/10"
      >
        Fechar
      </button>
    </div>
  )
}
