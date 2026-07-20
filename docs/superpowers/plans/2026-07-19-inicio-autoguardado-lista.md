# Inicio, Autoguardado y Lista de Presupuestos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una pantalla de Inicio, autoguardado del borrador en curso sin botón, y una lista de presupuestos guardados con reabrir — cerrando el sprint 1 de la dirección de producto "cotización rápida para oficios".

**Architecture:** `Cotizador.jsx` sigue dueño de su estado local (sin cambios en los 5 steps internos), pero gana un callback `onQuoteChange` debounced que el padre (`App.jsx`) usa para materializar/actualizar la entrada correspondiente en `quotes` por `id`. Reabrir un presupuesto distinto fuerza un remount limpio vía `key={mountKey}`; el primer autoguardado de un borrador nuevo NO remonta (el id se le asigna al componente ya vivo). Dos módulos puros nuevos (`format.js`, `quoteDrafts.js`) concentran la lógica testeable con `node:test`; dos pantallas nuevas (`Inicio.jsx`, `PresupuestosList.jsx`) son componentes de presentación sin lógica propia.

**Tech Stack:** Vite 7 + React 19 (existente), `node:test` para lógica pura (igual que `src/lib/catalogMatch.test.js`), sin dependencias npm nuevas.

## Global Constraints

- **Cero dependencias npm nuevas.**
- **Sin backend nuevo en este plan** — todo sigue en `localStorage` vía el mismo patrón `saveLocal`/`loadLocal` de `App.jsx`. El backend real es otro subproyecto.
- **No tocar los 5 steps del wizard** (`DatosEmpresaStep.jsx`, `MaterialesStep.jsx`, `JornadasStep.jsx`, `TrasladoStep.jsx`, `ResumenStep.jsx`) más allá de una única línea en `DatosEmpresaStep`'s caller (`Cotizador.jsx`).
- **Textos de UI en español (es-AR)**, estilo de los componentes existentes en `src/components/ui.jsx`.
- **Un borrador vacío no se guarda** — recién se materializa en `quotes` con el primer cambio real (ver `hasQuoteContent` en Tarea 2).
- Cada tarea debe dejar la app funcionando (`npm run dev` sin errores de consola) antes de pasar a la siguiente.

---

### Task 1: Extraer `money()` a un módulo compartido (`src/lib/format.js`)

**Files:**
- Create: `src/lib/format.js`
- Test: `src/lib/format.test.js`
- Modify: `src/pages/Cotizador.jsx` (elimina la función local `money`, importa la nueva)
- Modify: `package.json` (agrega el nuevo test al script `test`)

**Interfaces:**
- Consumes: nada.
- Produces: `money(value: number) => string` — usado por `Cotizador.jsx` (ya) y por `PresupuestosList.jsx` (Tarea 3).

- [ ] **Step 1: Confirmar el formato exacto de `Intl.NumberFormat` en este entorno**

Ya verificado en este entorno (Node 24, mismas ICU data que usa el navegador vía Vite):
```
money(1500) === "$ 1.500"
money(0)    === "$ 0"
```

- [ ] **Step 2: Write the failing test**

`src/lib/format.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { money } from "./format.js";

test("formatea pesos argentinos sin decimales", () => {
  assert.equal(money(1500), "$ 1.500");
});

test("miles con separador de punto", () => {
  assert.equal(money(125000), "$ 125.000");
});

test("valores no numéricos o vacíos devuelven cero formateado", () => {
  assert.equal(money(undefined), "$ 0");
  assert.equal(money(null), "$ 0");
  assert.equal(money(""), "$ 0");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test src/lib/format.test.js`
Expected: FAIL — `Cannot find module '.../src/lib/format.js'`

- [ ] **Step 4: Write minimal implementation**

`src/lib/format.js`:

```js
export function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test src/lib/format.test.js`
Expected: `# pass 3`

- [ ] **Step 6: Swap el uso en `Cotizador.jsx`**

En `src/pages/Cotizador.jsx`, la función local (líneas 11-17) es:

```js
function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
```

Eliminar esa función completa y en su lugar, en el bloque de imports (línea 1-8), agregar:

```js
import { money } from "../lib/format.js";
```

(el resto de los imports existentes no cambia — la línea `import React, { forwardRef, ... } from "react";` y las siguientes quedan igual, solo se agrega esta línea nueva al final del bloque de imports).

- [ ] **Step 7: Actualizar el script de test en `package.json`**

En `package.json`, el script actual es:

```json
"test": "node --test src/lib/catalogMatch.test.js api/_lib.test.js"
```

Cambiar a:

```json
"test": "node --test src/lib/catalogMatch.test.js src/lib/format.test.js api/_lib.test.js"
```

- [ ] **Step 8: Correr toda la suite y verificar que nada se rompió**

Run: `npm test`
Expected: todos los tests existentes + los 3 nuevos pasan (`# pass` incluye los de `catalogMatch.test.js`, `format.test.js` y `_lib.test.js`).

- [ ] **Step 9: Smoke test manual — el PDF sigue mostrando montos correctos**

```bash
npm run dev
```

Abrir el wizard, ir a Resumen, verificar que los totales se siguen mostrando como `$ X.XXX` (mismo formato de siempre — el swap no debe cambiar nada visible).

- [ ] **Step 10: Commit**

```bash
git add src/lib/format.js src/lib/format.test.js src/pages/Cotizador.jsx package.json
git commit -m "refactor: extrae money() a src/lib/format.js"
```

---

### Task 2: Lógica pura de borradores (`src/lib/quoteDrafts.js`)

**Files:**
- Create: `src/lib/quoteDrafts.js`
- Test: `src/lib/quoteDrafts.test.js`
- Modify: `package.json` (agrega el nuevo test al script `test`)

**Interfaces:**
- Consumes: nada (módulo puro, sin `Date.now()`/`Math.random()` directos — todo lo no determinístico se inyecta).
- Produces:
  - `hasQuoteContent(patch: { lineItems?, clientDetails?, service? }) => boolean` — usado por `Cotizador.jsx` (Tarea 5).
  - `makeQuoteId() => string` — usado por `App.jsx` (Tarea 5).
  - `upsertQuoteRecord(quotes: Array, id: string|null, patch: object, deps: { now: string, makeId: () => string, nextNumber: (quotes) => string }) => { quotes: Array, record: object|null }` — usado por `App.jsx` (Tarea 5).

