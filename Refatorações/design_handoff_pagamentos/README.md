# Handoff: Tela de Pagamentos — STHE

## Visão geral

Tela para a dona do negócio controlar o que ela paga a cada pessoa que trabalha com ela
(salário fixo, diária, freela, hora extra, vale, reembolso, desconto): quanto falta pagar no mês,
quem está em atraso, e o registro de cada pagamento (valor, data, forma, comprovante, observação).

O objetivo de UX é substituir o "controle na cabeça / WhatsApp": ao abrir a tela ela precisa
responder duas perguntas em menos de 2 segundos — **quanto falta pagar** e **quem está em atraso**.

## Sobre os arquivos deste pacote

Os arquivos aqui são **referências de design feitas em HTML** — um protótipo do visual e do
comportamento pretendidos, **não código de produção para copiar**.

A tarefa é **recriar este design dentro do codebase existente** (`STHE`: Vite + React 19 +
TypeScript + Tailwind CSS v4, estado em `localStorage`), reaproveitando os módulos que já existem
(`src/lib/money.ts`, `src/lib/calc.ts`, `src/lib/types.ts`, `src/lib/storage.ts`) e substituindo /
evoluindo os componentes de UI (`src/App.tsx`, `src/components/PersonCard.tsx`, `EntryForm.tsx`,
`PersonForm.tsx`).

Para abrir o protótipo: sirva a pasta (`npx serve .`) e abra `Pagamentos.dc.html` — ele precisa do
`support.js` que está ao lado.

## Fidelidade

**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, hierarquia e microinterações são
finais. Recriar com precisão usando Tailwind; os tokens abaixo já batem com `src/index.css`
(exceto a família de fontes, que muda — ver "Tipografia").

---

## Estrutura da tela

Layout de duas colunas, altura total da viewport:

```
┌────────────┬────────────────────────────────────────────────┐
│  aside     │ header (sticky)                               │
│  236px     ├────────────────────────────────────────────────┤
│  sticky    │ resumo do mês                                  │
│  h-100vh   │ filtros                                        │
│            │ grupos → linhas de pessoa (expansíveis)        │
└────────────┴────────────────────────────────────────────────┘
                                        + painel lateral (sheet) 428px
                                        + toast (bottom center)
```

Container do conteúdo: `max-width: 1040px`, padding `34px 32px 64px`.
Fundo geral `#faf8f4`.

### 1. Sidebar (`aside`)

- `width: 236px; flex-shrink: 0; border-right: 1px solid #f2eee6; padding: 22px 14px 20px;`
  `display:flex; flex-direction:column; gap:26px; position:sticky; top:0; height:100vh`
- **Marca**: borboleta SVG 24×24 (o `ButterflyMark` que já existe em `Primitives.tsx`, fill
  `#2c6fb5`, traços `#133a66`) + "STHE" em Barlow Condensed 20px / 600 / `letter-spacing: .14em`.
- **Nav ativa** — "Pagamentos": `padding 9px 10px; border-radius 10px; background #f2eee6;`
  `color #1a1d21; font-weight 500; font-size 14px`; ícone Lucide `wallet`, stroke 1.5, `#2c6fb5`.
- **Grupo "EM BREVE"**: label 11px, `letter-spacing .1em`, uppercase, `#b3bac2`, padding `16px 10px 6px`.
  Itens desabilitados (Agenda, Estoque, Vendas, Relatórios): mesma métrica da nav, `color #a6aeb6`,
  sem hover, ícones Lucide (`calendar`, `package`, `bar-chart-3`, `file-text`) 16px stroke 1.5.
  **Estas são as próximas janelas do produto — a nav já foi dimensionada para elas.**
- **Rodapé**: "Tudo salvo neste aparelho." 12px `#b3bac2` + link "Baixar backup" 12.5px `#4a5159`
  (liga no `exportDb` que já existe).

### 2. Header (sticky)

