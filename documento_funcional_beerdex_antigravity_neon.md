# Especificación Funcional y Técnica: BeerDex

Este documento define todos los requisitos funcionales, de diseño, arquitectura de datos y fases de desarrollo para construir **BeerDex** (una "Pokédex" de cervezas) utilizando **Neon** como base de datos PostgreSQL. Está diseñado para servir como guía directa de implementación para **AntiGravity**.

---

## 1. Resumen del Proyecto y Distribución (Coste 0 €)

* **Nombre de la app:** BeerDex.
* **Concepto:** Aplicación móvil multiplataforma para coleccionar cervezas en formato individual escaneando su código de barras, guardando una foto personal, puntuándolas y desbloqueando logros, títulos e iconos mientras se compite con amigos.
* **Estrategia de distribución gratuita:**
  * **Android:** Generación de archivo `.apk` instalable directamente (sin Google Play) mediante **Expo EAS Build**.
  * **iPhone (iOS):** Despliegue como **PWA** (Progressive Web App) gratuita en **Vercel** o **Netlify**, instalable en el escritorio de iOS desde Safari (*Compartir → Añadir a pantalla de inicio*).

---

## 2. Stack Tecnológico Recomendado

Dado que la base de datos será **Neon (PostgreSQL)**, el proyecto se divide en cliente multiplataforma y un backend ligero (nunca conectar la app móvil directamente a PostgreSQL por seguridad):

1. **Frontend (App + PWA):** React Native + **Expo** (TypeScript) con `expo-router`.
   * **Estilos:** Flexbox / NativeWind (Tailwind para React Native).
   * **Animación Flip 3D:** `react-native-reanimated`.
   * **Cámara y Escáner:**
     * En Android nativo (`.apk`): `expo-camera` (soporte `ean13` y `ean8`).
     * En Web/PWA (iPhone Safari): Fallback compatible con navegador (`html5-qrcode` o `@zxing/browser`) para leer el código de barras y capturar la foto sin errores en iOS.
   * **Compresión de imagen local:** `expo-image-manipulator` (en nativo) y `<canvas>` (en web) para reducir la foto antes de subirla.
2. **Backend (API REST):** Node.js (Express o API Routes desplegadas en Vercel) conectado a Neon mediante `@neondatabase/serverless` y ORM **Drizzle** o **Prisma**.
3. **Base de Datos:** **Neon** (PostgreSQL Serverless).
4. **Autenticación:** JWT (Access + Refresh Token) + `bcrypt` gestionado en el Backend + envío de correos de recuperación (Resend o Nodemailer).
5. **Almacenamiento de Imágenes:** **Cloudinary** (plan gratuito) o **Cloudflare R2** para guardar las fotos personales comprimidas de los usuarios, logos de marcas e iconos de perfil.

---

## 3. Esquema de Base de Datos (PostgreSQL en Neon)

AntiGravity debe crear las siguientes tablas relacionales en Neon:

1. **`users`**
   * `id` (UUID, PK)
   * `email` (VARCHAR, UNIQUE, NOT NULL)
   * `username` (VARCHAR, UNIQUE, NOT NULL)
   * `password_hash` (TEXT, NOT NULL)
   * `equipped_icon_id` (INT, FK → `icons.id`, default: icono inicial 1)
   * `equipped_title_id` (INT, FK → `titles.id`, default: "Cervecero Novato")
   * `flips_read_count` (INT, default 0) *(o tabla `user_beer_flips` para contar flips únicos)*
   * `profiles_visited_count` (INT, default 0)
   * `created_at` (TIMESTAMP)

2. **`brands`** *(Equivalente a las "Generaciones Pokémon")*
   * `id` (SERIAL, PK)
   * `name` (VARCHAR, NOT NULL)
   * `logo_url` (TEXT)
   * `history` (TEXT)

