# Configurar o Firebase

Passo a passo para ligar a nuvem. Sem isso o app funciona normalmente, só
que guardando tudo apenas no aparelho (localStorage).

## 1. Credenciais

No Console do Firebase: ⚙️ **Configurações do projeto** → **Seus apps** →
ícone `</>` (Web) → registrar.

Copie o bloco `firebaseConfig` para um arquivo `.env` na raiz do projeto,
no formato de `.env.example`:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:abc123
```

Reinicie o `npm run dev` depois de criar o `.env` — o Vite só lê variáveis
de ambiente na inicialização.

## 2. Autorizar quem pode entrar

Estar logado **não basta**: o uid precisa existir na coleção `autorizados`.
Isso é o que impede alguém que consiga criar uma conta de ler a folha de
pagamento (ver `firestore.rules`).

No Console: **Firestore Database** → **Iniciar coleção**

- ID da coleção: `autorizados`
- ID do documento: **o UID da pessoa** (Authentication → Users → coluna
  "ID do usuário")
- Campo: `nome` (tipo `string`) com o nome dela — só para você saber de
  quem é o uid ao olhar depois

Repita o documento para cada pessoa autorizada.

## 3. Publicar as regras de segurança

O arquivo `firestore.rules` deste repositório é a versão correta. Para
aplicar sem instalar nada:

**Firestore Database** → aba **Regras** → apague o conteúdo → cole o de
`firestore.rules` → **Publicar**.

> Confira que a aba Regras **não** está com `allow read, write: if true`.
> Essa é a regra do "modo de teste" e deixa o banco aberto para qualquer
> pessoa da internet.

## 4. Conferir

1. Abra o app: deve aparecer a tela de login.
2. Entre com o e-mail/senha criados em Authentication → Users.
3. Os dados que já existiam no aparelho sobem sozinhos na primeira entrada.
4. Abra em outro aparelho (ou outra aba anônima) e confirme que os mesmos
   dados aparecem.

Se entrar mas não carregar nada, quase sempre é o passo 2: o uid não está
em `autorizados`.