- `position: sticky; top: 0; z-index: 20; padding: 14px 32px;`
  `border-bottom: 1px solid #f2eee6; background: rgba(250,248,244,.88); backdrop-filter: blur(10px)`
- Navegação de mês: chevron esquerdo (16px, stroke 1.8, `#8b939c`, hover `background #f2eee6`,
  `color #1a1d21`, `border-radius 9px`, `padding 6px`) + título + chevron direito.
- Título do mês: Barlow Condensed 23px / 600, `min-width: 172px; text-align: center`,
  formato `"Agosto de 2026"`.
- Fora do mês atual aparece o botão-texto "voltar para hoje" — 12.5px / 500, `color #2c6fb5`,
  hover `background #eef5fc`.
- À direita: **Nova pessoa** — `background #1a1d21; color #faf8f4; padding 9px 15px;`
  `border-radius 11px; font-size 14px; font-weight 500`, ícone `+` 14px; hover `background #33383e`.

### 3. Resumo do mês

`display:flex; flex-wrap:wrap; align-items:flex-end; gap:40px; padding-bottom:26px;`
`border-bottom:1px solid #f2eee6`

**Bloco principal** (`min-width: 260px`):
- Kicker "FALTA PAGAR": 12px, `letter-spacing .1em`, uppercase, `#8b939c`.
- Valor: **Barlow 44px / 600**, `line-height 1`, `letter-spacing -.025em`, `tabular-nums`.
- Barra do mês: `width 300px; height 5px; border-radius 99px; background #f2eee6`; preenchimento
  `background: var(--accent)` (`#2c6fb5`), largura = `pago / total`, `transition: width .5s ease`.
- Legenda: "R$ 3.980,00 já pago de R$ 15.640,00" — 13px `#8b939c`.

**Stats de apoio** (`display:flex; gap:34px`):
- "EM ATRASO" — kicker com bolinha 6px `#b3452f`; valor Barlow 21px/600 em `#b3452f`;
  sublinha "5 pessoas" 13px `#8b939c`.
- "PRÓXIMO" — kicker `#8b939c`; valor Barlow 21px/600 `#1a1d21`; sublinha "dia 28 · Marina".

### 4. Filtros

Quatro botões-pílula (`Todos`, `Em atraso`, `A pagar`, `Pagos`), `padding 7px 13px;`
`border-radius 9px; font-size 13.5px; font-weight 500`.
Ativo: `background #1a1d21; color #faf8f4`. Inativo: transparente, `color #8b939c`.
Faixa com `padding: 20px 0 14px`.

### 5. Grupos

Três grupos, sempre nesta ordem, **ocultos quando vazios**: `Em atraso` (`#b3452f`),
`A pagar` (`#b8862a`), `Pagos` (`#2f7d5c`).

Cabeçalho do grupo: bolinha 6px na cor do grupo · título 12px uppercase `letter-spacing .1em`
`#4a5159` · contagem 12px `#b3bac2` · régua `flex:1; height:1px; background:#f2eee6` ·
soma do grupo 13px `#8b939c` tabular (falta a pagar; nos "Pagos", o total pago).
`margin-bottom: 30px` entre grupos; linhas com `gap: 8px`.

### 6. Linha de pessoa (card)

`border: 1px solid #f2eee6; border-radius: 16px; background: #fff;`
`box-shadow: 0 1px 2px rgba(26,29,33,.03)`

Linha principal: `display:flex; align-items:center; gap:14px; padding:15px 18px`
1. **Dia do vencimento** (34px, centralizado): número Barlow 16px/600 tabular —
   `#b3452f` se atrasado, senão `#8b939c`; abaixo "AGO" 10px `#b3bac2` uppercase.
2. **Avatar** 38px circular, iniciais 12.5px/600 — quitado: `bg #e6f3ec / #2f7d5c`;
   senão `bg #f2eee6 / #4a5159`.
