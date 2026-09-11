import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MonthNav, TopNav, type TabId } from './components/Shell'
import { PersonSheet } from './components/PersonSheet'
import { AddToMonthSheet } from './components/AddToMonthSheet'
import { ValueSheet, type ValueResult } from './components/ValueSheet'
import { SignSheet, type SignResult } from './components/SignSheet'
import { ReceiptSheet } from './components/ReceiptSheet'
import { ProofSheet } from './components/ProofSheet'
import { FotoSheet } from './components/FotoSheet'
import { Toast } from './components/Toast'
import { DemoNotice } from './components/DemoNotice'
import { EquipePage } from './pages/EquipePage'
import { PagamentosPage } from './pages/PagamentosPage'
import { AgendaPage } from './pages/AgendaPage'
import { RelatoriosPage } from './pages/RelatoriosPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'
import { exportDb, parseImportedDb, uid } from './lib/storage'
import { useCloudDb } from './lib/useCloudDb'
import { aplicarTema, lerTema, observarSistema, salvarTema, type Tema } from './lib/theme'
import { useDesfazer } from './lib/useDesfazer'
import { sair } from './lib/auth'
import { LoginScreen } from './components/LoginScreen'
import { centsToNumber } from './lib/money'
import {
  buildFixedSalaries,
  buildGroups,
  buildRepeatedEntries,
  currentPeriod,
  formatMoney,
  formatPeriod,
  monthStats,
  pendingByMethod,
  peopleVisibleInPeriod,
  shiftPeriod,
  sortSummaries,
  statusOf,
  summarizePerson,
  type FilterKey,
  type SortKey,
} from './lib/calc'
import {
  KIND_EFFECT,
  KIND_LABEL,
  type Company,
  type ContractType,
  type Entry,
  type PaymentMethod,
  type Person,
  type Receipt,
  type AgendaItem,
  type Database,
} from './lib/types'
import { hashReceipt, lastHash, nextNumber } from './lib/receipt'

type SheetState =
  | { mode: 'pagar' | 'lancar'; person: Person }
  /** `entrarNoMes`: veio do atalho dentro de "Adicionar ao mês" — ao salvar,
      a pessoa nova já ganha uma membership no período atual. */
  | { mode: 'pessoa'; person?: Person; entrarNoMes?: boolean }
  | { mode: 'membros' }
  /** Assinatura logo após registrar o pagamento — `entryIds` amarra o recibo
      aos lançamentos que ele quita. */
  | {
      mode: 'assinar'
      person: Person
      valor: number
      method: PaymentMethod
      entryIds: string[]
      /** Se este pagamento quitou tudo que faltava, ou só uma parte (vale). */
      quita: boolean
      /** Quanto ainda falta depois deste pagamento — só relevante quando parcial. */
      saldoRestante: number
    }
  | { mode: 'recibo'; recibo: Receipt }
  | { mode: 'comprovante'; entry: Entry }
  | { mode: 'foto'; person: Person }
  | null