- [ ] **Step 1: Write the failing test**

`src/lib/quoteDrafts.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { hasQuoteContent, makeQuoteId, upsertQuoteRecord } from "./quoteDrafts.js";

test("hasQuoteContent: false para un borrador vacío", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: {}, service: "" }), false);
});

test("hasQuoteContent: true si hay al menos un ítem cargado", () => {
  assert.equal(hasQuoteContent({ lineItems: [{ detail: "Caño" }], clientDetails: {}, service: "" }), true);
});

test("hasQuoteContent: true si hay nombre de cliente", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: { name: "Juan" }, service: "" }), true);
});

test("hasQuoteContent: true si hay teléfono de cliente", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: { phone: "1122334455" }, service: "" }), true);
});

test("hasQuoteContent: true si hay título de trabajo", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: {}, service: "Reja" }), true);
});

test("hasQuoteContent: espacios en blanco no cuentan como contenido", () => {
  assert.equal(hasQuoteContent({ lineItems: [], clientDetails: { name: "   " }, service: "  " }), false);
});

test("makeQuoteId: genera strings no vacíos y distintos entre llamadas", () => {
  const a = makeQuoteId();
  const b = makeQuoteId();
  assert.equal(typeof a, "string");
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

test("upsertQuoteRecord: no materializa un borrador vacío sin id", () => {
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "new-id", nextNumber: () => "P-0001" };
  const { quotes, record } = upsertQuoteRecord([], null, { lineItems: [], clientDetails: {}, service: "" }, deps);
  assert.equal(record, null);
  assert.deepEqual(quotes, []);
});

test("upsertQuoteRecord: crea un registro nuevo cuando hay contenido y no hay id", () => {
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "new-id", nextNumber: () => "P-0001" };
  const patch = { lineItems: [{ detail: "Caño" }], clientDetails: { name: "Juan" }, service: "Reja", total: 1000 };
  const { quotes, record } = upsertQuoteRecord([], null, patch, deps);
  assert.equal(record.id, "new-id");
  assert.equal(record.number, "P-0001");
  assert.equal(record.createdAt, "2026-07-19T00:00:00.000Z");
  assert.equal(record.updatedAt, "2026-07-19T00:00:00.000Z");
  assert.equal(record.total, 1000);
  assert.deepEqual(quotes, [record]);
});

test("upsertQuoteRecord: actualiza un registro existente por id sin reasignar number ni createdAt", () => {
  const existing = { id: "q1", number: "P-0002", client: "Cliente viejo", total: 500, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" };
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "should-not-be-used", nextNumber: () => "should-not-be-used" };
  const { quotes, record } = upsertQuoteRecord([existing], "q1", { client: "Cliente nuevo", total: 900 }, deps);
  assert.equal(record.id, "q1");
  assert.equal(record.number, "P-0002");
  assert.equal(record.client, "Cliente nuevo");
  assert.equal(record.total, 900);
  assert.equal(record.createdAt, "2026-07-01T00:00:00.000Z");
  assert.equal(record.updatedAt, "2026-07-19T00:00:00.000Z");
  assert.deepEqual(quotes, [record]);
});

test("upsertQuoteRecord: no toca otros presupuestos de la lista", () => {
  const other = { id: "q0", number: "P-0001", total: 1 };
  const existing = { id: "q1", number: "P-0002", total: 500, createdAt: "x", updatedAt: "x" };
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "x", nextNumber: () => "x" };
  const { quotes } = upsertQuoteRecord([other, existing], "q1", { total: 900 }, deps);
  assert.equal(quotes.length, 2);
  assert.deepEqual(quotes[0], other);
});

test("upsertQuoteRecord: id que no existe en la lista se agrega igual (defensivo)", () => {
  const deps = { now: "2026-07-19T00:00:00.000Z", makeId: () => "x", nextNumber: () => "P-0001" };
  const { quotes, record } = upsertQuoteRecord([], "ghost-id", { total: 1 }, deps);
  assert.equal(record.id, "ghost-id");
  assert.equal(record.total, 1);
  assert.deepEqual(quotes, [record]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/quoteDrafts.test.js`
Expected: FAIL — `Cannot find module '.../src/lib/quoteDrafts.js'`

- [ ] **Step 3: Write minimal implementation**

`src/lib/quoteDrafts.js`:

```js
// Lógica pura de materialización/actualización de borradores de presupuesto.
// Sin Date.now()/Math.random() directos: lo no determinístico se inyecta vía `deps`
// para que sea 100% testeable con node:test.

export function hasQuoteContent(patch) {
  return Boolean(
    (patch.lineItems && patch.lineItems.length) ||
    patch.clientDetails?.name?.trim() ||
    patch.clientDetails?.phone?.trim() ||
    patch.service?.trim()
  );
}

export function makeQuoteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// patch: shape parcial de un quote (mismo shape que arma buildQuote() en Cotizador.jsx).
// deps.now: ISO string ya calculado por el caller (no Date.now() acá adentro).
export function upsertQuoteRecord(quotes, id, patch, { now, makeId, nextNumber }) {
  if (!id) {
    if (!hasQuoteContent(patch)) return { quotes, record: null };
    const record = { ...patch, id: makeId(), number: nextNumber(quotes), createdAt: now, updatedAt: now };
    return { quotes: [...quotes, record], record };
  }
  const existing = quotes.find((item) => item.id === id) || {};
  const record = { ...existing, ...patch, id, updatedAt: now };
  const found = quotes.some((item) => item.id === id);
  const nextQuotes = found ? quotes.map((item) => (item.id === id ? record : item)) : [...quotes, record];
  return { quotes: nextQuotes, record };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/quoteDrafts.test.js`
Expected: `# pass 11`

- [ ] **Step 5: Actualizar el script de test en `package.json`**

Cambiar (partiendo del estado dejado por la Tarea 1):

```json
"test": "node --test src/lib/catalogMatch.test.js src/lib/format.test.js api/_lib.test.js"
```

