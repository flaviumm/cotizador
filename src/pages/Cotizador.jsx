import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import DatosEmpresaStep from "./steps/DatosEmpresaStep.jsx";
import MaterialesStep from "./steps/MaterialesStep.jsx";
import JornadasStep from "./steps/JornadasStep.jsx";
import TrasladoStep, { VEHICLE_TYPES, FUEL_CONSUMPTION_L_PER_100KM } from "./steps/TrasladoStep.jsx";
import ResumenStep from "./steps/ResumenStep.jsx";
import AnalisisPlanoAI from "../components/AnalisisPlanoAI.jsx";
import { MATERIAL_GROUPS, materialGroup, resolveMaterialCategory, materialCategoryLabel } from "../lib/materialGroups.js";
import { money } from "../lib/format.js";

// ---------- helpers (extraídos del ERP monolítico) ----------
function quoteLineTotal(line) {
  if (line.type === "title") return 0;
  return Number(line.quantity || 0) * Number(line.unitPrice || 0);
}

function catalogPrice(item) {
  return Number(item?.basePrice || item?.transferPrice || item?.listPrice || item?.pricePerMeter || 0);
}

function buildMaterialLine(item, quantity) {
  const price = catalogPrice(item);
  const meta = {
    category: item.category || "",
    sku: item.sku || "",
    unit: item.unit || "",
    provider: item.provider || "",
    source: item.source || "",
    spec: item.spec || "",
    espesorMm: item.espesorMm ?? null,
    largoM: item.largoM ?? null,
  };
  const medidasLabel = [
    meta.spec,
    meta.espesorMm != null ? `Esp: ${meta.espesorMm} mm` : "",
    meta.largoM != null ? `Largo: ${meta.largoM} m` : "",
  ].filter(Boolean).join(" · ");
  const detail = [
    item.name,
    medidasLabel,
    meta.unit ? `Unidad: ${meta.unit}` : "",
    meta.provider ? `Proveedor: ${meta.provider}` : "",
    meta.sku ? `SKU: ${meta.sku}` : "",
    `Precio base: ${money(price)}`,
  ].filter(Boolean).join(" - ");
  return {
    id: `mat-${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "material",
    detail,
    quantity: Number(quantity || 1),
    unitPrice: price,
    sourceId: item.id,
    meta,
  };
}

function buildLaborLine(rate, hours, description) {
  const meta = {
    category: rate.category || "",
    agreement: rate.agreement || "",
    unit: "hora",
    provider: "Mano de obra Bizon",
    source: "Tarifario interno",
  };
  const detail = String(description || "").trim() || `${rate.trade} - ${rate.category} - ${rate.agreement}`;
  return {
    id: `labor-${rate.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "labor",
    detail,
    quantity: Number(hours || 1),
    unitPrice: Number(rate.quoteHour || 0),
    sourceId: rate.id,
    meta,
  };
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function addDaysIso(days) {
  const safeDays = Number.isFinite(Number(days)) ? Number(days) : 0;
  const date = new Date();
  date.setDate(date.getDate() + safeDays);
  return date.toISOString().slice(0, 10);
}

function companyContacts(company) {
  if (Array.isArray(company.contacts) && company.contacts.length) {
    return company.contacts.map((contact) => ({
      name: contact.name || "Sin nombre",
      role: contact.role || "Contacto",
      phone: contact.phone || "-",
      email: contact.email || "",
    }));
  }
  return [{ name: company.contact || "Sin asignar", role: "Principal", phone: company.phone || "-", email: "" }];
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function openQuotePdfWindow() {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return null;
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head><title>Generando presupuesto</title></head>
      <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#F0E7D6;font-family:Arial,sans-serif;color:#211a12">
        <p>Generando presupuesto...</p>
      </body>
    </html>
  `);
  printWindow.document.close();
  return printWindow;
}

function generateQuotePdf(quote, targetWindow = null) {
  if (!quote?.number) return;

  const allLines = Array.isArray(quote.lineItems) && quote.lineItems.length
    ? quote.lineItems
    : [{ detail: quote.service, quantity: 1, unitPrice: quote.total, total: quote.total }];
  const client = quote.clientDetails || {};
  const logoUrl = `${window.location.origin}/brand/logo_principal_horizontal.png`;

  const sections = [];
  let cur = { title: null, items: [] };
  for (const line of allLines) {
    if (line.type === "title") {
      sections.push(cur);
      cur = { title: line.detail || "", items: [] };
    } else {
      cur.items.push(line);
    }
  }
  sections.push(cur);
  const validSections = sections.filter((s) => s.title !== null || s.items.length > 0);
  const hasSections = validSections.some((s) => s.title !== null);

  const palette = [
    { hd: "#8c1800", lt: "#FFF3EE", br: "#FFB4A4" },
    { hd: "#2e4c48", lt: "#F0FAF8", br: "#9DBDB8" },
    { hd: "#4b463a", lt: "#FBF9F3", br: "#D1C7B7" },
    { hd: "#8c1800", lt: "#FFF3EE", br: "#FFB4A4" },
    { hd: "#2e4c48", lt: "#F0FAF8", br: "#9DBDB8" },
  ];

  let ci = 0;
  let tableRows = "";

  for (const section of validSections) {
    const col = palette[ci % palette.length];
    if (section.title !== null) ci++;

    if (section.title !== null) {
      tableRows += `
        <tr>
          <td colspan="4" style="background:${col.hd};color:#fff;font-weight:700;font-size:12px;padding:10px 14px;letter-spacing:0.07em;text-transform:uppercase;border:none;">${htmlEscape(section.title)}</td>
        </tr>`;
    }

    let secTotal = 0;
    for (const line of section.items) {
      const lt = Number(line.total ?? quoteLineTotal(line));
      secTotal += lt;
      const rowBg = section.title !== null ? `background:${col.lt};` : "";
      const rowBd = section.title !== null ? `border-bottom:1px solid ${col.br};` : "border-bottom:1px solid #e4e4e7;";

      if (line.type === "labor") {
        const m = line.meta || {};
        const typeLabel = [m.category, m.agreement].filter(Boolean).join(" · ");
        const qty = Number(line.quantity || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });
        tableRows += `
          <tr style="${rowBg}">
            <td style="padding:10px 14px;${rowBd}">
              <div style="font-weight:600;color:#211a12;">${htmlEscape(line.detail)}</div>
              ${typeLabel ? `<div style="font-size:11px;color:#5c5347;margin-top:3px;">${htmlEscape(typeLabel)}</div>` : ""}
            </td>
            <td class="num" style="padding:10px 14px;${rowBd}color:#5c5347;">${qty} h</td>
            <td class="num" style="padding:10px 14px;${rowBd}color:#5c5347;">${money(line.unitPrice)}/h</td>
            <td class="num strong" style="padding:10px 14px;${rowBd}">${money(lt)}</td>
          </tr>`;
      } else {
        tableRows += `
          <tr style="${rowBg}">
            <td style="padding:10px 14px;${rowBd}">${htmlEscape(line.detail)}</td>
            <td class="num" style="padding:10px 14px;${rowBd}">${Number(line.quantity || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</td>
            <td class="num" style="padding:10px 14px;${rowBd}">${money(line.unitPrice)}</td>
            <td class="num strong" style="padding:10px 14px;${rowBd}">${money(lt)}</td>
          </tr>`;
      }
    }

    if (section.items.length > 0 && hasSections && section.title !== null) {
      const label = section.title ? `Subtotal — ${section.title}` : "Subtotal";
      tableRows += `
        <tr>
          <td colspan="3" style="padding:8px 14px;background:${col.lt};border-top:2px solid ${col.br};text-align:right;font-size:12px;font-weight:700;color:${col.hd};">${htmlEscape(label)}</td>
          <td class="num" style="padding:8px 14px;background:${col.lt};border-top:2px solid ${col.br};font-weight:700;color:${col.hd};white-space:nowrap;">${money(secTotal)}</td>
        </tr>`;
    }
  }

  const clientRows = [
    ["Empresa", quote.client],
    ["CUIT", client.taxId],
    ["Contacto", client.contact],
    ["Telefono", client.phone],
    ["Email", client.email],
    ["Direccion", client.address],
  ].filter(([, value]) => value).map(([label, value]) => `<p><span>${label}</span>${htmlEscape(value)}</p>`).join("");

  const ivaLabel = `IVA (${Math.round((quote.ivaRate ?? 0.21) * 100)}%)`;

  const printWindow = targetWindow || openQuotePdfWindow();
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${htmlEscape(quote.number)} PRESUPUESTO</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #F0E7D6; color: #211a12; font-family: Arial, sans-serif; }
          .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 20mm; }
          header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; border-bottom: 3px solid #ea2e00; padding-bottom: 18px; }
          img { width: 190px; height: auto; object-fit: contain; }
          h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
          .meta { text-align: right; font-size: 13px; color: #5c5347; }
          .meta strong { display: block; color: #211a12; font-size: 20px; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 24px 0 20px; }
          .box { border: 1px solid #d1c7b7; padding: 14px; border-radius: 4px; }
          .box h2 { margin: 0 0 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #5c5347; font-weight: 700; }
          .box p { margin: 5px 0; font-size: 13px; }
          .box span { display: inline-block; width: 80px; color: #5c5347; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #d1c7b7; border-radius: 4px; overflow: hidden; }
          thead tr { background: #211a12; }
          th { color: white; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          td { vertical-align: top; }
          .num { text-align: right; white-space: nowrap; }
          .strong { font-weight: 700; }
          .totals { width: 340px; margin-left: auto; margin-top: 24px; font-size: 13px; border: 1px solid #d1c7b7; border-radius: 4px; overflow: hidden; }
          .totals div { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #d1c7b7; }
          .totals .grand { font-size: 18px; font-weight: 700; color: #ea2e00; border-bottom: 0; padding: 12px 14px; background: #FFF3EE; }
          footer { margin-top: 36px; color: #5c5347; font-size: 11px; line-height: 1.6; border-top: 1px solid #d1c7b7; padding-top: 14px; }
          @media print { body { background: white; } .sheet { margin: 0; width: auto; min-height: auto; } }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header>
            <img src="${logoUrl}" alt="Bizon" onerror="this.style.display='none'" />
            <div class="meta">
              <h1>PRESUPUESTO</h1>
              <strong>${htmlEscape(quote.number)}</strong>
              <p>Fecha: ${new Date().toLocaleDateString("es-AR")}</p>
              <p>Valido hasta: ${htmlEscape(quote.validUntil || "-")}</p>
            </div>
          </header>
          <section class="info-grid">
            <div class="box">
              <h2>Cliente</h2>
              ${clientRows || `<p><span>Empresa</span>${htmlEscape(quote.client)}</p>`}
            </div>
            <div class="box">
              <h2>Obra / Trabajo</h2>
              <p><span>Descripcion</span>${htmlEscape(quote.service || "-")}</p>
              <p><span>Estado</span>${htmlEscape(quote.status || "Borrador")}</p>
            </div>
          </section>
          <table>
            <thead>
              <tr>
                <th>Descripcion</th>
                <th class="num">Cantidad</th>
                <th class="num">Precio unitario</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <section class="totals">
            <div><span>Subtotal</span><strong>${money(quote.subtotal)}</strong></div>
            <div><span>${ivaLabel}</span><strong>${money(quote.tax)}</strong></div>
            <div class="grand"><span>Total</span><strong>${money(quote.total)}</strong></div>
          </section>
          <footer>
            Presupuesto emitido por Bizon Metalurgica. Los precios estan expresados sin IVA salvo indicacion contraria y quedan sujetos a confirmacion de disponibilidad, alcance tecnico y condiciones comerciales finales.
          </footer>
        </main>
        <script>
          window.addEventListener("load", () => { setTimeout(() => window.print(), 250); });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ---------- Cotizador wizard (mismo componente del ERP; persistencia inyectada por props) ----------
const Cotizador = forwardRef(function Cotizador(
  { companies, setCompanies, quotes, setQuotes, persistRecord, getDocumentNumber, materials, laborRates, quoteParameters, step, setStep, lightboxImage, setLightboxImage },
  ref
) {
  const defaultValidUntil = addDaysIso(quoteParameters.offerValidityDays || 7);
  const [clientMode, setClientMode] = useState("existing");
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.name || "");
  const [clientDetails, setClientDetails] = useState({ name: companies[0]?.name || "", taxId: "", contact: companies[0]?.contact || "", phone: companies[0]?.phone || "", email: "", address: "" });
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [lineItems, setLineItems] = useState([]);
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialProvider, setMaterialProvider] = useState("");
  const [materialGroupFilter, setMaterialGroupFilter] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [materialMedida, setMaterialMedida] = useState("");
  const [materialEspesor, setMaterialEspesor] = useState("");
  const [materialFeedback, setMaterialFeedback] = useState(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState(1);
  const [jobTitle, setJobTitle] = useState("");
  const [laborAgreement, setLaborAgreement] = useState("");
  const [selectedLaborId, setSelectedLaborId] = useState(laborRates[0]?.id || "");
  const [laborHours, setLaborHours] = useState(1);
  const [laborDescription, setLaborDescription] = useState("");
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [saving, setSaving] = useState(false);

  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(0);
  const [perDiemPerPerson, setPerDiemPerPerson] = useState(0);
  const [travelConceptDraft, setTravelConceptDraft] = useState({ detail: "", unit: "Unidad", quantity: 1, unitPrice: 0 });

  const providers = [...new Set(materials.map((item) => item.provider).filter(Boolean))];

  const materialAlternates = useMemo(() => {
    const byName = new Map();
    for (const item of materials) {
      const key = (item.name || "").trim().toUpperCase();
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(item);
    }
    const result = new Map();
    for (const [key, items] of byName) {
      if (items.length > 1) result.set(key, items);
    }
    return result;
  }, [materials]);

  const materialGroups = useMemo(() => {
    const counts = new Map();
    for (const item of materials) {
      const g = materialGroup(item);
      counts.set(g, (counts.get(g) || 0) + 1);
    }
    return MATERIAL_GROUPS.filter((g) => counts.has(g)).map((g) => ({ name: g, count: counts.get(g) }));
  }, [materials]);

  const materialsInGroup = useMemo(() => {
    if (!materialGroupFilter) return [];
    return materials.filter((item) =>
      materialGroup(item) === materialGroupFilter &&
      (!materialProvider || item.provider === materialProvider));
  }, [materials, materialGroupFilter, materialProvider]);

  const materialCategories = useMemo(() => {
    if (materialGroupFilter === "Sin clasificar") return [];
    const counts = new Map();
    for (const item of materialsInGroup) {
      const key = resolveMaterialCategory(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: materialCategoryLabel(value), count }));
  }, [materialsInGroup, materialGroupFilter]);

  const materialsInCategory = useMemo(() => {
    if (!materialCategory) return materialsInGroup;
    return materialsInGroup.filter((item) => resolveMaterialCategory(item) === materialCategory);
  }, [materialsInGroup, materialCategory]);

  const materialMedidas = useMemo(() => {
    const set = new Set();
    for (const item of materialsInCategory) {
      const medida = (item.spec || item.medidas || "").trim();
      if (medida) set.add(medida);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [materialsInCategory]);

  const materialEspesores = useMemo(() => {
    const base = materialMedida
      ? materialsInCategory.filter((item) => (item.spec || item.medidas || "").trim() === materialMedida)
      : materialsInCategory;
    const set = new Set();
    for (const item of base) {
      if (item.espesorMm != null) set.add(Number(item.espesorMm));
    }
    return [...set].sort((a, b) => a - b);
  }, [materialsInCategory, materialMedida]);

  const filteredMaterials = useMemo(() => {
    const q = materialQuery.trim().toLowerCase();
    if (!materialGroupFilter && q.length < 2) return [];
    let list = materials;
    if (materialProvider) list = list.filter((item) => item.provider === materialProvider);
    if (materialGroupFilter) list = list.filter((item) => materialGroup(item) === materialGroupFilter);
    if (materialCategory) list = list.filter((item) => resolveMaterialCategory(item) === materialCategory);
    if (materialMedida) list = list.filter((item) => (item.spec || item.medidas || "").trim() === materialMedida);
    if (materialEspesor !== "") list = list.filter((item) => Number(item.espesorMm) === Number(materialEspesor));
    if (q) list = list.filter((item) => `${item.name} ${item.category} ${item.spec} ${item.provider} ${item.sku} ${item.brand}`.toLowerCase().includes(q));
    return list.slice(0, 200);
  }, [materials, materialProvider, materialGroupFilter, materialCategory, materialMedida, materialEspesor, materialQuery]);

  const selectedMaterial = materials.find((item) => item.id === selectedMaterialId) || null;
  const selectedLabor = laborRates.find((item) => item.id === selectedLaborId) || null;

  const subtotal = lineItems.reduce((total, line) => total + quoteLineTotal(line), 0);
  const subtotalMaterials = lineItems.filter((l) => l.type === "material").reduce((t, l) => t + quoteLineTotal(l), 0);
  const subtotalLabor = lineItems.filter((l) => l.type === "labor").reduce((t, l) => t + quoteLineTotal(l), 0);
  const subtotalTravel = lineItems.filter((l) => l.type === "travel").reduce((t, l) => t + quoteLineTotal(l), 0);
  const subtotalOther = subtotal - subtotalMaterials - subtotalLabor - subtotalTravel;
  const tax = Math.round(subtotal * Number(quoteParameters.iva || 0));
  const total = subtotal + tax;

  const travelLines = lineItems
    .map((line, index) => ({ ...line, index }))
    .filter((line) => line.type === "travel");

  useEffect(() => {
    if (!selectedCompany && companies[0]?.name) {
      updateClientFromCompany(companies[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, selectedCompany]);

  useEffect(() => {
    if (!materialFeedback) return;
    const timer = setTimeout(() => setMaterialFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [materialFeedback]);

  function selectMaterialGroup(value) {
    setMaterialGroupFilter(value);
    setMaterialCategory("");
    setMaterialMedida("");
    setMaterialEspesor("");
    setSelectedMaterialId("");
  }

  function selectMaterialCategory(value) {
    setMaterialCategory(value);
    setMaterialMedida("");
    setMaterialEspesor("");
    setSelectedMaterialId("");
  }

  function selectMaterialMedida(value) {
    setMaterialMedida(value);
    setMaterialEspesor("");
    setSelectedMaterialId("");
  }

  function updateClientFromCompany(name) {
    const company = companies.find((item) => item.name === name);
    setSelectedCompany(name);
    setClientDetails({
      name,
      taxId: "",
      contact: company?.contact || "",
      phone: company?.phone || "",
      email: companyContacts(company || {})[0]?.email || "",
      address: company?.city || "",
    });
  }

  function updateLine(index, patch) {
    setGeneratedQuote(null);
    setLineItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addLine() {
    setGeneratedQuote(null);
    setLineItems((items) => [...items, { id: Date.now(), detail: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeLine(index) {
    setGeneratedQuote(null);
    setLineItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function addMaterialLine() {
    if (!selectedMaterial) return;
    const outOfStock = selectedMaterial.stockDisponible === false ||
      (selectedMaterial.stockDisponible == null && selectedMaterial.stock != null && Number(selectedMaterial.stock) <= 0);
    if (outOfStock) {
      setMaterialFeedback({ type: "error", message: `Sin stock: no se puede agregar "${selectedMaterial.name}".` });
      return;
    }
    setGeneratedQuote(null);
    setLineItems((items) => [...items, buildMaterialLine(selectedMaterial, materialQuantity)]);
    setMaterialFeedback({ type: "success", message: `"${selectedMaterial.name}" se agregó al presupuesto.` });
  }

  function addLaborLine() {
    if (!selectedLabor) return;
    setGeneratedQuote(null);
    setLineItems((items) => [...items, buildLaborLine(selectedLabor, laborHours, laborDescription)]);
    setLaborDescription("");
  }

  function addAiMaterials(selections) {
    if (!selections?.length) return;
    setGeneratedQuote(null);
    setLineItems((items) => [...items, ...selections.map(({ item, quantity }) => buildMaterialLine(item, quantity))]);
  }

  function addAiLabor({ rate, horas, justificacion }) {
    if (!rate) return;
    setGeneratedQuote(null);
    setLineItems((items) => [...items, buildLaborLine(rate, horas, justificacion)]);
  }

  function ensureTravelSection(items) {
    if (items.some((l) => l.type === "title" && l.detail === "Traslado")) return items;
    return [...items, { id: `travel-title-${Date.now()}`, type: "title", detail: "Traslado" }];
  }

  function addOrUpdateFuelLine() {
    const liters = Number(((Number(distanceKm || 0) * FUEL_CONSUMPTION_L_PER_100KM) / 100).toFixed(2));
    setGeneratedQuote(null);
    setLineItems((items) => {
      const withSection = ensureTravelSection(items);
      const existingIndex = withSection.findIndex((l) => l.sourceId === "travel-fuel");
      const fuelLine = {
        id: existingIndex >= 0 ? withSection[existingIndex].id : `travel-fuel-${Date.now()}`,
        type: "travel",
        sourceId: "travel-fuel",
        detail: `Combustible (Consumo estimado ${FUEL_CONSUMPTION_L_PER_100KM}L/100km)`,
        quantity: liters,
        unitPrice: Number(fuelPricePerLiter || 0),
        meta: { unit: "Litro", provider: vehicleType },
      };
      if (existingIndex >= 0) {
        const next = [...withSection];
        next[existingIndex] = fuelLine;
        return next;
      }
      return [...withSection, fuelLine];
    });
  }

  function applyPerDiemDraft() {
    setTravelConceptDraft({ detail: "Viáticos de conductor (alojamiento y alimentación)", unit: "Día", quantity: 1, unitPrice: Number(perDiemPerPerson || 0) });
  }

  function addTravelConcept() {
    if (!travelConceptDraft.detail.trim()) return;
    setGeneratedQuote(null);
    setLineItems((items) => [...ensureTravelSection(items), {
      id: `travel-${Date.now()}`,
      type: "travel",
      detail: travelConceptDraft.detail.trim(),
      quantity: Number(travelConceptDraft.quantity || 0),
      unitPrice: Number(travelConceptDraft.unitPrice || 0),
      meta: { unit: travelConceptDraft.unit },
    }]);
    setTravelConceptDraft({ detail: "", unit: "Unidad", quantity: 1, unitPrice: 0 });
  }

  function buildQuote(number) {
    const normalizedLines = lineItems.map((line) => ({
      detail: line.type === "title" ? (line.detail || "") : (line.detail || "Producto sin detalle"),
      quantity: line.type === "title" ? 0 : Number(line.quantity || 0),
      unitPrice: line.type === "title" ? 0 : Number(line.unitPrice || 0),
      total: quoteLineTotal(line),
      type: line.type || "manual",
      sourceId: line.sourceId || "",
      meta: line.meta || {},
    }));
    return {
      number,
      client: clientDetails.name || selectedCompany || "Cliente sin nombre",
      service: jobTitle.trim() || normalizedLines.find((l) => l.type !== "title")?.detail || "Presupuesto",
      subtotal,
      tax,
      total,
      ivaRate: Number(quoteParameters.iva || 0),
      status: "Borrador",
      validUntil,
      lineItems: normalizedLines,
      clientDetails,
    };
  }

  async function saveQuote({ openPdf = false, pdfWindow = null } = {}) {
    if (openPdf && generatedQuote) {
      generateQuotePdf(generatedQuote, pdfWindow);
      return generatedQuote;
    }

    setSaving(true);
    try {
      let companyName = clientDetails.name?.trim();
      if (clientMode === "new" && companyName && !companies.some((company) => normalizeKey(company.name) === normalizeKey(companyName))) {
        const record = {
          id: Date.now(),
          name: companyName,
          type: "Cliente",
          city: clientDetails.address || "Neuquen",
          status: "Prospecto",
          contact: clientDetails.contact || "Sin asignar",
          phone: clientDetails.phone || "-",
          contacts: [{ name: clientDetails.contact || "Sin asignar", role: "Principal", phone: clientDetails.phone || "-", email: clientDetails.email || "" }],
          next: "Seguimiento presupuesto",
          value: total,
        };
        setCompanies((items) => [...items, record]);
        await persistRecord("companies", record);
      }

      const number = await getDocumentNumber("quote", quotes, "P", 4);
      const quote = buildQuote(number);
      setQuotes((items) => [...items, quote]);
      await persistRecord("quotes", quote);
      setGeneratedQuote(quote);
      if (openPdf) generateQuotePdf(quote, pdfWindow);
      return quote;
    } catch (error) {
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.document.open();
        pdfWindow.document.write(`
          <!doctype html>
          <html>
            <head><title>Error al generar presupuesto</title></head>
            <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#fff5f5;font-family:Arial,sans-serif;color:#991b1b">
              <div style="max-width:520px;padding:24px;border:1px solid #fecaca;border-radius:10px;background:white">
                <h1 style="margin:0 0 8px;font-size:22px">No se pudo generar el PDF</h1>
                <p style="margin:0;color:#52525b">${htmlEscape(error?.message || "Error desconocido")}</p>
              </div>
            </body>
          </html>
        `);
        pdfWindow.document.close();
      }
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function handleGeneratePdf() {
    const pdfWindow = openQuotePdfWindow();
    saveQuote({ openPdf: true, pdfWindow }).catch((error) => {
      console.error("No se pudo generar el presupuesto PDF:", error);
    });
  }

  useImperativeHandle(ref, () => ({ generatePdf: handleGeneratePdf }));

  if (step === "materiales") {
    return (
      <MaterialesStep
        materialProvider={materialProvider} setMaterialProvider={setMaterialProvider}
        materialGroupFilter={materialGroupFilter} onGroupChange={selectMaterialGroup} materialGroups={materialGroups}
        materialCategory={materialCategory} onCategoryChange={selectMaterialCategory} materialCategories={materialCategories}
        materialMedida={materialMedida} onMedidaChange={selectMaterialMedida} materialMedidas={materialMedidas}
        materialEspesor={materialEspesor} setMaterialEspesor={setMaterialEspesor} materialEspesores={materialEspesores}
        materialQuery={materialQuery} setMaterialQuery={setMaterialQuery}
        materialQuantity={materialQuantity} setMaterialQuantity={setMaterialQuantity}
        filteredMaterials={filteredMaterials} selectedMaterial={selectedMaterial}
        selectedMaterialId={selectedMaterialId} setSelectedMaterialId={setSelectedMaterialId}
        addMaterialLine={addMaterialLine} setLightboxImage={setLightboxImage}
        materialFeedback={materialFeedback} materialAlternates={materialAlternates}
        money={money} catalogPrice={catalogPrice} providers={providers}
        aiPanel={
          <AnalisisPlanoAI
            materials={materials}
            laborRates={laborRates}
            money={money}
            catalogPrice={catalogPrice}
            onAddMaterials={addAiMaterials}
            onAddLabor={addAiLabor}
          />
        }
      />
    );
  }
  if (step === "jornadas") {
    return (
      <JornadasStep
        laborAgreement={laborAgreement} setLaborAgreement={setLaborAgreement}
        selectedLaborId={selectedLaborId} setSelectedLaborId={setSelectedLaborId}
        laborRates={laborRates} selectedLabor={selectedLabor}
        laborHours={laborHours} setLaborHours={setLaborHours}
        laborDescription={laborDescription} setLaborDescription={setLaborDescription}
        addLaborLine={addLaborLine} money={money}
      />
    );
  }
  if (step === "traslado") {
    return (
      <TrasladoStep
        vehicleType={vehicleType} setVehicleType={setVehicleType}
        distanceKm={distanceKm} setDistanceKm={setDistanceKm}
        fuelPricePerLiter={fuelPricePerLiter} setFuelPricePerLiter={setFuelPricePerLiter}
        perDiemPerPerson={perDiemPerPerson} setPerDiemPerPerson={setPerDiemPerPerson}
        addOrUpdateFuelLine={addOrUpdateFuelLine} applyPerDiemDraft={applyPerDiemDraft}
        travelConceptDraft={travelConceptDraft} setTravelConceptDraft={setTravelConceptDraft}
        addTravelConcept={addTravelConcept} travelLines={travelLines} removeLine={removeLine}
        subtotalTravel={subtotalTravel} money={money}
      />
    );
  }
  if (step === "resumen") {
    return (
      <ResumenStep
        subtotalMaterials={subtotalMaterials} subtotalLabor={subtotalLabor} subtotalTravel={subtotalTravel} subtotalOther={subtotalOther}
        subtotal={subtotal} tax={tax} total={total} money={money}
        lineItems={lineItems} updateLine={updateLine} removeLine={removeLine} addLine={addLine} quoteLineTotal={quoteLineTotal}
        generatedQuote={generatedQuote} saving={saving} handleGeneratePdf={handleGeneratePdf} onEdit={() => setStep("datosEmpresa")}
        validUntil={validUntil}
      />
    );
  }
  return (
    <DatosEmpresaStep
      companies={companies} clientMode={clientMode} setClientMode={setClientMode}
      selectedCompany={selectedCompany} updateClientFromCompany={updateClientFromCompany}
      clientDetails={clientDetails} setClientDetails={setClientDetails}
      jobTitle={jobTitle} setJobTitle={setJobTitle}
      validUntil={validUntil} setValidUntil={setValidUntil}
      money={money} subtotalMaterials={subtotalMaterials} subtotalLabor={subtotalLabor} subtotalTravel={subtotalTravel} total={total}
      onSaveDraft={() => saveQuote({ openPdf: false })} saving={saving} generatedQuote={generatedQuote}
    />
  );
});

export default Cotizador;
