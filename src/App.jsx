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