a:

```json
"test": "node --test src/lib/catalogMatch.test.js src/lib/format.test.js src/lib/quoteDrafts.test.js api/_lib.test.js"
```

- [ ] **Step 6: Correr toda la suite**

Run: `npm test`
Expected: todos los tests pasan (suma de las 4 suites).

- [ ] **Step 7: Commit**

```bash
git add src/lib/quoteDrafts.js src/lib/quoteDrafts.test.js package.json
git commit -m "feat: lógica pura de materialización/autoguardado de presupuestos"
```

---

### Task 3: Pantallas de Inicio y Lista de presupuestos

**Files:**
- Create: `src/pages/Inicio.jsx`
- Create: `src/pages/PresupuestosList.jsx`

**Interfaces:**
- Consumes: `Panel`, `Badge`, `Button`, `Icon` de `src/components/ui.jsx` (ya existen — ver `src/components/ui.jsx:1-113`); `money` de `src/lib/format.js` (Tarea 1).
- Produces:
  - `<Inicio quotes={Array} onNewQuote={() => void} onViewList={() => void} onContinueDraft={(id: string) => void} />`
  - `<PresupuestosList quotes={Array} onOpenQuote={(id: string) => void} onNewQuote={() => void} />`
  - Ambos consumidos por `App.jsx` en la Tarea 5. `quotes` es el array ya existente en `App.jsx` (cada item tiene, como mínimo tras la Tarea 2: `id`, `number`, `client`, `service`, `status`, `total`, `createdAt`, `updatedAt`).

Ninguno de los dos componentes es testeable con `node:test` (son JSX sin lógica pura extraíble) — no hay harness de componentes en este repo (no `@testing-library/react`). La verificación es visual, en la Tarea 5, una vez wireados a `App.jsx`. Esta tarea deja los archivos completos y correctos por contrato de props; no rompen nada porque todavía no los importa nadie.

- [ ] **Step 1: Crear `src/pages/Inicio.jsx`**

```jsx
import React from "react";
import { Panel, Button, Icon } from "../components/ui.jsx";

function mostRecentDraft(quotes) {
  const drafts = quotes.filter((quote) => quote.status === "Borrador");
  if (!drafts.length) return null;
  return drafts.reduce((latest, quote) => ((quote.updatedAt || "") > (latest.updatedAt || "") ? quote : latest));
}

export default function Inicio({ quotes, onNewQuote, onViewList, onContinueDraft }) {
  const draft = mostRecentDraft(quotes);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
      <button
        onClick={onNewQuote}
        className="flex flex-col items-center justify-center gap-2 rounded-lg bg-primary px-6 py-10 text-white shadow-sm transition active:scale-[0.98]"
      >
        <Icon name="add_circle" className="text-[40px]" />
        <span className="text-lg font-bold uppercase tracking-wide">Nuevo presupuesto</span>
      </button>

      <Button variant="ghost" icon="list_alt" onClick={onViewList} className="w-full justify-center py-3">
        Ver presupuestos
      </Button>

      {draft && (
        <Panel className="p-4">
          <button onClick={() => onContinueDraft(draft.id)} className="flex w-full items-center gap-3 text-left">
            <Icon name="edit_note" className="text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface">Tenés un presupuesto sin terminar</p>
              <p className="truncate text-xs text-on-surface-variant">{draft.service || "Sin título"} — continuar</p>
            </div>
            <Icon name="chevron_right" className="text-on-surface-variant" />
          </button>
        </Panel>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/pages/PresupuestosList.jsx`**

```jsx
import React from "react";
import { Panel, Badge, Button, Icon } from "../components/ui.jsx";
import { money } from "../lib/format.js";

const STATUS_TONE = { Borrador: "neutral", Enviado: "primary", Aceptado: "success", "No aceptado": "warning", Vencido: "warning" };

function sortedByRecent(quotes) {
  return [...quotes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export default function PresupuestosList({ quotes, onOpenQuote, onNewQuote }) {
  const items = sortedByRecent(quotes);

  if (!items.length) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-12 text-center">
        <Icon name="request_quote" className="text-[40px] text-on-surface-variant" />
        <p className="text-sm text-on-surface-variant">Todavía no tenés presupuestos guardados.</p>
        <Button onClick={onNewQuote} icon="add">Nuevo presupuesto</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3 py-4">
      {items.map((quote) => (
        <button key={quote.id} onClick={() => onOpenQuote(quote.id)} className="text-left">
          <Panel className="p-4 transition active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">{quote.client || "Cliente sin nombre"}</p>
                <p className="truncate text-xs text-on-surface-variant">{quote.service || "Sin título"}</p>
              </div>
              <Badge tone={STATUS_TONE[quote.status] || "neutral"}>{quote.status}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-on-surface-variant">
              <span>{quote.updatedAt ? new Date(quote.updatedAt).toLocaleDateString("es-AR") : ""}</span>
              <span className="font-mono text-sm font-bold text-primary">{money(quote.total)}</span>
            </div>
          </Panel>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verificar que no hay errores de import**

Run: `npm run build`
Expected: build exitoso (`vite build` compila igual que antes — estos dos archivos nuevos no se importan todavía desde ningún lado, así que solo se está verificando que no tengan errores de sintaxis que Vite detecte si algo más los tocara).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Inicio.jsx src/pages/PresupuestosList.jsx
git commit -m "feat: pantallas de Inicio y lista de presupuestos"
```

---

### Task 4: Navegación — pestaña "Inicio" y vistas del wizard en `AppShell.jsx`

**Files:**
- Modify: `src/components/AppShell.jsx`

**Interfaces:**
- Consumes: nada nuevo (sigue usando `Icon` de `./ui.jsx`).
- Produces: `AppShell` gana las props `quoteView` (`"home" | "wizard" | "list"`, default `"wizard"` — el default preserva el comportamiento actual si el caller todavía no la pasa) y `onGoHome` (`() => void`, default no-op) y `autosaveStatus` (`"idle" | "pending" | "saved"`, default `"idle"`). Consumidas por `App.jsx` en la Tarea 5.

