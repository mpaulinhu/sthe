import { useMemo } from 'react'
import { PageHeader, Panel, StatCell, StatRow, Vazio } from '../components/Shell'
import { formatPeriod, summarizePerson } from '../lib/calc'
import { monthlyComparison, payrollByRole } from '../lib/business'
import { ReceiptAudit } from '../components/ReceiptAudit'
import { ReceiptArchive } from '../components/ReceiptArchive'
import type { Database, Receipt } from '../lib/types'

export function RelatoriosPage({
  db,
  period,
  val,
  aside,
  onVerRecibo,
  onAviso,
}: {
  db: Database
  period: string
  val: (v: number) => string
  aside: React.ReactNode
  onVerRecibo: (r: Receipt) => void
  onAviso: (msg: string) => void
}) {
  const people = useMemo(() => db.people.filter((p) => p.active), [db.people])

  const resumos = useMemo(
    () => people.map((p) => summarizePerson(p, db.entries, period)),
    [people, db.entries, period],
  )

  const folha = resumos.reduce((acc, s) => acc + s.total, 0)
  const pago = resumos.reduce((acc, s) => acc + s.pago, 0)
  const falta = resumos.reduce((acc, s) => acc + s.falta, 0)

  const porFuncao = useMemo(() => payrollByRole(db, period), [db, period])
  const comparativo = useMemo(() => monthlyComparison(db, period), [db, period])

  const custoPorPessoa = people.length > 0 ? folha / people.length : 0
  const maiorFuncao = porFuncao[0]?.total ?? 0
  const maiorMes = Math.max(...comparativo.map((m) => m.folha), 1)

  // Variação contra o mês anterior — o dado que responde "estou gastando mais?"
  const anterior = comparativo[comparativo.length - 2]?.folha ?? 0
  const variacao = anterior > 0 ? ((folha - anterior) / anterior) * 100 : null

  if (people.length === 0) {
    return (
      <>
        <PageHeader
          kicker={`Relatórios · ${formatPeriod(period)}`}
          title="Relatórios"
          subtitle="Quanto custa a equipe, para onde vai o dinheiro e como isso muda mês a mês."
          aside={aside}
        />
        <Vazio
          titulo="Ainda não há o que comparar"
          texto="Assim que você cadastrar a equipe e lançar os primeiros pagamentos, este resumo mostra o custo por pessoa, por função e a variação entre os meses."
        />

        {/* Sem ninguém ativo ainda pode haver recibos de quem já saiu — eles
            não podem sumir junto com a pessoa. */}
        {db.recibos.length > 0 ? (
          <div className="mt-5 flex flex-col gap-5">
            <ReceiptAudit recibos={db.recibos} onVer={onVerRecibo} />
            <ReceiptArchive
              recibos={db.recibos}
              onVer={onVerRecibo}
              onError={onAviso}
              onDone={onAviso}
            />
          </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      <PageHeader
        kicker={`Relatórios · ${formatPeriod(period)}`}
        title="Relatórios"
        subtitle="Quanto custa a equipe, para onde vai o dinheiro e como isso muda mês a mês."
        aside={aside}
      />

      <StatRow>
        <StatCell
          index={0}
          lead
          label="Folha do mês"
          value={val(folha)}
          sub={
            variacao === null
              ? `${people.length} ${people.length === 1 ? 'pessoa' : 'pessoas'} na equipe`
              : `${variacao >= 0 ? '+' : ''}${variacao.toFixed(0)}% em relação ao mês anterior`
          }
        />
        <StatCell
          index={1}
          label="Custo por pessoa"
          value={val(custoPorPessoa)}
          sub={`média entre ${people.length} ${people.length === 1 ? 'pessoa' : 'pessoas'}`}
        />
        <StatCell
          index={2}
          label="Já pago"
          value={val(pago)}
          tone="paid"
          sub={`${folha > 0 ? ((pago / folha) * 100).toFixed(0) : 0}% da folha`}
        />
        <StatCell
          index={3}
          label="Em aberto"
          value={val(falta)}
          tone={falta > 0 ? 'late' : 'ink'}
          dot={falta > 0 ? 'bg-late' : undefined}
          sub={falta > 0 ? 'ainda a sair do caixa' : 'tudo quitado'}
        />
      </StatRow>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-[20px] border border-blush-100 bg-white p-5 shadow-petal">
          <h2 className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Folha mês a mês
          </h2>

          <div className="flex flex-col gap-4">
            {comparativo.map((m) => {
              const atual = m.period === period
              return (
                <div key={m.period}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`font-display text-[16px] ${
                        atual ? 'font-semibold text-ink' : 'text-ink-soft'
                      }`}
                    >
                      {formatPeriod(m.period).replace(/ de \d{4}/, '')}
                    </span>
                    <span
                      className={`text-[14px] tabular-nums ${
                        atual ? 'font-semibold text-ink' : 'text-ink-faint'
                      }`}
                    >
                      {val(m.folha)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-blush-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ${
                        atual
                          ? 'bg-gradient-to-r from-butterfly-400 to-butterfly-600'
                          : 'bg-blush-200'
                      }`}
                      style={{ width: `${(m.folha / maiorMes) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <Panel title="Folha por função">
          {porFuncao.length === 0 ? (
            <p className="py-4 text-[13px] leading-relaxed text-ink-faint">
              Nenhum lançamento neste mês para dividir por função.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {porFuncao.map((f) => (
                <div key={f.role}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-ink-soft">{f.role}</span>
                    <span className="shrink-0 text-[13px] font-medium tabular-nums">
                      {val(f.total)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blush-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-butterfly-400 to-butterfly-600 transition-[width] duration-700"
                      style={{ width: `${maiorFuncao > 0 ? (f.total / maiorFuncao) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Fora do grid de duas colunas: a auditoria dos recibos é uma leitura
          de largura inteira, e não uma métrica ao lado de outra. */}
      <div className="mt-5 flex flex-col gap-5">
        <ReceiptAudit recibos={db.recibos} onVer={onVerRecibo} />
        {/* Erro e conclusão vão os dois para o toast — é o único canal de aviso
            da tela; os nomes separados existem para o componente não precisar
            saber disso. */}
        <ReceiptArchive
          recibos={db.recibos}
          onVer={onVerRecibo}
          onError={onAviso}
          onDone={onAviso}
        />
      </div>
    </>
  )
}
