import { ButterflyMark } from './Primitives'

/**
 * Navegação lateral. Além de "Pagamentos" (única tela pronta), já lista as
 * próximas janelas do produto em "Em breve" — a largura da nav foi dimensionada
 * pensando nelas, então elas ficam visíveis mesmo desabilitadas.
 */
const EM_BREVE = [
  { label: 'Agenda', icon: <><rect x="2.5" y="3.5" width="13" height="12" rx="2" /><path d="M2.5 7.5h13M6 2.5v2M12 2.5v2" /></> },
  { label: 'Estoque', icon: <><path d="M2.5 6L9 2.5 15.5 6v6L9 15.5 2.5 12V6Z" /><path d="M2.5 6L9 9.5 15.5 6M9 9.5v6" /></> },
  { label: 'Vendas', icon: <><path d="M2.5 15.5h13" /><path d="M5 15.5V9M9 15.5V4M13 15.5v-4" /></> },
  { label: 'Relatórios', icon: <><path d="M4 2.5h7l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1v-12a1 1 0 011-1Z" /><path d="M6 9h6M6 12h4" /></> },
]

export function Sidebar({ onExport }: { onExport: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col gap-[26px] self-start border-r border-cream-deep px-3.5 pb-5 pt-[22px] lg:flex">
      <div className="flex items-center gap-[9px] px-2">
        <ButterflyMark className="h-6 w-6" />
        <span className="font-display text-[20px] font-semibold tracking-[0.14em]">STHE</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        <span
          aria-current="page"
          className="flex items-center gap-2.5 rounded-[10px] bg-cream-deep px-2.5 py-[9px] text-[14px] font-medium text-ink"
        >
          <NavIcon className="text-butterfly-500">
            <path d="M2.5 6.5h13M2.5 6.5v7a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5v-7M2.5 6.5l1.2-3a1.5 1.5 0 011.4-1h7.8a1.5 1.5 0 011.4 1l1.2 3" />
            <path d="M7 10h4" />
          </NavIcon>
          Pagamentos
        </span>

        <div className="px-2.5 pb-1.5 pt-4 text-[11px] uppercase tracking-[0.1em] text-ink-dim">
          Em breve
        </div>

        {EM_BREVE.map((item) => (
          <span
            key={item.label}
            aria-disabled="true"
            className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[14px] text-ink-off"
          >
            <NavIcon>{item.icon}</NavIcon>
            {item.label}
          </span>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1.5 px-2.5">
        <p className="text-[12px] leading-normal text-ink-dim">Tudo salvo neste aparelho.</p>
        <button
          onClick={onExport}
          className="self-start text-[12.5px] text-ink-soft transition-colors hover:text-butterfly-600 hover:underline"
        >
          Baixar backup
        </button>
      </div>
    </aside>
  )
}

function NavIcon({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 18 18"
      className={`h-4 w-4 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}
