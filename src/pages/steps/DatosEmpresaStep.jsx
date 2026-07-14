import React from "react";
import { Panel, Field, TextInput, Select, Icon } from "../../components/ui.jsx";

export default function DatosEmpresaStep({ companies, clientMode, setClientMode, selectedCompany, updateClientFromCompany, clientDetails, setClientDetails, jobTitle, setJobTitle, validUntil, setValidUntil, money, subtotalMaterials, subtotalLabor, subtotalTravel, total }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Proyecto industrial / Cotización</p>
        <h1 className="mt-1 text-2xl font-semibold text-on-surface">Datos de la Empresa Cliente</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Ingresá la información legal y operativa del cliente para la correcta emisión de la cotización técnica y facturación posterior.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Información Legal" icon="gavel" className="p-6">
          <div className="grid gap-4 pt-2">
            <Field label="Cliente">
              <Select value={clientMode} onChange={(event) => setClientMode(event.target.value)}>
                <option value="existing">Empresa cargada</option>
                <option value="new">Empresa nueva</option>
              </Select>
            </Field>
            {clientMode === "existing" ? (
              <Field label="Empresa">
                <Select value={selectedCompany} onChange={(event) => updateClientFromCompany(event.target.value)}>
                  {companies.map((company) => (
                    <option key={company.id || company.name} value={company.name}>{company.name}</option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Razón Social">
                <TextInput value={clientDetails.name} onChange={(event) => setClientDetails({ ...clientDetails, name: event.target.value })} placeholder="Ej: Aceros del Sur S.A." />
              </Field>
            )}
            <Field label="CUIT">
              <TextInput value={clientDetails.taxId} onChange={(event) => setClientDetails({ ...clientDetails, taxId: event.target.value })} placeholder="30-XXXXXXXX-X" />
            </Field>
            <Field label="Dirección Fiscal">
              <TextInput value={clientDetails.address} onChange={(event) => setClientDetails({ ...clientDetails, address: event.target.value })} placeholder="Calle, número, localidad, provincia" />
            </Field>
          </div>
        </Panel>

        <Panel title="Contacto Directo" icon="contact_page" className="p-6">
          <div className="grid gap-4 pt-2">
            <Field label="Persona de Contacto">
              <TextInput value={clientDetails.contact} onChange={(event) => setClientDetails({ ...clientDetails, contact: event.target.value })} placeholder="Nombre completo" />
            </Field>
            <Field label="Correo Electrónico">
              <TextInput type="email" value={clientDetails.email} onChange={(event) => setClientDetails({ ...clientDetails, email: event.target.value })} placeholder="email@empresa.com" />
            </Field>
            <Field label="Teléfono / Obra">
              <TextInput value={clientDetails.phone} onChange={(event) => setClientDetails({ ...clientDetails, phone: event.target.value })} placeholder="+54 9 11 ..." />
            </Field>
          </div>
        </Panel>
      </div>

      <Panel title="Detalle del Presupuesto" icon="description" className="p-6">
        <div className="grid gap-4 pt-2 md:grid-cols-2">
          <Field label="Nombre del trabajo (aparece en el PDF)">
            <TextInput value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Ej. Estructura metálica para nave industrial" />
          </Field>
          <Field label="Válido hasta">
            <TextInput type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
          </Field>
        </div>
      </Panel>

      <div className="rounded-lg border border-outline bg-inverse-surface p-6 text-white">
        <h3 className="mb-4 flex items-center gap-2 border-b border-white/20 pb-3 text-sm font-bold uppercase tracking-widest">
          <Icon name="calculate" className="text-primary" />
          Resumen Estimado
        </h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between text-white/80"><span>Subtotal Materiales</span><span className="font-mono">{money(subtotalMaterials)}</span></div>
          <div className="flex justify-between text-white/80"><span>Subtotal Mano de Obra</span><span className="font-mono">{money(subtotalLabor)}</span></div>
          <div className="flex justify-between text-white/80"><span>Subtotal Traslado</span><span className="font-mono">{money(subtotalTravel)}</span></div>
          <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-base font-bold text-primary"><span>Total Final</span><span className="font-mono">{money(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
