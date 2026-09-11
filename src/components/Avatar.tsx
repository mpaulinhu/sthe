import type { Person } from '../lib/types'

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Avatar de uma pessoa: foto de perfil quando ela tem uma cadastrada, senão
 * as iniciais do nome sobre o tom de cor (status ou tipo de contrato,
 * decidido por quem chama). Um componente só para as duas telas que mostram
 * gente em lista (Equipe e Pagamentos) não divergirem no comportamento.
 *
 * `tone` é sempre "bg-X text-Y ring-Z" (ver CONTRACT_AVATAR e AVATAR_RING) —
 * com foto só o anel faz sentido continuar (a cor de fundo/texto fica atrás
 * da imagem), por isso extrai só a parte `ring-*` em vez de pedir duas props.
 */
export function Avatar({
  person,
  tone,
  className = 'h-[40px] w-[40px] text-[13px]',
  onVerFoto,
}: {
  person: Pick<Person, 'name' | 'photo'>
  tone: string
  className?: string
  /** Quando passado e a pessoa tem foto, clicar abre a imagem ampliada. */
  onVerFoto?: () => void
}) {
  if (person.photo) {
    const anel = tone.split(' ').find((c) => c.startsWith('ring-')) ?? 'ring-blush-200/50'
    const classes = `shrink-0 rounded-full object-cover ring-4 ${anel} ${className}`

    if (!onVerFoto) {
      return <img src={person.photo} alt="" aria-hidden className={classes} />
    }

    /**
     * `role="button"` num `<img>` em vez de embrulhar num `<button>`: nas duas
     * telas o avatar já vive dentro de um botão (que abre o cadastro), e botão
     * dentro de botão é HTML inválido — o navegador desmonta o aninhamento e o
     * clique de fora para de funcionar.
     *
     * `stopPropagation` é o que separa os dois gestos: sem ele, clicar na foto
     * abriria a imagem E o cadastro atrás dela.
     */
    return (
      <img
        src={person.photo}
        alt={`Foto de ${person.name}`}
        role="button"
        tabIndex={0}
        title="Ver foto"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          // Três barreiras porque uma só não segura: o avatar vive dentro do
          // botão que abre o cadastro, e sem parar já no `pointerdown`/
          // `mousedown` o clique chega ao pai e as duas telas abrem juntas.
          e.stopPropagation()
          e.preventDefault()
          onVerFoto()
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          e.stopPropagation()
          onVerFoto()
        }}
        className={`${classes} cursor-zoom-in transition-transform duration-300 hover:scale-105`}
      />
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ring-4 transition-transform duration-300 group-hover:scale-105 ${tone} ${className}`}
      aria-hidden
    >
      {initials(person.name)}
    </span>
  )
}
