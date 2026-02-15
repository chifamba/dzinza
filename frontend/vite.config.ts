import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, ''),
      },
      '/api/genealogy': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/genealogy/, '/api/v1'),
      },
      '/api/media': {
        target: 'http://localhost:8009',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/media/, '/api/v1/media'),
      },
      '/api/notifications': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/notifications/, '/api/v1/notifications'),
      },
      '/api/moderation': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/moderation/, '/api/v1/moderation'),
      },
      '/api/search': {
        target: 'http://localhost:8012',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search/, '/api/v1/search'),
      },
      '/api/trust': {
        target: 'http://localhost:8013',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trust/, '/api/v1/trust'),
      },
      '/api/analytics': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/analytics/, '/api/v1/analytics'),
      },
      '/api/marketplace': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/marketplace/, '/api/v1/marketplace'),
      },
      '/api/deduplication': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deduplication/, '/api/v1/deduplication'),
      },
      '/api/query': {
        target: 'http://localhost:8007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/query/, '/api/v1/query'),
      },
      '/api/localization': {
        target: 'http://localhost:8008',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/localization/, '/api/v1/localization'),
      },
      '/api/verification': {
        target: 'http://localhost:8011',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/verification/, '/api/v1/verification'),
      },
      '/api/help': {
        target: 'http://localhost:8014',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/help/, '/api/v1/help'),
      },
      '/api/ai': {
        target: 'http://localhost:8015',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/api/v1/ai'),
      },
      '/api/backup': {
        target: 'http://localhost:8016',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backup/, '/api/v1/backup'),
      },
      '/api/integration': {
        target: 'http://localhost:8017',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/integration/, '/api/v1/integration'),
      },
    },
  },
})
