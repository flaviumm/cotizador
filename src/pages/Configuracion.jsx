import React from "react";
import { Panel, Field, TextInput, Button, IconButton } from "../components/ui.jsx";

const PERCENT_FIELDS = [
  { key: "iva", label: "IVA", hint: "Alícuota aplicada al subtotal de cada presupuesto" },
  { key: "iibb", label: "Ingresos Brutos", hint: "Referencia interna, no se aplica automáticamente" },
  { key: "targetProfit", label: "Ganancia objetivo", hint: "Margen de referencia para tarifas de mano de obra" },
  { key: "adminOverhead", label: "Gastos administrativos", hint: "Referencia interna de costeo" },
  { key: "technicalContingency", label: "Contingencia técnica", hint: "Referencia interna de costeo" },
];

function CustomFieldRow({ field, suffix, onChange, onRemove }) {
  return (
    <Field label={
      <TextInput
        value={field.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Nombre del campo"
        className="normal-case text-xs font-semibold tracking-normal"
      />
    }>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <TextInput
            type="number" step="0.1"
            value={field.value}
            onChange={(e) => onChange({ value: Number(e.target.value || 0) })}
            className={suffix ? "pr-8" : ""}
          />
          {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">{suffix}</span>}
        </div>
        <IconButton icon="delete" tone="danger" title="Quitar campo" onClick={onRemove} />
      </div>
    </Field>
  );
}

export default function Configuracion({ quoteParameters, setQuoteParameters }) {
  const customPercentFields = quoteParameters.customPercentFields || [];
  const customCommercialFields = quoteParameters.customCommercialFields || [];

  function updateField(key, value) {
    setQuoteParameters((params) => ({ ...params, [key]: value }));
  }

  function addCustomField(listKey) {
    setQuoteParameters((params) => ({
      ...params,
      [listKey]: [...(params[listKey] || []), { id: `custom-${Date.now()}`, label: "", value: 0 }],
    }));
  }

  function updateCustomField(listKey, id, patch) {
    setQuoteParameters((params) => ({
      ...params,
      [listKey]: (params[listKey] || []).map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
  }

  function removeCustomField(listKey, id) {
    setQuoteParameters((params) => ({ ...params, [listKey]: (params[listKey] || []).filter((field) => field.id !== id) }));
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
          {customPercentFields.map((field) => (
            <CustomFieldRow
              key={field.id} field={field} suffix="%"
              onChange={(patch) => updateCustomField("customPercentFields", field.id, patch)}
              onRemove={() => removeCustomField("customPercentFields", field.id)}
            />
          ))}
        </div>
        <Button variant="ghost" icon="add" onClick={() => addCustomField("customPercentFields")} className="mt-4">
          Agregar campo personalizado
        </Button>
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
          {customCommercialFields.map((field) => (
            <CustomFieldRow
              key={field.id} field={field}
              onChange={(patch) => updateCustomField("customCommercialFields", field.id, patch)}
              onRemove={() => removeCustomField("customCommercialFields", field.id)}
            />
          ))}
        </div>
        <Button variant="ghost" icon="add" onClick={() => addCustomField("customCommercialFields")} className="mt-4">
          Agregar campo personalizado
        </Button>
      </Panel>
    </div>
  );
}
