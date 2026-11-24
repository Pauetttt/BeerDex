# Documento funcional: Tabernas (multijugador)

## 1. Resumen
Las **Tabernas** son grupos de hasta 10 jugadores. Cada mes, cada Taberna recibe **un único minijuego aleatorio** (de 5 posibles, Bingo incluido). Completarlo da Chapas a los miembros y puntos a la Taberna. Hay ranking de Tabernas por puntos y nivel.

## 2. Reglas generales
| Regla | Valor |
|---|---|
| Miembros máx. por Taberna | 10 |
| Tabernas máx. por usuario | 5 |
| Coste de fundación | 100 Chapas (configurable en constante) |
| Minijuegos por Taberna y mes | 1 (aleatorio, sin repetir el del mes anterior) |
| Ciclo | Mes natural (UTC+1 Europe/Madrid); el minijuego se genera al primer acceso del mes o por cron |
| Recompensas | Siempre en Chapas |

## 3. Gestión de Taberna
- **Crear**: nombre (único, 3-30 car.), descripción (≤200), visibilidad `pública` / `privada (solicitud)`, requisito mínimo de cervezas registradas (≥0). Cobra 100 Chapas; el creador es líder.
- **Unirse**: pública → entrada directa si cumple requisito y hay hueco; privada → crea solicitud que el líder acepta/rechaza (el requisito se valida al solicitar y al aceptar).
- **Líder**: editar descripción/visibilidad/requisito, aceptar/rechazar solicitudes, expulsar miembros, eliminar la Taberna (sin reembolso). Si el líder abandona, el miembro más antiguo hereda el liderazgo; si queda vacía, se elimina.
- **Miembro**: abandonar. Un expulsado/salido no puede volver a solicitar en 24 h.
- **Validaciones**: aforo 10, límite 5 Tabernas, no duplicar membresía, requisito de cervezas.

## 4. Minijuegos mensuales y flujo «Escanear para la Taberna»
El progreso de los minijuegos se alimenta mediante un botón exclusivo y prioritario situado en la parte superior de la pantalla de cada Taberna: **«Escanear para la Taberna»**.

### Flujo de escaneo dedicado («Escanear para la Taberna»):
1. **Acceso directo**: Desde la vista de la Taberna (`/tabernas/[id]`), el usuario pulsa `[ 📷 Escanear para la Taberna ]`.
2. **Independiente de la BeerDex personal**:
   - **Da igual si el usuario ya tiene la cerveza registrada en su BeerDex o no.**
   - No comprueba duplicados de colección personal, **NO pide hacer foto de la cerveza** y **NO pide valorar con estrellas (1-5)**.
   - El escaneo es ultrarrápido y valida directamente el código de barras contra la misión activa de esa Taberna concreta.
3. **Casos de respuesta inmediata del escáner**:
   - 🟢 **Completada con éxito**: La cerveza es válida para el minijuego y aún no ha sido aportada este mes por el usuario (o la casilla/hito estaba libre). Se marca como completada, se actualiza el progreso, se otorgan puntos a la Taberna y Chapas al miembro si correspondía un hito. Muestra alerta/modal: *«¡Cerveza añadida al minijuego de [Nombre de la Taberna]!»* con opciones directas de `[Escanear otra]` o `[Volver a la Taberna]`.
   - 🟡 **Ya registrada en el minijuego**: Si esa cerveza (o casilla) ya fue completada por el usuario o ya está cubierta en la misión: *«Esta cerveza ya ha sido registrada en el minijuego de este mes»*.
   - 🔴 **No válida para este minijuego**: Si la cerveza no cumple los requisitos de la misión activa (p. ej. estilo no coincidente, país no objetivo o fuera de la cuadrícula de Bingo): *«Esta cerveza no cumple los requisitos de la misión actual»*.
4. **Escáner general de la BeerDex**: Si el usuario escanea desde el botón general del Menú (`/scan`), sigue el flujo habitual de la BeerDex personal (cámara, foto y valoración). Si además esa cerveza encaja en la misión de alguna de sus Tabernas, se añade en segundo plano a la Taberna notificándolo en el resumen.