3. **Nome** Barlow Condensed 18.5px/600 + meta 13px `#8b939c`
   (`"Atendimento · Salário fixo"`, com ellipsis).
4. **Valor** (`min-width 118px`, alinhado à direita): Barlow 18px/600 tabular
   (`#2f7d5c` se quitado, senão `#1a1d21`) + status 11px uppercase `letter-spacing .07em`
   — `pago` `#2f7d5c` · `em atraso` `#b3452f` · `a pagar` `#8b939c` · `sem lançamento` `#8b939c`.
   Sem lançamento o valor é `—`.
5. **Ações**: botão "Pagar" (só se `falta > 0`) — `padding 8px 14px; border-radius 10px;`
   `border 1px solid #d7e7f7; background #eef5fc; color #2c6fb5; font-size 13.5px; font-weight 500`,
   hover `background #d7e7f7`. Depois o chevron de expandir (15px, `#b3bac2`, hover `#4a5159` +
   `background #f2eee6`), que rotaciona 180° com `transition: transform .2s ease`.

**Barra parcial** (só quando `falta > 0 && pago > 0`): `padding 0 18px 15px`; trilha 4px
`#f2eee6`, preenchimento no accent; legenda "já pago R$ 600,00 de R$ 1.100,00" 12px `#8b939c`.

**Detalhes (expandido)**: `border-top 1px solid #f5f2ec; background #fdfcfa;`
`border-radius 0 0 15px 15px`.
- Cada lançamento: `padding 12px 18px; border-bottom 1px solid #f5f2ec; gap 12px`
  - checkbox 19px `border-radius 6px` — pago: `background/border #2f7d5c` + check branco 10px
    (stroke 2.6); não pago: `background #fff; border 1px solid #ddd8ce`.
  - título 13.5px: `"Diária · 9 diárias × R$ 130,00"`.
  - sublinha 11.5px `#b3bac2`: `"10/08 · pago no pix"` / `"· a pagar"`; vale acrescenta
    `"· abate do total"`.
  - valor 13.5px/500 tabular à direita — desconto: `#b3452f` com `−` na frente;
    pago: `#2f7d5c`; pendente: `#1a1d21`.
- Rodapé de ações: "Lançar valor" (13px/500 `#4a5159`) · "Editar pessoa" (13px `#8b939c`) ·
  nota da pessoa alinhada à direita, 12.5px `#b3bac2`.

### 7. Painel lateral (sheet) — 3 modos

Overlay `rgba(26,29,33,.28)` (`animation: fadeIn .18s ease`), painel à direita
`width 428px; height 100%; background #fff; box-shadow -24px 0 60px -30px rgba(26,29,33,.4)`,
`animation: sheetIn .22s cubic-bezier(.2,.7,.3,1)` (de `translateX(24px)`/opacity .4).
Fecha no clique do overlay e no X.

**Cabeçalho**: título Barlow Condensed 22px/600 + subtítulo 13px `#8b939c`
(`"Ana Paula Ribeiro · falta R$ 1.700,00"`), botão X à direita.
**Rodapé fixo**: `padding 16px 24px; border-top 1px solid #f2eee6; background #fdfcfa` —
"Cancelar" (branco, borda `#f2eee6`) + botão primário preto `flex: 1` com o valor no rótulo
(`"Confirmar R$ 1.700,00"`).

Estilo padrão de campo: `padding 11px 13px; border 1px solid #f2eee6; border-radius 11px;`
`background #faf8f4; font-size 14.5px`; foco: `border-color #aecfef; background #fff`.
Label 13.5px/500; sufixo "· opcional" em `#b3bac2` peso 400.
Segmented: trilho `padding 4px; background #faf8f4; border 1px solid #f2eee6; border-radius 12px`;
opção ativa `background #fff; color #1a1d21`, inativa transparente `#8b939c`, `border-radius 9px`.