3. **`beers`**
   * `id` (SERIAL, PK)
   * `brand_id` (INT, FK → `brands.id`)
   * `name` (VARCHAR, NOT NULL)
   * `format` (ENUM: `'lata'`, `'botellin'`, `'litrona'`) — **Solo formatos individuales**.
   * `barcode` (VARCHAR, UNIQUE, NOT NULL) — Código EAN-13 / EAN-8 real.
   * `short_history` (VARCHAR(150), NOT NULL) — **Máximo estricto de 150 caracteres**.
   * `style` (VARCHAR, NOT NULL) — Ej: Lager, IPA, Tostada, Negra, 0,0%.
   * `abv` (DECIMAL(4,2), NOT NULL) — Graduación alcohólica (%).
   * `country` (VARCHAR, NOT NULL)

4. **`user_beers`** *(Cervezas desbloqueadas por cada usuario)*
   * `id` (UUID, PK)
   * `user_id` (UUID, FK → `users.id`)
   * `beer_id` (INT, FK → `beers.id`)
   * `photo_url` (TEXT, NOT NULL) — Foto personal comprimida del usuario.
   * `rating` (INT, CHECK `rating >= 1 AND rating <= 5`, NOT NULL) — Inmutable desde la carta.
   * `registered_at` (TIMESTAMP, default NOW())
   * *Constraint:* `UNIQUE(user_id, beer_id)` (no se puede duplicar la misma cerveza).

5. **`achievements`**, **`titles`**, **`icons`**
   * `achievements`: `id`, `code`, `name`, `description`, `target_value` (ej: 1, 5, 10, 29), `reward_title_id` (nullable), `reward_icon_id` (nullable).
   * `titles`: `id`, `name`, `is_default` (boolean), `unlock_achievement_id` (FK).
   * `icons`: `id`, `name`, `image_url`, `is_default` (boolean — 5 iniciales), `unlock_achievement_id` (FK).

6. **`user_achievements`**
   * `user_id` (UUID, FK), `achievement_id` (INT, FK), `current_progress` (INT), `unlocked` (BOOLEAN), `unlocked_at` (TIMESTAMP).

7. **`friendships`**
   * `id` (UUID, PK)
   * `requester_id` (UUID, FK → `users.id`)
   * `addressee_id` (UUID, FK → `users.id`)
   * `status` (ENUM: `'pending'`, `'accepted'`, `'rejected'`)
   * `created_at` (TIMESTAMP)

---

## 4. Especificación de Pantallas y Flujos Funcionales

### 4.1. Pantalla de Acceso (Auth) y Verificación +18
* **Primera apertura:** Modal simple de confirmación de mayoría de edad (+18).
* **Registro:** Campos de **Correo electrónico**, **Nombre de usuario** y **Contraseña**.
* **Inicio de sesión ("Ya tengo cuenta"):** Solo pide **Nombre de usuario** y **Contraseña**.
* **Recuperación:** Enlace *"¿Olvidaste tu usuario o contraseña?"* que solicita el correo y envía un email de recuperación/restablecimiento.
* **Redirección:** Al registrarse o iniciar sesión, lleva directamente al **Menú Inicial**.

### 4.2. Header Global y Menú Inicial
* **Header superior (presente en el menú principal):**
  * **Izquierda:** Nombre/Logo de la app (`BeerDex`).
  * **Derecha (pulsable):** Icono equipado del usuario + Nombre de usuario + Título equipado.
* **Cuerpo del Menú Inicial:** 3 botones principales grandes:
  1. **BeerDex** → Navega a la página principal de cervezas.
  2. **Logros** → Navega a la página de logros.
  3. **Amigos** → Navega a la página de amigos.
* **Navegación interna:** Una vez dentro de BeerDex, Logros o Amigos, incluir una barra inferior persistente (Bottom Tab Bar) con esas 3 secciones para moverse sin volver atrás.

### 4.3. Perfil y Personalización (Al pulsar el icono de usuario)
* **Navbar superior clásico (Flex) con 3 pestañas:**
  1. **Perfil:** Muestra datos del usuario (nombre, correo, fecha de registro, resumen de cervezas/logros) y botón de cerrar sesión.
  2. **Títulos:** Grid/lista con todos los títulos existentes.
     * Al empezar, solo está desbloqueado `"Cervecero Novato"`.
     * Los títulos bloqueados muestran fondo grisáceo y un **candado**.
     * Al pulsar un título desbloqueado, se equipa al instante.
     * Al pulsar un título bloqueado, salta una **alerta**: *"Se desbloquea al completar: [Nombre de la misión/logro]"*.
  3. **Iconos:** Grid con todos los iconos existentes.
     * Al empezar, **5 iconos** están disponibles. El resto se desbloquean por logros (incluyendo uno exclusivo al completar los 29 logros restantes).
     * Mismo comportamiento de candado grisáceo y alerta de misión que en los títulos.

