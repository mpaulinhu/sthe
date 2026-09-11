import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5200 },
  // No GitHub Pages o site fica em /sthe/, não na raiz do domínio. Sem isso os
  // caminhos de CSS/JS apontariam para a raiz e a página subiria em branco.
  base: process.env.GITHUB_PAGES ? '/sthe/' : '/',
  define: {
    // Liga o aviso de demonstração só na versão publicada — rodando local,
    // durante o desenvolvimento, ele só atrapalharia.
    __DEMO__: JSON.stringify(Boolean(process.env.GITHUB_PAGES)),
    // Data e hora do build, no rodapé. Serve para responder à pergunta que
    // mais atrasa a correção de um bug no celular: "já estou na versão nova
    // ou o navegador me serviu a antiga do cache?".
    __BUILD__: JSON.stringify(
      new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }),
    ),
  },
  build: {
    rollupOptions: {
      output: {
        // O SDK do Firebase sozinho é maior que o app inteiro. Num arquivo
        // próprio, o navegador baixa os dois em paralelo e guarda o do
        // Firebase em cache entre deploys (ele muda muito menos que o app).
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
})