**Modo A — Registrar pagamento** (`Pagar`)
1. Campo de valor destacado: `padding 16px 18px; border-radius 14px; background #faf8f4` —
   "R$" Barlow 19px `#8b939c` + input **Barlow 30px/600 tabular** `letter-spacing -.02em`,
   sem borda, `autofocus`. **Pré-preenchido com o que falta.**
2. Atalhos: "Tudo · R$ 1.700,00" e "Metade" — 12.5px, borda `#f2eee6`, `border-radius 9px`.
3. "Como pagou": segmented `Pix | Dinheiro | Transferência | Cartão` (default Pix).
4. "Data": `input[type=date]`, default hoje.
5. "Comprovante · opcional": área tracejada `1px dashed #ddd8ce; border-radius 12px; padding 13px`,
   ícone upload + "Anexar foto ou PDF" (mostra o nome do arquivo quando escolhido);
   hover `border-color #aecfef; background #eef5fc`.
6. "Observação · opcional": textarea 2 linhas, `resize: none`.

**Modo B — Lançar valor** (`Lançar valor`)
Igual ao modo A, sem os atalhos e **com o seletor de tipo no topo**: chips
`border-radius 99px; padding 8px 12px; font-size 13px` — ativo `background #eef5fc;`
`border 1px solid #aecfef; color #1b4f8a`; inativo `background #fff; border 1px solid #f2eee6;`
`color #8b939c`. Abaixo, a explicação do tipo selecionado em 12.5px `#b3bac2`.

**Modo C — Nova pessoa / Editar pessoa**
Nome · Função · segmented "Como ela recebe" (`Fixo | Diária | Freela`) ·
valor base (campo com prefixo "R$", rótulo muda conforme o tipo: "Salário mensal" /
"Valor da diária" / "Valor de referência") · "Dia de pagar" (campo 120px, só dígitos, máx. 2).

### 8. Toast

`position: fixed; left 50%; bottom 28px; transform translateX(-50%);`
`background #1a1d21; color #faf8f4; padding 11px 17px; border-radius 99px; font-size 13.5px;`
`box-shadow 0 12px 30px -12px rgba(26,29,33,.5); animation toastIn .2s ease`, check `#7fd4ab`.
Some sozinho em **2600 ms**. Mensagens usadas:
- `"Ana está quitada — R$ 1.700,00"`
- `"R$ 800,00 registrado · falta R$ 900,00"`
- `"Diária de R$ 130,00 lançado."`
- `"Marina entrou na lista."` / `"Dados atualizados."`
- erros: `"Falta o nome."`, `"Coloque um valor."`

---

## Interações e comportamento

- **Máscara de dinheiro ao vivo** (requisito do cliente): a pessoa digita só dígitos e o valor se
  monta da direita para a esquerda, como maquininha — `1 → 0,01`, `15 → 0,15`, `150 → 1,50`,
  `15000 → 150,00`. Já implementado em `src/lib/money.ts` (`digitsToCents` + `centsToDisplay`);
  **usar esse módulo, não reescrever**. O input mostra o valor sem "R$" (o prefixo é do campo) e
  o estado guarda **centavos inteiros**.
- **Pagar**: valor pré-preenchido com `falta`.
  - `valor >= falta` → marca todos os lançamentos não pagos (efeito ≠ `abate`) como pagos,
    gravando `data` e `forma`; toast de quitação.
  - `valor < falta` → cria um lançamento `vale` **já pago** com valor, data, forma e observação;
    a barra parcial aparece e o toast informa o restante.
- **Checkbox de lançamento**: alterna `pago` na hora, sem confirmação; o grupo da pessoa
  (atraso / a pagar / pagos) é recalculado e ela reordena.
- **Expandir/recolher detalhes**: por pessoa, guardado num mapa `{ [personId]: boolean }`.
- **Navegação de mês**: chevrons mudam o período; fora do mês atual aparece "voltar para hoje".
- **Ordenação** (default *por vencimento*): `dia` crescente, desempate por nome.
  Alternativas: *maior valor* (`falta` desc) e *nome*.
