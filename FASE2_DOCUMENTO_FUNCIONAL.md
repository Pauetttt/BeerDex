# BeerDex — Documento Funcional Fase 2: Chapas, 100 Logros, Cosméticos y "La Bodega"

> **Propósito de este documento:** Servir como especificación funcional y técnica completa para implementar la **Fase 2** de BeerDex en una nueva conversación, asegurando continuidad total con lo ya construido en la Fase 1 y precisión en base de datos, backend, assets visuales, lógica de logros, tienda y CSS/maquetación.

---

## 1. Resumen de lo ya implementado (Fase 1 — En Producción)

La aplicación ya cuenta con arquitectura completa, catálogo ampliado y despliegue activo:

- **Producción:**
  - Backend API: `https://beerdex-api.vercel.app` (`backend/`, Express + Drizzle ORM + PostgreSQL en Neon).
  - Frontend Web/PWA: `https://beerdex-app-sigma.vercel.app` (`app/`, Expo + Expo Router + React Native Web, Service Worker `app/public/sw.js` en versión `beerdex-pwa-v6`).
- **Catálogo actual en Neon Postgres:**
  - **41 marcas** oficiales (15 iniciales con `1906` y `Voll-Damm` separadas como marcas independientes + 26 marcas nuevas españolas e internacionales), cada una con su logo PNG en `app/assets/brands/<slug>.png` y mapeado en `app/src/components/BrandLogo.tsx`.
  - **557 cervezas** comerciales (`lata`, `botellin`, `litrona`) con `shortHistory` (120–150 caracteres), `style` (`Lager`, `Tostada`, `IPA`, `Negra`, `0,0%`, `Trigo`), `abv` y `country`.
  - **1.301 códigos de barras únicos** (envases individuales + cajas/packs multipack) soportando `EAN-13`, `EAN-8`, `UPC-A` (12 dígitos), `UPC-E` (8 dígitos) y `GTIN-14`.
- **Sistema base existente (listo para ampliar en Fase 2):**
  - `30` logros en `backend/src/db/seedData.ts` y evaluados en `backend/src/services/achievementEngine.ts`.
  - `10` títulos (`titles`) y `13` iconos de perfil (`icons` con PNGs en `app/assets/icons-profile/`).
  - Navegación actual: menú inicial (`app/src/app/menu.tsx`), cabecera global (`app/src/components/GlobalHeader.tsx`), perfil (`app/src/app/profile.tsx`), escáner (`app/src/app/scan.tsx`), perfil de amigo (`app/src/app/friend/[id].tsx`) y 3 pestañas en `app/src/app/(tabs)/_layout.tsx` (`beerdex`, `achievements`, `friends`).

---

## 2. Alcance de la Fase 2

1. **Nueva moneda del juego: `Chapas`** (con icono de chapa dorada detallada).
2. **Sistema de 100 logros** con recompensas de **Chapas**, **Títulos**, **Iconos**, **Marcos de Avatar**, **Diseños de Carta 3D**, **Reliquias de Vitrina** y **Temas de Color de la App**.
3. **Nueva tienda: `La Bodega`**, accesible desde el menú inicial y desde una 4.ª pestaña en el navbar inferior (**sin carrito**, compra directa con pantalla/modal de confirmación `Sí / No`).
4. **Nuevos cosméticos y coleccionables** (excluyendo expresamente banners de perfil).
5. **Creación de todos los assets visuales necesarios** (chapa dorada, nuevos iconos de perfil, diseño visual de marcos, reliquias de vitrina, estilos de cartas 3D y paletas de color) y **maquetación CSS/layout perfectamente cuadrada**.

---

## 3. Sistema de Monedas: "Chapas"

### 3.1. Identidad y Ubicación Visual
- **Nombre oficial:** `Chapas`
- **Icono:** Chapa de botella **dorada**, con relieve metálico y detalle cervecero bien trabajado (`app/assets/chapas-coin.png` o componente SVG/PNG nítido reutilizable `<ChapaCoinIcon size={...} />`).
- **Dónde se muestra el saldo:**
  - En `app/src/components/GlobalHeader.tsx`: a la izquierda del bloque de nombre de usuario y arriba del título (integrado limpiamente en la cápsula de usuario sin romper el alineamiento en pantallas estrechas).
  - En `app/src/app/profile.tsx`: visible en la cabecera del perfil junto al usuario/título.
  - En la cabecera de **La Bodega** (`shop.tsx`), para ver siempre el saldo disponible antes de comprar.

### 3.2. Reglas de Obtención de Chapas
1. **Registro de cerveza (`POST /api/beers/register`):** **`+10 Chapas`** por cada cerveza registrada.
   - *557 cervezas × 10 = 5.570 Chapas.*
2. **Completar una marca al 100 %:** **`+50 Chapas` extra** al registrar la última cerveza que faltaba de una marca.
   - *41 marcas × 50 = 2.050 Chapas.*
   - *(Importante: garantizar idempotencia para que no se pueda farmear ni otorgar dos veces si la marca ya estaba al 100 %).*
3. **Logros desbloqueados:** según la dificultad de cada uno de los 100 logros (entre `15` y `1.500 Chapas`, sumando `~10.900 Chapas` en total).
4. **Migración / Retrocompatibilidad con usuarios existentes:**
   - Al ejecutar la migración o recálculo inicial para cuentas que ya tenían cervezas/marcas/logros en Neon Postgres, evaluar retroactivamente sus logros y acreditarles las Chapas correspondientes por sus registros, marcas completadas y logros ya conseguidos (sin duplicar si ya fueron acreditadas).
