import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emptyStub = path.resolve(__dirname, 'worker/stubs/empty.ts');
const undiciStub = path.resolve(__dirname, 'worker/stubs/undici.ts');

export default defineConfig({
  publicDir: './app/dist',
  plugins: [cloudflare()],
  resolve: {
    alias: {
      '@electric-sql/pglite': emptyStub,
      pg: emptyStub,
      'pg-native': emptyStub,
      'drizzle-orm/node-postgres': emptyStub,
      'drizzle-orm/pglite': emptyStub,
      cloudinary: emptyStub,
      undici: undiciStub,
      '@vercel/oidc': emptyStub,
    },
  },
});