- **Modo discreto**: troca todo valor por `••••` — para abrir a tela na frente dos funcionários.
- **Hover** em tudo que é clicável (ver cores acima); foco de teclado
  `outline: 2px solid #2c6fb5; outline-offset: 2px` — nunca o azul default do browser.
- **Vazio**: borboleta 34px a 25% de opacidade + título Barlow Condensed 19px + texto 13.5px
  `#8b939c` em `max-width 320px`, `padding 70px 20px`.
- **Responsivo**: o protótipo é desktop. No mobile, a intenção é: sidebar → tab bar inferior,
  sheet → bottom sheet full-width, e a linha da pessoa quebra em duas (nome+meta na primeira,
  valor+ações na segunda). Botões com alvo mínimo de 44px.

## Regras de cálculo (já existem em `src/lib/calc.ts` / `types.ts`)

Efeito de cada tipo de lançamento:

| tipo | rótulo | efeito |
| --- | --- | --- |
| `salario` | Salário | soma |
| `diaria` | Diária | soma |
| `servico` | Serviço | soma |
| `extra` | Hora extra | soma |
| `reembolso` | Reembolso | soma |
| `vale` | Vale | antecipa (não muda o total; conta como pago) |
| `desconto` | Desconto | abate (reduz o total) |

```
total = Σ(soma) − Σ(abate)
pago  = Σ(lançamentos pagos cujo efeito ≠ abate)
falta = max(0, total − pago)
quitado  = total > 0 && falta === 0
atrasado = falta > 0 && dia_de_pagar < dia_de_hoje
```

> `diaria`, `extra` e `reembolso` **não existem** no `EntryKind` atual
> (`salario | servico | extra | adiantamento | desconto`). Renomear `adiantamento → vale` e
> acrescentar `diaria` e `reembolso`, com migração do banco em `storage.ts` (bump de `version`).

## Estado necessário

```ts
pessoas: Person[]            // com lanc: Entry[]  (já em localStorage)
periodo: string              // 'YYYY-MM'
filtro: 'todos' | 'atraso' | 'apagar' | 'pagos'
abertos: Record<string, boolean>
sheet: null | 'pagar' | 'lancar' | 'pessoa'
alvo: Person | null
// campos do sheet
cents: number                // centavos inteiros
kind: EntryKind
forma: 'Pix' | 'Dinheiro' | 'Transferência' | 'Cartão'
data: string                 // 'YYYY-MM-DD'
obs: string
comprovante: string          // nome do arquivo
nome, funcao, contrato, valorBase, diaPag   // modo pessoa
toast: string                // limpa em 2600ms
```

Persistência: `localStorage` via `src/lib/storage.ts` (sem backend nesta fase).
`forma`, `comprovante` e `obs` **precisam ser adicionados** ao tipo `Entry`.

## Tokens de design

**Cores** — iguais às de `src/index.css` (mantidas):

| token | hex | uso |
| --- | --- | --- |
| `ink` | `#1a1d21` | texto, botão primário |
| `ink-soft` | `#4a5159` | texto secundário, hover do primário (`#33383e`) |
| `ink-faint` | `#8b939c` | labels, meta |
| — | `#b3bac2` | texto terciário / placeholder |
| `cream` | `#faf8f4` | fundo da página e dos campos |
| `cream-deep` | `#f2eee6` | bordas, trilhas, chip ativo claro |
| — | `#fdfcfa` / `#f5f2ec` | fundo e divisor da área expandida |
| `butterfly-500` | `#2c6fb5` | accent (barras, links, "Pagar") |
| `butterfly-600/700` | `#1b4f8a` / `#133a66` | texto sobre tinta clara, traço da logo |
| `butterfly-50/100/200` | `#eef5fc` / `#d7e7f7` / `#aecfef` | fills, bordas e foco |
| `paid` | `#2f7d5c` (+ soft `#e6f3ec`) | pago |
| `due` | `#b8862a` | grupo "a pagar" |
| `late` | `#b3452f` (+ soft `#fbeae6`) | atraso |
| — | `#ddd8ce` | borda de checkbox / tracejado |
| — | `#7fd4ab` | check do toast (sobre escuro) |

