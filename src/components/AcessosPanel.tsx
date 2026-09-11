import { useEffect, useRef, useState } from 'react'
import { Panel } from './Shell'
import { Label, fieldClass } from './Sheet'
import {
  completarMinhaEntrada,
  convidar,
  enviarRedefinicao,
  erroDeAcesso,
  observarAcessos,
  removerAcesso,
  trocarMinhaSenha,
  type Acesso,
} from '../lib/acessos'

/**
 * Quem pode entrar no app.
 *
 * Convidar aqui faz as duas coisas de uma vez: cria o login no Firebase e já
 * põe a pessoa na lista de autorizados. Antes isso exigia ir ao Console copiar
 * um uid à mão.
 *
 * Não dá para apagar a conta em si pelo app (isso exige privilégio de
 * administrador, que só existe num servidor) — o que a remoção faz é tirar da
 * lista, e sem estar na lista a pessoa não enxerga dado nenhum.
 */

const botaoPrimario =
  'min-h-[44px] rounded-[11px] bg-ink px-5 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-40'

const botaoFino =
  'min-h-[38px] rounded-[10px] border border-cream-deep px-3 py-2 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40'

/** Senha sugerida: legível em voz alta, sem caracteres que se confundem. */
function senhaSugerida(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyz'
  const numeros = '23456789'
  const sorteia = (de: string) => de[Math.floor(Math.random() * de.length)]
  const bloco = () => Array.from({ length: 4 }, () => sorteia(letras)).join('')
  const digitos = Array.from({ length: 2 }, () => sorteia(numeros)).join('')
  return `${bloco()}-${bloco()}-${digitos}`
}

