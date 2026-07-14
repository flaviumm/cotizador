import React, { useEffect, useRef, useState } from "react";
import Cotizador from "./pages/Cotizador.jsx";
import Materiales from "./pages/Materiales.jsx";
import ManoDeObra from "./pages/ManoDeObra.jsx";
import Configuracion from "./pages/Configuracion.jsx";
import AppShell from "./components/AppShell.jsx";
import { laborRates as defaultLaborRates, materialPriceCatalog as defaultMaterials, quoteParameters as defaultQuoteParameters } from "./pricingData.js";

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

export default function App() {
  const [companies, setCompanies] = useState(() => loadLocal("cotizador.companies", []));
  const [quotes, setQuotes] = useState(() => loadLocal("cotizador.quotes", []));
  const [materials, setMaterials] = useState(() => loadLocal("cotizador.materials", defaultMaterials));
  const [laborRates, setLaborRates] = useState(() => loadLocal("cotizador.laborRates", defaultLaborRates));
  const [quoteParameters, setQuoteParameters] = useState(() => loadLocal("cotizador.quoteParameters", defaultQuoteParameters));

  const [activeSection, setActiveSection] = useState("presupuestos");
  const [quoteStep, setQuoteStep] = useState("datosEmpresa");
  const [lightboxImage, setLightboxImage] = useState(null);
  const cotizadorRef = useRef(null);

  useEffect(() => { localStorage.setItem("cotizador.companies", JSON.stringify(companies)); }, [companies]);
  useEffect(() => { localStorage.setItem("cotizador.quotes", JSON.stringify(quotes)); }, [quotes]);
  useEffect(() => { localStorage.setItem("cotizador.materials", JSON.stringify(materials)); }, [materials]);
  useEffect(() => { localStorage.setItem("cotizador.laborRates", JSON.stringify(laborRates)); }, [laborRates]);
  useEffect(() => { localStorage.setItem("cotizador.quoteParameters", JSON.stringify(quoteParameters)); }, [quoteParameters]);

  // El estado ya se persiste por efecto; persistRecord solo cumple el contrato async del componente.
  const persistRecord = async () => {};
  const getDocumentNumber = async (_type, items, prefix, padding) => nextLocalNumber(items, prefix, padding);

  return (
    <AppShell
      activeSection={activeSection}
      onNavigate={setActiveSection}
      quoteStep={quoteStep}
      onQuoteStep={setQuoteStep}
      quoteNumber="Nuevo presupuesto"
      quoteStatus="En borrador"
      onGeneratePdf={() => cotizadorRef.current?.generatePdf()}
    >
      {activeSection === "materiales" && <Materiales materials={materials} setMaterials={setMaterials} />}
      {activeSection === "manodeobra" && <ManoDeObra laborRates={laborRates} setLaborRates={setLaborRates} />}
      {activeSection === "configuracion" && <Configuracion quoteParameters={quoteParameters} setQuoteParameters={setQuoteParameters} />}
      <div style={{ display: activeSection === "presupuestos" ? "block" : "none" }}>
        <Cotizador
          ref={cotizadorRef}
          companies={companies}
          setCompanies={setCompanies}
          quotes={quotes}
          setQuotes={setQuotes}
          persistRecord={persistRecord}
          getDocumentNumber={getDocumentNumber}
          materials={materials}
          laborRates={laborRates}
          quoteParameters={quoteParameters}
          step={quoteStep}
          setStep={setQuoteStep}
          lightboxImage={lightboxImage}
          setLightboxImage={setLightboxImage}
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