Con los defaults elegidos, esta tarea no rompe nada: `App.jsx` (sin tocar todavía) no pasa estas props, así que `quoteView` cae en `"wizard"` — exactamente el comportamiento actual (header con progreso + barra inferior siempre visibles en la sección "presupuestos"). La app debe verse y comportarse igual que antes de esta tarea.

- [ ] **Step 1: Actualizar `MOBILE_TABS` — la pestaña pasa a llamarse "Inicio"**

En `src/components/AppShell.jsx`, reemplazar (líneas 18-23):

```js
const MOBILE_TABS = [
  { key: "presupuestos", label: "Presupuesto", icon: "request_quote", kind: "quote" },
  { key: "materiales", label: "Materiales", icon: "inventory_2", kind: "config" },
  { key: "manodeobra", label: "Mano de obra", icon: "engineering", kind: "config" },
  { key: "general", label: "Ajustes", icon: "settings", kind: "config" },
];
```

por:

```js
const MOBILE_TABS = [
  { key: "presupuestos", label: "Inicio", icon: "home", kind: "quote" },
  { key: "materiales", label: "Materiales", icon: "inventory_2", kind: "config" },
  { key: "manodeobra", label: "Mano de obra", icon: "engineering", kind: "config" },
  { key: "general", label: "Ajustes", icon: "settings", kind: "config" },
];
```

- [ ] **Step 2: Agregar las nuevas props con default y el handler `handleGoHome`**

Reemplazar la firma del componente y `handleMobileTab` (líneas 25-43):

```js
export default function AppShell({ activeSection, configTab, onQuoteStep, quoteStep, onConfigTab, quoteNumber, quoteStatus, onGeneratePdf, children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const stepIndex = Math.max(0, QUOTE_STEPS.findIndex((item) => item.key === quoteStep));
  const currentStep = QUOTE_STEPS[stepIndex];

  function handleQuoteStep(step) {
    onQuoteStep(step);
    setMobileNavOpen(false);
  }

  function handleConfigTab(tab) {
    onConfigTab(tab);
    setMobileNavOpen(false);
  }

  function handleMobileTab(item) {
    if (item.kind === "quote") handleQuoteStep(quoteStep || "datosEmpresa");
    else handleConfigTab(item.key);
  }
```

por:

```js
export default function AppShell({
  activeSection, configTab, onQuoteStep, quoteStep, onConfigTab, quoteNumber, quoteStatus, onGeneratePdf, children,
  quoteView = "wizard", onGoHome = () => {}, autosaveStatus = "idle",
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const stepIndex = Math.max(0, QUOTE_STEPS.findIndex((item) => item.key === quoteStep));
  const currentStep = QUOTE_STEPS[stepIndex];

  function handleQuoteStep(step) {
    onQuoteStep(step);
    setMobileNavOpen(false);
  }

  function handleConfigTab(tab) {
    onConfigTab(tab);
    setMobileNavOpen(false);
  }

  function handleGoHome() {
    onGoHome();
    setMobileNavOpen(false);
  }

  function handleMobileTab(item) {
    if (item.kind === "quote") handleGoHome();
    else handleConfigTab(item.key);
  }
```

- [ ] **Step 3: Gatear el subtítulo del header y la barra de progreso por `quoteView === "wizard"`**

Reemplazar (líneas 56-73):

```jsx
        <div className="min-w-0 md:contents">
          <span className="block text-base font-bold tracking-tight text-on-surface md:text-lg md:text-primary">Cotizador</span>
          {activeSection === "presupuestos" && <span className="block truncate text-xs text-on-surface-variant md:hidden">{currentStep.label}</span>}
        </div>
        <button onClick={onGeneratePdf} className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-primary/10 md:hidden" aria-label="Generar PDF">
          <Icon name="picture_as_pdf" />
        </button>
        </div>
        {activeSection === "presupuestos" && (
          <div className="flex h-10 items-center gap-3 border-t border-outline/70 md:hidden">
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">{stepIndex + 1}/5</span>
            <div className="flex flex-1 items-center gap-1.5" aria-label={`Paso ${stepIndex + 1} de 5`}>
              {QUOTE_STEPS.map((item, index) => (
                <span key={item.key} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-primary" : "bg-outline"}`} />
              ))}
            </div>
          </div>
        )}
