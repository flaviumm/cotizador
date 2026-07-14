import React, { useMemo, useState } from "react";
import { Panel, Field, TextInput, Button, IconButton, SectionTitle } from "../components/ui.jsx";

const money = (value) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));

const emptyDraft = { trade: "", agreement: "", category: "", baseHour: "", quoteHour: "" };

function RateForm({ draft, setDraft, onCancel, onSave, title }) {
  return (
    <div className="grid gap-3 border-t border-outline bg-surface-container-low p-5 md:grid-cols-3">
      <p className="md:col-span-3 text-xs font-bold uppercase tracking-wide text-primary">{title}</p>
      <Field label="Oficio"><TextInput value={draft.trade} onChange={(e) => setDraft({ ...draft, trade: e.target.value })} placeholder="Ej. Soldador" /></Field>
      <Field label="Convenio"><TextInput value={draft.agreement} onChange={(e) => setDraft({ ...draft, agreement: e.target.value })} placeholder="UOM CCT 260/75" /></Field>
      <Field label="Categoría"><TextInput value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Oficial Especializado" /></Field>
      <Field label="Costo hora base"><TextInput type="number" min="0" step="0.01" value={draft.baseHour} onChange={(e) => setDraft({ ...draft, baseHour: e.target.value })} /></Field>
      <Field label="Tarifa de cotización / hora"><TextInput type="number" min="0" step="0.01" value={draft.quoteHour} onChange={(e) => setDraft({ ...draft, quoteHour: e.target.value })} /></Field>
      <div className="flex items-end gap-2">
        <Button onClick={onSave} disabled={!draft.trade.trim()} icon="check">Guardar</Button>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

export default function ManoDeObra({ laborRates, setLaborRates }) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);

  const byAgreement = useMemo(() => {
    const groups = new Map();
    for (const rate of laborRates) {
      const key = rate.agreement || "Sin convenio";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rate);
    }
    return [...groups.entries()];
  }, [laborRates]);

  function startEdit(item) {
    setEditingId(item.id);
    setEditDraft({ ...emptyDraft, ...item, baseHour: item.baseHour ?? "", quoteHour: item.quoteHour ?? "" });
  }

  function saveNew() {
    if (!addDraft.trade.trim()) return;
    setLaborRates((items) => [...items, {
      ...addDraft,
      id: `custom-${Date.now()}`,
      baseHour: Number(addDraft.baseHour || 0),
      quoteHour: Number(addDraft.quoteHour || addDraft.baseHour || 0),
    }]);
    setAddDraft(emptyDraft);
    setAdding(false);
  }

  function saveEdit() {
    setLaborRates((items) => items.map((item) => item.id === editingId ? {
      ...item, ...editDraft,
      baseHour: Number(editDraft.baseHour || 0),
      quoteHour: Number(editDraft.quoteHour || 0),
    } : item));
    setEditingId(null);
  }

  function removeRate(id) {
    setLaborRates((items) => items.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        icon="engineering"
        title="Costo de Mano de Obra"
        subtitle="Configuración técnica de jornales según convenios colectivos vigentes."
        action={!adding ? "Agregar Oficio" : null}
        onAction={() => setAdding(true)}
      />

      {adding && (
        <Panel className="overflow-hidden">
          <RateForm draft={addDraft} setDraft={setAddDraft} onCancel={() => setAdding(false)} onSave={saveNew} title="Nuevo oficio" />
        </Panel>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {byAgreement.map(([agreement, rates]) => (
          <Panel key={agreement} title={agreement} icon="badge" className="overflow-hidden">
            <table className="w-full text-left">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3">Categoría profesional</th>
                  <th className="px-6 py-3 text-right">Costo hora</th>
                  <th className="w-20 px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {rates.map((rate) => (
                  <React.Fragment key={rate.id}>
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-semibold text-on-surface">{rate.trade}</p>
                        <p className="text-xs text-on-surface-variant">{rate.category}</p>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-primary">{money(rate.quoteHour)}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <IconButton icon="edit" onClick={() => startEdit(rate)} title="Editar" />
                        <IconButton icon="delete" tone="danger" onClick={() => removeRate(rate.id)} title="Eliminar" />
                      </td>
                    </tr>
                    {editingId === rate.id && (
                      <tr><td colSpan={3}><RateForm draft={editDraft} setDraft={setEditDraft} onCancel={() => setEditingId(null)} onSave={saveEdit} title={`Editar: ${rate.trade}`} /></td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </Panel>
        ))}
        {!laborRates.length && !adding && (
          <p className="text-sm text-on-surface-variant">No hay tarifas cargadas todavía.</p>
        )}
      </div>
    </div>
  );
}
