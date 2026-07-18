import React, { useState } from "react";
import { Icon } from "./ui.jsx";

const QUOTE_STEPS = [
  { key: "datosEmpresa", label: "Datos Empresa", icon: "business" },
  { key: "materiales", label: "Materiales", icon: "inventory_2" },
  { key: "jornadas", label: "Jornadas", icon: "engineering" },
  { key: "traslado", label: "Traslado", icon: "local_shipping" },
  { key: "resumen", label: "Resumen", icon: "analytics" },
];

const CONFIG_ITEMS = [
  { key: "materiales", label: "Materiales", icon: "inventory_2" },
  { key: "manodeobra", label: "Mano de Obra", icon: "engineering" },
  { key: "general", label: "General", icon: "tune" },
];

export default function AppShell({ activeSection, configTab, onQuoteStep, quoteStep, onConfigTab, quoteNumber, quoteStatus, onGeneratePdf, children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleQuoteStep(step) {
    onQuoteStep(step);
    setMobileNavOpen(false);
  }

  function handleConfigTab(tab) {
    onConfigTab(tab);
    setMobileNavOpen(false);
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-outline bg-surface-container-lowest px-4 md:px-8">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container md:hidden"
          aria-label="Abrir menú"
        >
          <Icon name="menu" />
        </button>
        <span className="text-lg font-bold text-primary">Cotizador</span>
      </header>

      <div className="flex">
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 flex-col overflow-y-auto border-r border-outline bg-surface-container-low p-4 transition-transform duration-200 md:sticky md:top-16 md:z-0 md:flex md:h-[calc(100vh-64px)] md:translate-x-0 ${
            mobileNavOpen ? "flex translate-x-0" : "hidden -translate-x-full md:flex"
          }`}
        >
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-white">
              <Icon name="architecture" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-primary">{quoteNumber || "Nuevo presupuesto"}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Estado: {quoteStatus}</p>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container md:hidden"
              aria-label="Cerrar menú"
            >
              <Icon name="close" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {QUOTE_STEPS.map((step) => {
              const isActive = activeSection === "presupuestos" && quoteStep === step.key;
              return (
                <button
                  key={step.key}
                  onClick={() => handleQuoteStep(step.key)}
                  className={`flex items-center gap-3 rounded px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition-all active:scale-[0.98] ${
                    isActive ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <Icon name={step.icon} className="text-[18px]" />
                  {step.label}
                </button>
              );
            })}

            <div className="mt-4 border-t border-outline pt-4">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Configuración</p>
              {CONFIG_ITEMS.map((item) => {
                const isActive = activeSection === "configuracion" && configTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleConfigTab(item.key)}
                    className={`flex items-center gap-3 rounded px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition-all active:scale-[0.98] ${
                      isActive ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <Icon name={item.icon} className="text-[18px]" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
          <button
            onClick={() => { onGeneratePdf(); setMobileNavOpen(false); }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-primary py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <Icon name="picture_as_pdf" className="text-[18px]" />
            Generar PDF
          </button>
        </aside>

        <main className="min-w-0 flex-1 p-4 pb-16 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <footer className="border-t-2 border-primary bg-inverse-surface px-6 py-4 md:px-8">
        <p className="text-xs font-semibold text-white/70">© {new Date().getFullYear()} Bizon Metalurgica. Sistema de Cotización Técnica.</p>
      </footer>
    </div>
  );
}
