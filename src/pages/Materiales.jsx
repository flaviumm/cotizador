import React, { useMemo, useState } from "react";
import { Panel, Field, TextInput, Select, Button, IconButton, Badge, StatCard, SectionTitle } from "../components/ui.jsx";

const PAGE_SIZE = 12;
const money = (value) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));

const emptyDraft = { name: "", category: "", familia: "", spec: "", espesorMm: "", largoM: "", unit: "unidad", sku: "", brand: "", provider: "", stock: "", basePrice: "", imagen: "" };

function MaterialForm({ draft, setDraft, onCancel, onSave, title }) {
  return (
    <tr className="bg-surface-container-low">
      <td colSpan={7} className="px-6 py-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-primary">{title}</p>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Nombre"><TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej. Viga IPE 140" /></Field>
          <Field label="Familia"><TextInput value={draft.familia} onChange={(e) => setDraft({ ...draft, familia: e.target.value, category: e.target.value || draft.category })} placeholder="CAÑO ESTRUCTURAL CUADRADO" /></Field>
          <Field label="Categoría"><TextInput value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Siderometalúrgico > Perfiles" /></Field>
          <Field label="Medidas"><TextInput value={draft.spec} onChange={(e) => setDraft({ ...draft, spec: e.target.value })} placeholder="100x100 mm" /></Field>
          <Field label="Espesor (mm)"><TextInput type="number" min="0" step="0.01" value={draft.espesorMm} onChange={(e) => setDraft({ ...draft, espesorMm: e.target.value })} /></Field>
          <Field label="Largo (m)"><TextInput type="number" min="0" step="0.01" value={draft.largoM} onChange={(e) => setDraft({ ...draft, largoM: e.target.value })} /></Field>
          <Field label="Unidad"><TextInput value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="unidad, barra, kg..." /></Field>
          <Field label="SKU"><TextInput value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></Field>
          <Field label="Marca"><TextInput value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} /></Field>
          <Field label="Proveedor"><TextInput value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} /></Field>
          <Field label="Stock"><TextInput type="number" min="0" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} /></Field>
          <Field label="Precio unitario"><TextInput type="number" min="0" step="0.01" value={draft.basePrice} onChange={(e) => setDraft({ ...draft, basePrice: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={onSave} disabled={!draft.name.trim()} icon="check">Guardar</Button>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
      </td>
    </tr>
  );
}

export default function Materiales({ materials, setMaterials }) {
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);

  const providers = useMemo(() => [...new Set(materials.map((m) => m.provider).filter(Boolean))].sort(), [materials]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((item) =>
      (!providerFilter || item.provider === providerFilter) &&
      (!q || `${item.name} ${item.category} ${item.sku} ${item.brand}`.toLowerCase().includes(q))
    );
  }, [materials, query, providerFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const lowStock = materials.filter((m) => Number(m.stock) > 0 && Number(m.stock) < 10).length;
    const inventoryValue = materials.reduce((sum, m) => sum + (Number(m.basePrice || m.transferPrice || m.listPrice || 0) * Number(m.stock || 0)), 0);
    return { total: materials.length, lowStock, inventoryValue };
  }, [materials]);

  function startEdit(item) {
    setEditingId(item.id);
    setEditDraft({ ...emptyDraft, ...item, espesorMm: item.espesorMm ?? "", largoM: item.largoM ?? "", stock: item.stock ?? "", basePrice: item.basePrice ?? item.transferPrice ?? item.listPrice ?? "" });
  }

  function saveNew() {
    if (!addDraft.name.trim()) return;
    setMaterials((items) => [...items, {
      ...addDraft,
      id: `custom-${Date.now()}`,
      espesorMm: addDraft.espesorMm === "" ? null : Number(addDraft.espesorMm),
      largoM: addDraft.largoM === "" ? null : Number(addDraft.largoM),
      medidas: addDraft.spec || null,
      stock: addDraft.stock === "" ? null : Number(addDraft.stock),
      stockDisponible: addDraft.stock === "" ? null : Number(addDraft.stock) > 0,
      basePrice: Number(addDraft.basePrice || 0),
      transferPrice: Number(addDraft.basePrice || 0),
      listPrice: Number(addDraft.basePrice || 0),
      pricePerMeter: null,
      source: "Carga manual",
    }]);
    setAddDraft(emptyDraft);
    setAdding(false);
  }

  function saveEdit() {
    setMaterials((items) => items.map((item) => item.id === editingId ? {
      ...item,
      ...editDraft,
      espesorMm: editDraft.espesorMm === "" ? null : Number(editDraft.espesorMm),
      largoM: editDraft.largoM === "" ? null : Number(editDraft.largoM),
      medidas: editDraft.spec || null,
      stock: editDraft.stock === "" ? null : Number(editDraft.stock),
      basePrice: Number(editDraft.basePrice || 0),
    } : item));
    setEditingId(null);
  }

  function removeMaterial(id) {
    setMaterials((items) => items.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        icon="inventory_2"
        title="Gestión de Materiales"
        subtitle="Catálogo técnico y control de existencias para cotizaciones industriales."
        action={!adding ? "Agregar Material" : null}
        onAction={() => setAdding(true)}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total SKUs" value={stats.total.toLocaleString("es-AR")} />
        <StatCard label="Bajo Stock (< 10)" value={stats.lowStock.toLocaleString("es-AR")} tone="error" />
        <StatCard label="Valor Inventario" value={money(stats.inventoryValue)} />
      </div>

      <Panel title="Filtros" icon="filter_alt" className="p-5">
        <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_220px]">
          <Field label="Buscar material"><TextInput value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Nombre, categoría, SKU, marca…" /></Field>
          <Field label="Proveedor">
            <Select value={providerFilter} onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {providers.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-6 py-4">Material</th>
                <th className="px-6 py-4">Precio Unitario</th>
                <th className="px-6 py-4">Medidas</th>
                <th className="px-6 py-4">Espesor / Largo</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {adding && <MaterialForm draft={addDraft} setDraft={setAddDraft} onCancel={() => setAdding(false)} onSave={saveNew} title="Nuevo material" />}
              {pageItems.map((item) => {
                if (editingId === item.id) {
                  return <MaterialForm key={item.id} draft={editDraft} setDraft={setEditDraft} onCancel={() => setEditingId(null)} onSave={saveEdit} title={`Editar: ${item.name}`} />;
                }
                const price = Number(item.basePrice || item.transferPrice || item.listPrice || item.pricePerMeter || 0);
                const hasStockFlag = item.stockDisponible !== null && item.stockDisponible !== undefined;
                const hasStockNumber = item.stock !== null && item.stock !== undefined;
                return (
                  <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-on-surface">{item.name}</div>
                      <div className="font-mono text-[11px] text-on-surface-variant">SKU: {item.sku || "-"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-primary">{money(price)} / {item.unit || "u"}</td>
                    <td className="px-6 py-4 font-mono text-on-surface-variant">{item.spec || item.medidas || "-"}</td>
                    <td className="px-6 py-4 font-mono text-on-surface-variant">
                      {[item.espesorMm != null ? `${item.espesorMm} mm` : null, item.largoM != null ? `${item.largoM} m` : null].filter(Boolean).join(" · ") || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {hasStockFlag && <Badge tone={item.stockDisponible ? "success" : "warning"}>{item.stockDisponible ? "Disponible" : "Sin stock"}</Badge>}
                      {!hasStockFlag && hasStockNumber && (
                        <Badge tone={Number(item.stock) === 0 ? "warning" : Number(item.stock) < 10 ? "warning" : "success"}>
                          {item.stock > 0 ? `${item.stock} ${item.unit || "u"}` : "Sin stock"}
                        </Badge>
                      )}
                      {!hasStockFlag && !hasStockNumber && <span className="text-on-surface-variant">-</span>}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{item.provider || "-"}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <IconButton icon="edit" onClick={() => startEdit(item)} title="Editar" />
                      <IconButton icon="delete" tone="danger" onClick={() => removeMaterial(item.id)} title="Eliminar" />
                    </td>
                  </tr>
                );
              })}
              {!pageItems.length && !adding && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-on-surface-variant">Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-outline bg-surface-container-low px-6 py-4">
          <p className="text-xs font-semibold text-on-surface-variant">
            Mostrando {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length.toLocaleString("es-AR")} materiales
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
