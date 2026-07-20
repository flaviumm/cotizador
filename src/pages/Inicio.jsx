import React from "react";
import { Panel, Button, Icon } from "../components/ui.jsx";

function mostRecentDraft(quotes) {
  const drafts = quotes.filter((quote) => quote.status === "Borrador");
  if (!drafts.length) return null;
  return drafts.reduce((latest, quote) => ((quote.updatedAt || "") > (latest.updatedAt || "") ? quote : latest));
}

export default function Inicio({ quotes, onNewQuote, onViewList, onContinueDraft }) {
  const draft = mostRecentDraft(quotes);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
      <button
        onClick={onNewQuote}
        className="flex flex-col items-center justify-center gap-2 rounded-lg bg-primary px-6 py-10 text-white shadow-sm transition active:scale-[0.98]"
      >
        <Icon name="add_circle" className="text-[40px]" />
        <span className="text-lg font-bold uppercase tracking-wide">Nuevo presupuesto</span>
      </button>

      <Button variant="ghost" icon="list_alt" onClick={onViewList} className="w-full justify-center py-3">
        Ver presupuestos
      </Button>

      {draft && (
        <Panel className="p-4">
          <button onClick={() => onContinueDraft(draft.id)} className="flex w-full items-center gap-3 text-left">
            <Icon name="edit_note" className="text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface">Tenés un presupuesto sin terminar</p>
              <p className="truncate text-xs text-on-surface-variant">{draft.service || "Sin título"} — continuar</p>
            </div>
            <Icon name="chevron_right" className="text-on-surface-variant" />
          </button>
        </Panel>
      )}
    </div>
  );
}