### 4.4. Página de la BeerDex
* **Zona superior:**
  * Botón destacado arriba del todo: **Registrar Cerveza** (abre el flujo de cámara/escáner).
  * **Contador Global:** `Registradas / Total global` (ej. `12 / 120`).
  * Filtros rápidos opcionales: `Todas` | `Conseguidas` | `Pendientes`.
* **Listado de Marcas ("Generaciones"):**
  * Cada marca muestra encima/junto a su cabecera su contador propio (`Registradas / Total de la marca`), su **nombre**, **logo** e **historia de la marca**.
  * Al pulsar una marca, se despliegan todas las cervezas de esa marca en un **Grid de 2 columnas (`repeat(2, 1fr)`)**.
* **Diseño de las Cards (Grid de 2 columnas):**
  * **Estado BLOQUEADA (no registrada):**
    * Arriba: Nombre de la cerveza.
    * Centro: Silueta gris genérica según formato (`lata`, `botellín` o `litrona`).
    * **Interacción:** Deshabilitada (NO permite hacer *flip*).
  * **Estado DESBLOQUEADA (registrada):**
    * **Cara delantera:**
      * Arriba: Nombre de la cerveza y fecha de registro (`DD/MM/AAAA`).
      * Centro: **Foto personal subida por el usuario** (proporción fija con `resizeMode="cover"` para que el grid no se descuadre).
      * Abajo: Valoración en **estrellas (1 a 5)** en modo **solo lectura** (no editable desde la card) + etiqueta del formato.
    * **Interacción:** Al pulsar la card, realiza una animación **Flip 3D**.
    * **Cara trasera (al hacer Flip):**
      * Historia corta de la cerveza (**estrictamente entre 120 y 150 caracteres** para garantizar que todo quepa dentro de la card sin desbordar).
      * 3 datos rápidos tipo ficha Pokémon: **Estilo**, **Graduación (ABV %)** y **País**.

### 4.5. Flujo de Registro de Cerveza (Escáner + Foto + Estrellas)
1. El usuario pulsa el botón superior de **Registrar Cerveza** en la BeerDex.
2. **Paso 1 — Escaneo de Código de Barras:** Se abre la cámara en modo escáner (solo códigos EAN-13 / EAN-8).
3. **Paso 2 — Validación JSON con Backend (Neon):**
   * Se envía el código escaneado a `GET /api/beers/barcode/:code`.
   * El servidor devuelve un JSON validando:
     * Que el código existe en el catálogo (solo formatos individuales: lata, botellín, litrona).
     * Que el usuario no ha registrado ya esa cerveza.
   * Si no existe o ya está registrada, muestra un mensaje de error claro y permite volver a escanear.
4. **Paso 3 — Foto Personal (Sin restricciones):**
   * Validado el código, se abre la cámara normal para hacer la foto personal de la cerveza (sin IA ni restricciones de imagen).
5. **Paso 4 — Valoración (1 a 5 estrellas):**
   * En la pantalla de previsualización de la foto, el usuario selecciona obligatoriamente de **1 a 5 estrellas** y pulsa **"Registrar en BeerDex"**.
6. **Paso 5 — Compresión y Subida:**
   * **Obligatorio:** Antes de enviar la imagen al servidor, el cliente comprime la foto (ancho máximo `600px`, formato JPEG, calidad `0.7`, peso objetivo ~80-120 KB) para garantizar rapidez.
   * Se sube la foto al almacenamiento, se crea el registro en `user_beers` en Neon y el backend recalcula automáticamente el progreso de los logros.

### 4.6. Página de Logros (30 Logros)
* Lista de los **30 logros**.
* Arriba de cada logro **sin conseguir**, debe mostrarse su progreso numérico exacto: `0/1` para logros de una sola acción, o `X/Y` (ej. `8/12`) para logros progresivos.
* Los logros conseguidos se muestran destacados como completados.