5. **Feedback al usuario:** Al registrar una cerveza, el toast o resumen de respuesta debe mostrar claramente cuántas Chapas se han ganado (`+10` por registro, `+50` si completó marca, y las de logros desbloqueados en ese momento).

---

## 4. La Bodega (Tienda Cervecera)

### 4.1. Navegación y Flujo UX
- **Nombre en el navbar inferior y menú:**
  - En `app/src/app/menu.tsx`: nueva tarjeta en el grid con título **`La Bodega`** y subtítulo descriptivo (ej. *"Canjea tus Chapas por cosméticos, marcos y reliquias"*).
  - En `app/src/app/(tabs)/_layout.tsx`: añadir 4.ª pestaña **`Tienda`** (`app/src/app/(tabs)/shop.tsx`) con icono `storefront` / `storefront-outline`. En la vista superior de esa pantalla, mostrar el título **`La Bodega`** y el saldo actual de Chapas.
- **Flujo de compra (SIN CARRITO):**
  1. El usuario navega por las categorías de **La Bodega** (Iconos, Títulos, Marcos, Cartas 3D, Vitrina, Colores).
  2. Cada artículo muestra su vista previa real, nombre, descripción breve y estado:
     - **Bloqueado por precio / Comprable:** botón **`Comprar · X Chapas`**.
     - **Ya en propiedad:** badge **`En propiedad`** y botón rápido **`Equipar`** (o **`Equipado`** si ya está activo; en Vitrina permite asignar al hueco 1, 2 o 3).
     - *(Opcional: los artículos exclusivos de logros no se venden en tienda o se muestran solo en Perfil indicando qué logro los desbloquea; La Bodega vende los artículos exclusivos de tienda).*
  3. Al pulsar **`Comprar`**, se abre una pantalla/modal de confirmación limpia:
     > **¿Seguro que quieres comprar "[Nombre del artículo]"?**  
     > Coste: **[X] Chapas** · Saldo tras la compra: **[Y] Chapas**  
     > Botones: **`Sí, comprar`** / **`No, cancelar`**
  4. Al confirmar **`Sí`**, el backend realiza una **transacción atómica** (`balance >= price`, descuenta `chapas`, inserta propiedad en BD) y la UI actualiza el saldo al instante permitiendo equipar el artículo.

---

## 5. Catálogo Completo de Cosméticos y Coleccionables

> **Restricción confirmada:** **NO** se incluyen banners de perfil.

### 5.1. Categorías y Personalización en la App

| Categoría | Dónde se ve en la App | Cómo se equipa |
|---|---|---|
| **Iconos de Perfil** | `GlobalHeader`, `profile.tsx`, `friends.tsx`, `friend/[id].tsx` | `equippedIconId` (1 activo) |
| **Títulos** | Debajo del username en `GlobalHeader`, `profile.tsx`, `friends.tsx`, `friend/[id].tsx` | `equippedTitleId` (1 activo) |
| **Marcos de Avatar** | Borde/aura decorativa rodeando `ProfileIcon` en cabecera, perfil y lista de amigos | `equippedFrameId` (1 activo) |
| **Diseños de Carta 3D** | Estilo visual del marco/reverso de `BeerCard.tsx` en `beerdex.tsx` y `friend/[id].tsx` | `equippedCardStyleId` (1 activo) |
| **Reliquias de Vitrina** | Coleccionables expuestos en una **Vitrina de 3 huecos** en `profile.tsx` y visible en `friend/[id].tsx` | Hasta **3 huecos** (`showcaseSlot1..3`) |
| **Temas de Color de la App** | Cambia la paleta de acento de la interfaz (botones activos, brillos, bordes destacados, tabs activos) | `equippedColorThemeId` (1 activo) |

### 5.2. Inventario de Iconos de Perfil (`app/assets/icons-profile/*.png`)

**Existentes (13):**
- Por defecto (5): `Jarra Clásica` (`mug-classic`), `Lúpulo Dorado` (`hop-gold`), `Botellín Retro` (`bottle-retro`), `Lata Craft` (`can-craft`), `Chapa Vintage` (`cap-vintage`).
- De logros Fase 1 (8): `Sommelier del Lúpulo` (`sommelier`), `Corona del Lúpulo` (`crown-hop`), `Escudo Cervecero` (`shield-house`), `Cetro de Malta` (`scepter-malt`), `Lata de Oro` (`can-gold`), `Botellín Maestro` (`bottle-master`), `Brindis Épico` (`cheers-squad`), `Cáliz Dorado BeerDex` (`beerdex-gold`).

**Nuevos iconos por Logros (8 a crear en PNG 256×256 estilo BeerDex):**
1. `Barril Imperial` (`barrel-imperial`) — Logro #9
2. `Cáliz de Platino` (`chalice-platinum`) — Logro #12
3. `Emblema Supremo` (`emblem-supreme`) — Logro #16
4. `Trono Cervecero` (`beer-throne`) — Logro #25
5. `Brújula del Lúpulo` (`hop-compass`) — Logro #31
6. `Lata Legendaria` (`can-legendary`) — Logro #37
7. `Jarra Gigante` (`giant-mug`) — Logro #45
8. `Espiga Tostada` (`toasted-barley`) — Logro #55
9. `Sol Cervecero` (`beer-sun`) — Logro #72
10. `Llama Eterna` (`eternal-flame`) — Logro #96

