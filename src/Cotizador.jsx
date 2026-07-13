import React, { useEffect, useState } from "react";
import { laborRates, materialPriceCatalog, quoteParameters } from "./pricingData";

// ---------- helpers (extraídos del ERP monolítico) ----------
function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function quoteLineTotal(line) {
  if (line.type === "title") return 0;
  return Number(line.quantity || 0) * Number(line.unitPrice || 0);
}

function catalogPrice(item) {
  return Number(item?.basePrice || item?.transferPrice || item?.listPrice || item?.pricePerMeter || 0);
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
      <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#f4f4f2;font-family:Arial,sans-serif;color:#18181b">
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
    { hd: "#1e40af", lt: "#EFF6FF", br: "#93C5FD" },
    { hd: "#92400e", lt: "#FFFBEB", br: "#FCD34D" },
    { hd: "#14532d", lt: "#F0FDF4", br: "#86EFAC" },
    { hd: "#581c87", lt: "#FAF5FF", br: "#D8B4FE" },
    { hd: "#134e4a", lt: "#F0FDFA", br: "#5EEAD4" },
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
              <div style="font-weight:600;color:#18181b;">${htmlEscape(line.detail)}</div>
              ${typeLabel ? `<div style="font-size:11px;color:#71717a;margin-top:3px;">${htmlEscape(typeLabel)}</div>` : ""}
            </td>
            <td class="num" style="padding:10px 14px;${rowBd}color:#52525b;">${qty} h</td>
            <td class="num" style="padding:10px 14px;${rowBd}color:#52525b;">${money(line.unitPrice)}/h</td>
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
          body { margin: 0; background: #f4f4f2; color: #18181b; font-family: Arial, sans-serif; }
          .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 20mm; }
          header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; border-bottom: 3px solid #ff7900; padding-bottom: 18px; }
          img { width: 190px; height: auto; object-fit: contain; }
          h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
          .meta { text-align: right; font-size: 13px; color: #52525b; }
          .meta strong { display: block; color: #18181b; font-size: 20px; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 24px 0 20px; }
          .box { border: 1px solid #e4e4e7; padding: 14px; border-radius: 6px; }
          .box h2 { margin: 0 0 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a; font-weight: 700; }
          .box p { margin: 5px 0; font-size: 13px; }
          .box span { display: inline-block; width: 80px; color: #71717a; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; }
          thead tr { background: #18181b; }
          th { color: white; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          td { vertical-align: top; }
          .num { text-align: right; white-space: nowrap; }
          .strong { font-weight: 700; }
          .totals { width: 340px; margin-left: auto; margin-top: 24px; font-size: 13px; border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; }
          .totals div { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #e4e4e7; }
          .totals .grand { font-size: 18px; font-weight: 700; color: #ff7900; border-bottom: 0; padding: 12px 14px; background: #fff8f3; }
          footer { margin-top: 36px; color: #71717a; font-size: 11px; line-height: 1.6; border-top: 1px solid #e4e4e7; padding-top: 14px; }
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
            <div><span>IVA (21%)</span><strong>${money(quote.tax)}</strong></div>
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

// ---------- UI primitives (extraídos del ERP) ----------
function Button({ children, onClick, variant = "primary", type = "button", disabled = false }) {
  const styles = {
    primary: "border-[#ff7900] bg-[#ff7900] text-black shadow-sm hover:bg-[#ff8f1f]",
    ghost: "border-[#cfe7dd] bg-[#f0fdf7] text-[#0f766e] hover:border-[#0f766e]",
    danger: "border-[#f3d2d2] bg-[#fff5f5] text-[#b42318] hover:border-[#b42318]",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border px-2.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]}`}>
      {children}
    </button>
  );
}

function Badge({ children, tone = "zinc" }) {
  const tones = {
    zinc: "border-[#e7e7e2] bg-[#f7f7f4] text-zinc-600",
    green: "border-[#ffd2ad] bg-[#fff3e8] text-[#d85f00]",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.zinc}`}>{children}</span>;
}

function Panel({ children, className = "" }) {
  return <section className={`rounded-[22px] border border-[#ececf0] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.035)] ${className}`}>{children}</section>;
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
      {label}
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className="min-h-9 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition placeholder:text-zinc-400 focus:border-[#ff7900] focus:ring-2" />;
}

function Select(props) {
  return <select {...props} className="min-h-9 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition focus:border-[#ff7900] focus:ring-2" />;
}

function TextArea(props) {
  return <textarea {...props} className="min-h-24 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 py-2 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition placeholder:text-zinc-400 focus:border-[#ff7900] focus:ring-2" />;
}

function SectionTitle({ title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-zinc-500">{subtitle}</p>}
      </div>
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  );
}

// ---------- Cotizador (mismo componente del ERP; persistencia inyectada por props) ----------
export default function Cotizador({ companies, setCompanies, quotes, setQuotes, persistRecord, getDocumentNumber }) {
  const defaultValidUntil = addDaysIso(quoteParameters.offerValidityDays || 7);
  const [clientMode, setClientMode] = useState("existing");
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.name || "");
  const [clientDetails, setClientDetails] = useState({ name: companies[0]?.name || "", taxId: "", contact: companies[0]?.contact || "", phone: companies[0]?.phone || "", email: "", address: "" });
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [lineItems, setLineItems] = useState([]);
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialProvider, setMaterialProvider] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState(1);
  const [jobTitle, setJobTitle] = useState("");
  const [laborAgreement, setLaborAgreement] = useState("");
  const [selectedLaborId, setSelectedLaborId] = useState(laborRates[0]?.id || "");
  const [laborHours, setLaborHours] = useState(1);
  const [laborDescription, setLaborDescription] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [saving, setSaving] = useState(false);

  const filteredMaterials = materialQuery.trim().length < 2 ? [] : materialPriceCatalog
    .filter((item) => (!materialProvider || item.provider === materialProvider) &&
      `${item.name} ${item.category} ${item.spec} ${item.provider} ${item.sku} ${item.brand}`.toLowerCase().includes(materialQuery.toLowerCase()))
    .slice(0, 60);
  const selectedMaterial = materialPriceCatalog.find((item) => item.id === selectedMaterialId) || null;
  const selectedLabor = laborRates.find((item) => item.id === selectedLaborId) || null;
  const subtotal = lineItems.reduce((total, line) => total + quoteLineTotal(line), 0);
  const tax = Math.round(subtotal * Number(quoteParameters.iva || 0));
  const total = subtotal + tax;

  useEffect(() => {
    if (!selectedCompany && companies[0]?.name) {
      updateClientFromCompany(companies[0].name);
    }
  }, [companies, selectedCompany]);

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

  function addTitleLine() {
    if (!titleInput.trim()) return;
    setGeneratedQuote(null);
    setLineItems((items) => [...items, { id: Date.now(), type: "title", detail: titleInput.trim() }]);
    setTitleInput("");
  }

  function removeLine(index) {
    setGeneratedQuote(null);
    setLineItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function addMaterialLine() {
    if (!selectedMaterial) return;
    const price = catalogPrice(selectedMaterial);
    const meta = {
      category: selectedMaterial.category || "",
      sku: selectedMaterial.sku || "",
      unit: selectedMaterial.unit || "",
      provider: selectedMaterial.provider || "",
      source: selectedMaterial.source || "",
      spec: selectedMaterial.spec || "",
    };
    const detail = [
      selectedMaterial.name,
      meta.spec,
      meta.unit ? `Unidad: ${meta.unit}` : "",
      meta.provider ? `Proveedor: ${meta.provider}` : "",
      meta.sku ? `SKU: ${meta.sku}` : "",
      `Precio base: ${money(price)}`,
    ].filter(Boolean).join(" - ");

    setGeneratedQuote(null);
    setLineItems((items) => [...items, {
      id: `mat-${selectedMaterial.id}-${Date.now()}`,
      type: "material",
      detail,
      quantity: Number(materialQuantity || 1),
      unitPrice: price,
      sourceId: selectedMaterial.id,
      meta,
    }]);
  }

  function addLaborLine() {
    if (!selectedLabor) return;
    const meta = {
      category: selectedLabor.category || "",
      agreement: selectedLabor.agreement || "",
      unit: "hora",
      provider: "Mano de obra Bizon",
      source: "Tarifario interno",
    };
    const detail = laborDescription.trim() || `${selectedLabor.trade} - ${selectedLabor.category} - ${selectedLabor.agreement}`;

    setGeneratedQuote(null);
    setLineItems((items) => [...items, {
      id: `labor-${selectedLabor.id}-${Date.now()}`,
      type: "labor",
      detail,
      quantity: Number(laborHours || 1),
      unitPrice: Number(selectedLabor.quoteHour || 0),
      sourceId: selectedLabor.id,
      meta,
    }]);
    setLaborDescription("");
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

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Cotizador Bizon" subtitle="Armado de presupuesto con empresa, detalle de productos, cantidades, precios y PDF" />

      <Panel className="p-5 shadow-none">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cliente">
              <Select value={clientMode} onChange={(event) => setClientMode(event.target.value)}>
                <option value="existing">Empresa cargada</option>
                <option value="new">Empresa nueva</option>
              </Select>
            </Field>
            {clientMode === "existing" ? (
              <Field label="Empresa">
                <Select value={selectedCompany} onChange={(event) => updateClientFromCompany(event.target.value)}>
                  {companies.map((company) => <option key={company.id || company.name} value={company.name}>{company.name}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Empresa">
                <TextInput value={clientDetails.name} onChange={(event) => setClientDetails({ ...clientDetails, name: event.target.value })} placeholder="Razon social" />
              </Field>
            )}
            <Field label="CUIT"><TextInput value={clientDetails.taxId} onChange={(event) => setClientDetails({ ...clientDetails, taxId: event.target.value })} placeholder="30-00000000-0" /></Field>
            <Field label="Contacto"><TextInput value={clientDetails.contact} onChange={(event) => setClientDetails({ ...clientDetails, contact: event.target.value })} /></Field>
            <Field label="Telefono"><TextInput value={clientDetails.phone} onChange={(event) => setClientDetails({ ...clientDetails, phone: event.target.value })} /></Field>
            <Field label="Email"><TextInput type="email" value={clientDetails.email} onChange={(event) => setClientDetails({ ...clientDetails, email: event.target.value })} /></Field>
            <Field label="Direccion / ciudad"><TextInput value={clientDetails.address} onChange={(event) => setClientDetails({ ...clientDetails, address: event.target.value })} /></Field>
            <Field label="Valido hasta"><TextInput type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></Field>
          </div>
          <div className="rounded-2xl border border-[#ececf0] bg-[#fafaf8] p-4">
            <p className="text-sm font-semibold text-zinc-950">Resumen</p>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between"><span>Numero</span><strong>{generatedQuote?.number || "Automatico"}</strong></div>
              <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="flex justify-between"><span>IVA</span><strong>{money(tax)}</strong></div>
              <div className="border-t border-[#e6e6e2] pt-2" />
              <div className="flex justify-between text-base text-zinc-950"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
            {generatedQuote && <Badge tone="green">Generado {generatedQuote.number}</Badge>}
          </div>
        </div>
      </Panel>

      <Panel className="p-5 shadow-none">
        <div className="grid gap-4">
          <Field label="Nombre del trabajo (aparece en el PDF)">
            <TextInput
              value={jobTitle}
              onChange={(event) => { setGeneratedQuote(null); setJobTitle(event.target.value); }}
              placeholder="Ej. Estructura metalica para nave industrial"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_max-content] items-end">
            <Field label="Titulo de seccion">
              <TextInput
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") addTitleLine(); }}
                placeholder="Ej. Materiales, Mano de obra, Trabajos de campo..."
              />
            </Field>
            <Button variant="ghost" onClick={addTitleLine}>Agregar titulo</Button>
          </div>
        </div>
      </Panel>

      <Panel className="p-5 shadow-none">
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="grid gap-3">
            <SectionTitle title="Base de materiales" subtitle={`${materialPriceCatalog.length} materiales disponibles para agregar al detalle`} />
            <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_96px_max-content] md:items-end">
              <Field label="Proveedor">
                <Select value={materialProvider} onChange={(event) => { setMaterialProvider(event.target.value); setSelectedMaterialId(""); }}>
                  <option value="">Todos</option>
                  {["Carlos Isla", "Neucon", "Ferromundo"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Buscar material">
                <TextInput value={materialQuery} onChange={(event) => { setMaterialQuery(event.target.value); setSelectedMaterialId(""); }} placeholder="Nombre, categoría, SKU, marca…" />
              </Field>
              <Field label="Cantidad">
                <TextInput type="number" min="0" step="0.01" value={materialQuantity} onChange={(event) => setMaterialQuantity(event.target.value)} />
              </Field>
              <Button onClick={addMaterialLine} disabled={!selectedMaterial}>Agregar material</Button>
            </div>
            {filteredMaterials.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-[#ececf0] divide-y divide-[#ececf0]">
                {filteredMaterials.map((item) => {
                  const isSelected = selectedMaterial?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedMaterialId(item.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${isSelected ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50 text-zinc-800"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`shrink-0 w-12 h-12 rounded overflow-hidden flex items-center justify-center ${isSelected ? "bg-zinc-700" : "bg-zinc-100"} ${item.imagen ? "cursor-zoom-in" : ""}`}
                          onClick={item.imagen ? (e) => { e.stopPropagation(); setLightboxImage({ src: item.imagen, name: item.name }); } : undefined}
                        >
                          {item.imagen
                            ? <img src={item.imagen} alt={item.name} className="w-full h-full object-contain" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                            : <span className="text-lg">{item.provider === "Carlos Isla" ? "🏗️" : item.provider === "Neucon" ? "🧱" : "🔧"}</span>
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold leading-snug truncate ${isSelected ? "text-white" : "text-zinc-900"}`}>{item.name}</p>
                          {item.spec && <p className={`text-xs mt-0.5 ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>{item.spec}</p>}
                          <p className={`text-xs mt-0.5 ${isSelected ? "text-zinc-400" : "text-zinc-400"}`}>
                            {[item.brand, item.sku, item.unit ? `Unidad: ${item.unit}` : null, item.provider].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-bold text-sm whitespace-nowrap ${isSelected ? "text-white" : "text-zinc-900"}`}>{money(catalogPrice(item))}</p>
                          {item.stock !== null && (
                            <p className={`text-xs mt-0.5 ${item.stock > 0 ? (isSelected ? "text-green-300" : "text-green-600") : (isSelected ? "text-red-300" : "text-red-500")}`}>
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
              <p className="text-sm text-zinc-400 text-center py-4">Sin resultados para "{materialQuery}"</p>
            )}
          </div>

          <div className="grid gap-3">
            <SectionTitle title="Mano de obra" subtitle="Carga de horas por oficio con tarifa de cotizacion" />
            <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)_96px_max-content] md:items-end">
              <Field label="Convenio">
                <Select value={laborAgreement} onChange={(event) => { setLaborAgreement(event.target.value); setSelectedLaborId(""); }}>
                  <option value="">Todos</option>
                  {[...new Set(laborRates.map((r) => r.agreement))].map((ag) => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Oficio">
                <Select value={selectedLaborId} onChange={(event) => setSelectedLaborId(event.target.value)}>
                  <option value="">Seleccionar oficio...</option>
                  {laborRates.filter((r) => !laborAgreement || r.agreement === laborAgreement).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.trade} - {money(item.quoteHour)}/h
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Horas">
                <TextInput type="number" min="0" step="0.25" value={laborHours} onChange={(event) => setLaborHours(event.target.value)} />
              </Field>
              <Button onClick={addLaborLine} disabled={!selectedLabor}>Agregar horas</Button>
            </div>
            <Field label="Descripcion del trabajo cotizado">
              <TextArea
                value={laborDescription}
                onChange={(event) => setLaborDescription(event.target.value)}
                placeholder="Ej. Soldadura de estructura metalica, corte y preparacion de materiales..."
              />
            </Field>
            {selectedLabor && (
              <div className="rounded-lg border border-[#ececf0] bg-[#fafaf8] p-3 text-sm text-zinc-600">
                <p className="font-semibold text-zinc-950">{selectedLabor.trade}</p>
                <p>{selectedLabor.category}</p>
                <p className="mt-1">Convenio: {selectedLabor.agreement} · Tarifa: <strong>{money(selectedLabor.quoteHour)}/h</strong></p>
                {selectedLabor.baseHour && selectedLabor.quoteHour !== selectedLabor.baseHour && (
                  <p className="mt-0.5 text-xs text-zinc-400">Base: {money(selectedLabor.baseHour)}/h + 40% costo laboral + 30% ganancia</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden shadow-none">
        <div className="flex flex-col gap-3 border-b border-[#ececf0] p-5 md:flex-row md:items-center md:justify-between">
          <SectionTitle title="Detalle de productos" subtitle="Columnas de producto, cantidad, precio unitario y precio total" />
          <Button onClick={addLine}>Agregar renglon</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-[#fafaf8] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Detalle del producto</th>
                <th className="w-[150px] px-4 py-3">Cantidad</th>
                <th className="w-[180px] px-4 py-3 text-right">Precio unitario</th>
                <th className="w-[180px] px-4 py-3 text-right">Precio total</th>
                <th className="w-[100px] px-4 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeec]">
              {lineItems.map((line, index) => {
                if (line.type === "title") {
                  return (
                    <tr key={line.id || index} className="bg-zinc-50">
                      <td className="px-4 py-3" colSpan={4}>
                        <TextInput
                          value={line.detail}
                          onChange={(event) => updateLine(index, { detail: event.target.value })}
                          placeholder="Titulo de seccion (ej. Materiales, Mano de obra...)"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="danger" onClick={() => removeLine(index)}>Quitar</Button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={line.id || index} className="align-top">
                    <td className="px-4 py-4">
                      <TextInput value={line.detail} onChange={(event) => updateLine(index, { detail: event.target.value })} placeholder="Producto, trabajo o servicio cotizado" />
                      {(line.meta?.unit || line.meta?.provider || line.meta?.sku || line.meta?.source || line.meta?.spec) && (
                        <div className="mt-2 grid gap-1 text-xs font-medium text-zinc-500">
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
                    <td className="px-4 py-4">
                      <TextInput type="number" min="0" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                    </td>
                    <td className="px-4 py-4">
                      <TextInput type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-base font-semibold text-zinc-950">{money(quoteLineTotal(line))}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button variant="danger" onClick={() => removeLine(index)}>Quitar</Button>
                    </td>
                  </tr>
                );
              })}
              {!lineItems.length && (
                <tr>
                  <td className="px-4 py-6 text-sm text-zinc-500" colSpan={5}>
                    Agrega materiales desde la base, horas de mano de obra o un renglon manual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="p-5 shadow-none">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <p className="text-sm text-zinc-500">Revisar el detalle, generar la numeracion automatica y abrir el PDF del presupuesto.</p>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <Button onClick={handleGeneratePdf} disabled={saving || !total}>{saving ? "Generando..." : "Generar presupuesto PDF"}</Button>
            {generatedQuote && <Button variant="ghost" onClick={() => generateQuotePdf(generatedQuote)}>Reimprimir PDF</Button>}
          </div>
        </div>
        <p className="mt-4 text-xs text-zinc-500">La numeracion se asigna automaticamente al generar el PDF usando el contador de Presupuestos.</p>
      </Panel>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <p className="text-sm font-semibold text-zinc-800 truncate pr-4">{lightboxImage.name}</p>
              <button
                onClick={() => setLightboxImage(null)}
                className="shrink-0 text-zinc-400 hover:text-zinc-700 text-xl leading-none"
              >✕</button>
            </div>
            <div className="flex items-center justify-center bg-zinc-50 p-6 min-h-[280px]">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.name}
                className="max-h-72 max-w-full object-contain"
                onError={(e) => { e.target.src = ""; e.target.alt = "Sin imagen"; }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