### 4.7. Página de Amigos
* **Navbar superior clásico con 2 pestañas:**
  1. **Amigos:** Lista de amigos actuales con su icono, nombre y título equipado. Permite **eliminar amigo** y pulsar sobre un amigo para **ver su perfil** (icono, título equipado, progreso BeerDex y sus logros).
  2. **Solicitudes:**
     * Buscador por `username` para enviar nuevas solicitudes de amistad.
     * Listado de solicitudes recibidas (botones **Aceptar** / **Rechazar**) y enviadas (pendientes).

---

## 5. Catálogo de los 30 Logros (Reglas de Negocio)

El backend debe evaluar estos 30 logros tras cada acción relevante (registrar cerveza, leer flip, aceptar amigo, cambiar perfil):

### Colección de Cervezas (6)
1. **Primer Sorbo** (`0/1`): Registra tu primera cerveza. *(Recompensa: Título "Aprendiz de Barra")*
2. **Ronda de Cinco** (`0/5`): Registra 5 cervezas distintas.
3. **Paladar Curioso** (`0/15`): Registra 15 cervezas distintas. *(Recompensa: Icono 6)*
4. **Coleccionista de Vidrio** (`0/30`): Registra 30 cervezas distintas. *(Recompensa: Título "Coleccionista")*
5. **Medio Centenar** (`0/50`): Registra 50 cervezas distintas. *(Recompensa: Título "Maestro Cervecero")*
6. **Leyenda del Lúpulo** (`0/100`): Registra 100 cervezas distintas. *(Recompensa: Icono 7)*

### Marcas / Generaciones (6)
7. **Primera Casa** (`0/1`): Completa el 100 % de 1 marca. *(Recompensa: Icono 8)*
8. **Fiel a las Marcas** (`0/3`): Completa el 100 % de 3 marcas.
9. **Dueño del Grifo** (`0/5`): Completa el 100 % de 5 marcas. *(Recompensa: Título "Dueño del Grifo")*
10. **Emperador de la Malta** (`0/10`): Completa el 100 % de 10 marcas. *(Recompensa: Icono 9)*
11. **Trotamundos** (`0/5`): Registra al menos 1 cerveza de 5 marcas distintas.
12. **Sin Fronteras** (`0/15`): Registra al menos 1 cerveza de 15 marcas distintas. *(Recompensa: Título "Trotamundos")*

### Formatos Individuales y Estilos (6)
13. **Team Lata** (`0/10`): Registra 10 cervezas en formato lata. *(Recompensa: Icono 10)*
14. **Team Botellín** (`0/10`): Registra 10 cervezas en formato botellín. *(Recompensa: Icono 11)*
15. **Peso Pesado** (`0/5`): Registra 5 cervezas en formato litrona. *(Recompensa: Título "Peso Pesado")*
16. **Tridente Cervecero** (`0/3`): Registra al menos 1 lata, 1 botellín y 1 litrona.
17. **Sin Remordimientos** (`0/1`): Registra una cerveza 0,0 % o Sin Alcohol.
18. **Explorador de Estilos** (`0/5`): Registra 5 cervezas de estilo Negra, Tostada o IPA.

### Social / Amigos (5)
19. **¡Salud!** (`0/1`): Consigue tu primer amigo (solicitud aceptada).
20. **Peña Cervecera** (`0/5`): Ten 5 amigos en tu lista. *(Recompensa: Icono 12)*
21. **Alma de la Fiesta** (`0/10`): Ten 10 amigos en tu lista. *(Recompensa: Título "El de las Rondas")*
22. **Cotilla Profesional** (`0/5`): Visita el perfil de 5 amigos distintos.
23. **Rivalidad Sana** (`0/1`): Ten al menos 1 amigo que haya completado el 100 % de una marca.

### Valoraciones, Perfil y Constancia (6)
24. **Obra Maestra** (`0/1`): Valora una cerveza con 5 estrellas al registrarla.
25. **Paladar Exigente** (`0/1`): Valora una cerveza con 1 estrella al registrarla. *(Recompensa: Título "Crítico Exigente")*
26. **Cambio de Look** (`0/1`): Equipa un icono distinto al inicial.
27. **Con Honores** (`0/1`): Equipa un título desbloqueado por primera vez.
28. **Historiador Cervecero** (`0/10`): Haz *flip* para leer la ficha trasera de 10 cervezas distintas.
29. **Racha de Tres** (`0/3`): Registra al menos una cerveza durante 3 días consecutivos.