```

por:

```jsx
        <div className="min-w-0 md:contents">
          <span className="block text-base font-bold tracking-tight text-on-surface md:text-lg md:text-primary">Cotizador</span>
          {activeSection === "presupuestos" && quoteView === "wizard" && (
            <span className="block truncate text-xs text-on-surface-variant md:hidden">
              {currentStep.label}
              {autosaveStatus === "pending" && " · Guardando…"}
              {autosaveStatus === "saved" && " · Guardado"}
            </span>
          )}
        </div>
        <button onClick={onGeneratePdf} className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-primary/10 md:hidden" aria-label="Generar PDF">
          <Icon name="picture_as_pdf" />
        </button>
        </div>
        {activeSection === "presupuestos" && quoteView === "wizard" && (
          <div className="flex h-10 items-center gap-3 border-t border-outline/70 md:hidden">
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">{stepIndex + 1}/5</span>
            <div className="flex flex-1 items-center gap-1.5" aria-label={`Paso ${stepIndex + 1} de 5`}>
              {QUOTE_STEPS.map((item, index) => (
                <span key={item.key} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-primary" : "bg-outline"}`} />
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 4: Agregar el ítem "Inicio" al sidebar de escritorio**

Reemplazar el inicio del `<nav>` del sidebar (líneas 105-106):

```jsx
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {QUOTE_STEPS.map((step) => {
```

por:

```jsx
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            <button
              onClick={handleGoHome}
              className={`flex items-center gap-3 rounded px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition-all active:scale-[0.98] ${
                activeSection === "presupuestos" && quoteView === "home" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <Icon name="home" className="text-[18px]" />
              Inicio
            </button>
            {QUOTE_STEPS.map((step) => {
```

- [ ] **Step 5: Gatear la barra fija inferior de "Siguiente/Generar PDF" por `quoteView === "wizard"`**

Reemplazar (línea 155):

```jsx
      {activeSection === "presupuestos" && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-outline bg-surface-container-lowest px-4 py-3 md:hidden">
```

por:

```jsx
      {activeSection === "presupuestos" && quoteView === "wizard" && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-outline bg-surface-container-lowest px-4 py-3 md:hidden">
```

- [ ] **Step 6: Verificar que el comportamiento por defecto no cambió**

```bash
npm run dev
```

En el navegador (mobile viewport): la app debe verse y comportarse EXACTAMENTE igual que antes de esta tarea (la pestaña ahora dice "Inicio" con ícono de casa, pero como nadie pasa `quoteView` todavía, sigue mostrando el wizard directo con el header de progreso — es el default `quoteView = "wizard"` haciendo su trabajo). Tocar la pestaña "Inicio" debe seguir llevando al wizard como antes (porque `onGoHome` default es no-op, así que `handleGoHome` solo cierra el drawer).

- [ ] **Step 7: Commit**

```bash
git add src/components/AppShell.jsx
git commit -m "feat: navegación de Inicio en AppShell (con defaults que no rompen el flujo actual)"
```

---

### Task 5: Integrar todo — `App.jsx` y `Cotizador.jsx`

**Files:**
- Modify: `src/App.jsx` (reescritura completa — el archivo es corto, 144 líneas)
- Modify: `src/pages/Cotizador.jsx` (varios cambios puntuales)

**Interfaces:**
- Consumes: `upsertQuoteRecord`, `makeQuoteId` de `src/lib/quoteDrafts.js` (Tarea 2); `Inicio` de `src/pages/Inicio.jsx` (Tarea 3); `PresupuestosList` de `src/pages/PresupuestosList.jsx` (Tarea 3); `quoteView`/`onGoHome`/`autosaveStatus` de `AppShell` (Tarea 4).
- Produces: la app funcional completa. No hay Tarea 6 — esta es la integración final.

Esta es la única tarea donde `App.jsx` y `Cotizador.jsx` deben cambiar juntos: `Cotizador.jsx` deja de recibir `quotes`/`setQuotes`/`persistRecord`/`getDocumentNumber` y empieza a depender de `onQuoteChange` para persistir — si esto se hiciera en tareas separadas, quedaría un estado intermedio donde "Generar PDF" no guarda nada. Por eso van juntos, con una verificación manual end-to-end al final.

- [ ] **Step 1: Reescribir `src/App.jsx` completo**

```jsx
import React, { useEffect, useRef, useState } from "react";
import Cotizador from "./pages/Cotizador.jsx";
import Materiales from "./pages/Materiales.jsx";
import ManoDeObra from "./pages/ManoDeObra.jsx";
import Configuracion from "./pages/Configuracion.jsx";
import Inicio from "./pages/Inicio.jsx";
import PresupuestosList from "./pages/PresupuestosList.jsx";
import AppShell from "./components/AppShell.jsx";
import { laborRates as defaultLaborRates, materialPriceCatalog as defaultMaterials, quoteParameters as defaultQuoteParameters } from "./pricingData.js";
import { upsertQuoteRecord, makeQuoteId } from "./lib/quoteDrafts.js";

// Persistencia local: reemplaza la capa Supabase del ERP.
function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Numeración automática local (equivale a getDocumentNumber del ERP).
function nextLocalNumber(items, prefix, padding = 4) {
  const max = items.reduce((highest, item) => {
    const match = String(item.number || "").match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(padding, "0")}`;
}

// localStorage puede fallar (quota: Safari corta en 5MB y el catálogo completo
// pesa ~9MB serializado). Un throw dentro de un useEffect desmonta toda la app,
// así que la persistencia nunca debe ser fatal.
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin espacio: la app sigue funcionando desde pricingData.js en memoria.
  }
}

// El catálogo completo no entra en localStorage en todos los navegadores, así
// que se persiste sólo el diff contra pricingData.js: ítems agregados, editados
// y borrados. Normalmente son pocos bytes.
function materialsDiff(materials) {
  const defaultById = new Map(defaultMaterials.map((item) => [item.id, JSON.stringify(item)]));
  const currentIds = new Set();
  const changed = [];
  for (const item of materials) {
    currentIds.add(item.id);
    const original = defaultById.get(item.id);
    if (!original) changed.push(item); // agregado manualmente
    else if (original !== JSON.stringify(item)) changed.push(item); // editado
  }
  const removedIds = defaultMaterials.filter((item) => !currentIds.has(item.id)).map((item) => item.id);
  return { changed, removedIds };
}

function applyMaterialsDiff(diff) {
  if (!diff || (!diff.changed?.length && !diff.removedIds?.length)) return defaultMaterials;
  const removed = new Set(diff.removedIds || []);
  const changedById = new Map((diff.changed || []).map((item) => [item.id, item]));
  const base = defaultMaterials.filter((item) => !removed.has(item.id)).map((item) => changedById.get(item.id) || item);
  const baseIds = new Set(base.map((item) => item.id));
  const added = (diff.changed || []).filter((item) => !baseIds.has(item.id));
  return [...base, ...added];
}

export default function App() {
  const [companies, setCompanies] = useState(() => loadLocal("cotizador.companies", []));
  const [quotes, setQuotes] = useState(() => loadLocal("cotizador.quotes", []));
  const [materials, setMaterials] = useState(() => {
    try { localStorage.removeItem("cotizador.materials"); } catch {} // caché legado de ~9MB; libera quota
    return applyMaterialsDiff(loadLocal("cotizador.materialsDiff", null));
  });
  const [laborRates, setLaborRates] = useState(() => loadLocal("cotizador.laborRates", defaultLaborRates));
  const [quoteParameters, setQuoteParameters] = useState(() => loadLocal("cotizador.quoteParameters", defaultQuoteParameters));

  const [activeSection, setActiveSection] = useState("presupuestos");
  const [configTab, setConfigTab] = useState("materiales");
  const [quoteStep, setQuoteStep] = useState("datosEmpresa");
  const [quoteView, setQuoteView] = useState("home"); // "home" | "wizard" | "list"
  const [activeQuoteId, setActiveQuoteId] = useState(null);
  const [mountKey, setMountKey] = useState(0);
  const [autosaveStatus, setAutosaveStatus] = useState("idle"); // "idle" | "pending" | "saved"
  const [lightboxImage, setLightboxImage] = useState(null);
  const cotizadorRef = useRef(null);

  useEffect(() => { saveLocal("cotizador.companies", companies); }, [companies]);
  useEffect(() => { saveLocal("cotizador.quotes", quotes); }, [quotes]);
  useEffect(() => { saveLocal("cotizador.materialsDiff", materialsDiff(materials)); }, [materials]);
  useEffect(() => { saveLocal("cotizador.laborRates", laborRates); }, [laborRates]);
  useEffect(() => { saveLocal("cotizador.quoteParameters", quoteParameters); }, [quoteParameters]);

  const activeQuote = quotes.find((quote) => quote.id === activeQuoteId) || null;

  function startNewQuote() {
    setActiveQuoteId(null);
    setMountKey((key) => key + 1);
    setQuoteStep("datosEmpresa");
    setQuoteView("wizard");
  }

  function openQuote(id) {
    setActiveQuoteId(id);
    setMountKey((key) => key + 1);
    setQuoteStep("datosEmpresa");
    setQuoteView("wizard");
  }

  function goHome() {
    setQuoteView("home");
  }

  function upsertQuote(id, patch) {
    const { quotes: nextQuotes, record } = upsertQuoteRecord(quotes, id, patch, {
      now: new Date().toISOString(),
      makeId: makeQuoteId,
      nextNumber: (items) => nextLocalNumber(items, "P", 4),
    });
    if (record) {
      setQuotes(nextQuotes);
      if (record.id !== id) setActiveQuoteId(record.id);
    }
    return record;
  }

  return (
    <AppShell
      activeSection={activeSection}
      configTab={configTab}
      onConfigTab={(tab) => { setConfigTab(tab); setActiveSection("configuracion"); }}
      quoteStep={quoteStep}
      onQuoteStep={(step) => { setQuoteStep(step); setActiveSection("presupuestos"); setQuoteView("wizard"); }}
      quoteView={quoteView}
      onGoHome={() => { setActiveSection("presupuestos"); goHome(); }}
      autosaveStatus={autosaveStatus}
      quoteNumber={activeQuote?.number || "Nuevo presupuesto"}
      quoteStatus={activeQuote?.status || "En borrador"}
      onGeneratePdf={() => cotizadorRef.current?.generatePdf()}
    >
      {activeSection === "configuracion" && configTab === "materiales" && <Materiales materials={materials} setMaterials={setMaterials} />}
      {activeSection === "configuracion" && configTab === "manodeobra" && <ManoDeObra laborRates={laborRates} setLaborRates={setLaborRates} />}
      {activeSection === "configuracion" && configTab === "general" && <Configuracion quoteParameters={quoteParameters} setQuoteParameters={setQuoteParameters} />}

      {activeSection === "presupuestos" && quoteView === "home" && (
        <Inicio quotes={quotes} onNewQuote={startNewQuote} onViewList={() => setQuoteView("list")} onContinueDraft={openQuote} />
      )}
      {activeSection === "presupuestos" && quoteView === "list" && (
        <PresupuestosList quotes={quotes} onOpenQuote={openQuote} onNewQuote={startNewQuote} />
      )}
      <div style={{ display: activeSection === "presupuestos" && quoteView === "wizard" ? "block" : "none" }}>
        <Cotizador
          key={mountKey}
          ref={cotizadorRef}
          companies={companies}
          setCompanies={setCompanies}
          materials={materials}
          laborRates={laborRates}
          quoteParameters={quoteParameters}
          step={quoteStep}
          setStep={setQuoteStep}
          lightboxImage={lightboxImage}
          setLightboxImage={setLightboxImage}
          initialQuote={activeQuote}
          activeQuoteId={activeQuoteId}
          activeQuoteNumber={activeQuote?.number || null}
          onQuoteChange={upsertQuote}
          onDone={goHome}
          onSavingStatusChange={setAutosaveStatus}
        />
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative w-full max-w-xl overflow-hidden rounded-lg bg-surface-container-lowest shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline px-4 py-3">
              <p className="truncate pr-4 text-sm font-semibold text-on-surface">{lightboxImage.name}</p>
              <button onClick={() => setLightboxImage(null)} className="shrink-0 text-lg leading-none text-on-surface-variant hover:text-primary">✕</button>
            </div>
            <div className="flex min-h-[280px] items-center justify-center bg-surface-container-low p-6">
              <img src={lightboxImage.src} alt={lightboxImage.name} className="max-h-72 max-w-full object-contain" onError={(e) => { e.target.src = ""; e.target.alt = "Sin imagen"; }} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
```

- [ ] **Step 2: `Cotizador.jsx` — agregar el import de `hasQuoteContent`**

En el bloque de imports (después del cambio de la Tarea 1, que ya agregó `import { money } from "../lib/format.js";`), agregar una línea más:

```js
import { hasQuoteContent } from "../lib/quoteDrafts.js";
```

- [ ] **Step 3: `Cotizador.jsx` — cambiar la firma del componente y sembrar estado desde `initialQuote`**

Reemplazar (la función `Cotizador` arranca así, hasta la declaración de `lineItems`):

```js
const Cotizador = forwardRef(function Cotizador(
  { companies, setCompanies, quotes, setQuotes, persistRecord, getDocumentNumber, materials, laborRates, quoteParameters, step, setStep, lightboxImage, setLightboxImage },
  ref
) {
  const defaultValidUntil = addDaysIso(quoteParameters.offerValidityDays || 7);
  const [clientMode, setClientMode] = useState("existing");
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.name || "");
  const [clientDetails, setClientDetails] = useState({ name: companies[0]?.name || "", taxId: "", contact: companies[0]?.contact || "", phone: companies[0]?.phone || "", email: "", address: "" });
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [lineItems, setLineItems] = useState([]);
```

por:

```js
const Cotizador = forwardRef(function Cotizador(
  {
    companies, setCompanies, materials, laborRates, quoteParameters, step, setStep, lightboxImage, setLightboxImage,
    initialQuote = null, activeQuoteId = null, activeQuoteNumber = null,
    onQuoteChange = () => null, onDone = () => {}, onSavingStatusChange = () => {},
  },
  ref
) {
  const defaultValidUntil = addDaysIso(quoteParameters.offerValidityDays || 7);
  const [clientMode, setClientMode] = useState(() => (initialQuote ? "new" : "existing"));
  const [selectedCompany, setSelectedCompany] = useState(() => (initialQuote ? "" : companies[0]?.name || ""));
  const [clientDetails, setClientDetails] = useState(() => initialQuote?.clientDetails || { name: companies[0]?.name || "", taxId: "", contact: companies[0]?.contact || "", phone: companies[0]?.phone || "", email: "", address: "" });
  const [validUntil, setValidUntil] = useState(() => initialQuote?.validUntil || defaultValidUntil);
  const [lineItems, setLineItems] = useState(() => initialQuote?.lineItems || []);
  const [quoteNumber, setQuoteNumber] = useState(() => initialQuote?.number || null);
```

- [ ] **Step 4: `Cotizador.jsx` — sembrar `jobTitle` desde `initialQuote`**

Reemplazar:

```js
  const [jobTitle, setJobTitle] = useState("");
```

por:

```js
  const [jobTitle, setJobTitle] = useState(() => initialQuote?.jobTitle || "");
```

- [ ] **Step 5: `Cotizador.jsx` — agregar el efecto de autoguardado**

Inmediatamente después de este bloque existente (buscar este texto exacto):

```js
  useEffect(() => {
    if (!materialFeedback) return;
    const timer = setTimeout(() => setMaterialFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [materialFeedback]);
```

agregar, justo debajo:

```js

  useEffect(() => {
    if (activeQuoteNumber && !quoteNumber) setQuoteNumber(activeQuoteNumber);
  }, [activeQuoteNumber, quoteNumber]);

  useEffect(() => {
    const draftPreview = { lineItems, clientDetails, service: jobTitle.trim() };
    if (!activeQuoteId && !hasQuoteContent(draftPreview)) return;
    onSavingStatusChange("pending");
    const timer = setTimeout(() => {
      const draft = buildQuote(quoteNumber);
      const saved = onQuoteChange(activeQuoteId, draft);
      if (saved?.number && saved.number !== quoteNumber) setQuoteNumber(saved.number);
      onSavingStatusChange("saved");
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientDetails, lineItems, jobTitle, validUntil]);
```

- [ ] **Step 6: `Cotizador.jsx` — agregar `jobTitle` al shape de `buildQuote`**

Reemplazar (la función `buildQuote` termina con este `return`):

```js
    return {
      number,
      client: clientDetails.name || selectedCompany || "Cliente sin nombre",
      service: jobTitle.trim() || normalizedLines.find((l) => l.type !== "title")?.detail || "Presupuesto",
      subtotal,
      tax,
      total,
      ivaRate: Number(quoteParameters.iva || 0),
      status: "Borrador",
      validUntil,
      lineItems: normalizedLines,
      clientDetails,
    };
```

por:

```js
    return {
      number,
      client: clientDetails.name || selectedCompany || "Cliente sin nombre",
      service: jobTitle.trim() || normalizedLines.find((l) => l.type !== "title")?.detail || "Presupuesto",
      jobTitle: jobTitle.trim(),
      subtotal,
      tax,
      total,
      ivaRate: Number(quoteParameters.iva || 0),
      status: "Borrador",
      validUntil,
      lineItems: normalizedLines,
      clientDetails,
    };
```

- [ ] **Step 7: `Cotizador.jsx` — reescribir `saveQuote`**

Reemplazar la función completa `saveQuote`:

```js
  async function saveQuote({ openPdf = false, pdfWindow = null } = {}) {
    if (openPdf && generatedQuote) {
      generateQuotePdf(generatedQuote, pdfWindow);
      return generatedQuote;
    }

    setSaving(true);
    try {
      let companyName = clientDetails.name?.trim();
      if (clientMode === "new" && companyName && !companies.some((company) => normalizeKey(company.name) === normalizeKey(companyName))) {
        const record = {
          id: Date.now(),
          name: companyName,
          type: "Cliente",
          city: clientDetails.address || "Neuquen",
          status: "Prospecto",
          contact: clientDetails.contact || "Sin asignar",
          phone: clientDetails.phone || "-",
          contacts: [{ name: clientDetails.contact || "Sin asignar", role: "Principal", phone: clientDetails.phone || "-", email: clientDetails.email || "" }],
          next: "Seguimiento presupuesto",
          value: total,
        };
        setCompanies((items) => [...items, record]);
        await persistRecord("companies", record);
      }

      const number = await getDocumentNumber("quote", quotes, "P", 4);
      const quote = buildQuote(number);
      setQuotes((items) => [...items, quote]);
      await persistRecord("quotes", quote);
      setGeneratedQuote(quote);
      if (openPdf) generateQuotePdf(quote, pdfWindow);
      return quote;
    } catch (error) {
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.document.open();
        pdfWindow.document.write(`
          <!doctype html>
          <html>
            <head><title>Error al generar presupuesto</title></head>
            <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#fff5f5;font-family:Arial,sans-serif;color:#991b1b">
              <div style="max-width:520px;padding:24px;border:1px solid #fecaca;border-radius:10px;background:white">
                <h1 style="margin:0 0 8px;font-size:22px">No se pudo generar el PDF</h1>
                <p style="margin:0;color:#52525b">${htmlEscape(error?.message || "Error desconocido")}</p>
              </div>
            </body>
          </html>
        `);
        pdfWindow.document.close();
      }
      throw error;
    } finally {
      setSaving(false);
    }
  }
```

por:

```js
  async function saveQuote({ openPdf = false, pdfWindow = null } = {}) {
    if (openPdf && generatedQuote) {
      generateQuotePdf(generatedQuote, pdfWindow);
      return generatedQuote;
    }

    setSaving(true);
    try {
      let companyName = clientDetails.name?.trim();
      if (clientMode === "new" && companyName && !companies.some((company) => normalizeKey(company.name) === normalizeKey(companyName))) {
        const record = {
          id: Date.now(),
          name: companyName,
          type: "Cliente",
          city: clientDetails.address || "Neuquen",
          status: "Prospecto",
          contact: clientDetails.contact || "Sin asignar",
          phone: clientDetails.phone || "-",
          contacts: [{ name: clientDetails.contact || "Sin asignar", role: "Principal", phone: clientDetails.phone || "-", email: clientDetails.email || "" }],
          next: "Seguimiento presupuesto",
          value: total,
        };
        setCompanies((items) => [...items, record]);
      }

      const draft = buildQuote(quoteNumber);
      const saved = onQuoteChange(activeQuoteId, draft);
      if (saved?.number && saved.number !== quoteNumber) setQuoteNumber(saved.number);
      if (saved) {
        setGeneratedQuote(saved);
        if (openPdf) generateQuotePdf(saved, pdfWindow);
      }
      return saved;
    } catch (error) {
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.document.open();
        pdfWindow.document.write(`
          <!doctype html>
          <html>
            <head><title>Error al generar presupuesto</title></head>
            <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#fff5f5;font-family:Arial,sans-serif;color:#991b1b">
              <div style="max-width:520px;padding:24px;border:1px solid #fecaca;border-radius:10px;background:white">
                <h1 style="margin:0 0 8px;font-size:22px">No se pudo generar el PDF</h1>
                <p style="margin:0;color:#52525b">${htmlEscape(error?.message || "Error desconocido")}</p>
              </div>
            </body>
          </html>
        `);
        pdfWindow.document.close();
      }
      throw error;
    } finally {
      setSaving(false);
    }
  }
```

- [ ] **Step 8: `Cotizador.jsx` — "Guardar y continuar más tarde" ahora navega a Inicio**

Reemplazar, en el render final del componente (bloque `<DatosEmpresaStep ...>`):

```jsx
      onSaveDraft={() => saveQuote({ openPdf: false })} saving={saving} generatedQuote={generatedQuote}
```

por:

```jsx
      onSaveDraft={async () => { await saveQuote({ openPdf: false }); onDone(); }} saving={saving} generatedQuote={generatedQuote}
```

- [ ] **Step 9: Correr la suite de tests (nada de esto debería romperse — son archivos distintos)**

Run: `npm test`
Expected: todos los tests pasan (esta tarea no tocó ningún módulo con tests).

- [ ] **Step 10: Verificación manual end-to-end**

```bash
npm run dev
```

En el navegador (mobile viewport, `npm run dev` en `http://127.0.0.1:5173`):

1. Abrir la app → aterriza en **Inicio**, sin avisos de borrador (primera vez, `quotes` vacío).
2. Tocar **"Nuevo presupuesto"** → entra al wizard, paso "Datos Empresa", header sin "Guardando…" todavía (nada cargado).
3. Cargar un nombre de cliente nuevo (modo "Empresa nueva") → esperar ~1 segundo → el header debe mostrar "· Guardando…" y luego "· Guardado".
4. Tocar la pestaña inferior **"Inicio"** → vuelve a Inicio y ahora aparece la tarjeta "Tenés un presupuesto sin terminar" con el nombre cargado.
5. Tocar esa tarjeta → reabre el wizard en "Datos Empresa" con los datos previamente cargados intactos.
6. Ir al paso Materiales, agregar un material → volver a Inicio → **"Ver presupuestos"** → aparece la tarjeta con cliente, estado "Borrador", fecha de hoy y el subtotal correcto.
7. Tocar esa tarjeta desde la lista → reabre el wizard con el material ya cargado.
8. Completar y tocar **"Generar PDF"** (paso Resumen o botón del header) → se abre la ventana de impresión con los datos correctos, sin duplicar la entrada en la lista (volver a "Ver presupuestos" y confirmar que sigue habiendo una sola tarjeta para este presupuesto, no dos).
9. Recargar la página del navegador por completo → debe aterrizar en Inicio de nuevo (no auto-resume del wizard) — si había un borrador sin PDF generado, el aviso de "presupuesto sin terminar" debe seguir apareciendo.
10. Consola del navegador sin errores en ningún paso.

- [ ] **Step 11: Commit**

```bash
git add src/App.jsx src/pages/Cotizador.jsx
git commit -m "feat: pantalla de Inicio, autoguardado del borrador y reabrir desde la lista"
```

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec:** pestaña "Inicio" (T4), autoguardado sin botón con materialización en el primer cambio real (T2+T5), reabrir con remount limpio vía `mountKey` que NO se dispara en el primer autoguardado (T5 Step 1 `upsertQuote` / Step 5 efecto de autoguardado), lista de presupuestos con tarjetas (T3+T5), indicador "Guardando…/Guardado" en el header (T4 Step 3 + T5 Step 5), "Guardar y continuar más tarde" ahora navega a Inicio (T5 Step 8), sidebar de escritorio con ítem "Inicio" sin romper el salto directo a pasos (T4 Step 4). Fuera de alcance (duplicar, eliminar, unificar wizard, filtros, WhatsApp) respetado — no se tocó.
- **Placeholders:** ninguno; todo step tiene código completo y real.
- **Consistencia de tipos:** `upsertQuoteRecord(quotes, id, patch, { now, makeId, nextNumber }) => { quotes, record }` igual en T2 (definición + tests) y T5 (uso en `App.jsx`). `onQuoteChange(id, patch) => record|null` igual en T5 Step 1 (`App.jsx` pasa `upsertQuote`) y T5 Steps 5/7 (`Cotizador.jsx` lo llama y usa `saved.number`). `hasQuoteContent(patch)` con el mismo shape `{ lineItems, clientDetails, service }` en T2 (tests) y T5 Step 5 (`draftPreview`). `money(value) => string` igual en T1 (definición) y T3 (`PresupuestosList.jsx`).
- **Riesgo de remount que pierde datos (el bug que se corrigió en el spec):** verificado explícitamente — `mountKey` solo cambia en `startNewQuote`/`openQuote` (T5 Step 1), nunca dentro de `upsertQuote`. El efecto de autoguardado en `Cotizador.jsx` (T5 Step 5) actualiza `quoteNumber` vía `setQuoteNumber` local, sin depender de un remount para enterarse del id/number asignado.