**Iconos Exclusivos de La Bodega (14 a crear en PNG 256×256):**
1. `Barril de Roble` (`shop-oak-barrel`) — `150 Chapas`
2. `Grifo Dorado` (`shop-gold-tap`) — `200 Chapas`
3. `Posavasos Vintage` (`shop-coaster-retro`) — `180 Chapas`
4. `Bota Bávara` (`shop-bavarian-boot`) — `250 Chapas`
5. `Tanque de Cobre` (`shop-copper-kettle`) — `300 Chapas`
6. `Lúpulo Neón` (`shop-neon-hop`) — `350 Chapas`
7. `Calavera Lupulada` (`shop-hop-skull`) — `450 Chapas`
8. `Alambique Artesanal` (`shop-craft-still`) — `400 Chapas`
9. `Oso Cervecero` (`shop-brew-bear`) — `500 Chapas`
10. `Gato de Taberna` (`shop-tavern-cat`) — `500 Chapas`
11. `Búho Nocturno` (`shop-night-owl`) — `550 Chapas`
12. `Monje Maestro` (`shop-brew-monk`) — `650 Chapas`
13. `Jarra Vikinga` (`shop-viking-horn`) — `700 Chapas`
14. `Capitán de la Espuma` (`shop-foam-captain`) — `800 Chapas`

### 5.3. Inventario de Títulos

**Existentes (10):**
`Cervecero Novato` (default), `Aprendiz de Barra`, `Coleccionista`, `Maestro Cervecero`, `Dueño del Grifo`, `Trotamundos`, `Peso Pesado`, `El de las Rondas`, `Crítico Exigente`, `Leyenda BeerDex`.

