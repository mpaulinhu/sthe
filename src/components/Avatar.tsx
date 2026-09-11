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
}: {
  person: Pick<Person, 'name' | 'photo'>
  tone: string
  className?: string
}) {
  if (person.photo) {
    const anel = tone.split(' ').find((c) => c.startsWith('ring-')) ?? 'ring-blush-200/50'
    return (
      <img
        src={person.photo}
        alt=""
        aria-hidden
        className={`shrink-0 rounded-full object-cover ring-4 ${anel} ${className}`}
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