export function AcessosPanel({
  meuUid,
  meuEmail,
  onAviso,
  onErro,
}: {
  meuUid: string
  meuEmail: string
  onAviso: (msg: string) => void
  onErro: (msg: string) => void
}) {
  const [lista, setLista] = useState<Acesso[]>([])
  const [carregando, setCarregando] = useState(true)
  // Uma tentativa por sessão: o remendo dispara uma escrita, que reabre o
  // listener — sem esta trava viraria laço.
  const jaRemendou = useRef(false)

  useEffect(() => {
    return observarAcessos(
      (l) => {
        setLista(l)
        setCarregando(false)

        if (!jaRemendou.current) {
          jaRemendou.current = true
          const minha = l.find((a) => a.uid === meuUid)
          void completarMinhaEntrada(meuUid, meuEmail, minha).catch(() => {
            // Falhar aqui é cosmético — a lista só fica sem o e-mail. Não vale
            // um alerta vermelho na tela por isso.
          })
        }
      },
      (err) => {
        setCarregando(false)
        onErro(erroDeAcesso(err))
      },
    )
    // Sem dependências de propósito: `onErro` vem do App e é recriado a cada
    // render — incluí-lo aqui reabriria o listener do Firestore sem parar.
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <ConvidarPanel meuEmail={meuEmail} onAviso={onAviso} onErro={onErro} />
      <ListaPanel
        lista={lista}
        carregando={carregando}
        meuUid={meuUid}
        meuEmail={meuEmail}
        onAviso={onAviso}
        onErro={onErro}
      />
      <MinhaSenhaPanel onAviso={onAviso} onErro={onErro} />
    </div>
  )
}

function ConvidarPanel({
  meuEmail,
  onAviso,
  onErro,
}: {
  meuEmail: string
  onAviso: (msg: string) => void
  onErro: (msg: string) => void
}) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  // Guarda o que foi criado para ela conseguir copiar e repassar a senha —
  // depois de sair desta tela não há como recuperar (o Firebase guarda só o
  // hash, ninguém consegue ler a senha de volta).
  const [criado, setCriado] = useState<{ nome: string; email: string; senha: string } | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return onErro('Falta o nome da pessoa.')
    if (!email.trim()) return onErro('Falta o e-mail.')
    if (senha.length < 6) return onErro('A senha precisa de pelo menos 6 caracteres.')

    setEnviando(true)
    try {
      await convidar(nome, email, senha, meuEmail)
      setCriado({ nome: nome.trim(), email: email.trim(), senha })
      setNome('')
      setEmail('')
      setSenha('')
      onAviso('Acesso criado.')
    } catch (err) {
      onErro(erroDeAcesso(err))
    } finally {
      setEnviando(false)
    }
  }

  async function copiar() {
    if (!criado) return
    const linhas = [
      'Acesso ao STHE',
      `Endereço: ${window.location.origin}`,
      `E-mail: ${criado.email}`,
      `Senha: ${criado.senha}`,
    ]
    try {
      await navigator.clipboard.writeText(linhas.join('\n'))
      onAviso('Copiado.')
    } catch {
      onErro('Não consegui copiar. Selecione o texto à mão.')
    }
  }

  return (
    <Panel title="Dar acesso a alguém">
      {criado ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-[12px] border border-paid/25 bg-paid-soft px-3.5 py-3">
            <p className="text-[13px] font-medium">{criado.nome} já pode entrar</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              Passe estes dados para a pessoa. <strong>Anote a senha agora</strong> — depois que
              você sair desta tela ela não aparece mais em lugar nenhum, nem para você.
            </p>
          </div>

          <div className="rounded-[12px] border border-cream-deep bg-cream px-3.5 py-3 text-[13px]">
            <p className="text-ink-soft">
              <span className="text-ink-faint">E-mail:</span> {criado.email}
            </p>
            <p className="mt-1 text-ink-soft">
              <span className="text-ink-faint">Senha:</span>{' '}
              <span className="font-medium tracking-wide">{criado.senha}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copiar()} className={botaoFino}>
              Copiar para enviar
            </button>
            <button type="button" onClick={() => setCriado(null)} className={botaoFino}>
              Dar acesso a outra pessoa
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <p className="text-[12.5px] leading-relaxed text-ink-faint">
            Cria o login e já libera o acesso. Quem entrar por aqui vê os mesmos dados que você —
            salários, recibos e comprovantes de todo mundo.
          </p>

          <label className="flex flex-col gap-[7px]">
            <Label>Nome</Label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: Sthéfany"
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-[7px]">
            <Label>E-mail</Label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              inputMode="email"
              placeholder="pessoa@exemplo.com"
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-[7px]">
            <Label>Senha provisória</Label>
            <div className="flex gap-2">
              <input
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                placeholder="pelo menos 6 caracteres"
                className={`${fieldClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => setSenha(senhaSugerida())}
                className={`${botaoFino} shrink-0`}
              >
                Sugerir
              </button>
            </div>
            <span className="text-[12px] leading-snug text-ink-dim">
              A pessoa pode trocar depois, aqui em Configurações.
            </span>
          </label>

          <button type="submit" disabled={enviando} className={`${botaoPrimario} self-start`}>
            {enviando ? 'Criando…' : 'Criar acesso'}
          </button>
        </form>
      )}
    </Panel>
  )
}

function ListaPanel({
  lista,
  carregando,
  meuUid,
  meuEmail,
  onAviso,
  onErro,
}: {
  lista: Acesso[]
  carregando: boolean
  meuUid: string
  meuEmail: string
  onAviso: (msg: string) => void
  onErro: (msg: string) => void
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function remover(acesso: Acesso) {
    setOcupado(acesso.uid)
    try {
      await removerAcesso(acesso.uid)
      onAviso(`${acesso.nome || acesso.email} perdeu o acesso.`)
      setConfirmando(null)
    } catch (err) {
      onErro(erroDeAcesso(err))
    } finally {
      setOcupado(null)
    }
  }

  async function redefinir(acesso: Acesso) {
    if (!acesso.email) {
      return onErro('Essa entrada não tem e-mail — não dá para enviar a redefinição.')
    }
    setOcupado(acesso.uid)
    try {
      await enviarRedefinicao(acesso.email)
      onAviso(`E-mail de nova senha enviado para ${acesso.email}.`)
    } catch (err) {
      onErro(erroDeAcesso(err))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Panel title={`Quem tem acesso${lista.length ? ` (${lista.length})` : ''}`}>
      {carregando ? (
        <p className="text-[13px] text-ink-dim">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-ink-dim">Ninguém na lista ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((acesso) => {
            const souEu = acesso.uid === meuUid
            const travado = ocupado === acesso.uid
            // Documento antigo pode estar sem e-mail; na própria linha dá para
            // suprir com o da conta logada, que é o dado de verdade.
            const email = acesso.email || (souEu ? meuEmail : '')
            return (
              <li
                key={acesso.uid}
                className="rounded-[14px] border border-cream-deep bg-cream px-3.5 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium leading-snug">
                      {acesso.nome || email}
                      {souEu ? (
                        <span className="ml-2 rounded-full bg-butterfly-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-butterfly-600">
                          você
                        </span>
                      ) : null}
                    </p>
                    {email ? (
                      <p className="mt-0.5 break-all text-[12.5px] text-ink-faint">{email}</p>
                    ) : null}
                    {acesso.convidadoPor && !souEu ? (
                      <p className="mt-0.5 text-[12px] text-ink-dim">
                        Convidado por {acesso.convidadoPor}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void redefinir({ ...acesso, email })}
                      disabled={travado}
                      className={botaoFino}
                    >
                      Reenviar senha
                    </button>
                    {souEu ? null : (
                      <button
                        type="button"
                        onClick={() => setConfirmando(acesso.uid)}
                        disabled={travado}
                        className={`${botaoFino} border-late/30 text-late hover:bg-late-soft`}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                {confirmando === acesso.uid ? (
                  <div className="mt-3 rounded-[11px] border border-late/25 bg-late-soft px-3 py-2.5">
                    <p className="text-[12.5px] leading-relaxed text-ink-soft">
                      Tirar o acesso de <strong>{acesso.nome || acesso.email}</strong>? O login
                      continua existindo, mas deixa de enxergar qualquer dado.
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void remover(acesso)}
                        disabled={travado}
                        className="min-h-[38px] rounded-[10px] bg-late px-3.5 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {travado ? 'Removendo…' : 'Sim, remover'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmando(null)}
                        className={botaoFino}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function MinhaSenhaPanel({
  onAviso,
  onErro,
}: {
  onAviso: (msg: string) => void
  onErro: (msg: string) => void
}) {
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (nova.length < 6) return onErro('A senha precisa de pelo menos 6 caracteres.')
    if (nova !== confirma) return onErro('As duas senhas não são iguais.')

    setSalvando(true)
    try {
      await trocarMinhaSenha(nova)
      setNova('')
      setConfirma('')
      onAviso('Senha trocada.')
    } catch (err) {
      onErro(erroDeAcesso(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Panel title="Minha senha">
      <form onSubmit={salvar} className="flex max-w-[380px] flex-col gap-4">
        <label className="flex flex-col gap-[7px]">
          <Label>Nova senha</Label>
          <input
            type="password"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            autoComplete="new-password"
            placeholder="pelo menos 6 caracteres"
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <Label>Repita a nova senha</Label>
          <input
            type="password"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className={fieldClass}
          />
        </label>

        <button type="submit" disabled={salvando || !nova} className={`${botaoPrimario} self-start`}>
          {salvando ? 'Trocando…' : 'Trocar senha'}
        </button>

        <p className="text-[12px] leading-snug text-ink-dim">
          Se você estiver logado há muito tempo, o Firebase pede para sair e entrar de novo antes
          de aceitar a troca — é proteção contra alguém mexer num aparelho deixado aberto.
        </p>
      </form>
    </Panel>
  )
}
