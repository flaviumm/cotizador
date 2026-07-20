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

const MOBILE_TABS = [
  { key: "presupuestos", label: "Presupuesto", icon: "request_quote", kind: "quote" },
  { key: "materiales", label: "Materiales", icon: "inventory_2", kind: "config" },
  { key: "manodeobra", label: "Mano de obra", icon: "engineering", kind: "config" },
  { key: "general", label: "Ajustes", icon: "settings", kind: "config" },
];

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

  return (
    <div className="min-h-screen bg-surface md:bg-surface">
      <header className="sticky top-0 z-30 border-b border-outline bg-surface-container-lowest px-4 pt-[env(safe-area-inset-top)] md:z-50 md:flex md:h-16 md:items-center md:gap-3 md:px-8 md:pt-0">
        <div className="flex h-14 items-center justify-between md:contents">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-on-surface hover:bg-surface-container md:hidden"
          aria-label="Abrir menú"
        >
          <Icon name="menu" />
        </button>
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

        <main className="min-w-0 flex-1 px-4 pb-44 pt-5 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      {activeSection === "presupuestos" && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-outline bg-surface-container-lowest px-4 py-3 md:hidden">
          {stepIndex > 0 && (
            <button onClick={() => handleQuoteStep(QUOTE_STEPS[stepIndex - 1].key)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-outline text-on-surface" aria-label="Paso anterior">
              <Icon name="arrow_back" />
            </button>
          )}
          {stepIndex < QUOTE_STEPS.length - 1 ? (
            <button onClick={() => handleQuoteStep(QUOTE_STEPS[stepIndex + 1].key)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white active:brightness-90">
              Siguiente <Icon name="arrow_forward" />
            </button>
          ) : (
            <button onClick={onGeneratePdf} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white active:brightness-90">
              Generar PDF <Icon name="picture_as_pdf" />
            </button>
          )}
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-cols-4 border-t border-outline bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegación principal">
        {MOBILE_TABS.map((item) => {
          const selected = item.kind === "quote" ? activeSection === "presupuestos" : activeSection === "configuracion" && configTab === item.key;
          return (
            <button key={item.key} onClick={() => handleMobileTab(item)} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold ${selected ? "text-primary" : "text-on-surface-variant"}`} aria-current={selected ? "page" : undefined}>
              <Icon name={item.icon} className={`text-[22px] ${selected ? "[font-variation-settings:'FILL'_1,'wght'_600,'GRAD'_0,'opsz'_20]" : ""}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <footer className="hidden border-t-2 border-primary bg-inverse-surface px-6 py-4 md:block md:px-8">
        <p className="text-xs font-semibold text-white/70">© {new Date().getFullYear()} Bizon Metalurgica. Sistema de Cotización Técnica.</p>
      </footer>
    </div>
  );
}
