import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Skytree/',
  plugins: [react()],
  server: {
    proxy: {
      // Dev proxy for Umang gateway
      '/umang': {
        target: 'https://apigw.umangapp.in',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/umang/, ''),
      },
      // Dev proxy for API Setu CRSTN (Birth/Death certificates)
      '/apisetu-crstn': {
        target: 'https://apisetu.gov.in/certificate/v3/crstn',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/apisetu-crstn/, ''),
      },
      // Dev proxy for API Setu TN eDistrict
      '/apisetu-edistricttn': {
        target: 'https://apisetu.gov.in/certificate/v3/edistricttn',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/apisetu-edistricttn/, ''),
      },
    },
  },
})
