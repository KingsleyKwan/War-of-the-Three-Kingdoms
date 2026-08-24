import { defineConfig } from 'vite'

// GitHub Pages project site: https://kingsleykwan.github.io/War-of-the-Three-Kingdoms/
// Keep every emitted JS chunk under ~180KB so GitHub Contents / MCP push tools can handle them.
export default defineConfig({
  base: '/War-of-the-Three-Kingdoms/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    chunkSizeWarningLimit: 200,
    rollupOptions: {
      output: {
        // Force more granular chunks so no single file exceeds the practical ~200KB tool limit
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
          if (id.includes('/src/engine/')) return 'engine'
          if (id.includes('/src/ai/')) return 'ai'
          if (id.includes('/src/data/')) return 'data'
          if (id.includes('/src/ui/')) return 'ui'
          if (id.includes('/src/multiplayer/')) return 'ui'
          if (id.includes('/src/persist/')) return 'persist'
        },
      },
    },
  },
})
