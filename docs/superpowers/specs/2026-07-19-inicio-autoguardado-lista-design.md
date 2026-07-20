# Inicio, autoguardado y lista de presupuestos

**Fecha:** 2026-07-19 · **Estado:** aprobado por Flavio

## Objetivo

Cerrar el sprint 1 de la "cotización rápida para oficios" (ver
`docs/superpowers/plans` — dirección de producto vigente, ver memoria
`doc-oficios-distinto-producto`): que el trabajador pueda abrir la app,
tocar "Nuevo presupuesto", cargar datos sin miedo a perderlos si lo
interrumpen, y recuperar cualquier presupuesto en curso o guardado.

No incluye: unificar el wizard de 5 pasos en una sola pantalla con
bloques, duplicar presupuesto, ni el catálogo por oficios — quedan
para otra vuelta.

## Contexto actual (antes de este cambio)

- La pestaña inferior "Presupuesto" entra directo al wizard (paso
  "Datos Empresa"). No existe pantalla de inicio.
- `Cotizador.jsx` guarda todo en estado local de React. Solo se
  escribe a `quotes` (y de ahí a `localStorage`) cuando el usuario
  toca "Guardar y continuar más tarde" o "Generar PDF". Cerrar el
  navegador antes de eso pierde todo lo cargado.
- No hay forma de ver los presupuestos guardados ni de reabrir uno
  para seguir editándolo. El wizard siempre arranca en blanco.
- `quotes` no tiene un id estable, solo un `number` secuencial
  (p. ej. "P-0004") asignado recién al guardar.

## Decisiones tomadas

- **Pestaña "Presupuesto" → "Inicio"** (ícono `home`). Alineado con la
  sección 4 del documento de producto, sin agregar una quinta pestaña.
- **Autoguardado sin botón**, pero el borrador solo se materializa en
  la lista con el primer cambio real (no al sólo abrir el wizard) —
  evita ensuciar la lista con toques accidentales del botón "Nuevo
  presupuesto".
- **Reabrir = remount controlado**: `Cotizador` no gana lógica de
  rehidratación manual; se remonta con `key={quote.id}` y arranca de
  cero con `initialQuote` como semilla. Menos riesgo que levantar todo
  el estado del wizard a `App.jsx`.
- **La app siempre aterriza en Inicio**, nunca hace auto-resume del
  wizard. Si hay un borrador sin terminar, Inicio lo muestra y el
  usuario decide si lo retoma.

## Arquitectura

```
src/App.jsx                  ← agrega quoteView, activeQuoteId, materializeQuote/upsertQuote
src/components/AppShell.jsx  ← tab "Inicio"; header/step-bar solo si quoteView === "wizard"
src/pages/Cotizador.jsx      ← agrega prop initialQuote, callback onChange debounced
src/pages/Inicio.jsx         ← NUEVO: pantalla de inicio
src/pages/PresupuestosList.jsx ← NUEVO: lista de presupuestos guardados
```

### Estado en `App.jsx`

```js
const [quoteView, setQuoteView] = useState("home"); // "home" | "wizard" | "list"
const [activeQuoteId, setActiveQuoteId] = useState(null);
const [mountKey, setMountKey] = useState(0); // fuerza remount SOLO en start/open explícitos
```

- `quotes` (ya existente) suma `id` (string estable, `crypto.randomUUID()`
  si está disponible, si no `Date.now()-random` como ya hace `companies`).
- `startNewQuote()`: `setActiveQuoteId(null)`, `setMountKey(k => k + 1)`,
  `setQuoteView("wizard")`, `setStep("datosEmpresa")`. No crea nada en
  `quotes` todavía — el `id` real se asigna recién en el primer
  `onChange` con contenido.
- `upsertQuote(id, patch)`: si `id` es `null` y `patch` tiene contenido
  real (ver "qué cuenta como contenido real" abajo), genera un id nuevo,
  reserva `number` vía `getDocumentNumber` (como ya hace `saveQuote`),
  inserta con `status: "Borrador"`, llama `setActiveQuoteId(newId)` y
  devuelve `newId`. **Importante:** esto NO toca `mountKey`, así que
  `Cotizador` no se remonta — sigue siendo el mismo componente con el
  mismo estado interno, solo que ahora tiene un id real. Si `id` ya
  existe, sólo actualiza esa entrada en `quotes` in place.
- `openQuote(id)`: `setActiveQuoteId(id)`, `setMountKey(k => k + 1)`,
  `setQuoteView("wizard")`, `setStep("datosEmpresa")` — acá sí querés
  remount, porque estás saltando a un presupuesto distinto.

**Qué cuenta como "contenido real":** al menos un `lineItem`, o
`clientDetails.name`/`clientDetails.phone` no vacío, o `jobTitle` no
vacío. Cambiar `validUntil` del default solo no cuenta (evita
materializar por un campo que ya viene precargado).

### Cambios en `Cotizador.jsx`

- Nueva prop `initialQuote` (opcional): si viene, siembra
  `clientDetails`, `lineItems`, `jobTitle`, `validUntil`,
  `selectedCompany`/`clientMode` desde ahí en vez de los defaults
  actuales.
