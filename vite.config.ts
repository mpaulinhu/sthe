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
  },
})
