import React, { useState } from "react";
import { Panel, Field, TextInput, Select, Button, SectionTitle, Icon, Badge } from "../../components/ui.jsx";

function PriceCompareModal({ offers, money, catalogPrice, onSelect, onClose }) {
  const sorted = [...offers].sort((a, b) => catalogPrice(a) - catalogPrice(b));
  const cheapest = sorted[0];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-lg bg-surface-container-lowest shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b border-outline px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Icon name="price_check" className="text-[18px]" />
              Comparar precios
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-on-surface">{sorted[0]?.name}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-lg leading-none text-on-surface-variant hover:text-primary">✕</button>
        </div>
        <div className="divide-y divide-outline">
          {sorted.map((offer) => {
            const price = catalogPrice(offer);
            const isCheapest = offer === cheapest;
            const outOfStock = offer.stockDisponible === false || (offer.stockDisponible == null && offer.stock != null && Number(offer.stock) <= 0);
            return (
              <div key={offer.id} className={`flex items-center justify-between gap-4 px-5 py-3.5 ${isCheapest ? "bg-primary/5" : ""}`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-on-surface">
                    {offer.provider || "Proveedor sin nombre"}
                    {isCheapest && <Badge tone="primary">Mejor precio</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {offer.sku ? `SKU: ${offer.sku}` : "Sin SKU"}
                    {" · "}
                    {outOfStock ? <span className="text-error">Sin stock</span> : <span className="text-green-700">Disponible</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="font-mono text-base font-bold text-on-surface">{money(price)}</p>
                  <Button onClick={() => onSelect(offer)} disabled={outOfStock} icon="check">Usar este</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MaterialesStep({
  materialProvider, setMaterialProvider,
  materialGroupFilter, onGroupChange, materialGroups,
  materialCategory, onCategoryChange, materialCategories,
  materialMedida, onMedidaChange, materialMedidas,
  materialEspesor, setMaterialEspesor, materialEspesores,
  materialQuery, setMaterialQuery, materialQuantity, setMaterialQuantity,
  filteredMaterials, selectedMaterial, selectedMaterialId, setSelectedMaterialId, addMaterialLine, setLightboxImage,
  materialFeedback, materialAlternates, money, catalogPrice, providers, aiPanel,
}) {
  const [compareOffers, setCompareOffers] = useState(null);

  function alternatesFor(item) {
    return materialAlternates?.get((item.name || "").trim().toUpperCase()) || null;
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        icon="inventory_2"
        title="Materiales del Presupuesto"
        subtitle="Elegí una categoría del catálogo técnico o buscá directamente y agregá renglones al detalle de la cotización."
      />
      {aiPanel}

      {materialFeedback && (
        <div className={`flex items-center gap-2 rounded border px-3 py-2.5 text-sm font-semibold ${
          materialFeedback.type === "error" ? "border-error bg-error/10 text-error" : "border-green-200 bg-green-100 text-green-800"
        }`}>
          <Icon name={materialFeedback.type === "error" ? "error" : "check_circle"} className="text-[18px]" />
          {materialFeedback.message}
        </div>
      )}

      <Panel className="p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Grupo">
            <Select value={materialGroupFilter} onChange={(event) => onGroupChange(event.target.value)}>
              <option value="">Todos (usar búsqueda)</option>
              {materialGroups.map((g) => (
                <option key={g.name} value={g.name}>{g.name} ({g.count})</option>
              ))}
            </Select>
          </Field>
          {materialCategories.length > 0 && (
            <Field label="Categoría">
              <Select value={materialCategory} onChange={(event) => onCategoryChange(event.target.value)}>
                <option value="">Todas</option>
                {materialCategories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label} ({c.count})</option>
                ))}
              </Select>
            </Field>
          )}
          {materialMedidas.length > 0 && (
            <Field label="Medida">
              <Select value={materialMedida} onChange={(event) => onMedidaChange(event.target.value)}>
                <option value="">Todas</option>
                {materialMedidas.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
          )}
          {materialEspesores.length > 0 && (
            <Field label="Espesor">
              <Select value={materialEspesor} onChange={(event) => setMaterialEspesor(event.target.value)}>
                <option value="">Todos</option>
                {materialEspesores.map((e) => <option key={e} value={e}>{e} mm</option>)}
              </Select>
            </Field>
          )}
          <Field label="Proveedor">
            <Select value={materialProvider} onChange={(event) => { setMaterialProvider(event.target.value); setSelectedMaterialId(""); }}>
              <option value="">Todos</option>
              {providers.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_96px_max-content] md:items-end">
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
              const alternates = alternatesFor(item);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMaterialId(item.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedMaterialId(item.id); } }}
                  className={`w-full cursor-pointer text-left px-3 py-2.5 text-sm transition-colors ${isSelected ? "bg-primary text-white" : "bg-surface-container-lowest hover:bg-surface-container-low text-on-surface"}`}
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
                      {alternates && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCompareOffers(alternates); }}
                          className={`mt-1.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                            isSelected ? "bg-white/15 text-white hover:bg-white/25" : "bg-primary/10 text-primary hover:bg-primary/20"
                          }`}
                        >
                          <Icon name="price_check" className="text-[13px]" />
                          Comparar {alternates.length} precios
                        </button>
                      )}
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
                </div>
              );
            })}
          </div>
        )}
        {(materialQuery || materialGroupFilter) && filteredMaterials.length === 0 && (
          <p className="py-6 text-center text-sm text-on-surface-variant">Sin resultados{materialQuery ? ` para "${materialQuery}"` : ""}.</p>
        )}
        {!materialQuery && !materialGroupFilter && (
          <p className="py-6 text-center text-sm text-on-surface-variant">Elegí un grupo o escribí al menos 2 caracteres para buscar en el catálogo.</p>
        )}
      </Panel>

      {compareOffers && (
        <PriceCompareModal
          offers={compareOffers}
          money={money}
          catalogPrice={catalogPrice}
          onClose={() => setCompareOffers(null)}
          onSelect={(offer) => { setSelectedMaterialId(offer.id); setCompareOffers(null); }}
        />
      )}
    </div>
  );
}