### Logro Definitivo (1)
30. **Dios de la BeerDex** (`0/29`): Completa los otros 29 logros. *(Recompensa: Icono dorado exclusivo + Título "Leyenda BeerDex")*

---

## 6. Plan de Ejecución Paso a Paso para AntiGravity

AntiGravity debe construir el proyecto siguiendo este orden incremental:

### Fase 1: Infraestructura, Neon y Semilla (Seed)
1. Inicializar monorepo o dos carpetas: `/backend` (Node.js/TypeScript + Drizzle/Prisma conectado a **Neon**) y `/app` (Expo + TypeScript + Expo Router).
2. Crear las migraciones SQL en Neon para todas las tablas de la Sección 3.
3. Crear un script `seed.ts` que inserte:
   * Los **30 logros**, todos los **títulos** (incluyendo `"Cervecero Novato"` como default) y los **iconos** (5 iniciales como default + iconos de recompensa).
   * Al menos 3 marcas de prueba con 4-6 cervezas individuales cada una (con códigos de barras EAN reales de prueba, historias ≤ 150 caracteres, estilo, ABV y país).

### Fase 2: Backend API y Autenticación
1. Implementar endpoints de Auth: `POST /auth/register`, `POST /auth/login` (por `username` + `password`), `POST /auth/forgot-password`, `POST /auth/reset-password`.
2. Implementar middleware JWT para proteger todas las rutas privadas.
3. Implementar endpoints de Perfil (`GET/PATCH /me`, equipar título/icono validando que esté desbloqueado).

### Fase 3: API de BeerDex, Escáner y Motor de Logros
1. Implementar `GET /beerdex` (devuelve contadores globales, marcas con sus contadores y listado de cervezas indicando si están desbloqueadas con foto/fecha/rating o bloqueadas).
2. Implementar `GET /beers/barcode/:code` (valida existencia en Neon y que no esté duplicada).
3. Implementar `POST /beers/register` (recibe `beer_id`, `rating` 1-5 y foto comprimida → sube a Cloudinary/R2 → inserta en `user_beers` → ejecuta el **Motor de Logros**).
4. Implementar `POST /beers/:id/flip` (registra lectura para el logro *Historiador Cervecero*).
5. Implementar endpoints de Amigos (`GET /friends`, `GET /friends/requests`, `POST /friends/request`, `PATCH /friends/request/:id`, `DELETE /friends/:id`, `GET /users/:id/profile`).

### Fase 4: Interfaz Frontend (Expo + PWA)
1. Construir flujo de Verificación +18, Registro, Login y Recuperación.
2. Construir Header Global y Menú Inicial (3 botones grandes) + Bottom Tab Bar interna.
3. Construir pantalla de Perfil con Navbar de 3 pestañas (`Perfil` | `Títulos` | `Iconos`), estado gris con candado y alertas de desbloqueo.
4. Construir pantalla de **BeerDex** con marcas expandibles, grid de 2 columnas, siluetas grises bloqueadas y animación **Flip 3D** con `react-native-reanimated` (solo para desbloqueadas).
5. Construir flujo de **Registro**: Escáner EAN compatible con Android nativo y Safari PWA → Cámara libre → Compresión local (`600px`, JPEG `0.7`) → Selector de estrellas (1-5) → Subida.
6. Construir pantalla de **Logros** (con contadores `X/Y` arriba de cada logro pendiente) y pantalla de **Amigos** (Navbar `Amigos` | `Solicitudes` y visor de perfil ajeno).

### Fase 5: Empaquetado y Despliegue Gratuito
1. Configurar `app.json` y `eas.json` con perfil `preview` (`buildType: "apk"`) para generar el **`.apk` de Android**.
2. Configurar `manifest.json`, iconos PWA y `expo export --platform web` para desplegar el frontend en **Vercel/Netlify** y permitir la instalación en **iPhone desde Safari**.