export default function App() {
  const { db, setDb, estado: estadoNuvem, erroNuvem } = useCloudDb()
  const [tab, setTab] = useState<TabId>('pagamentos')
  const [period, setPeriod] = useState(currentPeriod)
  const [filtro, setFiltro] = useState<FilterKey>('todos')
  const [tipo, setTipo] = useState<ContractType | 'todos'>('todos')
  const [sort, setSort] = useState<SortKey>('vencimento')
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState('')
  const [discreet, setDiscreet] = useState(false)
  const [tema, setTema] = useState<Tema>(lerTema)
  const fileRef = useRef<HTMLInputElement>(null)

  // O tema já foi aplicado pelo script no index.html, antes da primeira
  // pintura. Isto aqui mantém em dia depois: quando ela troca a opção, e
  // quando o próprio sistema muda (só importa no modo automático).
  useEffect(() => {
    aplicarTema(tema)
    if (tema !== 'sistema') return
    return observarSistema(() => aplicarTema(tema))
  }, [tema])

  function trocarTema(novo: Tema) {
    setTema(novo)
    salvarTema(novo)
  }

  // Todo mundo ativo agora — usado para o que não depende de qual mês está
  // aberto (auto-lançamento, repetir mês anterior).
  const peopleAtivos = useMemo(() => db.people.filter((p) => p.active), [db.people])

  // Quem deve aparecer NESTE mês: fixo aparece enquanto esteve na empresa
  // (mesmo sem lançamento ainda); freelancer/diarista só se teve lançamento,
  // foi cadastrada neste mês, ou foi readicionada via "Adicionar ao mês". Ver
  // `peopleVisibleInPeriod`.
  const peopleDoMes = useMemo(
    () => peopleVisibleInPeriod(db.people, db.entries, period, db.monthMemberships),
    [db.people, db.entries, period, db.monthMemberships],
  )

  // Quem já está no banco mas NÃO aparece neste mês — candidatos pro sheet
  // de "Adicionar ao mês".
  const candidatosDoMes = useMemo(() => {
    const visiveisIds = new Set(peopleDoMes.map((p) => p.id))
    return peopleAtivos.filter((p) => !visiveisIds.has(p.id))
  }, [peopleAtivos, peopleDoMes])

  /**
   * O valor combinado no cadastro entra sozinho: salário de quem é fixo ao
   * abrir o mês, e a diária/valor de referência de quem foi trazido pelo
   * "Adicionar ao mês". Ela não deveria ter que redigitar um número que já
   * está no cadastro. Roda só para o mês corrente e os futuros: em mês passado
   * sem lançamento, criar valor agora inventaria uma dívida que nunca existiu.
   *
   * A lista é montada DENTRO do setDb, a partir do estado mais recente. Fazer
   * isso fora (lendo `db.entries` do render) duplicava os salários: o efeito
   * rodava de novo com a lista antiga antes do estado novo chegar.
   */
  useEffect(() => {
    if (period < currentPeriod()) return
    setDb((d) => {
      const novos = buildFixedSalaries(
        d.entries,
        period,
        d.people,
        uid,
        d.monthMemberships,
        d.company.workDays,
      )
      return novos.length === 0 ? d : { ...d, entries: [...d.entries, ...novos] }
    })
  }, [period, db.people, db.monthMemberships, db.company.workDays])

  // Trocar de mês ou de filtro descarta a seleção: manter marcado alguém que
  // sumiu da tela levaria a pagar sem querer.
  useEffect(() => {
    setSelecionados([])
  }, [period, filtro, tipo])

  const summaries = useMemo(
    () =>
      sortSummaries(
        peopleDoMes.map((p) => summarizePerson(p, db.entries, period, db.company.workDays)),
        sort,
      ),
    [peopleDoMes, db.entries, period, sort, db.company.workDays],
  )

  const stats = useMemo(() => monthStats(summaries), [summaries])

  const porForma = useMemo(() => pendingByMethod(summaries), [summaries])

  // Os dois filtros se combinam e valem só para a LISTA. Os indicadores do mês
  // continuam somando todo mundo de propósito: é a resposta de "quanto falta
  // pagar no total" — se mudassem junto, ela perderia essa visão.
  const visiveis = useMemo(
    () =>
      summaries
        .filter((s) => filtro === 'todos' || statusOf(s) === filtro)
        .filter((s) => tipo === 'todos' || s.person.contract === tipo),
    [summaries, filtro, tipo],
  )

  const grupos = useMemo(() => buildGroups(visiveis), [visiveis])

  const mesVazio = summaries.every((s) => s.entries.length === 0)
  const repetiveis = useMemo(
    () =>
      mesVazio && peopleAtivos.length > 0
        ? buildRepeatedEntries(db.entries, shiftPeriod(period, -1), period, peopleAtivos, uid)
        : [],
    [mesVazio, db.entries, period, peopleAtivos],
  )

  const contagemPorTipo = useMemo(() => {
    const acc = { fixo: 0, diarista: 0, freelancer: 0 } as Record<ContractType, number>
    peopleDoMes.forEach((p) => {
      acc[p.contract] += 1
    })
    return acc
  }, [peopleDoMes])

  const ehMesAtual = period === currentPeriod()
  const val = (v: number) => (discreet ? '••••' : formatMoney(v))

  function flash(msg: string) {
    setToast(msg)
  }

  /**
   * Ctrl+Z / Ctrl+Shift+Z.
   *
   * Cada ação que altera o banco chama `registrar` ANTES de mexer, dizendo o
   * que está prestes a fazer. A exceção é assinar recibo: uma vez emitido, o
   * documento existe e desfazer o pagamento o deixaria órfão — comprovando
   * algo que o app passaria a dizer que não aconteceu.
   */
  const aplicarEstado = useCallback((d: Database) => setDb(() => d), [setDb])
  const { registrar, esquecer, desfazer, refazer, temPassado, temFuturo } = useDesfazer(
    db,
    aplicarEstado,
    flash,
  )

  // -------------------------------------------------------------------------
  // Pessoas e lançamentos
  // -------------------------------------------------------------------------

  /**
   * `entrarNoMes` vem do atalho "Nova pessoa" dentro de "Adicionar ao mês":
   * ela já nasce com uma membership no período atual, pra não precisar de um
   * segundo passo — cadastrar e trazer pro mês na mesma ação.
   */
  function upsertPerson(person: Person, entrarNoMes = false) {
    registrar(db.people.some((p) => p.id === person.id) ? 'Edição de pessoa' : 'Nova pessoa')
    const editando = db.people.some((p) => p.id === person.id)
    setDb((d) => ({
      ...d,
      people: editando
        ? d.people.map((p) => (p.id === person.id ? person : p))
        : [...d.people, person],
      monthMemberships:
        !editando && entrarNoMes
          ? [...d.monthMemberships, { personId: person.id, period }]
          : d.monthMemberships,
    }))
    setSheet(null)
    flash(editando ? 'Dados atualizados.' : `${person.name.split(' ')[0]} entrou na lista.`)
  }

  function salvarEmpresa(company: Company) {
    registrar('Dados da empresa')
    setDb((d) => ({ ...d, company }))
    flash('Dados de quem paga salvos.')
  }

  function archivePerson(id: string) {
    registrar('Arquivar pessoa')
    const alvo = db.people.find((p) => p.id === id)
    // Guarda quando ela saiu: é o que faz um fixo continuar aparecendo nos
    // meses em que trabalhou e sumir só dos meses seguintes à saída.
    const hoje = new Date().toISOString()
    setDb((d) => ({
      ...d,
      people: d.people.map((p) =>
        p.id === id ? { ...p, active: false, inactivatedAt: hoje } : p,
      ),
    }))
    setSheet(null)
    if (alvo) flash(`${alvo.name.split(' ')[0]} saiu da lista.`)
  }

  function reactivatePerson(id: string) {
    registrar('Reativar pessoa')
    const alvo = db.people.find((p) => p.id === id)
    setDb((d) => ({
      ...d,
      people: d.people.map((p) =>
        p.id === id ? { ...p, active: true, inactivatedAt: undefined } : p,
      ),
    }))
    setSheet(null)
    if (alvo) flash(`${alvo.name.split(' ')[0]} voltou pra lista.`)
  }

  /**
   * Exclusão de verdade — diferente de "não trabalha mais aqui", que só
   * arquiva preservando histórico. Aqui some com a pessoa e tudo que só faz
   * sentido ligado a ela (lançamentos, participação em meses, recibos);
   * itens de agenda continuam existindo, só perdem a referência a ela.
   */
  function deletePerson(id: string) {
    registrar('Exclusão de pessoa')
    const alvo = db.people.find((p) => p.id === id)
    setDb((d) => ({
      ...d,
      people: d.people.filter((p) => p.id !== id),
      entries: d.entries.filter((e) => e.personId !== id),
      monthMemberships: d.monthMemberships.filter((m) => m.personId !== id),
      recibos: d.recibos.filter((r) => r.personId !== id),
      agenda: d.agenda.map((item) =>
        item.personIds.includes(id)
          ? { ...item, personIds: item.personIds.filter((pid) => pid !== id) }
          : item,
      ),
    }))
    setSheet(null)
    if (alvo) flash(`${alvo.name.split(' ')[0]} foi excluído.`)
  }

  /** Marca quem foi escolhido no sheet "Adicionar ao mês" como participante. */
  function addMonthMembers(personIds: string[]) {
    registrar('Adicionar ao mês')
    if (personIds.length === 0) return
    setDb((d) => ({
      ...d,
      monthMemberships: [
        ...d.monthMemberships,
        ...personIds.map((personId) => ({ personId, period })),
      ],
    }))
    setSheet(null)
    flash(
      personIds.length === 1
        ? 'Pessoa adicionada ao mês.'
        : `${personIds.length} pessoas adicionadas ao mês.`,
    )
  }

  function toggleEntry(entry: Entry) {
    registrar('Marcar lançamento')
    setDb((d) => ({
      ...d,
      entries: d.entries.map((e) => (e.id === entry.id ? { ...e, paid: !e.paid } : e)),
    }))
  }

  /**
   * Registra um pagamento. Se o valor cobre tudo que falta, quita os lançamentos
   * em aberto (guardando data e forma). Se cobre só parte, cria um "vale" já
   * pago — que abate do que falta sem inflar o total do mês.
   */
  function registrarPagamento(person: Person, r: ValueResult) {
    const resumo = summaries.find((s) => s.person.id === person.id)
    if (!resumo) return
    const valor = centsToNumber(r.cents)
    const quita = valor >= resumo.falta

    // Quais lançamentos este pagamento cobre — o recibo precisa apontar para
    // eles, senão fica solto e não dá para dizer depois a que ele se referia.
    const alvos = quita
      ? resumo.entries
          .filter((e) => !e.paid && KIND_EFFECT[e.kind] !== 'abate')
          .map((e) => e.id)
      : []
    const idVale = quita ? '' : uid()

    registrar('Pagamento')
    setDb((d) => {
      if (quita) {
        return {
          ...d,
          entries: d.entries.map((e) =>
            e.personId === person.id &&
            e.period === period &&
            !e.paid &&
            KIND_EFFECT[e.kind] !== 'abate'
              ? {
                  ...e,
                  paid: true,
                  date: r.date,
                  method: r.method,
                  receiptName: r.receiptName || e.receiptName,
                  receiptImage: r.receiptImage || e.receiptImage,
                }
              : e,
          ),
        }
      }
      const vale: Entry = {
        id: idVale,
        personId: person.id,
        period,
        kind: 'vale',
        amount: valor,
        date: r.date,
        paid: true,
        description: r.obs.trim(),
        method: r.method,
        receiptName: r.receiptName || undefined,
        receiptImage: r.receiptImage || undefined,
        createdAt: new Date().toISOString(),
      }
      return { ...d, entries: [...d.entries, vale] }
    })

    if (r.colherAssinatura) {
      setSheet({
        mode: 'assinar',
        person,
        valor,
        method: r.method,
        entryIds: quita ? alvos : [idVale],
        quita,
        saldoRestante: quita ? 0 : resumo.falta - valor,
      })
      return
    }

    setSheet(null)
    flash(
      quita
        ? `${person.name.split(' ')[0]} está quitada — ${formatMoney(valor)}`
        : `${formatMoney(valor)} registrado · falta ${formatMoney(resumo.falta - valor)}`,
    )
  }

  /**
   * Colher a assinatura depois — para quando ela desmarcou "colher assinatura"
   * na hora do pagamento (ou pagou fora do app e só lançou aqui) e decide
   * reconhecer o recebimento mais tarde. O recibo cobre só este lançamento,
   * pelo valor dele; `quita` reflete a situação atual do mês (se sobrou algo
   * em aberto depois dele, não é mais "plena e geral quitação").
   */
  function assinarDepois(person: Person, entry: Entry) {
    const resumo = summaries.find((s) => s.person.id === person.id)
    const quita = !resumo || resumo.falta === 0
    setSheet({
      mode: 'assinar',
      person,
      valor: entry.amount,
      method: entry.method ?? 'Pix',
      entryIds: [entry.id],
      quita,
      saldoRestante: resumo?.falta ?? 0,
    })
  }

  /**
   * Fecha o ciclo: monta o recibo assinado, encadeia no hash do anterior e
   * abre a tela de envio. O CPF sobe para o cadastro quando é novo, para ela
   * não redigitar no mês que vem.
   */
  async function assinarRecibo(
    person: Person,
    valor: number,
    method: PaymentMethod,
    entryIds: string[],
    r: SignResult,
  ) {
    const numero = nextNumber(db.recibos)
    const prevHash = lastHash(db.recibos)
    const signedAt = new Date().toISOString()

    const hash = await hashReceipt({
      numero,
      personName: person.name,
      personDoc: r.doc,
      payerName: db.company.name,
      payerDoc: db.company.doc,
      amount: valor,
      method,
      period,
      signedAt,
      signature: r.signature,
      prevHash,
    })

    const recibo: Receipt = {
      id: uid(),
      numero,
      personId: person.id,
      period,
      entryIds,
      signature: r.signature,
      personName: person.name,
      personDoc: r.doc,
      payerName: db.company.name,
      payerDoc: db.company.doc,
      payerDocType: db.company.docType,
      amount: valor,
      amountText: r.amountText,
      method,
      termo: r.termo,
      signedAt,
      hash,
      prevHash,
    }

    setDb((d) => ({
      ...d,
      recibos: [...d.recibos, recibo],
      people: r.guardarDoc
        ? d.people.map((p) => (p.id === person.id ? { ...p, doc: r.doc } : p))
        : d.people,
    }))

    // Daqui não se volta. O recibo está assinado e encadeado no hash do
    // anterior; desfazer o pagamento que ele comprova deixaria o documento
    // apontando para algo que o app passaria a dizer que não aconteceu.
    esquecer()

    setSheet({ mode: 'recibo', recibo })
  }

  function alternarSelecao(id: string) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    )
  }

  /**
   * Quita de uma vez todo mundo que está marcado, cada um pela forma de
   * pagamento do próprio cadastro — é por isso que o lote não precisa
   * perguntar nada: a informação já está lá.
   */
  function pagarSelecionados() {
    const alvos = summaries.filter((s) => selecionados.includes(s.person.id) && s.falta > 0)
    if (alvos.length === 0) return

    const ids = new Set(alvos.map((s) => s.person.id))
    const hoje = new Date().toISOString().slice(0, 10)
    const total = alvos.reduce((acc, s) => acc + s.falta, 0)

    registrar('Pagamento em lote')
    setDb((d) => ({
      ...d,
      entries: d.entries.map((e) =>
        ids.has(e.personId) && e.period === period && !e.paid && KIND_EFFECT[e.kind] !== 'abate'
          ? {
              ...e,
              paid: true,
              date: hoje,
              method: d.people.find((p) => p.id === e.personId)?.method ?? e.method,
            }
          : e,
      ),
    }))

    setSelecionados([])
    flash(
      alvos.length === 1
        ? `${alvos[0].person.name.split(' ')[0]} está quitada — ${formatMoney(total)}`
        : `${alvos.length} pessoas quitadas — ${formatMoney(total)}`,
    )
  }

  function lancarValor(person: Person, r: ValueResult) {
    const valor = centsToNumber(r.cents)
    const novo: Entry = {
      id: uid(),
      personId: person.id,
      period,
      kind: r.kind,
      amount: valor,
      date: r.date,
      paid: false,
      description: r.obs.trim(),
      receiptName: r.receiptName || undefined,
      createdAt: new Date().toISOString(),
    }
    registrar(KIND_LABEL[r.kind])
    setDb((d) => ({ ...d, entries: [...d.entries, novo] }))
    setSheet(null)
    flash(`${KIND_LABEL[r.kind]} de ${formatMoney(valor)} lançado.`)
  }

  function repetirMesAnterior() {
    registrar('Repetir mês anterior')
    setDb((d) => ({ ...d, entries: [...d.entries, ...repetiveis] }))
    flash(`${repetiveis.length} lançamentos trazidos.`)
  }

  // -------------------------------------------------------------------------
  // Agenda
  // -------------------------------------------------------------------------

  function upsertAgendaItem(item: AgendaItem) {
    const editando = db.agenda.some((it) => it.id === item.id)
    registrar(editando ? 'Edição na agenda' : 'Novo item na agenda')
    setDb((d) => ({
      ...d,
      agenda: editando
        ? d.agenda.map((it) => (it.id === item.id ? item : it))
        : [...d.agenda, item],
    }))
    flash(editando ? 'Item atualizado.' : 'Item adicionado à agenda.')
  }

  /**
   * Arrastar um item para outro dia — e, com Alt, deixar uma cópia.
   *
   * Separado do `upsert` por causa do aviso: arrastar é gesto contínuo, e
   * "Item atualizado" a cada solta viraria ruído. Aqui a mensagem diz o que
   * de fato aconteceu, e some sozinha.
   */
  function moverAgendaItem(id: string, date: string, duplicar: boolean) {
    // Registra antes de mexer, mas só se houver mudança: soltar o item no
    // mesmo dia não é uma ação, e entupiria o histórico com passos vazios.
    const item = db.agenda.find((it) => it.id === id)
    if (!item || item.date === date) return
    registrar(duplicar ? 'Cópia na agenda' : 'Item movido')

    setDb((d) => {
      const item = d.agenda.find((it) => it.id === id)
      if (!item || item.date === date) return d
      return {
        ...d,
        agenda: duplicar
          ? [...d.agenda, { ...item, id: uid(), date, createdAt: new Date().toISOString() }]
          : d.agenda.map((it) => (it.id === id ? { ...it, date } : it)),
      }
    })
    flash(duplicar ? 'Item copiado.' : 'Item movido.')
  }

  function deleteAgendaItem(id: string) {
    registrar('Excluir item da agenda')
    setDb((d) => ({ ...d, agenda: d.agenda.filter((it) => it.id !== id) }))
    flash('Item excluído.')
  }

  // -------------------------------------------------------------------------
  // Backup
  // -------------------------------------------------------------------------

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseImportedDb(String(reader.result))
        if (window.confirm('Isso substitui os dados atuais. Continuar?')) {
          registrar('Restaurar backup')
          setDb(() => imported)
          flash('Dados restaurados.')
        }
      } catch {
        flash('Não consegui ler esse arquivo.')
      }
    }
    reader.readAsText(file)
  }

  const alvoSummary =
    sheet && (sheet.mode === 'pagar' || sheet.mode === 'lancar')
      ? summaries.find((s) => s.person.id === sheet.person.id)
      : undefined

  // A navegação de mês não serve na Agenda, que anda por semana.
  const monthNav =
    tab === 'agenda' || tab === 'config' ? null : (
      <MonthNav
        label={formatPeriod(period)}
        onPrev={() => setPeriod(shiftPeriod(period, -1))}
        onNext={() => setPeriod(shiftPeriod(period, 1))}
        onToday={() => setPeriod(currentPeriod())}
        showToday={!ehMesAtual}
      />
    )

  // Com nuvem ligada, nada aparece antes de saber quem está entrando: os dados
  // são folha de pagamento e CPF da equipe. Sem nuvem (modo local), o app abre
  // direto, como sempre funcionou.
  if (estadoNuvem.modo === 'carregando') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-ink-faint">
        Abrindo…
      </div>
    )
  }
  if (estadoNuvem.modo === 'deslogado') return <LoginScreen />

  return (
    <div className="flex min-h-screen flex-col text-[15px] text-ink">
      <TopNav
        tab={tab}
        onTab={setTab}
        right={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
                e.target.value = ''
              }}
            />
            {/* Só aparecem quando há o que desfazer: botão permanentemente
                apagado vira ruído, e o atalho de teclado continua valendo. */}
            {temPassado ? (
              <button
                onClick={desfazer}
                title="Desfazer (Ctrl+Z)"
                aria-label="Desfazer"
                className="flex rounded-[10px] p-2 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
              >
                <UndoIcon />
              </button>
            ) : null}

            {temFuturo ? (
              <button
                onClick={refazer}
                title="Refazer (Ctrl+Shift+Z)"
                aria-label="Refazer"
                className="flex rounded-[10px] p-2 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
              >
                <UndoIcon virado />
              </button>
            ) : null}

            <button
              onClick={() => setDiscreet(!discreet)}
              aria-pressed={discreet}
              title={discreet ? 'Mostrar valores' : 'Esconder valores'}
              className={`flex rounded-[10px] p-2 transition-colors ${
                discreet
                  ? 'bg-blush-100 text-blush-600'
                  : 'text-ink-faint hover:bg-blush-100 hover:text-blush-600'
              }`}
            >
              <EyeIcon off={discreet} />
            </button>

            {estadoNuvem.modo === 'pronto' ? (
              <button
                onClick={() => void sair()}
                title={`Sair (${estadoNuvem.usuario.email ?? ''})`}
                aria-label="Sair"
                className="flex rounded-[10px] p-2 text-ink-faint transition-colors hover:bg-blush-100 hover:text-blush-600"
              >
                <svg
                  viewBox="0 0 18 18"
                  className="h-[17px] w-[17px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M7 15.5H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h3" />
                  <path d="M11.5 12 15 9l-3.5-3M15 9H7" />
                </svg>
              </button>
            ) : null}
          </>
        }
      />

      {/* Falha de nuvem precisa ser visível: os dados continuam salvos no
          aparelho, mas deixar isso silencioso é como parecer sincronizado
          quando não está — pior do que não ter nuvem nenhuma. */}
      {erroNuvem ? (
        <div className="mx-auto w-full max-w-[1280px] px-4 pt-3 sm:px-7">
          <p className="rounded-[12px] border border-late/25 bg-late-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            {erroNuvem}
          </p>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-16 sm:px-7">
        {tab === 'equipe' ? (
          <EquipePage
            people={db.people}
            onNovaPessoa={() => setSheet({ mode: 'pessoa' })}
            onEditar={(p) => setSheet({ mode: 'pessoa', person: p })}
            onArquivar={archivePerson}
            onReativar={reactivatePerson}
            onExcluir={deletePerson}
            onVerFoto={(person) => setSheet({ mode: 'foto', person })}
          />
        ) : null}

        {tab === 'pagamentos' ? (
          <PagamentosPage
            db={db}
            period={period}
            summaries={summaries}
            grupos={grupos}
            stats={stats}
            filtro={filtro}
            setFiltro={setFiltro}
            tipo={tipo}
            setTipo={setTipo}
            sort={sort}
            setSort={setSort}
            contagemPorTipo={contagemPorTipo}
            abertos={abertos}
            setAbertos={setAbertos}
            selecionados={selecionados}
            onSelecionar={alternarSelecao}
            onSelecionarTodos={setSelecionados}
            onPagarSelecionados={pagarSelecionados}
            porForma={porForma}
            repetiveis={repetiveis}
            onRepetir={repetirMesAnterior}
            discreet={discreet}
            val={val}
            aside={monthNav}
            onAdicionarAoMes={() => setSheet({ mode: 'membros' })}
            onIrParaEquipe={() => setTab('equipe')}
            onPagar={(p) => setSheet({ mode: 'pagar', person: p })}
            onLancar={(p) => setSheet({ mode: 'lancar', person: p })}
            onEditar={(p) => setSheet({ mode: 'pessoa', person: p })}
            onToggleEntry={toggleEntry}
            onVerRecibo={(recibo) => setSheet({ mode: 'recibo', recibo })}
            onVerComprovante={(entry) => setSheet({ mode: 'comprovante', entry })}
            onVerFoto={(person) => setSheet({ mode: 'foto', person })}
            onAssinarDepois={assinarDepois}
          />
        ) : null}

        {tab === 'agenda' ? (
          <AgendaPage
            agenda={db.agenda}
            people={peopleAtivos}
            onSave={upsertAgendaItem}
            onMove={moverAgendaItem}
            onDelete={deleteAgendaItem}
            onError={flash}
          />
        ) : null}

        {tab === 'relatorios' ? (
          <RelatoriosPage
            db={db}
            period={period}
            val={val}
            aside={monthNav}
            onVerRecibo={(recibo) => setSheet({ mode: 'recibo', recibo })}
            onAviso={flash}
          />
        ) : null}

        {tab === 'config' ? (
          <ConfiguracoesPage
            company={db.company}
            tema={tema}
            onTrocarTema={trocarTema}
            onSave={salvarEmpresa}
            onError={flash}
            usuario={
              estadoNuvem.modo === 'pronto'
                ? {
                    uid: estadoNuvem.usuario.uid,
                    email: estadoNuvem.usuario.email ?? '',
                  }
                : null
            }
            onAviso={flash}
          />
        ) : null}
      </main>

      <footer className="border-t border-blush-100 bg-white/40">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-5 sm:px-7">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-dim">
            STHE · Controle interno
          </span>
          {/* Versão publicada. Sem isso, "o bug continua" e "seu navegador
              serviu a versão antiga" são indistinguíveis pelo telefone. */}
          <span className="text-[10.5px] tabular-nums text-ink-dim" title="Versão publicada">
            v{__BUILD__}
          </span>
          {__DEMO__ ? (
            <span className="rounded-full bg-blush-100 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-blush-600">
              demonstração
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-3 text-[12.5px] text-ink-faint">
            Tudo salvo neste aparelho
            <button
              onClick={() => exportDb(db)}
              className="font-medium text-ink-soft underline-offset-4 transition-colors hover:text-blush-500 hover:underline"
            >
              Baixar backup
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-ink-dim underline-offset-4 transition-colors hover:text-blush-500 hover:underline"
            >
              Restaurar
            </button>
          </span>
        </div>
      </footer>

      {sheet?.mode === 'pessoa' ? (
        <PersonSheet
          initial={sheet.person}
          period={period}
          workDays={db.company.workDays}
          onSave={(p) => upsertPerson(p, sheet.entrarNoMes)}
          onArchive={sheet.person ? () => archivePerson(sheet.person!.id) : undefined}
          onReactivate={sheet.person ? () => reactivatePerson(sheet.person!.id) : undefined}
          onClose={() => setSheet(null)}
          onError={flash}
        />
      ) : null}

      {sheet?.mode === 'membros' ? (
        <AddToMonthSheet
          period={period}
          candidatos={candidatosDoMes}
          onConfirm={addMonthMembers}
          onNovaPessoa={() => setSheet({ mode: 'pessoa', entrarNoMes: true })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet && (sheet.mode === 'pagar' || sheet.mode === 'lancar') && alvoSummary ? (
        <ValueSheet
          mode={sheet.mode}
          person={sheet.person}
          summary={alvoSummary}
          onConfirm={(r) =>
            sheet.mode === 'pagar'
              ? registrarPagamento(sheet.person, r)
              : lancarValor(sheet.person, r)
          }
          onClose={() => setSheet(null)}
          onError={flash}
        />
      ) : null}

      {sheet?.mode === 'assinar' ? (
        <SignSheet
          person={sheet.person}
          valor={sheet.valor}
          method={sheet.method}
          period={period}
          company={db.company}
          quita={sheet.quita}
          saldoRestante={sheet.saldoRestante}
          onIrParaConfig={() => {
            setSheet(null)
            setTab('config')
            flash('Preencha os dados e registre o pagamento de novo.')
          }}
          onConfirm={(r) =>
            void assinarRecibo(sheet.person, sheet.valor, sheet.method, sheet.entryIds, r)
          }
          // Fechar aqui não desfaz o pagamento — ele já foi registrado. Só fica
          // sem recibo assinado, que é o que a mensagem explica.
          onClose={() => {
            setSheet(null)
            flash('Pagamento registrado — sem assinatura.')
          }}
          onError={flash}
        />
      ) : null}

      {sheet?.mode === 'recibo' ? (
        <ReceiptSheet
          recibo={sheet.recibo}
          onClose={() => {
            setSheet(null)
            flash(`Recibo nº ${String(sheet.recibo.numero).padStart(4, '0')} assinado.`)
          }}
          onError={flash}
        />
      ) : null}

      {sheet?.mode === 'comprovante' ? (
        <ProofSheet entry={sheet.entry} onClose={() => setSheet(null)} />
      ) : null}

      {sheet?.mode === 'foto' ? (
        <FotoSheet person={sheet.person} onClose={() => setSheet(null)} />
      ) : null}

      <Toast message={toast} onDone={() => setToast('')} />

      {__DEMO__ ? <DemoNotice /> : null}
    </div>
  )
}

/** Seta curva de desfazer; espelhada vira refazer. */
function UndoIcon({ virado }: { virado?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-[17px] w-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={virado ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden
    >
      <path d="M7.5 7.5H12a4 4 0 0 1 0 8H8" />
      <path d="M10 4.5 6.5 7.5 10 10.5" />
    </svg>
  )
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 18 18"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M1.5 9S4.5 3.5 9 3.5 16.5 9 16.5 9 13.5 14.5 9 14.5 1.5 9 1.5 9Z" />
      <circle cx="9" cy="9" r="2.5" />
      {off ? <path d="M3 15L15 3" /> : null}
    </svg>
  )
}
