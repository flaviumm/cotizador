import React, { useRef, useState } from "react";
import { Panel, Field, TextInput, Select, Button, Icon } from "./ui.jsx";
import { matchCatalog } from "../lib/catalogMatch.js";

const MAX_FILES = 4;
const MAX_PDF_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const AUTO_SELECT_SCORE = 0.5;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`No se pudo leer "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagen inválida"));
    img.src = src;
  });
}

// Reescala imágenes a máx 1600px (JPEG 0.85) para no superar el límite de body de Vercel (4.5MB).
async function fileToPayload(file) {
  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_BYTES) throw new Error(`"${file.name}" supera los 3MB. Comprimí el PDF o subí una captura.`);
    const dataUrl = await readAsDataURL(file);
    return { name: file.name, mimeType: "application/pdf", dataBase64: dataUrl.split(",")[1], previewUrl: null };
  }
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}": usá PDF, JPG, PNG o WebP.`);
  const img = await loadImage(await readAsDataURL(file));
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL("image/jpeg", 0.85);
  return { name: file.name, mimeType: "image/jpeg", dataBase64: jpeg.split(",")[1], previewUrl: jpeg };
}

export default function AnalisisPlanoAI({ materials, laborRates, money, catalogPrice, onAddMaterials, onAddLabor }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [rows, setRows] = useState([]);
  const [laborRows, setLaborRows] = useState([]);
  const inputRef = useRef(null);

  async function handleFiles(fileList) {
    setError("");
    try {
      const incoming = await Promise.all([...fileList].map(fileToPayload));
      setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES));
    } catch (err) {
      setError(err.message);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyze() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: files.map(({ name, mimeType, dataBase64 }) => ({ name, mimeType, dataBase64 })),
          oficios: laborRates.map((rate) => rate.trade),
        }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");

      setAnalysis(data.analysis);
      setRows((data.analysis.materiales || []).map((mat, index) => {
        const candidates = matchCatalog(mat.descripcion, materials, 5);
        const best = candidates[0];
        return {
          key: index,
          ...mat,
          candidates,
          selectedId: best && best.score >= AUTO_SELECT_SCORE ? best.item.id : "",
          include: Boolean(best && best.score >= AUTO_SELECT_SCORE),
        };
      }));
      setLaborRows((data.analysis.manoDeObra || []).map((labor, index) => {
        const match = laborRates.find((rate) =>
          rate.trade.toLowerCase().includes(labor.oficio.toLowerCase()) ||
          labor.oficio.toLowerCase().includes(rate.trade.toLowerCase()));
        return { key: index, ...labor, rateId: match?.id || laborRates[0]?.id || "", applied: false };
      }));
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  }

  function updateRow(key, patch) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function confirmMaterials() {
    const selections = rows
      .filter((row) => row.include && row.selectedId)
      .map((row) => ({
        item: row.candidates.find((c) => c.item.id === row.selectedId)?.item,
        quantity: row.cantidad,
      }))
      .filter((sel) => sel.item);
    onAddMaterials(selections);
    setRows((prev) => prev.map((row) => (row.include && row.selectedId ? { ...row, include: false, added: true } : row)));
  }

  function applyLabor(row) {
    const rate = laborRates.find((r) => r.id === row.rateId);
    if (!rate) return;
    onAddLabor({ rate, horas: row.horas, justificacion: `${row.oficio}: ${row.justificacion}` });
    setLaborRows((prev) => prev.map((l) => (l.key === row.key ? { ...l, applied: true } : l)));
  }

  function reset() {
    setFiles([]); setAnalysis(null); setRows([]); setLaborRows([]); setStatus("idle"); setError("");
  }

  const pendingCount = rows.filter((row) => row.include && row.selectedId).length;

  return (
    <Panel className="p-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 font-semibold text-on-surface">
          <Icon name="auto_awesome" className="text-primary" /> Analizar plano con AI
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-on-surface-variant" />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* --- carga de archivos --- */}
          <div
            className="rounded border-2 border-dashed border-outline p-6 text-center text-sm text-on-surface-variant"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <p>Arrastrá planos o croquis acá (PDF, JPG, PNG — máx {MAX_FILES} archivos)</p>
            <Button className="mt-2" variant="ghost" icon="upload_file" onClick={() => inputRef.current?.click()}>Elegir archivos</Button>
            <input ref={inputRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 rounded border border-outline bg-surface-container-low px-2 py-1 text-xs">
                  {file.previewUrl
                    ? <img src={file.previewUrl} alt={file.name} className="h-8 w-8 rounded object-cover" />
                    : <Icon name="picture_as_pdf" className="text-error" />}
                  <span className="max-w-[140px] truncate">{file.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} className="text-on-surface-variant hover:text-error">✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={analyze} disabled={!files.length || status === "loading"} icon="auto_awesome">
              {status === "loading" ? "Analizando… (~30 seg)" : "Analizar"}
            </Button>
            {(analysis || files.length > 0) && <Button variant="ghost" onClick={reset}>Limpiar</Button>}
          </div>

          {/* --- resultado --- */}
          {analysis && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface">{analysis.resumen}</p>

              {analysis.advertencias?.length > 0 && (
                <div className="rounded border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <p className="font-semibold">⚠ Advertencias</p>
                  <ul className="ml-4 list-disc">{analysis.advertencias.map((adv, i) => <li key={i}>{adv}</li>)}</ul>
                </div>
              )}
              {analysis.supuestos?.length > 0 && (
                <details className="text-sm text-on-surface-variant">
                  <summary className="cursor-pointer font-semibold">Supuestos ({analysis.supuestos.length})</summary>
                  <ul className="ml-4 mt-1 list-disc">{analysis.supuestos.map((sup, i) => <li key={i}>{sup}</li>)}</ul>
                </details>
              )}

              {rows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-on-surface">Materiales propuestos</p>
                  {rows.map((row) => (
                    <div key={row.key} className={`rounded border border-outline p-3 ${row.added ? "opacity-50" : ""}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" checked={row.include} disabled={row.added} onChange={(e) => updateRow(row.key, { include: e.target.checked })} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-on-surface">{row.descripcion} <span className="text-on-surface-variant">— {row.cantidad} {row.unidad}</span></p>
                          <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_90px]">
                            <Select value={row.selectedId} onChange={(e) => updateRow(row.key, { selectedId: e.target.value, include: Boolean(e.target.value) })} disabled={row.added}>
                              <option value="">— sin match, usar buscador manual —</option>
                              {row.candidates.map(({ item }) => (
                                <option key={item.id} value={item.id}>{item.name} · {money(catalogPrice(item))}</option>
                              ))}
                            </Select>
                            <TextInput type="number" min="0" step="0.01" value={row.cantidad} disabled={row.added} onChange={(e) => updateRow(row.key, { cantidad: Number(e.target.value) })} />
                          </div>
                          {row.added && <p className="mt-1 text-xs text-green-700">✓ Agregado al presupuesto</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button onClick={confirmMaterials} disabled={!pendingCount} icon="playlist_add">
                    Agregar {pendingCount} material{pendingCount === 1 ? "" : "es"} al presupuesto
                  </Button>
                </div>
              )}

              {laborRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-on-surface">Mano de obra estimada</p>
                  {laborRows.map((row) => (
                    <div key={row.key} className={`rounded border border-outline p-3 ${row.applied ? "opacity-50" : ""}`}>
                      <p className="text-sm font-medium text-on-surface">{row.oficio} — {row.horas} h</p>
                      <p className="text-xs text-on-surface-variant">{row.justificacion}</p>
                      <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_90px_max-content]">
                        <Select value={row.rateId} disabled={row.applied} onChange={(e) => setLaborRows((prev) => prev.map((l) => (l.key === row.key ? { ...l, rateId: e.target.value } : l)))}>
                          {laborRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.trade} · {money(rate.quoteHour)}/h</option>)}
                        </Select>
                        <TextInput type="number" min="0" step="0.5" value={row.horas} disabled={row.applied} onChange={(e) => setLaborRows((prev) => prev.map((l) => (l.key === row.key ? { ...l, horas: Number(e.target.value) } : l)))} />
                        <Button variant="ghost" disabled={row.applied} onClick={() => applyLabor(row)} icon="engineering">
                          {row.applied ? "✓ Aplicado" : "Aplicar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
