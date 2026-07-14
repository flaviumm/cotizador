import React from "react";
import { Panel, Field, TextInput, Select, Button, IconButton, Icon } from "../../components/ui.jsx";

export const VEHICLE_TYPES = [
  "Camión de Carga Pesada (12 Ton)",
  "Camioneta de Operaciones (4x4)",
  "Grúa Industrial Autopropulsada",
  "Furgón de Logística (3 Ton)",
];

export const FUEL_CONSUMPTION_L_PER_100KM = 15;

export default function TrasladoStep({
  vehicleType, setVehicleType, distanceKm, setDistanceKm, fuelPricePerLiter, setFuelPricePerLiter,
  perDiemPerPerson, setPerDiemPerPerson, addOrUpdateFuelLine, applyPerDiemDraft,
  travelConceptDraft, setTravelConceptDraft, addTravelConcept, travelLines, removeLine,
  subtotalTravel, money,
}) {
  const estimatedLiters = ((Number(distanceKm || 0) * FUEL_CONSUMPTION_L_PER_100KM) / 100).toFixed(2);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-on-surface">Costos de Traslado y Logística</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Configurá los parámetros de transporte y gastos operativos para el proyecto industrial.</p>
      </div>

      <Panel title="Configuración" icon="settings_suggest" className="p-6">
        <div className="grid gap-4 pt-2 md:grid-cols-3">
          <Field label="Tipo de Vehículo">
            <Select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}>
              {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Distancia (KM)">
            <TextInput type="number" min="0" step="1" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} />
          </Field>
          <Field label="Combustible ($/L)">
            <TextInput type="number" min="0" step="0.01" value={fuelPricePerLiter} onChange={(event) => setFuelPricePerLiter(event.target.value)} />
          </Field>
          <Field label="Viáticos Diarios (p/p)">
            <TextInput type="number" min="0" step="1" value={perDiemPerPerson} onChange={(event) => setPerDiemPerPerson(event.target.value)} />
          </Field>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button onClick={addOrUpdateFuelLine} icon="local_gas_station">Calcular combustible ({estimatedLiters} L)</Button>
            <Button variant="ghost" onClick={applyPerDiemDraft} icon="hotel">Precargar viáticos</Button>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline bg-surface-container-low px-6 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Desglose de Costos Logísticos</span>
        </div>
        <div className="grid gap-3 border-b border-outline p-4 sm:grid-cols-[minmax(0,1fr)_110px_90px_120px_max-content] sm:items-end">
          <Field label="Concepto">
            <TextInput value={travelConceptDraft.detail} onChange={(event) => setTravelConceptDraft({ ...travelConceptDraft, detail: event.target.value })} placeholder="Ej. Peajes y autopistas" />
          </Field>
          <Field label="Unidad">
            <TextInput value={travelConceptDraft.unit} onChange={(event) => setTravelConceptDraft({ ...travelConceptDraft, unit: event.target.value })} placeholder="Unidad / Día / Global" />
          </Field>
          <Field label="Cantidad">
            <TextInput type="number" min="0" step="0.01" value={travelConceptDraft.quantity} onChange={(event) => setTravelConceptDraft({ ...travelConceptDraft, quantity: event.target.value })} />
          </Field>
          <Field label="Costo unitario">
            <TextInput type="number" min="0" step="0.01" value={travelConceptDraft.unitPrice} onChange={(event) => setTravelConceptDraft({ ...travelConceptDraft, unitPrice: event.target.value })} />
          </Field>
          <Button onClick={addTravelConcept} disabled={!travelConceptDraft.detail.trim()} icon="add_circle">Añadir concepto</Button>
        </div>
        <table className="w-full text-left">
          <thead className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-6 py-3">Concepto</th>
              <th className="px-6 py-3">Unidad</th>
              <th className="px-6 py-3">Cantidad</th>
              <th className="px-6 py-3 text-right">Costo Unitario</th>
              <th className="px-6 py-3 text-right">Total</th>
              <th className="w-10 px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline">
            {travelLines.map((line) => (
              <tr key={line.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-6 py-3 text-sm">{line.detail}</td>
                <td className="px-6 py-3 font-mono text-sm text-on-surface-variant">{line.meta?.unit || "-"}</td>
                <td className="px-6 py-3 font-mono text-sm">{Number(line.quantity || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</td>
                <td className="px-6 py-3 text-right font-mono text-sm">{money(line.unitPrice)}</td>
                <td className="px-6 py-3 text-right font-mono text-sm font-bold">{money(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</td>
                <td className="px-6 py-3 text-right"><IconButton icon="delete" tone="danger" onClick={() => removeLine(line.index)} /></td>
              </tr>
            ))}
            {!travelLines.length && (
              <tr><td colSpan={6} className="px-6 py-6 text-center text-sm text-on-surface-variant">Calculá el combustible o añadí un concepto para empezar el desglose.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      <div className="flex flex-col items-center justify-between gap-4 rounded-lg border-2 border-primary bg-surface-container-lowest p-6 md:flex-row">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Icon name="local_shipping" className="text-primary" />
          <p className="text-sm">Estos conceptos se agrupan como sección "Traslado" en el detalle y el PDF del presupuesto.</p>
        </div>
        <div className="text-center md:text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Total Traslado</p>
          <p className="font-mono text-2xl font-bold text-primary">{money(subtotalTravel)}</p>
        </div>
      </div>
    </div>
  );
}
