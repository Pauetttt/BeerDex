# 🍺 BeerDex

> **La "Pokédex" de la cerveza en la vida real.** Escanea códigos de barras en tiempo real, colecciona cartas 3D estilo códice medieval, únete a **Tabernas** multijugador, desbloquea 110 logros, gana chapas y compite con tus amigos.

🌐 **App en vivo (PWA):** https://beerdex.pauagurei.workers.dev

---

## ✨ Características Principales

- ⚡ **Escáner en tiempo real a 30 FPS + IA Antitrampas:**
  Detección instantánea de códigos EAN-8 / EAN-13 / UPC / GTIN-14 desde la cámara del móvil (`BarcodeDetector` / ZXing) con feedback háptico/sonoro, captura automática del fotograma y validación visual con **Cloudflare Workers AI (`@cf/google/gemma-4-26b-a4b-it`)** (o Gemini Flash si se configura `GEMINI_API_KEY`) para bloquear escaneos de pantallas o folios impresos.
- 🍻 **Tabernas Multijugador y Minijuegos Mensuales:**
  Hermandades de hasta **10 jugadores** (máx. 5 por usuario) con 5 minijuegos mensuales aleatorios (*Bingo 3×3*, *Escalera del Grado*, *Ruta Internacional*, *Tridente de la Peña* y *Cata Temática*), botón directo **«Escanear para la Taberna»** (sin foto ni valoración, independiente de tu BeerDex personal), niveles hasta el 20 y ranking Global/Mensual.
- 🎴 **Cartas 3D estilo Códice Medieval:**
  Fichas coleccionables interactivas con filigrana botánica de lúpulo y cebada, reverso con la *Crónica Cervecera*, estilo, graduación, valoración, zoom en tu foto personal e historia completa deslizable en cada marca.
- 📚 **Catálogo Oficial:**
  **41 marcas** y **473 cervezas** (nacionales, regionales e internacionales) en formatos `botellín`, `lata` y `litrona`, con resolución auxiliar vía Open Food Facts y sugerencias de catálogo desde el escáner.
- 🏆 **110 Logros y Personalización:**
  Desbloquea **39 títulos**, **38 iconos 3D**, **13 marcos**, **50 cosméticos**, estilos de carta y temas de color (incluidos los 10 logros de la categoría *Tabernas y Hermandad*).
- 🪙 **Economía de Chapas, La Bodega y Tesorería:**
  Gana chapas con cada registro, al completar el 100 % de una marca o en misiones de Taberna, compra cosméticos en *La Bodega* y mejora tus reliquias del Nv. 1 al 5 en *Tesorería*.
- 👥 **Sistema Social:**
  Búsqueda de usuarios, solicitudes de amistad, perfiles públicos comparables y ranking entre amigos.

---

## 🛠️ Stack Tecnológico

- **Frontend (PWA):** React Native + Expo (SDK 58) + Expo Router + TypeScript + Service Worker (`sw.js`)
- **Hosting & Edge Runtime:** Cloudflare Workers + Workers Static Assets (`cf` CLI + `@cloudflare/vite-plugin`, `cloudflare:node`)
- **Backend API:** Express + TypeScript + Drizzle ORM + Zod + Web Crypto `PBKDF2-SHA256`
- **Base de Datos:** Neon PostgreSQL (`aws:eu-central-1`, con `pgcrypto` para migración transparente de hashes)
- **Almacenamiento de Fotos:** Vercel Blob (o Cloudflare R2 / Cloudinary)
- **IA Antitrampas:** Cloudflare Workers AI (`@cf/google/gemma-4-26b-a4b-it`, sin API key externa) + soporte opcional de Google AI Studio (`GEMINI_API_KEY`)

---

## 📁 Estructura del Proyecto

- `/app` — Frontend multiplataforma Expo + Expo Router (exportación estática PWA en `app/dist/`).
- `/backend` — API REST en Express + Drizzle ORM + Vitest (27 tests de integración con PGlite).
- `/worker` — Entrypoint de Cloudflare Workers (`worker/index.ts`) que monta Express vía `cloudflare:node`.
- `/docs` — Documentación funcional de módulos (incluyendo `FUNCIONAL_TABERNAS.md`).
- `/cloudflare.config.ts` y `/vite.config.ts` — Configuración unificada de Cloudflare Workers + Static Assets.
- `/.github/workflows/ci.yml` — Pipeline de CI para validar backend y exportación web PWA.

---

## 🚀 Arranque Rápido en Local

### 1. Backend (con PGlite embebido, 0 €)

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

* Si `DATABASE_URL` está vacío, arranca automáticamente con **PGlite** (`backend/.pglite`), aplica las migraciones de `backend/drizzle/` y carga el catálogo semilla (**41 marcas, 473 cervezas, 110 logros**).
* Tests de integración: `npm test` (27/27 en verde).

### 2. Frontend (Web / Expo)

```bash
cd app
cp .env.example .env
npm install
npm run web
```

---

## ☁️ Despliegue en Cloudflare Workers

El proyecto unifica el frontend estático (`app/dist/`) y la API (`/api/*`) en un único Worker de Cloudflare bajo el mismo dominio (sin CORS):

```bash
# Desde la raíz del repositorio
npm install
npx cf auth login
npm run deploy:cf -- --secrets-file .dev.vars
```

Variables/secretos principales (en `.dev.vars` para despliegue):
- `DATABASE_URL` (Neon PostgreSQL)
- `JWT_SECRET` y `JWT_REFRESH_SECRET`
- `BLOB_READ_WRITE_TOKEN` (o binding R2 / Cloudinary)
- `GEMINI_API_KEY` *(opcional, para validación antitrampas en vivo)*
- `RESEND_API_KEY` *(opcional, para correos de recuperación)*
