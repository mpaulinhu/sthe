import { useState } from 'react'

/**
 * Orientação sobre os recibos assinados.
 *
 * Fica dobrado por padrão: quem já entendeu não precisa reler todo mês, e quem
 * está com dúvida na hora de pagar encontra a resposta sem sair da tela. O
 * texto evita jargão de propósito — o que importa é ela saber o que fazer e
 * por que aquilo protege as duas partes.
 */
export function GuiaRecibos() {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="rounded-[16px] border border-butterfly-100 bg-butterfly-50/40">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-butterfly-100 text-butterfly-600">
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M8 7.2v4M8 4.8v.4" />
            <circle cx="8" cy="8" r="6" />
          </svg>
        </span>
        <span className="min-w-0 flex-1 text-[13.5px] font-medium">
          Como funcionam os recibos assinados
        </span>
        <svg
          viewBox="0 0 16 16"
          className="h-[15px] w-[15px] shrink-0 text-ink-faint transition-transform duration-300"
          style={{ transform: aberto ? 'rotate(180deg)' : undefined }}
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

      {aberto ? (
        <div className="flex flex-col gap-4 border-t border-butterfly-100 px-4 py-4 [animation:fadeIn_.22s_ease]">
          <Passo n={1} titulo="Pague como sempre">
            Registre o pagamento normalmente e anexe o print do Pix. Esse anexo é a sua prova
            de que o dinheiro saiu.
          </Passo>

          <Passo n={2} titulo="Passe o celular para ela">
            Na tela de assinatura, ela confere o valor, o CPF e o texto do recibo, marca que
            leu e assina com o dedo. É esse aceite que prova que ela recebeu — o print do Pix
            sozinho não prova.
          </Passo>

          <Passo n={3} titulo="Mande o recibo para ela">
            O recibo é gerado na hora, com número, valor por extenso, a assinatura e um código
            de verificação. Envie uma cópia para ela e guarde a sua.
          </Passo>

          <div className="rounded-[12px] border border-cream-deep bg-white px-3.5 py-3">
            <p className="text-[13px] font-medium">Por que isso vale como prova</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              A Lei nº 14.063/2020 reconhece a assinatura eletrônica. O que dá força a ela é o
              conjunto: o texto que ela leu e aceitou, o CPF que a identifica, a data e hora
              exatas, e o código de verificação que denuncia qualquer alteração posterior.
              Cada recibo carrega o código do anterior — mexer em um recibo antigo quebra a
              sequência, e o aplicativo acusa isso na aba Relatórios.
            </p>
          </div>

          <div className="rounded-[12px] border border-blush-100 bg-blush-50/50 px-3.5 py-3">
            <p className="text-[13px] font-medium">Cuidados que fazem diferença</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                <span className="text-blush-400" aria-hidden>
                  •
                </span>
                Ela deve assinar no momento do pagamento, com você presente — assinatura
                colhida depois, de memória, vale menos.
              </li>
              <li className="flex gap-2">
                <span className="text-blush-400" aria-hidden>
                  •
                </span>
                Confira o CPF antes de ela assinar. Um número errado enfraquece justamente o
                que o recibo deveria provar.
              </li>
              <li className="flex gap-2">
                <span className="text-blush-400" aria-hidden>
                  •
                </span>
                Baixe o backup com frequência. Os recibos ficam guardados neste aparelho —
                se ele se perder e não houver backup, eles se perdem junto.
              </li>
              <li className="flex gap-2">
                <span className="text-blush-400" aria-hidden>
                  •
                </span>
                Recibo não substitui registro em carteira nem contrato. Ele prova o
                pagamento, não a natureza da relação de trabalho.
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-cream">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium leading-snug">{titulo}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{children}</p>
      </div>
    </div>
  )
}
