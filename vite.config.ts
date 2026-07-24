import { defineConfig } from 'vite'

// GitHub Pages project site: https://kingsleykwan.github.io/War-of-the-Three-Kingdoms/
export default defineConfig({
  base: '/War-of-the-Three-Kingdoms/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
