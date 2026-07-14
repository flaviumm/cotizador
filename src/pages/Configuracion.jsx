import React from "react";
import { Panel, Field, TextInput } from "../components/ui.jsx";

const PERCENT_FIELDS = [
  { key: "iva", label: "IVA", hint: "Alícuota aplicada al subtotal de cada presupuesto" },
  { key: "iibb", label: "Ingresos Brutos", hint: "Referencia interna, no se aplica automáticamente" },
  { key: "targetProfit", label: "Ganancia objetivo", hint: "Margen de referencia para tarifas de mano de obra" },
  { key: "adminOverhead", label: "Gastos administrativos", hint: "Referencia interna de costeo" },
  { key: "technicalContingency", label: "Contingencia técnica", hint: "Referencia interna de costeo" },
];

export default function Configuracion({ quoteParameters, setQuoteParameters }) {
  function updateField(key, value) {
    setQuoteParameters((params) => ({ ...params, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-on-surface">Configuración</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Parámetros generales usados para calcular presupuestos.</p>
      </div>

      <Panel title="Alícuotas y márgenes" icon="percent" className="p-6">
        <div className="grid gap-4 pt-2 md:grid-cols-2">
          {PERCENT_FIELDS.map((field) => (
            <Field key={field.key} label={field.label} hint={field.hint}>
              <div className="relative">
                <TextInput
                  type="number" min="0" max="100" step="0.1"
                  value={Number(quoteParameters[field.key] ?? 0) * 100}
                  onChange={(e) => updateField(field.key, Number(e.target.value || 0) / 100)}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">%</span>
              </div>
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="Condiciones comerciales" icon="rule" className="p-6">
        <div className="grid gap-4 pt-2 md:grid-cols-2">
          <Field label="Validez de la oferta" hint="Días corridos por defecto para nuevos presupuestos">
            <div className="relative">
              <TextInput type="number" min="1" step="1" value={quoteParameters.offerValidityDays ?? 7} onChange={(e) => updateField("offerValidityDays", Number(e.target.value || 0))} className="pr-14" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">días</span>
            </div>
          </Field>
          <Field label="Redondeo de totales" hint="Los totales se redondean a este múltiplo">
            <TextInput type="number" min="1" step="1" value={quoteParameters.roundTo ?? 1000} onChange={(e) => updateField("roundTo", Number(e.target.value || 1))} />
          </Field>
        </div>
      </Panel>
    </div>
  );
}
