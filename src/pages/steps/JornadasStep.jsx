import React from "react";
import { Panel, Field, TextInput, Select, TextArea, Button, SectionTitle } from "../../components/ui.jsx";

export default function JornadasStep({
  laborAgreement, setLaborAgreement, selectedLaborId, setSelectedLaborId, laborRates, selectedLabor,
  laborHours, setLaborHours, laborDescription, setLaborDescription, addLaborLine, money,
}) {
  const agreements = [...new Set(laborRates.map((r) => r.agreement))];
  return (
    <div className="space-y-4">
      <SectionTitle icon="engineering" title="Mano de Obra del Presupuesto" subtitle="Cargá horas por oficio según la tarifa de cotización vigente." />
      <Panel className="p-5">
        <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)_96px_max-content] md:items-end">
          <Field label="Convenio">
            <Select value={laborAgreement} onChange={(event) => { setLaborAgreement(event.target.value); setSelectedLaborId(""); }}>
              <option value="">Todos</option>
              {agreements.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
            </Select>
          </Field>
          <Field label="Oficio">
            <Select value={selectedLaborId} onChange={(event) => setSelectedLaborId(event.target.value)}>
              <option value="">Seleccionar oficio...</option>
              {laborRates.filter((r) => !laborAgreement || r.agreement === laborAgreement).map((item) => (
                <option key={item.id} value={item.id}>{item.trade} - {money(item.quoteHour)}/h</option>
              ))}
            </Select>
          </Field>
          <Field label="Horas">
            <TextInput type="number" min="0" step="0.25" value={laborHours} onChange={(event) => setLaborHours(event.target.value)} />
          </Field>
          <Button onClick={addLaborLine} disabled={!selectedLabor} icon="add">Agregar</Button>
        </div>
        <div className="mt-4">
          <Field label="Descripción del trabajo cotizado">
            <TextArea value={laborDescription} onChange={(event) => setLaborDescription(event.target.value)} placeholder="Ej. Soldadura de estructura metálica, corte y preparación de materiales..." />
          </Field>
        </div>
        {selectedLabor && (
          <div className="mt-4 rounded border border-outline bg-surface-container-low p-4 text-sm text-on-surface-variant">
            <p className="font-bold text-on-surface">{selectedLabor.trade}</p>
            <p>{selectedLabor.category}</p>
            <p className="mt-1">Convenio: {selectedLabor.agreement} · Tarifa: <strong className="font-mono text-primary">{money(selectedLabor.quoteHour)}/h</strong></p>
            {selectedLabor.baseHour && selectedLabor.quoteHour !== selectedLabor.baseHour && (
              <p className="mt-0.5 text-xs">Base: {money(selectedLabor.baseHour)}/h + cargas sociales + margen de cotización</p>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