| # | Minijuego | Tipo | Mecánica | Victoria |
|---|---|---|---|---|
| 1 | **Bingo 3×3** | Cooperativo | Se muestran 9 cervezas aleatorias (cuadrícula). Cualquier miembro que escanee una de ellas para la Taberna marca la casilla. | Línea (fila/col/diagonal): +100 Chapas a quienes aportaron a la línea, +150 pts. Cartón completo: +500 Chapas a todos, +500 pts |
| 2 | **Escalera del Grado** | Cooperativo | Escanear cervezas en orden creciente de graduación (tramos <4º, 4-5º, 5-6º, 6-7º, 7º+); cada peldaño lo completa cualquiera. | 50 %: +150 Chapas; 100 %: +400 Chapas, +350 pts |
| 3 | **Ruta Internacional** | Cooperativo | Escanear cervezas de N países objetivo (p. ej. 8) entre todos los miembros. | Igual que arriba |
| 4 | **Tridente de la Peña** | Individual | Cada miembro intenta lograr 3 retos personales (p. ej. 1 rara, 1 de otro país, 1 IPA). Se cuenta cuántos miembros completan su tridente. | Mitad de miembros: +150; todos los activos: +400 y +350 pts (por miembro que lo completó, recompensa individual) |
| 5 | **Cata Temática** | Individual/ranking | Se sortea un estilo (Lager, Stout, IPA...). Cada cerveza válida suma a la meta conjunta; se clasifica el aporte de cada miembro. | Meta conjunta (p. ej. 15): +400 Chapas a todos con ≥1 aportación; top 1 individual: +200 extra |

Recompensas **solo una vez por hito** y miembro. Miembros que entren tras el inicio del mes participan pero sólo cobran hitos futuros.

## 5. Puntos, nivel y ranking
- Los puntos de Taberna suben con minijuegos. Umbral nivel *n* → *n+1*: `500 × n` pts acumulados (nivel 1→2: 500, 2→3: 1000...). Máx. nivel 20.
- **Subida de nivel**: cada miembro recibe `nivel_nuevo × 100` Chapas (una vez por nivel).
- **Ranking**: global ordenado por nivel desc, puntos desc. Pestañas "Global" y "Mensual" (puntos del mes). Top 3 mensual otorga logro 110.

## 6. Logros nuevos (categoría «Tabernas y Hermandad»)
| # | Logro | Condición | Chapas | Extra |
|---|---|---|---|---|
| 101 | Ronda de Bienvenida | Unirte o fundar una Taberna | 150 | Título *Parroquiano* |
| 102 | Tabernero Mayor | Fundar una Taberna y llegar a 5 miembros | 300 | Icono *Jarra de la Hermandad* |
| 103 | Hermandad Completa | Estar en Taberna con 10 miembros | 250 | — |
| 104 | Primera Línea | Aportar a una línea de Bingo | 200 | — |
| 105 | ¡BINGO! | Tu Taberna completa un cartón de Bingo | 600 | Título *Cantinero Maestro* |
| 106 | Jornada de Taberna | Tu Taberna completa 3 minijuegos mensuales (meses distintos) | 500 | — |
| 107 | Misión Impecable | Completar el minijuego mensual al 100 % con todos los miembros participando | 1.200 | Marco *Madera de Taberna* |
| 108 | Taberna en Auge | Taberna nivel 5 | 400 | — |
| 109 | Bastión Cervecero | Taberna nivel 10 | 1.000 | Título *Señor del Barril* |
| 110 | Élite del Ranking | Top 3 mensual | 2.500 | Carta *Estandarte Real* |

**Nota técnica**: el logro 100 «Dios de la BeerDex» debe seguir evaluando sólo los 99 logros originales (excluir ids ≥101 del recuento).

## 7. Modelo de datos (Drizzle / Neon)
- `tabernas`: id, name (unique), description, visibility (`public|private`), min_beers, leader_id, level, points, created_at.
- `taberna_members`: taberna_id, user_id, role (`leader|member`), joined_at, PK(taberna_id,user_id).
- `taberna_requests`: id, taberna_id, user_id, status (`pending|accepted|rejected`), created_at.
- `taberna_missions`: id, taberna_id, month (`YYYY-MM`), game_type (`bingo|escalera|ruta|tridente|cata`), config (jsonb: cervezas/países/estilo/metas), status (`active|completed|expired`), progress (jsonb), points_awarded; unique(taberna_id, month).
- `taberna_contributions`: id, mission_id, user_id, beer_id, slot_key, created_at; unique(mission_id,user_id,beer_id).
- `taberna_rewards_claimed`: mission_id, user_id, milestone_key (PK compuesta) — idempotencia de recompensas.
- `taberna_level_rewards`: taberna_id, user_id, level (PK) — idempotencia de nivel.

