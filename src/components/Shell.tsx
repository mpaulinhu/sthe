import type { ReactNode } from 'react'
import { ButterflyMark } from './Primitives'

export type TabId = 'equipe' | 'pagamentos' | 'agenda' | 'relatorios' | 'config'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'equipe', label: 'Equipe' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'config', label: 'Configurações' },
]

/**
 * Barra superior: marca à esquerda, abas no meio, ações à direita. Substituiu
 * a sidebar de 236px — com cinco áreas, a nav horizontal devolve a largura
 * inteira para o conteúdo e ainda cabe melhor no celular.
 */
export function TopNav({
  tab,
  onTab,
  right,
}: {
  tab: TabId
  onTab: (t: TabId) => void
  right: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-blush-100 bg-cream/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-6 px-4 py-3 sm:px-7">
        <div className="flex shrink-0 items-center gap-2.5">
          <ButterflyMark className="flutter h-7 w-7" />
          <span className="font-display text-[22px] font-semibold leading-none tracking-[0.15em] text-ink">
            STHE
          </span>
        </div>

        <nav className="-mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const ativo = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                aria-current={ativo ? 'page' : undefined}
                className={`relative shrink-0 rounded-[10px] px-3 py-2 text-[14px] transition-colors ${
                  ativo
                    ? 'font-medium text-ink'
                    : 'text-ink-faint hover:bg-blush-50 hover:text-ink-soft'
                }`}
              >
                {t.label}
                {ativo ? (
                  <span
                    className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-blush-400"
                    aria-hidden
                  />
                ) : null}
              </button>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">{right}</div>
      </div>
    </header>
  )
}

/**
 * Cabeçalho de página: sobretítulo, título grande e a navegação de mês à
 * direita. Repetido em todas as abas para dar o mesmo ponto de partida.
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  aside,
}: {
  kicker: string
  title: string
  subtitle: string
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-7 pt-8">
      <div className="min-w-0">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-blush-500">
          {kicker}
        </p>
        <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">
          {title}
        </h1>
        <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-ink-faint">{subtitle}</p>
      </div>
      {aside}
    </div>
  )
}

/**
 * Painel de indicadores: um cartão só, em gradiente claro, com a borboleta
 * gigante em marca-d'água no canto. O primeiro indicador ganha destaque
 * tipográfico (é a pergunta principal da tela); os outros três seguem ao lado,
 * separados por filetes.
 */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-blush-100 bg-gradient-to-br from-white via-white to-blush-50 px-6 py-7 shadow-petal sm:px-8">
      <ButterflyMark className="pointer-events-none absolute -right-8 -top-10 h-64 w-64 rotate-12 opacity-[0.07]" />
      <div className="relative grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
        {children}
      </div>
    </section>
  )
}

export function StatCell({
  label,
  value,
  sub,
  dot,
  tone = 'ink',
  index = 0,
  /** O primeiro indicador do painel, em corpo maior. */
  lead,
  children,
}: {
  label: string
  value: string
  sub: ReactNode
  dot?: string
  tone?: 'ink' | 'late' | 'paid' | 'blush'
  index?: number
  lead?: boolean
  children?: ReactNode
}) {
  const cor = {
    ink: 'text-ink',
    late: 'text-late',
    paid: 'text-paid',
    blush: 'text-blush-600',
  }[tone]

  return (
    <div
      className={`rise-in ${
        lead ? '' : 'lg:border-l lg:border-blush-100 lg:pl-8'
      }`}
      style={{ ['--i' as string]: index }}
    >
      <p
        className={`mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] ${
          lead ? 'text-blush-500' : 'text-ink-faint'
        }`}
      >
        {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden /> : null}
        {label}
      </p>
      <p
        className={`font-display font-semibold leading-none tracking-[-0.03em] tabular-nums ${cor} ${
          lead ? 'text-[42px] sm:text-[50px]' : 'text-[25px]'
        }`}
      >
        {value}
      </p>
      {children}
      <p className={`text-[12.5px] text-ink-faint ${lead ? 'mt-2.5' : 'mt-2'}`}>{sub}</p>
    </div>
  )
}

/** Painel da coluna direita (próximos vencimentos, folha por função…). */
export function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-[20px] border border-blush-100 bg-white p-5 shadow-petal">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Navegação de mês, usada no canto direito do cabeçalho de cada aba. */
export function MonthNav({
  label,
  onPrev,
  onNext,
  onToday,
  showToday,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  showToday: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {showToday ? (
        <button
          onClick={onToday}
          className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-blush-500 transition-colors hover:bg-blush-50"
        >
          voltar para hoje
        </button>
      ) : null}
      <div className="flex items-center gap-1 rounded-xl border border-blush-100 bg-white/70 p-1 backdrop-blur-sm">
        <button
          onClick={onPrev}
          aria-label="Mês anterior"
          className="flex rounded-[9px] p-1.5 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
        >
          <Chevron dir="left" />
        </button>
        <span className="min-w-[132px] text-center font-display text-[15px] font-semibold sm:min-w-[150px]">
          {label}
        </span>
        <button
          onClick={onNext}
          aria-label="Próximo mês"
          className="flex rounded-[9px] p-1.5 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </div>
  )
}

export function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={dir === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
    </svg>
  )
}

/** Estado vazio padrão de todas as abas. */
export function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string
  texto: string
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[22px] border border-dashed border-blush-200 bg-white/40 px-5 py-16 text-center">
      <ButterflyMark className="flutter h-11 w-11 opacity-45" />
      <h3 className="mt-2 font-display text-[21px] font-semibold">{titulo}</h3>
      <p className="max-w-[360px] text-[13.5px] leading-relaxed text-ink-faint">{texto}</p>
      {acao}
    </div>
  )
}

/** Botão primário escuro, o mesmo em todas as abas. */
export function PrimaryButton({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-[7px] rounded-xl bg-ink px-[15px] py-[9px] text-[13.5px] font-medium text-cream shadow-[0_4px_12px_-4px_rgba(42,32,40,0.5)] transition-all duration-200 hover:-translate-y-px hover:bg-ink-hover hover:shadow-[0_8px_18px_-6px_rgba(42,32,40,0.55)] ${className}`}
    >
      {children}
    </button>
  )
}

export function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  )
}
