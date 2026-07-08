import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const githubPagesBase = '/Room-Management-system/'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? githubPagesBase : '/',
  plugins: [react()],
})
