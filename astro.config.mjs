import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://awethon.com',
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/moe') })],
  redirects: {
    '/moe': { status: 301, destination: 'https://listen.moe' },
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'aurora-x' },
      wrap: false,
    },
  },
})