- Nueva prop `onChange(id, patch)`: efecto debounced (~800ms) sobre
  `[clientDetails, lineItems, jobTitle, validUntil]` que arma el mismo
  shape que ya arma `buildQuote()` y llama `onChange(activeQuoteIdProp, data)`.
  Reutiliza `buildQuote()` tal cual existe hoy — no se reimplementa el
  cálculo de subtotales/IVA. `activeQuoteIdProp` puede ser `null` en el
  primer llamado (borrador recién creado); `App.jsx` lo resuelve a un id
  real en `upsertQuote` y se lo pasa de vuelta a `Cotizador` como prop
  normal (no vía `key`) para los llamados siguientes.
- `App.jsx` renderiza `<Cotizador key={mountKey} activeQuoteId={activeQuoteId} .../>`.
  El remount solo ocurre en `startNewQuote()`/`openQuote()` (cambian
  `mountKey`), nunca como efecto secundario de que `upsertQuote` le
  asigne id a un borrador nuevo — si remontara ahí, se perdería
  justo lo que el usuario acaba de cargar.
- "Guardar y continuar más tarde" dejar de ser necesario para no perder
  datos (ya autoguarda), pero se mantiene como acción explícita: ahora
  navega a Inicio (`quoteView = "home"`) en vez de solo mostrar un
  estado de guardado — el autoguardado ya garantiza que no hace falta
  para no perder el borrador.

### `AppShell.jsx`

- `MOBILE_TABS[0]`: `label: "Inicio"`, `icon: "home"` (antes
  `"Presupuesto"` / `"request_quote"`). El tap sigue mandando a la
  sección `presupuestos`, pero ahora `App.jsx` decide si eso muestra
  Inicio, wizard o lista según `quoteView`.
- El header con paso actual (`1/5`, barra de progreso) y la barra fija
  inferior "Siguiente/Generar PDF" pasan a condicionarse también a
  `quoteView === "wizard"` (hoy solo miran `activeSection === "presupuestos"`).
- Sidebar de escritorio: se agrega un ítem "Inicio" antes de "Datos
  Empresa" que hace `setQuoteView("home")`. Los 5 pasos existentes
  siguen saltando directo al wizard (comportamiento sin cambios para
  quien ya sabe lo que quiere).

## Pantalla de Inicio (`src/pages/Inicio.jsx`)

- Botón primario grande: **"Nuevo presupuesto"** → `startNewQuote()`.
- Acción secundaria: **"Ver presupuestos"** → `setQuoteView("list")`.
- Aviso contextual (solo si existe): presupuesto con `status ===
  "Borrador"` más reciente por `updatedAt` → tarjeta "Tenés un
  presupuesto sin terminar: *{service||"Sin título"}* — Continuar" que
  llama `openQuote(id)`.
- Sin gráficos, sin métricas, sin accesos a "repetir último" ni
  "buscar producto" (fuera de alcance esta vuelta).

## Lista de presupuestos (`src/pages/PresupuestosList.jsx`)

- Tarjetas por cada entrada de `quotes`, ordenadas por más reciente:
  cliente (`quote.client`), trabajo (`quote.service`), importe
  (`money(quote.total)`), fecha, estado (`Badge` con `quote.status`).
- Tap en la tarjeta → `openQuote(quote.id)`.
- Sin filtros, sin menú de acciones (reenviar/duplicar/eliminar) —
  fuera de alcance esta vuelta.
- Estado vacío: mensaje simple ("Todavía no tenés presupuestos
  guardados") + botón "Nuevo presupuesto".

## Indicador de guardado

Texto discreto en el header del wizard (junto al paso actual):
"Guardando…" mientras el debounce de `onChange` está pendiente,
"Guardado" un instante después de que se aplica. Sin bloquear nada,
solo feedback visual (principio 2.5 y sección 22 del documento).

## Errores y casos borde

- `localStorage` puede fallar por quota (ya manejado hoy en
  `saveLocal` — no fatal). El autoguardado hereda esa protección: si
  falla, el estado sigue vivo en memoria de React hasta que el usuario
  recargue; no se agrega manejo nuevo.
- Si el usuario abandona un wizard sin cargar nada (nunca se
  materializó), no queda rastro — es el comportamiento buscado.
- Reabrir un presupuesto con `status` distinto de "Borrador" (ya
  enviado/aceptado) es posible en esta vuelta pero no dispara ninguna
  advertencia especial todavía (no hay concepto de "enviado" real
  hasta el subproyecto de backend/WhatsApp).

## Verificación

Manual en `npm run dev` (mobile viewport):
1. Abrir la app → aterriza en Inicio, sin borradores.
2. "Nuevo presupuesto" → wizard vacío; la lista sigue vacía hasta
   cargar el primer dato.
3. Cargar un cliente o un material → esperar ~1s → header muestra
   "Guardado"; volver a Inicio → aparece el aviso de borrador sin
   terminar.
4. "Ver presupuestos" → aparece la tarjeta con los datos cargados.
5. Cerrar sesión del navegador (recargar) → Inicio sigue mostrando el
   aviso de borrador; tocarlo reabre el wizard con los datos previos.
6. Completar y "Generar PDF" → el presupuesto pasa a la lista con su
   estado correspondiente.

## Fuera de alcance (por ahora)

- Duplicar presupuesto.
- Eliminar borradores desde la lista.
- Unificar el wizard de 5 pasos en una sola pantalla con bloques
  editables (sección 6 del documento de producto).
- Filtros de la lista (Todos/Borradores/Enviados/Aceptados/Vencidos).
- "Repetir último presupuesto" y "Buscar producto" desde Inicio
  (dependen del catálogo por oficios).
- Envío por WhatsApp, confirmación pública del cliente, estados reales
  post-envío (subproyecto de backend, todavía no arrancado).
