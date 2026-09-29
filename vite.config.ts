import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { jsonApi } from './server/jsonApi'

export default defineConfig({
  plugins: [react(), tailwindcss(), jsonApi()],
  server: { port: 5190 },
  preview: { port: 5190 },
  build: { chunkSizeWarningLimit: 3000 },
})
