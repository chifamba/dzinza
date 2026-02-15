import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api/auth': {
        target: 'http://auth_service:8003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, ''),
      },
      '/api/genealogy': {
        target: 'http://genealogy_service:8006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/genealogy/, '/api/v1'),
      },
      '/api/media': {
        target: 'http://media_storage_service:8009',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/media/, '/api/v1/media'),
      },
      '/api/notifications': {
        target: 'http://notification_service:8010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/notifications/, '/api/v1/notifications'),
      },
      '/api/moderation': {
        target: 'http://admin_moderation_service:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/moderation/, '/api/v1/moderation'),
      },
      '/api/search': {
        target: 'http://search_discovery_service:8012',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search/, '/api/v1/search'),
      },
      '/api/trust': {
        target: 'http://trust_access_control_service:8013',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trust/, '/api/v1/trust'),
      },
      '/api/analytics': {
        target: 'http://analytics_service:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/analytics/, '/api/v1/analytics'),
      },
      '/api/marketplace': {
        target: 'http://community_marketplace_service:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/marketplace/, '/api/v1/marketplace'),
      },
      '/api/deduplication': {
        target: 'http://deduplication_service:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deduplication/, '/api/v1/deduplication'),
      },
      '/api/query': {
        target: 'http://graph_query_service:8007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/query/, '/api/v1/query'),
      },
      '/api/localization': {
        target: 'http://localization_service:8008',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/localization/, '/api/v1/localization'),
      },
      '/api/verification': {
        target: 'http://relationship_verification_service:8011',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/verification/, '/api/v1/verification'),
      },
      '/api/help': {
        target: 'http://help_support_service:8014',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/help/, '/api/v1/help'),
      },
      '/api/ai': {
        target: 'http://ai_moderation_service:8015',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/api/v1/ai'),
      },
      '/api/backup': {
        target: 'http://backup_recovery_service:8016',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backup/, '/api/v1/backup'),
      },
      '/api/integration': {
        target: 'http://integration_service:8017',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/integration/, '/api/v1/integration'),
      },
    },
  },
})
