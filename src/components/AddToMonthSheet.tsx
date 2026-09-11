import { useState } from 'react'
import { Sheet } from './Sheet'
import { CONTRACT_LABEL, type Person } from '../lib/types'
import { formatPeriod } from '../lib/calc'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Lista de quem já está no banco de Equipe mas não aparece neste mês — o
 * caminho para "readicionar" um freela ou diarista que já trabalhou antes,
 * sem recadastrar do zero. Não lança nenhum valor: só marca a participação;
 * o lançamento continua sendo feito na lista de Pagamentos, como sempre.
 */
export function AddToMonthSheet({
  period,
  candidatos,
  onConfirm,
  onNovaPessoa,
  onClose,
}: {
  period: string
  candidatos: Person[]
  onConfirm: (personIds: string[]) => void
  /** Abre o cadastro completo — quem for criada ali já entra direto neste mês. */
  onNovaPessoa: () => void
  onClose: () => void
}) {
  const [selecionados, setSelecionados] = useState<string[]>([])

  function toggle(id: string) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    )
  }

  return (
    <Sheet
      title="Adicionar ao mês"
      subtitle={`Quem participa de ${formatPeriod(period).toLowerCase()} — sem lançar valor ainda.`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-[11px] border border-cream-deep bg-white px-[15px] py-[11px] text-[14px] text-ink-soft transition-colors hover:bg-cream"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selecionados)}
            disabled={selecionados.length === 0}
            className="min-h-[44px] flex-1 rounded-[11px] bg-ink px-4 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selecionados.length === 0
              ? 'Adicionar'
              : `Adicionar ${selecionados.length} ${selecionados.length === 1 ? 'pessoa' : 'pessoas'}`}
          </button>
        </>
      }
    >
      {/* Atalho pra quem ainda não existe no cadastro nenhum: cria a pessoa
          e já entra direto neste mês, sem precisar ir até a Equipe e voltar. */}
      <button
        type="button"
        onClick={onNovaPessoa}
        className="flex items-center gap-2.5 rounded-[14px] border border-dashed border-blush-200 bg-blush-50/40 px-3.5 py-3 text-left text-[13.5px] font-medium text-blush-600 transition-colors hover:border-blush-300 hover:bg-blush-50"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
        Nova pessoa — já entra neste mês
      </button>

      {candidatos.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-ink-faint">
          Todo mundo do cadastro já aparece neste mês.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {candidatos.map((p) => {
            const ativo = selecionados.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={ativo}
                className={`flex items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-colors ${
                  ativo
                    ? 'border-butterfly-300 bg-butterfly-50'
                    : 'border-cream-deep bg-white hover:border-blush-200 hover:bg-blush-50/50'
                }`}
              >
                <span
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-blush-50 text-[11.5px] font-semibold text-blush-600"
                  aria-hidden
                >
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium leading-tight">{p.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                    {p.role ? `${p.role} · ` : ''}
                    {CONTRACT_LABEL[p.contract]}
                  </p>
                </div>
                <span
                  className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                    ativo ? 'border-butterfly-500 bg-butterfly-500 text-white' : 'border-line bg-white'
                  }`}
                >
                  <svg
                    viewBox="0 0 14 14"
                    className="h-2.5 w-2.5"
                    style={{ opacity: ativo ? 1 : 0 }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M2.5 7.5l3 3 6-6.5" />
                  </svg>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
