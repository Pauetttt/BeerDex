# 🍺 BeerDex

> **La "Pokédex" de la cerveza en la vida real.** Escanea códigos de barras en tiempo real, colecciona cartas 3D estilo códice medieval, desbloquea 100 logros, gana chapas y compite con tus amigos.

🌐 **App en vivo (PWA):** https://beerdex.pauagurei.workers.dev

---

## ✨ Características Principales

- ⚡ **Escáner en tiempo real a 30 FPS + IA Antitrampas:**
  Detección instantánea de códigos EAN-8 / EAN-13 / UPC / GTIN-14 desde la cámara del móvil (`BarcodeDetector` / ZXing) con feedback háptico/sonoro, captura automática del fotograma y validación visual con **Google AI Studio (Gemini Flash)** para bloquear escaneos de pantallas o folios impresos.
- 🎴 **Cartas 3D estilo Códice Medieval:**
  Fichas coleccionables interactivas con filigrana botánica de lúpulo y cebada, reverso con la *Crónica Cervecera*, estilo, graduación, valoración y zoom en tu foto personal.
- 📚 **Catálogo Oficial:**
  **41 marcas** y **557 cervezas** (nacionales, regionales e internacionales) en formatos `botellín`, `lata` y `litrona`, con resolución auxiliar vía Open Food Facts y sugerencias de catálogo desde el escáner.
- 🏆 **100 Logros y Personalización:**
  Desbloquea títulos, **37 iconos 3D**, **12 marcos esculpidos en 3D**, estilos de carta y temas de color.
- 🪙 **Economía de Chapas, La Bodega y Vitrina 3D:**
  Gana chapas con cada registro o al completar el 100 % de una marca, compra cosméticos en *La Bodega* y exhibe hasta 3 reliquias en tu **Vitrina de Museo 3D**.
- 👥 **Sistema Social:**
  Búsqueda de usuarios, solicitudes de amistad, perfiles públicos comparables y ranking entre amigos.

---

## 🛠️ Stack Tecnológico

- **Frontend (PWA):** React Native + Expo (SDK 58) + Expo Router + TypeScript + Service Worker (`sw.js`)
- **Hosting & Edge Runtime:** Cloudflare Workers + Workers Static Assets (`cf` CLI + `@cloudflare/vite-plugin`, `cloudflare:node`)
- **Backend API:** Express + TypeScript + Drizzle ORM + Zod + Web Crypto `PBKDF2-SHA256`
- **Base de Datos:** Neon PostgreSQL (`aws:eu-central-1`, con `pgcrypto` para migración transparente de hashes)
- **Almacenamiento de Fotos:** Vercel Blob (o Cloudflare R2 / Cloudinary)
- **IA Antitrampas:** Google AI Studio (`gemini-2.5-flash`)

---

## 📁 Estructura del Proyecto

- `/app` — Frontend multiplataforma Expo + Expo Router (exportación estática PWA en `app/dist/`).
- `/backend` — API REST en Express + Drizzle ORM + Vitest (16 tests de integración con PGlite).
- `/worker` — Entrypoint de Cloudflare Workers (`worker/index.ts`) que monta Express vía `cloudflare:node`.
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

* Si `DATABASE_URL` está vacío, arranca automáticamente con **PGlite** (`backend/.pglite`), aplica las migraciones de `backend/drizzle/` y carga el catálogo semilla (**41 marcas, 557 cervezas, 100 logros**).
* Tests de integración: `npm test` (16/16 en verde).

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