## 8. API backend (`/api/tabernas`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Mis Tabernas |
| GET | `/explore?q=` | Buscar públicas/privadas |
| POST | `/` | Crear (cobra 100) |
| GET | `/:id` | Detalle, miembros, misión actual |
| PATCH | `/:id` | Editar (líder) |
| DELETE | `/:id` | Eliminar (líder) |
| POST | `/:id/join` | Unirse / solicitar |
| POST | `/:id/leave` | Abandonar |
| GET/POST | `/:id/requests`, `/:id/requests/:rid/{accept,reject}` | Gestión solicitudes |
| DELETE | `/:id/members/:userId` | Expulsar |
| GET | `/:id/mission` | Estado minijuego del mes (lo genera si no existe) |
| POST | `/:id/scan` | **Escanear para la Taberna**: valida barcode directamente contra el minijuego sin foto ni valoración |
| GET | `/ranking?scope=global|monthly` | Ranking |

Servicio `tabernaService.scanForTaberna(tabernaId, userId, barcode)` procesa el escaneo rápido:
- Resuelve la cerveza por código de barras.
- Valida si encaja en el minijuego activo de la Taberna.
- Comprueba si ya ha sido aportada o cubierta.
- Si es válida: actualiza progreso en `taberna_contributions` y `taberna_missions`, computa hitos conseguidos, reparte Chapas y puntos, evalúa subida de nivel y logros 101-110.
- Devuelve estado: `valid` (con detalles de casilla/hito completado y recompensas), `already_contributed` o `invalid` (con motivo explicativo).

Adicionalmente, `tabernaService.onBeerRegistered(userId, beer)` se mantiene como salvaguarda en el escáner general (`/beers/register`).

## 9. Frontend (Expo)
- **Navbar inferior eliminado**: `tabBarStyle: {display:'none'}`; `/menu` es el hub (BeerDex, Tabernas, Tesorería, Tienda, Logros, Amigos, Escanear). Cada pantalla con cabecera `← Menú`.
- Nuevas pantallas:
  - `tabernas/index`: mis Tabernas + explorar hermandades + botón fundar.
  - `tabernas/[id]`: miembros, misión del mes con UI interactiva por minijuego, panel del líder y el botón destacado superior **«Escanear para la Taberna»**.
  - `tabernas/ranking`: podio y tabla global/mensual.
- Modal de escaneo rápido dentro de `tabernas/[id]`: abre la cámara enfocada al minijuego, valida con `/api/tabernas/:id/scan` y da feedback al instante con botones `[Escanear otra]` y `[Volver a la Taberna]`.

## 10. Casos límite
- Mes sin cervezas suficientes en catálogo → generar con las disponibles; si <9 para bingo, reducir a otro minijuego.
- Eliminar Taberna con misión activa: se pierde el progreso; recompensas ya cobradas se mantienen.
- Cambio de mes: misión no completada pasa a `expired`; se crea la nueva al acceder.
- Concurrencia: transacciones con `ON CONFLICT DO NOTHING` en tablas de recompensas y contribuciones.

## 11. Plan de implementación
1. Migración `0004_tabernas.sql` + esquema Drizzle.
2. Servicio y rutas de gestión (crear/unirse/líder).
3. Generador y motor de minijuegos + endpoint `/api/tabernas/:id/scan` para escaneo rápido de Taberna.
4. Hook auxiliar en registro general de cervezas.
5. Puntos, niveles, ranking.
6. Logros 101-110 (+ ajuste del 100) y seeds.
7. UI: quitar navbar inferior, menú hub con acceso a Tabernas, pantallas de Tabernas con botón superior «Escanear para la Taberna» y visor interactivo de minijuegos.
8. Tests unitarios y de integración, migración Neon y despliegue.
