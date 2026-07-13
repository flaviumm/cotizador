import React, { useEffect, useState } from "react";
import Cotizador from "./Cotizador.jsx";

// Persistencia local: reemplaza la capa Supabase del ERP.
function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Numeración automática local (equivale a getDocumentNumber del ERP).
function nextLocalNumber(items, prefix, padding = 4) {
  const max = items.reduce((highest, item) => {
    const match = String(item.number || "").match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(padding, "0")}`;
}

export default function App() {
  const [companies, setCompanies] = useState(() => loadLocal("cotizador.companies", []));
  const [quotes, setQuotes] = useState(() => loadLocal("cotizador.quotes", []));

  useEffect(() => { localStorage.setItem("cotizador.companies", JSON.stringify(companies)); }, [companies]);
  useEffect(() => { localStorage.setItem("cotizador.quotes", JSON.stringify(quotes)); }, [quotes]);

  // El estado ya se persiste por efecto; persistRecord solo cumple el contrato async del componente.
  const persistRecord = async () => {};
  const getDocumentNumber = async (_type, items, prefix, padding) => nextLocalNumber(items, prefix, padding);

  return (
    <div className="mx-auto max-w-6xl">
      <Cotizador
        companies={companies}
        setCompanies={setCompanies}
        quotes={quotes}
        setQuotes={setQuotes}
        persistRecord={persistRecord}
        getDocumentNumber={getDocumentNumber}
      />
    </div>
  );
}