**Tipografia** — mudou em relação ao código atual:
`--font-heading: 'Barlow Condensed'` (500/600) e `--font-body: 'Barlow'` (400/500/600/700),
substituindo Fraunces + Outfit em `src/index.css`.
Barlow Condensed: títulos, nome das pessoas, marca. Barlow: corpo **e todos os valores**
(600 + `font-variant-numeric: tabular-nums`).

Escala usada: 46/44 · 23 · 22 · 21 · 19 · 18.5 · 18 · 16 · 14.5 · 14 · 13.5 · 13 · 12.5 · 12 · 11.5 · 11 · 10.

**Raios**: 6 (checkbox) · 9 (botão pequeno) · 10 · 11 (campo/botão) · 12 · 14 (campo de valor) ·
16 (card) · 99 (pílula/avatar).

**Sombras**: card `0 1px 2px rgba(26,29,33,.03)` · sheet `-24px 0 60px -30px rgba(26,29,33,.4)` ·
toast `0 12px 30px -12px rgba(26,29,33,.5)`.

**Espaçamento** (px, múltiplos de 2): 2 · 4 · 6 · 8 · 10 · 12 · 14 · 18 · 20 · 22 · 24 · 26 · 30 · 32 · 34 · 40 · 64.

## Assets

- **Marca borboleta**: SVG inline, já existe como `ButterflyMark` em
  `src/components/Primitives.tsx` — reaproveitar.
- **Ícones**: Lucide, stroke-width 1.5 (no protótipo estão desenhados inline com a mesma métrica).
- **Logo original** da cliente: `logo-sthe.png` (referência de paleta; não é usada na tela).
- Sem fotografias.

## Dados de exemplo do protótipo

9 pessoas, competência agosto/2026, hoje = 27/08/2026 —
falta R$ 11.660,00 · pago R$ 3.980,00 · total R$ 15.640,00 · 5 em atraso (R$ 7.320,00) ·
próximo: dia 28, Marina. Cobrem todos os casos: parcial com vale, diária em lote,
freela, hora extra somando ao salário, quitado e a vencer.

## Arquivos deste pacote

- `Pagamentos.dc.html` — o design (markup + lógica; abre no browser junto do `support.js`).
- `support.js` — runtime necessário para abrir o HTML acima.
- `logo-sthe.png` — logo da cliente.
- `README.md` — este documento.

### Onde mexer no codebase `STHE`

| Arquivo | O que fazer |
| --- | --- |
| `src/index.css` | trocar as fontes para Barlow / Barlow Condensed; resto dos tokens permanece |
| `src/App.tsx` | novo layout: sidebar + header sticky + resumo + filtros de 4 estados + grupos |
| `src/components/PersonCard.tsx` | virar a linha nova (dia, avatar, valor, "Pagar", expandir) |
| `src/components/EntryForm.tsx` | virar o sheet lateral, modos "pagar" e "lancar" |
| `src/components/PersonForm.tsx` | virar o sheet lateral, modo "pessoa" |
| `src/components/MoneyInput.tsx` | reaproveitar; adicionar a variante grande do campo de valor |
| `src/lib/types.ts` | `EntryKind`: renomear `adiantamento → vale`, add `diaria` e `reembolso`; `Entry`: add `forma`, `comprovante`, `obs` |
| `src/lib/storage.ts` | migração de versão do banco |
| novo `src/components/Sidebar.tsx` | nav com as janelas futuras (Agenda, Estoque, Vendas, Relatórios) |
| novo `src/components/Toast.tsx` | toast de confirmação (2600 ms) |