**Nuevos títulos por Logros (14):**
1. `Veterano de Barra` (Logro #8)
2. `Cazador de Maltas` (Logro #11)
3. `Archiduque Cervecero` (Logro #14)
4. `Enciclopedia Viva` (Logro #16)
5. `Conquistador de Barriles` (Logro #23)
6. `Soberano de las 41 Casas` (Logro #26)
7. `Embajador Cervecero` (Logro #32)
8. `Señor del Aluminio` (Logro #35)
9. `Guardián del Vidrio` (Logro #40)
10. `Puro Equilibrio` (Logro #50)
11. `Maestro del Trigo` (Logro #61)
12. `Maestro Ibérico` (Logro #66)
13. `Erudito Cervecero` (Logro #93)
14. `Incombustible` (Logro #97)

**Títulos Exclusivos de La Bodega (12):**
1. `Parroquiano Fiel` — `150 Chapas`
2. `Catador Nocturno` — `220 Chapas`
3. `Barón de la Cebada` — `280 Chapas`
4. `Señor de la Taberna` — `350 Chapas`
5. `Maestro del Grifo` — `400 Chapas`
6. `Rey de la Litrona` — `450 Chapas`
7. `Alquimista del Lúpulo` — `550 Chapas`
8. `Cazador de Ediciones` — `600 Chapas`
9. `Alma del Biergarten` — `700 Chapas`
10. `Leyenda de Barra` — `800 Chapas`
11. `Soberano del Barril` — `900 Chapas`
12. `Inmortal de la Espuma` — `1.000 Chapas`

### 5.4. Inventario de Marcos de Avatar (12 en total)

**Por Logros (5):**
1. `Marco Bronce Clásico` (Logro #7) — Anillo bronce cálido con brillo suave.
2. `Marco Platino Imperial` (Logro #15) — Doble aro plateado metálico.
3. `Marco Laurel Dorado` (Logro #26) — Corona de laurel dorado alrededor del avatar.
4. `Marco Espuma Desbordante` (Logro #47) — Borde crema espumoso con reflejos dorados.
5. `Marco Brújula Dorada` (Logro #74) — Anillo dorado con marcas cardinales.
6. `Marco Rubí` (Logro #88) — Aro carmesí intenso con destello rubí.

**Exclusivos de La Bodega (6):**
1. `Marco Madera de Barril` — `250 Chapas` (textura roble y remaches metálicos)
2. `Marco Cobre Tostado` — `350 Chapas` (tono cobre bruñido)
3. `Marco Pizarra Nocturna` — `450 Chapas` (borde pizarra con filete dorado)
4. `Marco Hielo y Escarcha` — `600 Chapas` (azul glacial brillante, efecto recién tirada)
5. `Marco Neón Ámbar` — `850 Chapas` (resplandor ámbar vibrante estilo letrero de bar)
6. `Marco Diamante Cervecero` — `1.200 Chapas` (halo prismático premium)

*(Además, incluir un estado base gratuito: `Marco Estándar` por defecto).*

### 5.5. Inventario de Diseños de Carta 3D (9 en total)

**Por Logros (4):**
1. `Madera Envejecida` (Logro #10)
2. `Pizarra de Taberna` (Logro #24)
3. `Cristal Tallado` (Logro #42)
4. `Obsidiana Nocturna` (Logro #57)
5. `Pergamino Clásico` (Logro #92)
6. `Oro Imperial` (Logro #100)

**Exclusivos de La Bodega (3 + 3 extra = 6):**
1. `Carta Clásica Ámbar` (Default gratuito)
2. `Cobre Industrial` — `450 Chapas`
3. `Estilo Oktoberfest` — `600 Chapas`
4. `Mármol Blanco` — `750 Chapas`
5. `Neón Nocturno` — `950 Chapas`
6. `Edición Reserva Dorada` — `1.300 Chapas`

### 5.6. Inventario de Reliquias de Vitrina (Coleccionables para 3 huecos en Perfil)

**Por Logros (5):**
1. `Chapa Reliquia 1900` (Logro #13)
2. `Posavasos Fundacional` (Logro #19)
3. `Mini Barril Roble` (Logro #44)
4. `Medalla del Lúpulo` (Logro #62)
5. `Cáliz de Abadía` (Logro #68)
6. `Trofeo de Espuma` (Logro #82)

**Exclusivos de La Bodega (10):**
1. `Posavasos de Múnich` — `120 Chapas`
2. `Abrebotellas Antiguo` — `180 Chapas`
3. `Lúpulo de Cristal` — `260 Chapas`
4. `Jarra de Porcelana` — `350 Chapas`
5. `Chapa de Platino` — `500 Chapas`
6. `Grifo de Bronce` — `650 Chapas`
7. `Llave de La Bodega` — `800 Chapas`
8. `Barril de Coleccionista` — `1.000 Chapas`
9. `Lúpulo de Oro Macizo` — `1.500 Chapas`
10. `Corona Real Cervecera` — `2.000 Chapas`

### 5.7. Inventario de Temas de Color de la App (7 en total)

**Por Logros (3):**
1. `Cobre Tostado` (Logro #21) — Acento cobre cálido `#D97736`
2. `Dorado Pilsen` (Logro #53) — Acento oro brillante `#EAB308`
3. `Verde Lúpulo` (Logro #59) — Acento verde botánico `#34D399`
4. `Rubí IPA` (Logro #97) — Acento rojo rubí `#EF4444`

**Exclusivos de La Bodega (2 + default):**
1. `Ámbar Clásico` (Default gratuito — colores actuales en `tokens.ts`)
2. `Azul Glacial` — `600 Chapas` (`#38BDF8`)
3. `Púrpura Imperial` — `900 Chapas` (`#A855F7`)

---

## 6. Lista Completa de los 100 Logros

> Todos los IDs del `1` al `100` deben existir en `ACHIEVEMENTS_SEED`, con su `code` único en `snake_case`, `category`, `targetValue`, `rewardChapas`, y vínculos opcionales a `rewardTitleId`, `rewardIconId` y `rewardCosmeticId`.

### A. Colección de Cervezas (1–16)
1. **Primer Sorbo** — Registra tu primera cerveza (`1`) · `15 Chapas` + Título: *Aprendiz de Barra*
2. **Ronda de Cinco** — Registra 5 cervezas distintas (`5`) · `20 Chapas`
3. **Paladar Curioso** — Registra 15 cervezas distintas (`15`) · `30 Chapas` + Icono: *Sommelier del Lúpulo*
4. **Coleccionista de Vidrio** — Registra 30 cervezas distintas (`30`) · `40 Chapas` + Título: *Coleccionista*
5. **Medio Centenar** — Registra 50 cervezas distintas (`50`) · `60 Chapas` + Título: *Maestro Cervecero*
6. **Primer Centenar** — Registra 100 cervezas distintas (`100`) · `100 Chapas` + Icono: *Corona del Lúpulo*
7. **Ciento Cincuenta** — Registra 150 cervezas distintas (`150`) · `125 Chapas` + Marco: *Marco Bronce Clásico*
8. **Doscientas Espumas** — Registra 200 cervezas distintas (`200`) · `150 Chapas` + Título: *Veterano de Barra*
9. **Cuarto de Millar** — Registra 250 cervezas distintas (`250`) · `180 Chapas` + Icono: *Barril Imperial*
10. **Trescientas Birras** — Registra 300 cervezas distintas (`300`) · `220 Chapas` + Carta 3D: *Madera Envejecida*
11. **Cazador Incansable** — Registra 350 cervezas distintas (`350`) · `260 Chapas` + Título: *Cazador de Maltas*
12. **Cuatrocientas en Mano** — Registra 400 cervezas distintas (`400`) · `300 Chapas` + Icono: *Cáliz de Platino*
13. **Recta Final** — Registra 450 cervezas distintas (`450`) · `350 Chapas` + Reliquia: *Chapa Reliquia 1900*
14. **Medio Millar** — Registra 500 cervezas distintas (`500`) · `450 Chapas` + Título: *Archiduque Cervecero*
15. **Casi Completo** — Registra 525 cervezas distintas (`525`) · `500 Chapas` + Marco: *Marco Platino Imperial*
16. **Colección Absoluta** — Registra todas las cervezas del catálogo (`557`) · `800 Chapas` + Icono: *Emblema Supremo* + Título: *Enciclopedia Viva*

### B. Marcas Completadas y Descubrimiento (17–32)
17. **Primera Casa** — Completa el 100 % de 1 marca (`1`) · `50 Chapas` + Icono: *Escudo Cervecero*
18. **Dúo de Casas** — Completa el 100 % de 2 marcas (`2`) · `75 Chapas`
19. **Fiel a las Marcas** — Completa el 100 % de 3 marcas (`3`) · `100 Chapas` + Reliquia: *Posavasos Fundacional*
20. **Dueño del Grifo** — Completa el 100 % de 5 marcas (`5`) · `150 Chapas` + Título: *Dueño del Grifo*
21. **Señor de Ocho Casas** — Completa el 100 % de 8 marcas (`8`) · `200 Chapas` + Color: *Cobre Tostado*
22. **Emperador de la Malta** — Completa el 100 % de 10 marcas (`10`) · `250 Chapas` + Icono: *Cetro de Malta*
23. **Conquistador** — Completa el 100 % de 15 marcas (`15`) · `350 Chapas` + Título: *Conquistador de Barriles*
24. **Veinte Estandartes** — Completa el 100 % de 20 marcas (`20`) · `450 Chapas` + Carta 3D: *Pizarra de Taberna*
25. **Treinta Imperios** — Completa el 100 % de 30 marcas (`30`) · `600 Chapas` + Icono: *Trono Cervecero*
26. **Dominio Total** — Completa el 100 % de las 41 marcas (`41`) · `1.000 Chapas` + Título: *Soberano de las 41 Casas* + Marco: *Marco Laurel Dorado*
27. **Trotamundos** — Registra al menos 1 cerveza de 5 marcas distintas (`5`) · `25 Chapas`
28. **Explorador de Casas** — Registra al menos 1 cerveza de 10 marcas distintas (`10`) · `40 Chapas`
29. **Sin Fronteras** — Registra al menos 1 cerveza de 15 marcas distintas (`15`) · `60 Chapas` + Título: *Trotamundos*
30. **Ruta Cervecera** — Registra al menos 1 cerveza de 25 marcas distintas (`25`) · `100 Chapas`
31. **Catador Universal** — Registra al menos 1 cerveza de 35 marcas distintas (`35`) · `150 Chapas` + Icono: *Brújula del Lúpulo*
32. **Embajador de las 41** — Registra al menos 1 cerveza de las 41 marcas (`41`) · `250 Chapas` + Título: *Embajador Cervecero*

### C. Formatos: Lata, Botellín y Litrona (33–47)
33. **Team Lata** — Registra 10 cervezas en formato lata (`10`) · `30 Chapas` + Icono: *Lata de Oro*
34. **Adictos al Aluminio** — Registra 25 cervezas en formato lata (`25`) · `60 Chapas`
35. **Maestro de la Lata** — Registra 50 cervezas en formato lata (`50`) · `100 Chapas` + Título: *Señor del Aluminio*
36. **Centenario en Lata** — Registra 100 cervezas en formato lata (`100`) · `180 Chapas`
37. **Legión de Latas** — Registra 150 cervezas en formato lata (`150`) · `250 Chapas` + Icono: *Lata Legendaria*
38. **Team Botellín** — Registra 10 cervezas en formato botellín (`10`) · `30 Chapas` + Icono: *Botellín Maestro*
39. **Amante del Vidrio** — Registra 25 cervezas en formato botellín (`25`) · `60 Chapas`
40. **Cristal Fino** — Registra 50 cervezas en formato botellín (`50`) · `100 Chapas` + Título: *Guardián del Vidrio*
41. **Bodega de Botellines** — Registra 100 cervezas en formato botellín (`100`) · `180 Chapas`
42. **Maestro Vidriero** — Registra 200 cervezas en formato botellín (`200`) · `300 Chapas` + Carta 3D: *Cristal Tallado*
43. **Peso Pesado** — Registra 5 cervezas en formato litrona (`5`) · `50 Chapas` + Título: *Peso Pesado*
44. **Gigante de Litro** — Registra 15 cervezas en formato litrona (`15`) · `120 Chapas` + Reliquia: *Mini Barril Roble*
45. **Titán de la Litrona** — Registra 30 cervezas en formato litrona (`30`) · `220 Chapas` + Icono: *Jarra Gigante*
46. **Tridente Cervecero** — Registra al menos 1 lata, 1 botellín y 1 litrona (`3`) · `25 Chapas`
47. **Equilibrio Perfecto** — Registra al menos 10 latas, 10 botellines y 5 litronas (`3`) · `100 Chapas` + Marco: *Marco Espuma Desbordante*

### D. Estilos y Graduación (48–64)
48. **Sin Remordimientos** — Registra una cerveza 0,0 % o Sin Alcohol (`1`) · `15 Chapas`
49. **Mente Clara** — Registra 10 cervezas 0,0 % (`10`) · `45 Chapas`
50. **Campeón 0,0** — Registra 25 cervezas 0,0 % (`25`) · `100 Chapas` + Título: *Puro Equilibrio*
51. **Explorador de Estilos** — Registra 5 cervezas de estilo Negra, Tostada o IPA (`5`) · `30 Chapas`
52. **Amante de la Lager** — Registra 25 cervezas Lager (`25`) · `50 Chapas`
53. **Rey de la Lager** — Registra 100 cervezas Lager (`100`) · `150 Chapas` + Color: *Dorado Pilsen*
54. **Toque Tostado** — Registra 10 cervezas Tostadas (`10`) · `45 Chapas`
55. **Maestro Tostador** — Registra 40 cervezas Tostadas (`40`) · `140 Chapas` + Icono: *Espiga Tostada*
56. **Lado Oscuro** — Registra 5 cervezas Negras (`5`) · `40 Chapas`
57. **Señor de la Noche** — Registra 25 cervezas Negras (`25`) · `130 Chapas` + Carta 3D: *Obsidiana Nocturna*
58. **Fiebre del Lúpulo** — Registra 5 cervezas IPA (`5`) · `40 Chapas`
59. **Adicto al Amargor** — Registra 20 cervezas IPA (`20`) · `130 Chapas` + Color: *Verde Lúpulo*
60. **Cosecha de Trigo** — Registra 5 cervezas de Trigo (`5`) · `40 Chapas`
61. **Espíritu Bávaro** — Registra 20 cervezas de Trigo (`20`) · `130 Chapas` + Título: *Maestro del Trigo*
62. **Paleta Completa** — Registra al menos 1 cerveza de cada uno de los 6 estilos (`6`) · `80 Chapas` + Reliquia: *Medalla del Lúpulo*
63. **Alta Graduación** — Registra 10 cervezas de 7,0 % vol. o más (`10`) · `90 Chapas`
64. **Peso Ligero** — Registra 10 cervezas con alcohol de 3,5 % vol. o menos (`10`) · `70 Chapas`

### E. Geografía y Rutas (65–74)
65. **Producto Nacional** — Registra 25 cervezas de España (`25`) · `50 Chapas`
66. **Orgullo Ibérico** — Registra 100 cervezas de España (`100`) · `180 Chapas` + Título: *Maestro Ibérico*
67. **Vecino Portugués** — Registra 10 cervezas de Portugal (`10`) · `60 Chapas`
68. **Tradición Belga** — Registra 10 cervezas de Bélgica (`10`) · `70 Chapas` + Reliquia: *Cáliz de Abadía*
69. **Ley de Pureza** — Registra 10 cervezas de Alemania (`10`) · `70 Chapas`
70. **Ruta Británica e Irlandesa** — Registra 10 cervezas de Reino Unido o Irlanda (`10`) · `70 Chapas`
71. **Sabor Azteca** — Registra 10 cervezas de México (`10`) · `70 Chapas`
72. **Sol Naciente** — Registra 10 cervezas de Japón (`10`) · `80 Chapas` + Icono: *Sol Cervecero*
73. **Pasaporte Internacional** — Registra cervezas de 5 países distintos (`5`) · `60 Chapas`
74. **Vuelta al Mundo** — Registra cervezas de 10 países distintos (`10`) · `150 Chapas` + Marco: *Marco Brújula Dorada*

### F. Social y Amigos (75–84)
75. **¡Salud!** — Consigue tu primer amigo (`1`) · `20 Chapas`
76. **Peña Cervecera** — Ten 5 amigos en tu lista (`5`) · `50 Chapas` + Icono: *Brindis Épico*
77. **Alma de la Fiesta** — Ten 10 amigos en tu lista (`10`) · `90 Chapas` + Título: *El de las Rondas*
78. **Taberna Llena** — Ten 20 amigos en tu lista (`20`) · `150 Chapas`
79. **Cotilla Profesional** — Visita el perfil de 5 amigos distintos (`5`) · `30 Chapas`
80. **Inspector de Barras** — Visita el perfil de 15 amigos distintos (`15`) · `70 Chapas`
81. **Rivalidad Sana** — Ten al menos 1 amigo con el 100 % de una marca (`1`) · `40 Chapas`
82. **Liga de Campeones** — Ten al menos 3 amigos con el 100 % de alguna marca (`3`) · `100 Chapas` + Reliquia: *Trofeo de Espuma*
83. **Inspiración** — Supera a un amigo en número total de cervezas registradas (`1`) · `60 Chapas`
84. **Anfitrión** — Ten 5 amigos que hayan registrado al menos 10 cervezas (`5`) · `120 Chapas`

### G. Valoraciones, Perfil, Constancia y Curiosidad (85–99)
85. **Obra Maestra** — Valora una cerveza con 5 estrellas (`1`) · `15 Chapas`
86. **Paladar Exigente** — Valora una cerveza con 1 estrella (`1`) · `15 Chapas` + Título: *Crítico Exigente*
87. **Jurado Popular** — Registra y valora 25 cervezas (`25`) · `50 Chapas`
88. **Crítico Consolidado** — Registra y valora 100 cervezas (`100`) · `120 Chapas` + Marco: *Marco Rubí*
89. **Cambio de Look** — Equipa un icono distinto al inicial (`1`) · `15 Chapas`
90. **Con Honores** — Equipa un título desbloqueado por primera vez (`1`) · `15 Chapas`
91. **Historiador Cervecero** — Haz flip en 10 cervezas distintas (`10`) · `30 Chapas`
92. **Erudito de la Espuma** — Haz flip en 50 cervezas distintas (`50`) · `80 Chapas` + Carta 3D: *Pergamino Clásico*
93. **Archivista** — Haz flip en 150 cervezas distintas (`150`) · `160 Chapas` + Título: *Erudito Cervecero*
94. **Racha de Tres** — Registra al menos 1 cerveza durante 3 días seguidos (`3`) · `40 Chapas`
95. **Semana Completa** — Registra al menos 1 cerveza durante 7 días seguidos (`7`) · `100 Chapas`
96. **Quincena Dorada** — Registra al menos 1 cerveza durante 15 días seguidos (`15`) · `200 Chapas` + Icono: *Llama Eterna*
97. **Mes de Oro** — Registra al menos 1 cerveza durante 30 días seguidos (`30`) · `400 Chapas` + Color: *Rubí IPA*
98. **Cazador de Packs** — Registra una cerveza usando un código de pack/caja (`1`) · `25 Chapas`
99. **Colaborador** — Envía una sugerencia de código de barras nuevo (`1`) · `30 Chapas`

### H. Logro Definitivo (100)
100. **Dios de la BeerDex** — Completa los otros 99 logros (`99`) · `1.500 Chapas` + Icono: *Cáliz Dorado BeerDex* + Título: *Leyenda BeerDex* + Carta 3D: *Oro Imperial*

---

## 7. Arquitectura Técnica y Cambios Necesarios

### 7.1. Base de Datos (`backend/src/db/schema.ts` y migraciones)
- **`users`:** añadir:
  - `chapas: integer('chapas').default(0).notNull()`
  - `equippedFrameId: integer('equipped_frame_id')` (nullable o FK a `cosmetics.id`)
  - `equippedCardStyleId: integer('equipped_card_style_id')`
  - `equippedColorThemeId: integer('equipped_color_theme_id')`
  - `showcaseSlot1Id`, `showcaseSlot2Id`, `showcaseSlot3Id` (nullable FK a `cosmetics.id`)
  - `completedBrandRewardsCount` o tabla `user_completed_brands (userId, brandId, rewardedAt)` para asegurar que el bonus de `+50 Chapas` por marca completada se entrega exactamente una vez por marca.
  - `hasRegisteredPack: boolean('has_registered_pack').default(false).notNull()` (para logro #98) y `hasSubmittedSuggestion: boolean('has_submitted_suggestion').default(false).notNull()` (para logro #99).
- **`cosmetics` (tabla unificada para Marcos, Cartas 3D, Reliquias de Vitrina y Temas de Color, o extensión de `icons` / `titles` para tienda):**
  - Campos: `id`, `code`, `type` (`'icon' | 'title' | 'frame' | 'card_style' | 'relic' | 'color_theme'`), `name`, `description`, `previewKey` / `imageUrl`, `source` (`'default' | 'achievement' | 'shop'`), `priceChapas` (nullable si no es de tienda), `unlockAchievementId` (nullable), `metadataJson` (ej. colores hex para temas o estilos de marco/carta).
- **`user_cosmetics`:** `(userId, cosmeticId, acquiredAt, source)` con PK compuesta `(userId, cosmeticId)`.
- **`achievements`:** añadir `rewardChapas: integer('reward_chapas').default(0).notNull()` y `rewardCosmeticId: integer('reward_cosmetic_id')` (para recompensas que no son título/icono, o unificar junto con `rewardTitleId` / `rewardIconId`).

### 7.2. Backend (`backend/src/`)
1. **`services/achievementEngine.ts`:**
   - Ampliar la evaluación a los **100 logros** (usando los nuevos contadores de país, estilo `Lager`/`Tostada`/`IPA`/`Negra`/`0,0%`/`Trigo`, `abv >= 7`, `abv <= 3.5 && abv > 0`, amigos con marcas completas, racha de hasta 30 días, pack escaneado, sugerencia enviada, y logro #100 con `targetValue = 99`).
   - Al desbloquear cada logro en `user_achievements`, **acreditar `rewardChapas`** en `users.chapas` e insertar cualquier `rewardCosmeticId` / título / icono desbloqueado de manera atómica e idempotente (solo la primera vez que `unlocked` pasa de `false` a `true`).
   - Revisar `hasRegisteredPack`: en `POST /api/beers/register` aceptar opcionalmente `scannedViaPack?: boolean` (calculado en `GET /api/beers/barcode/:code` cuando el código escaneado pertenece a `extraBarcodes` o `BARCODE_TO_BEER_NAME` de un pack).
2. **`routes/beerdex.ts`:**
   - En `POST /api/beers/register`:
     - Sumar `+10 Chapas` al usuario dentro de la operación de registro.
     - Si al contar cervezas de la marca se alcanza el 100 % y la pareja `(userId, brandId)` no existe aún en `user_completed_brands`, insertarla y sumar `+50 Chapas` extra.
     - Devolver en el JSON `{ userBeer, newlyUnlocked, chapasEarned, totalChapas, completedBrandBonus }`.
3. **Nueva ruta `routes/shop.ts` (montada en `/api/shop` en `app.ts`):**
   - `GET /api/shop`: devuelve saldo actual de `chapas` y todo el catálogo de **La Bodega** agrupado por categoría (`icons`, `titles`, `frames`, `card_styles`, `relics`, `color_themes`), indicando `owned: boolean` y `equipped: boolean` para el usuario autenticado.
   - `POST /api/shop/buy`: recibe `{ cosmeticId }` (o `{ itemType, itemId }`). Ejecuta en transacción:
     - Verifica que existe, es comprable en tienda (`priceChapas > 0`) y el usuario no lo posee ya (`409` si ya lo tiene).
     - Actualiza `users.chapas = users.chapas - price` con condición `WHERE id = userId AND chapas >= price` (`400` si saldo insuficiente).
     - Registra la propiedad en `user_cosmetics` (o tabla de desbloqueo correspondiente).
     - Devuelve `{ newBalance, item }`.
4. **`routes/me.ts`, `services/profileService.ts` y `routes/friends.ts`:**
   - Incluir `chapas`, `equippedFrame`, `equippedCardStyle`, `equippedColorTheme` y `showcaseRelics` (3 slots) en `/api/me`, `/api/auth/*` (user payload) y `/api/friends/:id/profile`.
   - Ampliar `PATCH /api/me` para equipar marco, diseño de carta 3D, tema de color y los 3 huecos de la vitrina validando propiedad (`403` si no lo tiene desbloqueado o comprado).

### 7.3. Frontend (`app/src/`) y Creación de Assets
1. **Assets a generar (`app/assets/`):**
   - `app/assets/chapa-coin.png` (icono oficial de chapa dorada bien trabajada).
   - Nuevos iconos de perfil PNG 256×256 en `app/assets/icons-profile/` (10 de logros + 14 exclusivos de La Bodega) manteniendo estética coherente con los 13 existentes, y registrarlos en `app/src/components/ProfileIcon.tsx`.
   - Iconos/ilustraciones para las **Reliquias de Vitrina** (PNGs o componentes vectoriales detallados en `app/assets/relics/`).
2. **Estilos dinámicos y componentes:**
   - `app/src/components/ProfileIcon.tsx`: soportar `frameCode` / `frameStyle` para renderizar los **12 Marcos de Avatar** alrededor del círculo sin recortar ni descentrar.
   - `app/src/components/BeerCard.tsx`: soportar `cardStyleCode` para aplicar los **Diseños de Carta 3D** (colores de borde, textura/fondo y reverso).
   - **Contexto de Tema (`ThemeContext` o `tokens.ts` dinámico):** aplicar el **Tema de Color de la App** elegido por el usuario en botones primarios, tabs activos, bordes destacados y badges.
   - `app/src/components/GlobalHeader.tsx`: colocar el contador de **Chapas** (chapa dorada + número formateado) **a la izquierda del nombre de usuario y encima del título**.
3. **Pantallas nuevas y modificadas:**
   - `app/src/app/(tabs)/shop.tsx` (**La Bodega**):
     - Header interno con título **La Bodega**, saldo de Chapas y filtros por categoría (`Todos`, `Iconos`, `Títulos`, `Marcos`, `Cartas 3D`, `Vitrina`, `Colores`).
     - Grid uniforme de tarjetas cuadradas con botón **`Comprar`** -> Modal de confirmación **"¿Seguro que quieres comprar [artículo]?"** (`Sí` / `No`) -> botón **`Equipar`** tras la compra.
   - `app/src/app/(tabs)/_layout.tsx`: añadir 4.ª pestaña **`Tienda`** apuntando a `shop`.
   - `app/src/app/menu.tsx`: añadir tarjeta **`La Bodega`** en el menú principal.
   - `app/src/app/profile.tsx` y `app/src/app/friend/[id].tsx`: añadir sección **Vitrina (3 reliquias)** y selector para equipar Marcos, Cartas 3D, Reliquias y Temas de Color además de Iconos y Títulos.
   - `app/src/app/(tabs)/achievements.tsx`: mostrar los **100 logros** por categorías, mostrando claramente la recompensa de **Chapas** y el cosmético/título/icono que otorga cada uno.

---

## 8. Directrices de CSS y Maquetación ("Todo bien cuadrado")

Para mantener una interfaz pulida y sin desajustes visuales en iPhone/Android y Web:

1. **Cabecera (`GlobalHeader.tsx`):**
   - Alinear el badge de **Chapas** (`flexDirection: 'row'`, `alignItems: 'center'`, `gap: 4`) en la esquina superior izquierda del bloque de usuario (a la izquierda del `username` y por encima del `titleText`).
   - Usar `flexShrink: 1` y `numberOfLines={1}` en `username` y `titleText` para que en pantallas de `360px`–`390px` la chapa dorada nunca empuje ni corte el logo `BeerDex` ni el avatar.
2. **Navbar inferior (`(tabs)/_layout.tsx`):**
   - Ajustar las 4 pestañas (`BeerDex`, `Logros`, `Amigos`, `Tienda`) con `tabBarItemStyle` equilibrado (`flex: 1`), texto conciso de 1 palabra (`fontSize: 11–12`) y en pantallas anchas (`width >= 560`) ampliar `maxWidth` del dock flotante de `500` a `560–600` para que las 4 pestañas respiren cómodamente.
3. **Grid de La Bodega (`shop.tsx`) y Vitrina (`profile.tsx`):**
   - Tarjetas de tienda en grid responsivo de **2 columnas en móvil** y **3 columnas en web ancho**, todas con **misma altura y alineación** (`justifyContent: 'space-between'`), contenedor de vista previa de altura fija (`height: 88`), título en máx. 2 líneas con altura reservada, y botón de acción anclado abajo al mismo nivel en toda la fila.
   - Vitrina del perfil en **3 cajas cuadradas simétricas** (`flex: 1`, `aspectRatio: 1`) centradas en fila horizontal con borde sutil y slot vacío elegante si no hay reliquia asignada.
4. **Menu principal (`menu.tsx`):**
   - Mantener simetría visual en las tarjetas del menú al añadir **La Bodega** (grid par de 2 columnas en escritorio / lista uniforme con mismo `padding`, `borderRadius` y altura en móvil).
5. **PWA Cache (`app/public/sw.js`):**
   - Incrementar `CACHE_NAME` a `'beerdex-pwa-v7'` en el despliegue de la Fase 2 para forzar la actualización de assets y estilos en móviles instalados.

---

## 9. Checklist de Verificación antes de Dar por Cerrada la Fase 2

- [ ] `backend`: `npm run typecheck`, `npm run build` y `vitest run` en verde (incluyendo tests de los 100 logros, suma de +10/+50 Chapas, compra en La Bodega, saldo insuficiente, doble compra y equipamiento de cosméticos).
- [ ] `backend`: `npm run seed` ejecutado sobre Neon Postgres cargando los 100 logros y todo el catálogo de cosméticos/tienda sin perder datos de usuarios existentes.
- [ ] `app`: `npm run typecheck` y `npx expo export --platform web` sin errores.
- [ ] Despliegue en Vercel (`backend` y `app`) y verificación visual en vivo (desktop y móvil `390x844`) de:
  - Chapa dorada + saldo arriba a la izquierda del usuario/título.
  - Compra en La Bodega con confirmación `Sí / No` y equipamiento inmediato.
  - Vitrina de 3 huecos, marcos de avatar, cartas 3D y temas de color funcionando en tiempo real.
  - Las 4 pestañas del navbar inferior y menú inicial perfectamente alineadas.
