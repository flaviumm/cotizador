import React from "react";
import { Panel, Button, TextInput, Icon, Badge } from "../../components/ui.jsx";

function BreakdownRow({ icon, label, hint, value, money }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-outline px-2 py-4 transition-colors hover:bg-surface-container-low last:border-b-0">
      <div className="flex items-center gap-4">
        <div className="rounded bg-secondary-container p-3 text-on-secondary-container">
          <Icon name={icon} />
        </div>
        <div>
          <p className="font-bold text-on-surface">{label}</p>
          {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
        </div>
      </div>
      <span className="font-mono text-lg text-on-surface">{money(value)}</span>
    </div>
  );
}

export default function ResumenStep({
  subtotalMaterials, subtotalLabor, subtotalTravel, subtotalOther, subtotal, tax, total, money,
  lineItems, updateLine, removeLine, addLine, quoteLineTotal, generatedQuote, saving, handleGeneratePdf, onEdit, validUntil,
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Resumen Final del Presupuesto</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Revisión técnica de costos directos e indirectos para el proyecto industrial.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel title="Desglose de Costos" icon="list_alt" className="p-6">
          <div className="pt-2">
            <BreakdownRow icon="inventory_2" label="Subtotal Materiales" hint="Materiales agregados al detalle" value={subtotalMaterials} money={money} />
            <BreakdownRow icon="engineering" label="Subtotal Mano de Obra" hint="Horas de oficio cotizadas" value={subtotalLabor} money={money} />
            <BreakdownRow icon="local_shipping" label="Subtotal Traslado" hint="Logística y gastos de transporte" value={subtotalTravel} money={money} />
            {subtotalOther > 0 && <BreakdownRow icon="edit_note" label="Otros renglones" hint="Cargados manualmente" value={subtotalOther} money={money} />}
          </div>
        </Panel>

        <div className="sticky top-20 self-start rounded-lg border border-outline bg-inverse-surface p-6 text-white">
          <h3 className="mb-4 border-b border-white/20 pb-3 text-lg font-semibold">Resumen Total</h3>
          <div className="mb-4 space-y-3 text-sm">
            <div className="flex justify-between text-white/80"><span>Subtotal Neto</span><span className="font-mono">{money(subtotal)}</span></div>
            <div className="flex justify-between text-white/80"><span>IVA (21%)</span><span className="font-mono">{money(tax)}</span></div>
          </div>
          <div className="mb-5 rounded border border-white/20 bg-white/10 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Total Final (ARS)</p>
            <p className="font-mono text-2xl font-bold text-primary">{money(total)}</p>
          </div>
          <div className="grid gap-2">
            <Button onClick={handleGeneratePdf} disabled={saving || !total} icon="task_alt">{saving ? "Generando..." : "Finalizar y Exportar PDF"}</Button>
            <Button variant="dark" onClick={onEdit} icon="edit_note">Volver a Editar</Button>
          </div>
          {generatedQuote && <div className="mt-3"><Badge tone="primary">Generado {generatedQuote.number}</Badge></div>}
          <p className="mt-5 text-center text-[11px] italic leading-relaxed text-white/50">
            Este presupuesto tiene una validez hasta el {validUntil || "-"}. Los precios de materiales están sujetos a variaciones de mercado.
          </p>
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-outline p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Detalle de productos</h2>
            <p className="text-sm text-on-surface-variant">Editá el detalle, cantidad y precio de cada renglón antes de generar el PDF.</p>
          </div>
          <Button onClick={addLine} icon="add">Agregar renglón</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Detalle del producto</th>
                <th className="w-[150px] px-4 py-3">Cantidad</th>
                <th className="w-[180px] px-4 py-3 text-right">Precio unitario</th>
                <th className="w-[180px] px-4 py-3 text-right">Precio total</th>
                <th className="w-[100px] px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {lineItems.map((line, index) => {
                if (line.type === "title") {
                  return (
                    <tr key={line.id || index} className="bg-surface-container-low">
                      <td className="px-4 py-3" colSpan={4}>
                        <TextInput value={line.detail} onChange={(event) => updateLine(index, { detail: event.target.value })} placeholder="Título de sección" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="danger" onClick={() => removeLine(index)} icon="delete">Quitar</Button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={line.id || index} className="align-top">
                    <td className="px-4 py-4">
                      <TextInput value={line.detail} onChange={(event) => updateLine(index, { detail: event.target.value })} placeholder="Producto, trabajo o servicio cotizado" />
                      {(line.meta?.unit || line.meta?.provider || line.meta?.sku || line.meta?.source || line.meta?.spec) && (
                        <div className="mt-2 grid gap-1 text-xs font-medium text-on-surface-variant">
                          {line.meta?.spec && <p>{line.meta.spec}</p>}
                          <p>
                            {[
                              line.meta?.unit ? `Unidad: ${line.meta.unit}` : "",
                              line.meta?.provider ? `Proveedor: ${line.meta.provider}` : "",
                              line.meta?.sku ? `SKU: ${line.meta.sku}` : "",
                              line.meta?.source ? `Base: ${line.meta.source}` : "",
                            ].filter(Boolean).join(" | ")}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4"><TextInput type="number" min="0" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} /></td>
                    <td className="px-4 py-4"><TextInput type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} /></td>
                    <td className="px-4 py-4 text-right"><p className="font-mono text-base font-semibold text-on-surface">{money(quoteLineTotal(line))}</p></td>
                    <td className="px-4 py-4 text-right"><Button variant="danger" onClick={() => removeLine(index)} icon="delete">Quitar</Button></td>
                  </tr>
                );
              })}
              {!lineItems.length && (
                <tr><td className="px-4 py-6 text-sm text-on-surface-variant" colSpan={5}>Agregá materiales, horas de mano de obra o conceptos de traslado desde los pasos anteriores.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
