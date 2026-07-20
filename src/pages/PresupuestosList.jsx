import React from "react";
import { Panel, Badge, Button, Icon } from "../components/ui.jsx";
import { money } from "../lib/format.js";

const STATUS_TONE = { Borrador: "neutral", Enviado: "primary", Aceptado: "success", "No aceptado": "warning", Vencido: "warning" };

function sortedByRecent(quotes) {
  return [...quotes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export default function PresupuestosList({ quotes, onOpenQuote, onNewQuote }) {
  const items = sortedByRecent(quotes);

  if (!items.length) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-12 text-center">
        <Icon name="request_quote" className="text-[40px] text-on-surface-variant" />
        <p className="text-sm text-on-surface-variant">Todavía no tenés presupuestos guardados.</p>
        <Button onClick={onNewQuote} icon="add">Nuevo presupuesto</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3 py-4">
      {items.map((quote) => (
        <button key={quote.id} onClick={() => onOpenQuote(quote.id)} className="text-left">
          <Panel className="p-4 transition active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">{quote.client || "Cliente sin nombre"}</p>
                <p className="truncate text-xs text-on-surface-variant">{quote.service || "Sin título"}</p>
              </div>
              <Badge tone={STATUS_TONE[quote.status] || "neutral"}>{quote.status}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-on-surface-variant">
              <span>{quote.updatedAt ? new Date(quote.updatedAt).toLocaleDateString("es-AR") : ""}</span>
              <span className="font-mono text-sm font-bold text-primary">{money(quote.total)}</span>
            </div>
          </Panel>
        </button>
      ))}
    </div>
  );
}
