import { useState } from 'react'
import { ButterflyMark } from './Primitives'
import { entrar, mensagemDeErro } from '../lib/auth'
import { fieldClass, Label } from './Sheet'

/**
 * Porta de entrada quando o app está ligado à nuvem.
 *
 * Não tem "criar conta" nem "esqueci a senha" de propósito: as contas são
 * criadas no Console do Firebase. Num app com CPF e folha de pagamento da
 * equipe, quem entra é decidido por fora, não por quem chega na tela.
 */
export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha.')
      return
    }
    setEntrando(true)
    setErro('')
    try {
      await entrar(email, senha)
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <form
        onSubmit={enviar}
        className="flex w-full max-w-[380px] flex-col gap-5 rounded-[20px] border border-blush-100 bg-white px-6 py-8 shadow-petal"
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          <ButterflyMark className="h-10 w-10" />
          <h1 className="font-display text-[24px] font-semibold tracking-[0.14em]">STHE</h1>
          <p className="text-[13px] leading-relaxed text-ink-faint">
            Entre para ver os pagamentos da equipe.
          </p>
        </div>

        <label className="flex flex-col gap-[7px]">
          <Label>E-mail</Label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            placeholder="voce@exemplo.com"
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <Label>Senha</Label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className={fieldClass}
          />
        </label>

        {erro ? (
          <p className="rounded-[11px] border border-late/25 bg-late-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            {erro}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={entrando}
          className="min-h-[46px] rounded-[11px] bg-ink px-4 py-3 text-[14.5px] font-medium text-cream transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-center text-[11.5px] leading-relaxed text-ink-dim">
          Esqueceu a senha ou precisa de acesso? Fale com quem administra o aplicativo.
        </p>
      </form>
    </div>
  )
}
