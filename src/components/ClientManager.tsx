/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  DollarSign,
  FileText,
  CreditCard,
  X,
  History,
  TrendingUp,
  TrendingDown,
  UserPlus,
  AlertCircle
} from "lucide-react";
import { Client } from "../types";

interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: any) => Promise<Client>;
  onRegisterAbono: (clientId: string, amount: number, description: string) => Promise<any>;
  onRefreshClients: () => void;
}

export const ClientManager: React.FC<ClientManagerProps> = ({
  clients,
  onAddClient,
  onRegisterAbono,
  onRefreshClients,
}) => {
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Add Client Form State
  const [name, setName] = useState("");
  const [rfc, setRfc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState("1000");

  // Abono Form State
  const [abonoAmount, setAbonoAmount] = useState("");
  const [abonoDescription, setAbonoDescription] = useState("Abono en efectivo");

  // Ledger History
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchPaymentsHistory();
  }, []);

  const fetchPaymentsHistory = async () => {
    try {
      const res = await fetch("/api/clients/payments");
      if (res.ok) {
        const data = await res.json();
        setPaymentsHistory(data);
      }
    } catch (err) {
      console.error("Error fetching credit payments ledger history:", err);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert("Por favor ingrese el nombre del cliente y su teléfono.");
      return;
    }

    const payload = {
      name,
      rfc: rfc || "XAXX010101000", // Default SAT RFC generic
      email,
      phone,
      creditLimit: Number(creditLimit) || 0,
    };

    try {
      await onAddClient(payload);
      onRefreshClients();
      setShowAddClientModal(false);
      setName("");
      setRfc("");
      setEmail("");
      setPhone("");
      setCreditLimit("1000");
    } catch (err) {
      alert("Error al registrar cliente.");
    }
  };

  const handleSaveAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !abonoAmount || isNaN(Number(abonoAmount)) || Number(abonoAmount) <= 0) {
      alert("Ingrese un monto de abono válido.");
      return;
    }

    if (Number(abonoAmount) > selectedClient.balance) {
      if (!confirm(`El abono ($${abonoAmount}) es mayor al saldo deudor actual ($${selectedClient.balance}). ¿Desea continuar de todos modos?`)) {
        return;
      }
    }

    try {
      await onRegisterAbono(selectedClient.id, Number(abonoAmount), abonoDescription);
      onRefreshClients();
      fetchPaymentsHistory();
      setShowAbonoModal(false);
      setAbonoAmount("");
      setAbonoDescription("Abono en efectivo");
      setSelectedClient(null);
    } catch (err) {
      alert("Error al registrar abono.");
    }
  };

  // Exclude Público en General from having balance / limits
  const registeredClients = clients.filter((c) => c.id !== "cl-3");
  const totalReceivables = registeredClients.reduce((acc, c) => acc + c.balance, 0);

  return (
    <div id="client-manager-main" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: RECEIVABLES SUMMARY & CLIENTS LIST (8 columns) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Accounts Receivables totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-200/80 tracking-wider">Total de Cuentas por Cobrar ("Lista de Raya")</p>
              <h2 className="text-2xl font-black mt-1">${totalReceivables.toFixed(2)} MXN</h2>
              <p className="text-[10px] text-blue-200/50 mt-1">Capital activo pendiente de pago por clientes del negocio</p>
            </div>
            <TrendingUp className="h-10 w-10 text-blue-400 stroke-1" />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clientes con Crédito Activo</p>
              <h2 className="text-2xl font-black text-slate-800 mt-1">
                {registeredClients.filter((c) => c.balance > 0).length} de {registeredClients.length}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">Clientes de confianza con saldo pendiente de liquidar</p>
            </div>
            <Users className="h-10 w-10 text-slate-300 stroke-1" />
          </div>
        </div>

        {/* Clients Directory */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Directorio de Clientes de Confianza</h3>
            <button
              id="btn-nuevo-cliente"
              onClick={() => setShowAddClientModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="h-4 w-4" /> Registrar Cliente
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 border-b border-slate-100 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Nombre / RFC</th>
                  <th className="py-3 px-4">Teléfono / Email</th>
                  <th className="py-3 px-4 text-center">Límite de Crédito</th>
                  <th className="py-3 px-4 text-center">Saldo Deudor</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {registeredClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No hay clientes de confianza registrados. Haga clic en Registrar Cliente para dar de alta uno.
                    </td>
                  </tr>
                ) : (
                  registeredClients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/30">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">RFC: {c.rfc}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p>{c.phone}</p>
                          <p className="text-[10px] text-slate-400">{c.email || "Sin correo"}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium">${c.creditLimit.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-1 rounded-md ${
                            c.balance > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          ${c.balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          id={`btn-abono-${c.id}`}
                          onClick={() => {
                            setSelectedClient(c);
                            setShowAbonoModal(true);
                          }}
                          className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                        >
                          Registrar Abono / Pago
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: RECENT PAYMENTS LOG (4 columns) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-blue-600" /> Historial de Abonos Recientes
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Control de ingresos de deudas liquidadas en la tienda</p>
        </div>

        <div className="space-y-3 max-h-[360px] overflow-y-auto">
          {paymentsHistory.length === 0 ? (
            <p className="text-center text-slate-400 text-[10px] py-10">No se han registrado abonos recientemente.</p>
          ) : (
            paymentsHistory.map((h: any) => {
              const cl = clients.find((c) => c.id === h.clientId);
              return (
                <div key={h.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[120px]">
                      {cl?.name || "Cliente Eliminado"}
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono ${
                        h.type === "ABONO" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {h.type === "ABONO" ? "ABONO" : "CARGO"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">{h.description}</p>
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/50">
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(h.timestamp).toLocaleString()}
                    </span>
                    <span className="font-black text-xs font-mono text-slate-900">
                      ${h.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL: REGISTER CLIENT */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">Registrar Nuevo Cliente</h3>
              <button onClick={() => setShowAddClientModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo</label>
                <input
                  id="input-client-name"
                  type="text"
                  required
                  placeholder="Ej. Don Antonio Martínez"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">RFC SAT (Opcional)</label>
                  <input
                    id="input-client-rfc"
                    type="text"
                    placeholder="Ej. MAAA8001017A3"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input
                    id="input-client-phone"
                    type="text"
                    required
                    placeholder="Ej. 5512345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Correo Electrónico (Para Invoicing)</label>
                <input
                  id="input-client-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Límite de Crédito Fiar (MXN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                  <input
                    id="input-client-limit"
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Monto máximo acumulado que el cajero le permitirá fiar a este cliente antes de requerir un abono.
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-50"
                >
                  Registrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER ABONO / PAYMENT */}
      {showAbonoModal && selectedClient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">Registrar Abono a Cuenta</h3>
              <button onClick={() => setShowAbonoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5 border border-slate-100 mb-4 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Cliente:</span>
                <span className="font-bold text-slate-900">{selectedClient.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Límite autorizado:</span>
                <span>${selectedClient.creditLimit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-extrabold border-t border-slate-200 pt-2">
                <span>Saldo Deudor Actual:</span>
                <span className="text-rose-700">${selectedClient.balance.toFixed(2)} MXN</span>
              </div>
            </div>

            <form onSubmit={handleSaveAbono} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto del Abono en Efectivo (MXN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                  <input
                    id="input-abono-amount"
                    type="number"
                    required
                    placeholder="Monto a pagar..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={abonoAmount}
                    onChange={(e) => setAbonoAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Concepto / Comentario</label>
                <input
                  id="input-abono-description"
                  type="text"
                  placeholder="Ej. Abono a cuenta Don Pedro, abona con $200"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={abonoDescription}
                  onChange={(e) => setAbonoDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAbonoModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-50"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
