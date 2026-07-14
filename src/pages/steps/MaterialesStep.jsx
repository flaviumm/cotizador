import React from "react";
import { Panel, Field, TextInput, Select, Button, SectionTitle, Icon } from "../../components/ui.jsx";

export default function MaterialesStep({
  materialProvider, setMaterialProvider, materialQuery, setMaterialQuery, materialQuantity, setMaterialQuantity,
  filteredMaterials, selectedMaterial, selectedMaterialId, setSelectedMaterialId, addMaterialLine, setLightboxImage,
  money, catalogPrice, providers, aiPanel,
}) {
  return (
    <div className="space-y-4">
      <SectionTitle
        icon="inventory_2"
        title="Materiales del Presupuesto"
        subtitle="Buscá en el catálogo técnico y agregá renglones al detalle de la cotización."
      />
      {aiPanel}
      <Panel className="p-5">
        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_96px_max-content] md:items-end">
          <Field label="Proveedor">
            <Select value={materialProvider} onChange={(event) => { setMaterialProvider(event.target.value); setSelectedMaterialId(""); }}>
              <option value="">Todos</option>
              {providers.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Buscar material">
            <TextInput value={materialQuery} onChange={(event) => { setMaterialQuery(event.target.value); setSelectedMaterialId(""); }} placeholder="Nombre, categoría, SKU, marca…" />
          </Field>
          <Field label="Cantidad">
            <TextInput type="number" min="0" step="0.01" value={materialQuantity} onChange={(event) => setMaterialQuantity(event.target.value)} />
          </Field>
          <Button onClick={addMaterialLine} disabled={!selectedMaterial} icon="add">Agregar</Button>
        </div>

        {filteredMaterials.length > 0 && (
          <div className="mt-4 max-h-96 overflow-y-auto rounded border border-outline divide-y divide-outline">
            {filteredMaterials.map((item) => {
              const isSelected = selectedMaterial?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMaterialId(item.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${isSelected ? "bg-primary text-white" : "bg-surface-container-lowest hover:bg-surface-container-low text-on-surface"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`shrink-0 w-12 h-12 rounded overflow-hidden flex items-center justify-center border ${isSelected ? "border-white/30 bg-white/10" : "border-outline bg-surface-container-high"} ${item.imagen ? "cursor-zoom-in" : ""}`}
                      onClick={item.imagen ? (e) => { e.stopPropagation(); setLightboxImage({ src: item.imagen, name: item.name }); } : undefined}
                    >
                      {item.imagen
                        ? <img src={item.imagen} alt={item.name} className="w-full h-full object-contain" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                        : <Icon name="hardware" className={isSelected ? "text-white" : "text-primary"} />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold leading-snug truncate ${isSelected ? "text-white" : "text-on-surface"}`}>{item.name}</p>
                      {item.spec && <p className={`text-xs mt-0.5 ${isSelected ? "text-white/70" : "text-on-surface-variant"}`}>{item.spec}</p>}
                      {(item.espesorMm != null || item.largoM != null) && (
                        <p className={`font-mono text-[11px] mt-0.5 ${isSelected ? "text-white/60" : "text-on-surface-variant"}`}>
                          {[item.espesorMm != null ? `Esp: ${item.espesorMm} mm` : null, item.largoM != null ? `Largo: ${item.largoM} m` : null].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className={`font-mono text-[11px] mt-0.5 ${isSelected ? "text-white/60" : "text-on-surface-variant"}`}>
                        {[item.brand, item.sku, item.unit ? `Unidad: ${item.unit}` : null, item.provider].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono font-bold text-sm whitespace-nowrap ${isSelected ? "text-white" : "text-on-surface"}`}>{money(catalogPrice(item))}</p>
                      {item.stockDisponible !== null && item.stockDisponible !== undefined && (
                        <p className={`text-xs mt-0.5 ${item.stockDisponible ? (isSelected ? "text-green-200" : "text-green-700") : (isSelected ? "text-red-200" : "text-error")}`}>
                          {item.stockDisponible ? "Disponible" : "Sin stock"}
                        </p>
                      )}
                      {(item.stockDisponible === null || item.stockDisponible === undefined) && item.stock !== null && item.stock !== undefined && (
                        <p className={`text-xs mt-0.5 ${item.stock > 0 ? (isSelected ? "text-green-200" : "text-green-700") : (isSelected ? "text-red-200" : "text-error")}`}>
                          {item.stock > 0 ? `Stock: ${item.stock}` : "Sin stock"}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {materialQuery && filteredMaterials.length === 0 && (
          <p className="py-6 text-center text-sm text-on-surface-variant">Sin resultados para "{materialQuery}"</p>
        )}
        {!materialQuery && (
          <p className="py-6 text-center text-sm text-on-surface-variant">Escribí al menos 2 caracteres para buscar en el catálogo.</p>
        )}
      </Panel>
    </div>
  );
}
