import { readFileSync } from 'node:fs'
import { Agent } from 'node:https'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const config = {
    plugins: [react()],
    server: {
      port: 5173,
      host: '127.0.0.1',
    },
  }

  if (command === 'serve') {
    const env = loadEnv(mode, process.cwd(), '')
    const caPath = env.DIONA_CA_CERT_PATH
    const target = env.DIONA_HUB_URL
    if (!caPath || !target) {
      throw new Error('Set DIONA_CA_CERT_PATH and DIONA_HUB_URL in .env.local.')
    }

    config.server.proxy = {
      '/api': {
        target,
        changeOrigin: true,
        secure: true,
        agent: new Agent({ ca: readFileSync(resolve(process.cwd(), caPath)) }),
      },
    }
  }

  return config
})
