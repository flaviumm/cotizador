import React from "react";
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
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 flex h-16 items-center border-b border-outline bg-surface-container-lowest px-6 md:px-8">
        <span className="text-lg font-bold text-primary">Cotizador</span>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-64 shrink-0 flex-col border-r border-outline bg-surface-container-low p-4 md:flex">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-white">
              <Icon name="architecture" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-primary">{quoteNumber || "Nuevo presupuesto"}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Estado: {quoteStatus}</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {QUOTE_STEPS.map((step) => {
              const isActive = activeSection === "presupuestos" && quoteStep === step.key;
              return (
                <button
                  key={step.key}
                  onClick={() => onQuoteStep(step.key)}
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
                    onClick={() => onConfigTab(item.key)}
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
            onClick={onGeneratePdf}
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
