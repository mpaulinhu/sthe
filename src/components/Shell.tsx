import { useEffect, useState, type ReactNode } from 'react'
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
 * inteira para o conteúdo.
 *
 * No celular as abas dão lugar ao nome da seção atual, que abre a lista
 * inteira. A barra rolável que havia antes escondia metade das seções sem
 * nenhum sinal de que existia mais coisa para o lado — quem não arrastasse
 * por acaso nunca descobriria Agenda, Relatórios e Configurações.
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
  const [menuAberto, setMenuAberto] = useState(false)
  const atual = TABS.find((t) => t.id === tab)

  function escolher(id: TabId) {
    onTab(id)
    setMenuAberto(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-blush-100 bg-cream/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 py-3 sm:gap-6 sm:px-7">
          <div className="flex shrink-0 items-center gap-2.5">
            <ButterflyMark className="flutter h-7 w-7" />
            <span className="font-display text-[22px] font-semibold leading-none tracking-[0.15em] text-ink">
              STHE
            </span>
          </div>

          {/* Celular: a seção atual vira o botão que abre todas. */}
          <button
            onClick={() => setMenuAberto(true)}
            aria-haspopup="dialog"
            aria-expanded={menuAberto}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[11px] border border-blush-100 bg-white/70 px-3 py-2 text-left sm:hidden"
          >
            <span className="truncate text-[14px] font-medium text-ink">{atual?.label}</span>
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4 shrink-0 text-ink-faint"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3.5 6L8 10.5 12.5 6" />
            </svg>
          </button>

          {/* Desktop: todas as abas cabem lado a lado. */}
          <nav className="-mx-1 hidden min-w-0 flex-1 items-center gap-0.5 px-1 sm:flex">
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

      {/* Fora do <header>: ele é sticky, e um elemento fixo dentro de um pai
          que cria contexto de empilhamento fica preso a ele — o menu abria
          colado no topo, cortado, em vez de cobrir a tela. */}
      {menuAberto ? (
        <MenuSecoes tab={tab} onEscolher={escolher} onFechar={() => setMenuAberto(false)} />
      ) : null}
    </>
  )
}

/**
 * Lista de seções no celular. Entra por baixo, como os outros sheets do app,
 * para o polegar alcançar as opções sem esticar até o topo da tela.
 */
function MenuSecoes({
  tab,
  onEscolher,
  onFechar,
}: {
  tab: TabId
  onEscolher: (t: TabId) => void
  onFechar: () => void
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = anterior
    }
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:hidden">
      <div
        onClick={onFechar}
        className="absolute inset-0 bg-[rgba(26,29,33,0.28)] [animation:fadeIn_.18s_ease]"
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Seções"
        className="relative w-full rounded-t-2xl bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-24px_60px_-30px_rgba(26,29,33,0.4)] [animation:sheetIn_.22s_cubic-bezier(.2,.7,.3,1)]"
      >
        {/* Alça: sinaliza que dá para arrastar/fechar, padrão de bottom sheet. */}
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-cream-deep" aria-hidden />

        <nav className="flex flex-col px-2 pb-1">
          {TABS.map((t) => {
            const ativo = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => onEscolher(t.id)}
                aria-current={ativo ? 'page' : undefined}
                className={`flex min-h-[52px] items-center justify-between rounded-[12px] px-4 text-left text-[15px] transition-colors ${
                  ativo ? 'bg-blush-50 font-medium text-ink' : 'text-ink-soft hover:bg-cream'
                }`}
              >
                {t.label}
                {ativo ? (
                  <svg
                    viewBox="0 0 14 14"
                    className="h-3.5 w-3.5 text-blush-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M2.5 7.5l3 3 6-6.5" />
                  </svg>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
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
