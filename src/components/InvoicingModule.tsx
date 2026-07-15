/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  FileCheck,
  AlertCircle,
  Download,
  Printer,
  X,
  ShieldCheck,
  Building
} from "lucide-react";
import { Sale, Client } from "../types";

interface InvoicingModuleProps {
  sales: Sale[];
  clients: Client[];
}

export const InvoicingModule: React.FC<InvoicingModuleProps> = ({ sales, clients }) => {
  const [activeSubTab, setActiveSubTab] = useState<"NOMINATIVA" | "GLOBAL">("NOMINATIVA");
  const [searchTicketQuery, setSearchTicketQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Individual Form State
  const [clientRfc, setClientRfc] = useState("");
  const [clientName, setClientName] = useState("");
  const [fiscalRegime, setFiscalRegime] = useState("601"); // General de Ley Personas Morales
  const [cfdiUse, setCfdiUse] = useState("G03"); // Gastos en general
  const [postalCode, setPostalCode] = useState("06000"); // CDMX Centro

  // Output Generated Invoice state
  const [generatedCfdi, setGeneratedCfdi] = useState<any | null>(null);

  const handleSelectSaleForInvoicing = (sale: Sale) => {
    setSelectedSale(sale);
    // Try to auto-populate from selected client if any
    const cl = clients.find((c) => c.name === sale.items[0]?.product?.category); // Conceptual link or find active client
    // For demo, we search if client exists
    if (sale.cajero !== "Cajero Principal") {
      // conceptual
    }

    setClientRfc("GOMM850402AB3");
    setClientName("MARTHA GOMEZ MENDEZ");
    setGeneratedCfdi(null);
  };

  const handleGenerateIndividualCfdi = () => {
    if (!selectedSale) return;

    // Validate RFC
    const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/i;
    if (!rfcRegex.test(clientRfc.trim())) {
      alert("⚠️ RFC Mexicano inválido. Debe tener 12 o 13 caracteres alfanuméricos válidos para el SAT.");
      return;
    }

    if (!clientName || !postalCode) {
      alert("⚠️ Nombre / Razón Social y Código Postal Fiscal son requeridos para CFDI 4.0.");
      return;
    }

    // Generate simulated CFDI 4.0
    const uuid = "SAT-" + Math.floor(Math.random() * 100000) + "-4E3F-BF89-" + Date.now().toString(16).toUpperCase();
    const mockXML = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="A" Folio="${selectedSale.ticketNumber}" Fecha="${new Date().toISOString()}" Sello="MIIEizCCA3OgAwIBAgIUMDAw..." NoCertificado="00001000000504465028" SubTotal="${selectedSale.subtotal}" Moneda="MXN" Total="${selectedSale.total}" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" LugarExpedicion="${postalCode}">
  <cfdi:Emisor Rfc="JJM100412MN1" Nombre="JJM TECNOLOGIAS INNOVADORAS SA DE CV" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="${clientRfc.toUpperCase()}" Nombre="${clientName.toUpperCase()}" DomicilioFiscalReceptor="${postalCode}" RegimenFiscalReceptor="${fiscalRegime}" UsoCFDI="${cfdiUse}"/>
  <cfdi:Conceptos>
    ${selectedSale.items
      .map(
        (item) => `
    <cfdi:Concepto ClaveProdServ="50181900" NoIdentificacion="${item.product.code}" Cantidad="${item.quantity}" ClaveUnidad="H87" Unidad="${item.product.unit}" Descripcion="${item.product.name}" ValorUnitario="${item.product.price}" Importe="${item.price * item.quantity}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${item.price * item.quantity}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(item.price * item.quantity * 0.16).toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`
      )
      .join("")}
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${uuid}" FechaTimbrado="${new Date().toISOString()}" RFCProvCertif="SAT970701NN3" SelloCFD="..." SelloSAT="..."/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    setGeneratedCfdi({
      uuid,
      rfcEmisor: "JJM100412MN1",
      nombreEmisor: "JJM TECNOLOGÍAS INNOVADORAS S.A. DE C.V.",
      rfcReceptor: clientRfc.toUpperCase(),
      nombreReceptor: clientName.toUpperCase(),
      subtotal: selectedSale.subtotal,
      taxes: selectedSale.taxes,
      total: selectedSale.total,
      xml: mockXML,
      ticketNo: selectedSale.ticketNumber,
      timestamp: new Date().toISOString(),
    });
  };

  const handleGenerateGlobalCfdi = () => {
    // Bundle all unticketed / generic completed sales
    const completedSales = sales.filter((s) => s.status === "COMPLETED");
    if (completedSales.length === 0) {
      alert("⚠️ No hay ventas registradas en esta caja hoy para consolidar en la Factura Global.");
      return;
    }

    const sub = completedSales.reduce((acc, s) => acc + s.subtotal, 0);
    const tax = completedSales.reduce((acc, s) => acc + s.taxes, 0);
    const tot = completedSales.reduce((acc, s) => acc + s.total, 0);

    const uuid = "GLOBAL-SAT-" + Math.floor(Math.random() * 1000000).toString(16).toUpperCase() + "-CFDI";
    setGeneratedCfdi({
      uuid,
      rfcEmisor: "JJM100412MN1",
      nombreEmisor: "JJM TECNOLOGÍAS INNOVADORAS S.A. DE C.V.",
      rfcReceptor: "XAXX010101000", // Generic Public RFC
      nombreReceptor: "PUBLICO EN GENERAL",
      subtotal: Number(sub.toFixed(2)),
      taxes: Number(tax.toFixed(2)),
      total: Number(tot.toFixed(2)),
      xml: `<!-- CFDI 4.0 Factura Global Consolidada Diaria -->`,
      ticketNo: "Consolidado de " + completedSales.length + " Tickets",
      timestamp: new Date().toISOString(),
    });
  };

  // List sales available for nominative invoice
  const activeSales = sales.filter(
    (s) => s.status === "COMPLETED" && s.ticketNumber.includes(searchTicketQuery)
  );

  return (
    <div id="invoicing-module-main" className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => {
            setActiveSubTab("NOMINATIVA");
            setSelectedSale(null);
            setGeneratedCfdi(null);
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "NOMINATIVA" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          📄 Factura Nominativa (Individual)
        </button>
        <button
          onClick={() => {
            setActiveSubTab("GLOBAL");
            setSelectedSale(null);
            setGeneratedCfdi(null);
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === "GLOBAL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          🌐 Factura Global Diario/Semanal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Controls (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          {activeSubTab === "NOMINATIVA" ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Paso 1: Buscar Ticket de Venta</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Ingrese el número de ticket impreso para timbrarlo</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  id="search-ticket-invoice"
                  type="text"
                  placeholder="Ej. 1001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={searchTicketQuery}
                  onChange={(e) => setSearchTicketQuery(e.target.value)}
                />
              </div>

              <div className="max-h-[160px] overflow-y-auto space-y-2 border border-slate-100 p-2 rounded-xl bg-slate-50/50">
                {activeSales.length === 0 ? (
                  <p className="text-center text-slate-400 text-[10px] py-6">No hay ventas registradas.</p>
                ) : (
                  activeSales.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSaleForInvoicing(s)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex justify-between items-center ${
                        selectedSale?.id === s.id
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-slate-200 hover:bg-slate-50/80"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-800">Ticket #{s.ticketNumber}</p>
                        <p className="text-[9px] text-slate-400">{new Date(s.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <span className="font-black font-mono text-blue-700">${s.total.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              {selectedSale && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Paso 2: Datos Fiscales SAT CFDI 4.0</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Complete la constancia de situación fiscal del receptor</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">RFC del Cliente</label>
                      <input
                        id="input-rfc-factura"
                        type="text"
                        placeholder="Ej. GOMM850402AB3"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 uppercase font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={clientRfc}
                        onChange={(e) => setClientRfc(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nombre / Razón Social</label>
                      <input
                        id="input-nombre-factura"
                        type="text"
                        placeholder="Tal como aparece en constancia SAT"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Código Postal Fiscal</label>
                        <input
                          id="input-cp-factura"
                          type="text"
                          placeholder="Ej. 06000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Régimen Fiscal</label>
                        <select
                          id="select-regimen-factura"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:ring-1 focus:ring-blue-500"
                          value={fiscalRegime}
                          onChange={(e) => setFiscalRegime(e.target.value)}
                        >
                          <option value="601">601 - Personas Morales</option>
                          <option value="605">605 - Sueldos y Salarios</option>
                          <option value="612">612 - Personas Físicas Empresariales</option>
                          <option value="626">626 - RESICO (Simplificado)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Uso de CFDI</label>
                      <select
                        id="select-uso-factura"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:ring-1 focus:ring-blue-500"
                        value={cfdiUse}
                        onChange={(e) => setCfdiUse(e.target.value)}
                      >
                        <option value="G01">G01 - Adquisición de mercancías</option>
                        <option value="G03">G03 - Gastos en general</option>
                        <option value="D01">D01 - Honorarios médicos</option>
                        <option value="P01">P01 - Por definir (Legacy)</option>
                      </select>
                    </div>

                    <button
                      id="btn-timbrar-sat"
                      type="button"
                      onClick={handleGenerateIndividualCfdi}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-50 mt-4"
                    >
                      <ShieldCheck className="h-4.5 w-4.5" /> Timbrar Factura con SAT
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Facturación Global Consolidada</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Collate todas las ventas de mostrador del público en general</p>
              </div>

              <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 text-xs text-slate-600 space-y-3">
                <p className="font-medium text-slate-700">Regulaciones SAT CFDI 4.0:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Se utiliza el RFC Genérico: <strong>XAXX010101000</strong>.</li>
                  <li>Agrupa transacciones emitidas con notas sencillas de mostrador.</li>
                  <li>Evita multas fiscales consolidando al cierre del día laboral.</li>
                </ul>
              </div>

              <button
                id="btn-generar-global"
                onClick={handleGenerateGlobalCfdi}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-50"
              >
                <Building className="h-4.5 w-4.5" /> Generar Factura Global del Día
              </button>
            </div>
          )}
        </div>

        {/* Right Side Outputs - Timbre SAT preview (7 columns) */}
        <div className="lg:col-span-7">
          {generatedCfdi ? (
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-md p-5 space-y-5">
              {/* Header SAT Successful Stamped */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="flex gap-2.5 items-center">
                  <div className="h-9 w-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">FACTURA TIMBRADA CON ÉXITO</h3>
                    <p className="text-[10px] text-emerald-600 font-bold">CFDI 4.0 Aprobado por Proveedor Autorizado (PAC)</p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-bold font-mono">
                  SAT Activo
                </span>
              </div>

              {/* PDF thermal or legal format simulation */}
              <div className="border border-slate-200 rounded-xl p-5 space-y-4 text-xs font-sans text-slate-700 leading-relaxed bg-slate-50/50">
                <div className="flex justify-between items-start text-[10px] border-b border-slate-200 pb-2">
                  <div>
                    <p className="font-black uppercase text-slate-900">{generatedCfdi.nombreEmisor}</p>
                    <p>RFC: {generatedCfdi.rfcEmisor}</p>
                    <p>Regimen Fiscal: 601</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-blue-700 text-xs">Factura Electrónica</p>
                    <p>Serie: F | Folio: {generatedCfdi.ticketNo}</p>
                    <p>Fecha: {new Date(generatedCfdi.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-[10px] border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-slate-400 block uppercase text-[8px]">RECEPTOR FISCAL</span>
                  <p className="font-bold text-slate-900">{generatedCfdi.nombreReceptor}</p>
                  <p>RFC: {generatedCfdi.rfcReceptor}</p>
                  <p>Lugar de Expedición (C.P.): 06000</p>
                </div>

                <div className="space-y-1 border-b border-slate-200 pb-2 text-[10px]">
                  <span className="font-extrabold text-slate-400 block uppercase text-[8px]">CONCEPTOS FACTURADOS</span>
                  <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">
                    <span>Detalle</span>
                    <span>Total</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Servicio de Facturación Venta #{generatedCfdi.ticketNo}</span>
                    <span>${generatedCfdi.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-[10px] space-y-1 text-right ml-auto max-w-[200px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${generatedCfdi.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>IVA Traslado 16%:</span>
                    <span>${generatedCfdi.taxes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1">
                    <span>TOTAL MXN:</span>
                    <span>${generatedCfdi.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* SAT Digital signature block */}
                <div className="pt-2 border-t border-dashed border-slate-300 flex gap-3 text-[8px] text-slate-400 leading-tight">
                  <div className="bg-white p-1 rounded border border-slate-200 shrink-0">
                    {/* Simulated visual QR stamp */}
                    <div className="w-14 h-14 bg-slate-100 flex items-center justify-center font-black text-slate-600 font-mono text-[6px]">
                      QR SAT STAMP
                    </div>
                  </div>
                  <div className="space-y-1.5 font-mono truncate">
                    <div>
                      <span className="font-bold text-slate-700 block">FOLIO FISCAL SAT (UUID):</span>
                      <span className="text-slate-500 font-bold">{generatedCfdi.uuid}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block">SELLO DIGITAL DEL CFDI:</span>
                      <span className="text-slate-400 text-[6px]">MIIEizCCA3OgAwIBAgIUMDAwMTEwMDAwMDA1MDQ0NjUwMjgwdQYJKoZIhvcNAQELBQAw...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => alert("💾 Descargando archivo fiscal XML de timbrado SAT para el cliente...")}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="h-4 w-4" /> Descargar XML
                </button>
                <button
                  onClick={() => alert("🖨️ Mandando representación impresa PDF del CFDI 4.0...")}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="h-4 w-4" /> Imprimir Representación PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-10 text-center text-slate-400 h-full flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-slate-300 stroke-1 mb-2.5" />
              <h4 className="font-bold text-slate-700 text-sm">Visualizador de Comprobante CFDI</h4>
              <p className="text-xs max-w-xs mt-1 leading-relaxed">
                Seleccione un ticket, capture los datos fiscales del cliente y proceda a presionar "Timbrar" para simular el proceso de timbrado del SAT en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
