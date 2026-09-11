/**
 * Tema claro/escuro.
 *
 * São três opções, não duas: "sistema" é o padrão, e acompanha a preferência
 * do aparelho — quem deixa o celular escurecer à noite não deveria precisar
 * vir aqui trocar também. Claro e escuro fixam a escolha.
 *
 * A escolha fica no localStorage e não sobe para a nuvem: é preferência de
 * aparelho, não de pessoa. O celular dela pode estar escuro e o computador
 * claro ao mesmo tempo.
 */

export type Tema = 'claro' | 'escuro' | 'sistema'

const CHAVE = 'sthe.tema'

export function lerTema(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') return salvo
  } catch {
    // Navegador com storage bloqueado: cai no padrão.
  }
  return 'sistema'
}

export function salvarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // Sem storage a escolha não persiste, mas a sessão atual funciona.
  }
}

function sistemaPrefereEscuro(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/** Qual tema de fato aplicar, resolvendo "sistema" para claro ou escuro. */
export function resolverTema(tema: Tema): 'claro' | 'escuro' {
  if (tema === 'sistema') return sistemaPrefereEscuro() ? 'escuro' : 'claro'
  return tema
}

/**
 * Escreve o tema no `<html>`, que é onde o CSS procura. Fica no elemento raiz
 * (e não no body) para o fundo da página valer também na área além do
 * conteúdo — no celular, ao esticar a rolagem além do fim.
 */
export function aplicarTema(tema: Tema): void {
  const efetivo = resolverTema(tema)
  document.documentElement.dataset.theme = efetivo === 'escuro' ? 'dark' : 'light'

  // A barra do navegador no celular acompanha: sem isso ela fica clara com o
  // app escuro, e a emenda aparece no alto da tela.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', efetivo === 'escuro' ? '#191318' : '#fdf8f7')
}

/** Avisa quando o sistema troca de tema, para "sistema" acompanhar na hora. */
export function observarSistema(aoMudar: () => void): () => void {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!media) return () => {}
  media.addEventListener('change', aoMudar)
  return () => media.removeEventListener('change', aoMudar)
}
