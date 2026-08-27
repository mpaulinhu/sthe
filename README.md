# STHE — Organização

Site de organização interna da STHE. A primeira tela entregue é o **controle de
pagamentos de funcionários**: quem recebe o quê, o que já foi pago e o que falta.

## Como rodar

```bash
npm install
npm run dev      # abre em http://localhost:5200
```

Outros comandos:

```bash
npm run build       # gera a versão de produção em dist/
npm run test        # roda os testes da lógica de cálculo
npm run type-check  # confere os tipos
```

## Como funciona a tela de pagamentos

Cada pessoa é cadastrada **uma vez** (nome, função, como recebe, valor de
referência e o dia em que costuma ser paga). Depois, mês a mês, você adiciona
**lançamentos** para ela.

### Formas de pagamento suportadas

- **Salário fixo** — valor mensal combinado.
- **Freelancer** — trabalho avulso, valor varia a cada serviço.
- **Diária** — pagamento por dia trabalhado.

### Tipos de lançamento

| Tipo | O que faz na conta do mês |
|---|---|
| **Salário** | Soma. É o pagamento principal. |
| **Serviço avulso** | Soma. Usado para freelancer e diária. |
| **Extra / Bônus** | Soma **por fora** do salário (gorjeta, ajuda de custo). |
| **Adiantamento** | **Não muda o total.** É parte do salário paga antes da data — abate do que ainda falta pagar. |
| **Desconto** | Abate do total (falta, material quebrado, etc.). |

A diferença entre **Adiantamento** e **Extra** é importante:

- Salário R$ 2.000 + adiantamento de R$ 500 → total continua **R$ 2.000**, e
  falta pagar **R$ 1.500**.
- Salário R$ 2.000 + extra de R$ 500 → total vira **R$ 2.500**.

### Status de cada pessoa

- **Pago** — não falta mais nada no mês.
- **A pagar** — ainda tem valor em aberto.
- **Atrasado** — tem lançamento pendente com data já vencida.

O botão **Quitar** marca de uma vez tudo que está pendente daquela pessoa no mês.

## Onde os dados ficam

Tudo é salvo **no navegador do próprio computador** (localStorage) — não vai para
nenhum servidor e não precisa de internet nem de login.

Isso significa que **limpar os dados do navegador apaga tudo**. Por isso existem
os botões:

- **Backup** — baixa um arquivo `.json` com todos os dados.
- **Importar** — restaura um backup desses (substitui o que estiver lá).

Vale baixar um backup de vez em quando e guardar em algum lugar seguro.

## Estrutura

```
src/
  lib/
    types.ts       # modelo de dados (pessoas, lançamentos)
    calc.ts        # regras de cálculo do mês
    calc.test.ts   # testes das regras
    storage.ts     # salvar/carregar/exportar
  components/      # cards, formulários, primitivos de UI
  App.tsx          # a tela
```

A lógica de dinheiro fica isolada em `calc.ts` e é coberta por testes — mexer ali
sem rodar `npm run test` é pedir para quebrar a conta.

## Paleta

Tirada do logo (borboleta azul sobre off-white), definida em `src/index.css`:

- Azul principal `#2c6fb5`, escuro `#1b4f8a`
- Grafite do texto `#1a1d21`
- Fundo creme `#faf8f4`
- Estados: pago `#2f7d5c`, a pagar `#b8862a`, atrasado `#b3452f`
