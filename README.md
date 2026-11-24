# BeerDex

Aplicación móvil multiplataforma ("Pokédex" de cervezas individuales) construida con **React Native + Expo (SDK 58) + Expo Router** en el frontend, **Express + TypeScript + Drizzle ORM** en el backend y **Neon (PostgreSQL)** como base de datos.

---

## Estructura del Proyecto

- `/backend` — API REST en Express + Drizzle ORM + `@neondatabase/serverless` (con *rate limiting*, transformaciones Cloudinary, sugerencias de catálogo, comparativa y ranking de amigos, fallback local PGlite y código de recuperación en consola cuando no hay credenciales externas configuradas).
- `/app` — Frontend multiplataforma Expo + TypeScript + Expo Router (Android `.apk` vía EAS Build + PWA instalable con soporte offline mediante Service Worker `sw.js` y caché local).
- `/.github/workflows/ci.yml` — Pipeline de CI para validar backend y exportación web PWA.
- `/documento_funcional_beerdex_antigravity_neon.md` — Especificación funcional y técnica original.

---

## 1. Arranque Rápido en Local (Coste 0 €, sin cuentas externas obligatorias)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

* Si `DATABASE_URL` está vacío en `.env`, el servidor arranca automáticamente usando **PGlite** (PostgreSQL embebido en `backend/.pglite`), aplica las migraciones SQL de `backend/drizzle/` y carga la semilla inicial (**15 marcas, 105 cervezas, 30 logros, 10 títulos, 13 iconos**).
* Escucha por defecto en `http://localhost:3001` (`GET /api/health`).

### Frontend (Web / Expo Go / Simulador)

```bash
cd app
cp .env.example .env
npm install
npm run web
```

*(Si pruebas desde un teléfono físico en la misma Wi-Fi, cambia `EXPO_PUBLIC_API_URL` en `app/.env` de `localhost` a la IP local de tu equipo, ej. `http://192.168.1.50:3001/api`.)*

---

## 2. Preparación de Producción (Neon, Cloudinary, Resend y Secretos)

1. **Generar secretos JWT seguros:**
   ```bash
   cd backend
   npm run secrets:generate
   ```
   Copia los valores generados en `JWT_SECRET` y `JWT_REFRESH_SECRET` dentro de `backend/.env` (o en las variables de entorno de Vercel).

2. **Neon (PostgreSQL Serverless):**
   * Crea un proyecto gratuito en Neon y copia tu Connection String en `backend/.env` como `DATABASE_URL`.
   * Ejecuta las migraciones y la semilla inicial (idempotente):
     ```bash
     cd backend
     npm run db:migrate
     npm run seed
     ```

3. **Cloudinary (Almacenamiento de fotos comprimidas):**
   * Añade `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` en `backend/.env` (las subidas aplican además transformación máxima `600px` `quality: auto` en servidor y se eliminan automáticamente si el usuario borra su cuenta).

4. **Resend (Correos de recuperación de usuario/contraseña):**
   * Añade `RESEND_API_KEY` y `EMAIL_FROM` en `backend/.env`.

5. **Comprobar estado de configuración antes de desplegar:**
   ```bash
   cd backend
   npm run env:check
   ```

---

## 3. Importar o Ampliar Catálogo con Códigos EAN Reales (CSV / JSON + Open Food Facts)

El catálogo semilla incluye **15 marcas × 7 cervezas = 105 cervezas individuales** (con los 3 formatos `lata`, `botellin`, `litrona`, versiones `0,0%` y estilos `Negra`, `Tostada`, `IPA`, `Lager`, `Trigo`), permitiendo desbloquear el 100 % de los 30 logros. Además, los usuarios pueden sugerir cervezas no catalogadas directamente desde el escáner (`beer_suggestions`).

Para cargar o actualizar cervezas con códigos de barras reales de supermercado sin editar código:

1. *(Opcional)* Consulta **Open Food Facts** para generar el borrador CSV a partir de un EAN real:
   ```bash
   cd backend
   npm run catalog:lookup -- 8410521001011
   ```
2. Añade las filas a un CSV siguiendo la plantilla [backend/data/catalog_template.csv](file:///home/pauaguilarreig/Proyectos/BeerDex/backend/data/catalog_template.csv) (o un JSON equivalente).
3. Ejecuta el importador (valida dígito de control EAN-13/EAN-8 y longitud de `short_history` entre 120 y 150 caracteres):
   ```bash
   cd backend
   npm run catalog:import -- data/catalog_template.csv
   ```

---

## 4. Despliegue Gratuito (Fase 5)

### Backend en Vercel (Serverless)

El directorio `/backend` incluye `api/index.ts` y `vercel.json`. Despliégalo en Vercel configurando las variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `RESEND_API_KEY`, `FRONTEND_URL`).

### iPhone (iOS) como PWA en Vercel o Netlify (con Service Worker offline)

```bash
cd app
npx expo export --platform web
```

Sube `/app` a **Vercel** (`app/vercel.json` incluido) o **Netlify** (`app/netlify.toml` incluido) con `EXPO_PUBLIC_API_URL` apuntando a tu backend desplegado. El bundle incluye `sw.js` para caché de assets estáticos y copia local de la última BeerDex cargada.
En iPhone, abre la URL HTTPS en **Safari → Compartir → Añadir a pantalla de inicio**.

### Android (`.apk` instalable directo con Expo EAS Build)

El perfil `preview` en `app/eas.json` está configurado con `"buildType": "apk"`:

```bash
cd app
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build -p android --profile preview
```

---

## 5. Códigos EAN-13 de Prueba (Catálogo Semilla)

| Marca | Cerveza | Formato | EAN-13 |
| --- | --- | --- | --- |
| Estrella Galicia | Estrella Galicia Especial Botellín | `botellin` | `8410521001011` |
| Estrella Galicia | Estrella Galicia 0,0 Lata | `lata` | `8410521001035` |
| Estrella Galicia | Estrella Galicia Especial Litrona | `litrona` | `8410521001066` |
| Mahou | Mahou Cinco Estrellas Lata | `lata` | `8410085002028` |
| Mahou | Mahou Clásica Litrona | `litrona` | `8410085002035` |
| Alhambra | Alhambra Reserva 1925 Botellín | `botellin` | `8410793003034` |
| La Virgen | La Virgen 360 IPA Lata | `lata` | `8437012004030` |

---

## 6. Verificación y Tests

```bash
# Backend: typecheck, build, seed idempotente, env check y tests de integración
cd backend
npm run typecheck
npm run build
npm run seed
npm run env:check
npm test

# Frontend: typecheck y exportación web/PWA
cd ../app
npm run typecheck
npx expo export --platform web
```
