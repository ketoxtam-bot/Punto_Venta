/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ShoppingCart,
  DollarSign,
  CreditCard,
  QrCode,
  UserPlus,
  Trash2,
  Plus,
  Minus,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  X,
  Printer,
  ChevronRight,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { Product, Client, CashSession, Sale } from "../types";

interface SalesRegisterProps {
  products: Product[];
  clients: Client[];
  activeSession: CashSession | null;
  onOpenSession: (openingBalance: number) => Promise<void>;
  onCloseSession: (realCashCollected: number) => Promise<void>;
  onAddSale: (saleData: any) => Promise<Sale>;
  onRefreshClients: () => void;
  onRefreshProducts: () => void;
  giro: string;
}

interface TicketItem {
  productId: string;
  quantity: number;
}

interface Ticket {
  id: number;
  name: string;
  items: TicketItem[];
  selectedClientId: string;
  isFiado: boolean;
}

export const SalesRegister: React.FC<SalesRegisterProps> = ({
  products,
  clients,
  activeSession,
  onOpenSession,
  onCloseSession,
  onAddSale,
  onRefreshClients,
  onRefreshProducts,
  giro,
}) => {
  // Session opening/closing controls
  const [openBalanceInput, setOpenBalanceInput] = useState<string>("1000");
  const [closeCashInput, setCloseCashInput] = useState<string>("");
  const [cashAction, setCashAction] = useState<"OPEN" | "CLOSE" | null>(null);

  // Tickets State (Multiticket support)
  const [tickets, setTickets] = useState<Ticket[]>([
    { id: 1, name: "Ticket 1", items: [], selectedClientId: "cl-3", isFiado: false },
    { id: 2, name: "Ticket 2", items: [], selectedClientId: "cl-3", isFiado: false },
    { id: 3, name: "Ticket 3", items: [], selectedClientId: "cl-3", isFiado: false },
  ]);
  const [activeTicketId, setActiveTicketId] = useState<number>(1);

  // Search and Scanning state
  const [searchQuery, setSearchQuery] = useState("");
  const [scanMode, setScanMode] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Checkout modal and calculations
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TARJETA" | "SPEI">("EFECTIVO");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Active Ticket helper
  const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0];
  const activeClient = clients.find((c) => c.id === activeTicket.selectedClientId) || clients[2];

  // Quick cash buttons
  const quickCashBills = [20, 50, 100, 200, 500, 1000];

  useEffect(() => {
    // Focus search on mount
    if (activeSession && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeSession, activeTicketId]);

  // Handle barcode search or normal search
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  // Automatically add product if barcode scanned (exact match and enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exactMatch = products.find(
      (p) => p.code === searchQuery || p.name.toLowerCase() === searchQuery.toLowerCase()
    );
    if (exactMatch) {
      addToTicket(exactMatch.id);
      setSearchQuery("");
    }
  };

  const addToTicket = (productId: string, qty = 1) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (product.stock < qty) {
      alert(`⚠️ Advertencia: Solo quedan ${product.stock} ${product.unit} de ${product.name}`);
    }

    setTickets(
      tickets.map((t) => {
        if (t.id === activeTicketId) {
          const existingItem = t.items.find((item) => item.productId === productId);
          if (existingItem) {
            return {
              ...t,
              items: t.items.map((item) =>
                item.productId === productId
                  ? { ...item, quantity: item.quantity + qty }
                  : item
              ),
            };
          } else {
            return {
              ...t,
              items: [...t.items, { productId, quantity: qty }],
            };
          }
        }
        return t;
      })
    );
  };

  const updateQuantity = (productId: string, delta: number) => {
    setTickets(
      tickets.map((t) => {
        if (t.id === activeTicketId) {
          return {
            ...t,
            items: t.items
              .map((item) => {
                if (item.productId === productId) {
                  const newQty = item.quantity + delta;
                  return { ...item, quantity: newQty };
                }
                return item;
              })
              .filter((item) => item.quantity > 0),
          };
        }
        return t;
      })
    );
  };

  const removeFromTicket = (productId: string) => {
    setTickets(
      tickets.map((t) => {
        if (t.id === activeTicketId) {
          return {
            ...t,
            items: t.items.filter((item) => item.productId !== productId),
          };
        }
        return t;
      })
    );
  };

  const clearCurrentTicket = () => {
    setTickets(
      tickets.map((t) => {
        if (t.id === activeTicketId) {
          return { ...t, items: [], selectedClientId: "cl-3", isFiado: false };
        }
        return t;
      })
    );
  };

  // Ticket totals calculator
  const calculateTotals = () => {
    let subtotal = 0;
    let taxes = 0;
    let total = 0;

    activeTicket.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return;

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      let itemSubtotal = itemTotal;
      let itemTax = 0;

      if (product.taxType === "IVA_16") {
        itemSubtotal = itemTotal / 1.16;
        itemTax = itemTotal - itemSubtotal;
      } else if (product.taxType === "IEPS_8") {
        itemSubtotal = itemTotal / 1.08;
        itemTax = itemTotal - itemSubtotal;
      }

      subtotal += itemSubtotal;
      taxes += itemTax;
    });

    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxes: Number(taxes.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  };

  const { subtotal, taxes, total } = calculateTotals();

  // Handle final purchase checkout
  const handleCheckout = async () => {
    if (activeTicket.items.length === 0) return;

    if (paymentMethod === "EFECTIVO") {
      const paidNum = Number(cashReceived);
      if (!cashReceived || isNaN(paidNum) || paidNum < total) {
        setCheckoutError("❌ El efectivo recibido es insuficiente.");
        return;
      }
    }

    if (activeTicket.isFiado && activeTicket.selectedClientId === "cl-3") {
      setCheckoutError("❌ No se puede fiar al Público en General. Seleccione un cliente de la lista.");
      return;
    }

    if (activeTicket.isFiado && activeClient) {
      if (activeClient.balance + total > activeClient.creditLimit) {
        setCheckoutError(
          `❌ Cupo excedido. Límite: $${activeClient.creditLimit} MXN. Saldo actual: $${activeClient.balance} MXN. Al sumarle esta venta de $${total} MXN, supera el límite.`
        );
        return;
      }
    }

    try {
      setCheckoutError(null);
      const changeVal = paymentMethod === "EFECTIVO" ? Number(cashReceived) - total : 0;

      const saleData = {
        items: activeTicket.items,
        paymentMethod: paymentMethod,
        amountPaid: paymentMethod === "EFECTIVO" ? Number(cashReceived) : total,
        change: Number(changeVal.toFixed(2)),
        clientId: activeTicket.selectedClientId,
        isFiado: activeTicket.isFiado,
        cajero: activeSession?.userName,
      };

      const result = await onAddSale(saleData);
      setLastCompletedSale(result);
      setShowCheckoutModal(false);
      clearCurrentTicket();
      setCashReceived("");
      onRefreshProducts();
      onRefreshClients();
    } catch (err: any) {
      setCheckoutError(err.message || "Error al completar la venta.");
    }
  };

  const handleQuickCash = (bill: number) => {
    const current = Number(cashReceived) || 0;
    setCashReceived((current + bill).toString());
  };

  // Sound play simulation for satisfying POS chime
  const playBeep = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.frequency.setValueAtTime(880, context.currentTime); // High pitch click/beep
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
      osc.start();
      osc.stop(context.currentTime + 0.1);
    } catch (e) {
      // Ignored if browser blocks audio autoplay
    }
  };

  return (
    <div id="sales-register-main" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* LEFT SECTION: PRODUCT SCANNING & GRID (8 columns) */}
      <div id="pos-scanning-side" className="lg:col-span-7 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Cash Register State Banner */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`h-3.5 w-3.5 rounded-full ${activeSession ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span className="font-medium text-slate-700">
              {activeSession ? `Caja Abierta: ${activeSession.userName}` : "Caja Cerrada - Se requiere apertura"}
            </span>
          </div>

          <div className="flex gap-2">
            {!activeSession ? (
              <button
                id="btn-abrir-caja"
                onClick={() => setCashAction("OPEN")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Play className="h-4 w-4" /> Apertura de Caja
              </button>
            ) : (
              <button
                id="btn-cerrar-caja"
                onClick={() => {
                  setCloseCashInput("");
                  setCashAction("CLOSE");
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Pause className="h-4 w-4" /> Corte de Caja
              </button>
            )}
          </div>
        </div>

        {activeSession ? (
          <>
            {/* Search and barcode toggle */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-3 items-center">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  id="barcode-search-input"
                  ref={searchInputRef}
                  type="text"
                  placeholder={scanMode ? "Escanea código de barras o busca producto..." : "Buscar por nombre, categoría o código..."}
                  className="w-full bg-white pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
              <button
                id="btn-scan-mode-toggle"
                onClick={() => setScanMode(!scanMode)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${
                  scanMode ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Hash className="h-4 w-4" />
                {scanMode ? "Modo Lector Activo" : "Búsqueda Manual"}
              </button>
            </div>

            {/* Product Quick-Selection list */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                  <AlertCircle className="h-10 w-10 mb-2 stroke-1" />
                  <p className="text-sm">No se encontraron productos coincidentes.</p>
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <motion.div
                    key={p.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playBeep();
                      addToTicket(p.id);
                    }}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 hover:border-blue-200 cursor-pointer flex flex-col justify-between transition-all group"
                  >
                    <div>
                      <div className="flex gap-2.5">
                        {p.images && p.images.length > 0 ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-11 h-11 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-50 mt-0.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-200/50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 mt-0.5">
                            <ShoppingCart className="h-4 w-4 stroke-1" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[9px] font-mono text-slate-400 truncate max-w-[70px]">
                              {p.code}
                            </span>
                            {p.stock <= p.minStock && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] px-1 py-0.2 rounded font-bold whitespace-nowrap">
                                Stock Bajo
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-slate-800 text-[11px] line-clamp-2 mt-0.5 group-hover:text-blue-700 leading-tight">
                            {p.name}
                          </h4>
                          <p className="text-[9px] text-slate-500 bg-slate-200/60 inline-block px-1.5 py-0.2 rounded-md mt-0.5 font-medium">
                            {p.category}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline mt-3 border-t border-slate-100 pt-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {p.stock} {p.unit}
                      </span>
                      <span className="font-extrabold text-blue-800 text-sm">
                        ${p.price.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-slate-50/50">
            <LockSessionVisual />
            <h3 className="font-bold text-slate-800 text-lg mt-4">La Caja de Cobro está Cerrada</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              Es necesario realizar la apertura de caja indicando el fondo de cambio en efectivo inicial para poder registrar ventas.
            </p>
            <button
              id="btn-abrir-caja-centro"
              onClick={() => setCashAction("OPEN")}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors flex items-center gap-2"
            >
              <Play className="h-5 w-5" /> Abrir Caja con Fondo Inicial
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SECTION: ACTIVE CART & MULTI-TICKET (5 columns) */}
      <div id="pos-billing-side" className="lg:col-span-5 flex flex-col bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden h-full">
        {/* Multi-Ticket Tabs Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex gap-1.5">
            {tickets.map((t) => (
              <button
                key={t.id}
                id={`tab-ticket-${t.id}`}
                onClick={() => setActiveTicketId(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTicketId === t.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {t.name}
                {t.items.length > 0 && (
                  <span className="bg-white text-slate-950 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                    {t.items.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            id="btn-limpiar-ticket"
            onClick={clearCurrentTicket}
            disabled={activeTicket.items.length === 0}
            className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
            title="Limpiar Ticket Actual"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Client Selection */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Cliente / Cuenta Crédito ("Fiado")
          </label>
          <div className="flex gap-2">
            <select
              id="select-cliente-ticket"
              value={activeTicket.selectedClientId}
              onChange={(e) => {
                const val = e.target.value;
                setTickets(
                  tickets.map((t) =>
                    t.id === activeTicketId ? { ...t, selectedClientId: val } : t
                  )
                );
              }}
              className="bg-slate-800 text-sm rounded-xl border border-slate-700 px-3 py-2 text-white flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `(Debe: $${c.balance})` : ""}
                </option>
              ))}
            </select>

            {activeTicket.selectedClientId !== "cl-3" && (
              <button
                id="btn-fiado-toggle"
                onClick={() => {
                  setTickets(
                    tickets.map((t) =>
                      t.id === activeTicketId ? { ...t, isFiado: !t.isFiado } : t
                    )
                  );
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                  activeTicket.isFiado
                    ? "bg-rose-900/60 border-rose-600 text-rose-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {activeTicket.isFiado ? "Fiado Activo" : "Fiar Venta"}
              </button>
            )}
          </div>
          {activeTicket.isFiado && activeClient && (
            <div className="text-xs bg-rose-950/30 border border-rose-900/60 p-2 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-rose-200/80 font-medium">Deuda acumulada: ${activeClient.balance} / ${activeClient.creditLimit} MXN</p>
                <p className="text-[10px] text-rose-300/60">El saldo se cargará automáticamente a su cuenta.</p>
              </div>
              <TrendingUp className="h-4 w-4 text-rose-400" />
            </div>
          )}
        </div>

        {/* Current Items Cart Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {activeTicket.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-600">
              <ShoppingCart className="h-12 w-12 mb-2 stroke-1" />
              <p className="text-sm">Ticket vacío</p>
              <p className="text-xs text-slate-700 mt-1">Escanee o seleccione un producto del lado izquierdo.</p>
            </div>
          ) : (
            <AnimatePresence>
              {activeTicket.items.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product) return null;

                const itemTotal = product.price * item.quantity;

                return (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="bg-slate-800/50 p-3 rounded-xl flex items-center justify-between gap-3 border border-slate-800"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-8 h-8 object-cover rounded-md border border-slate-700 shrink-0 bg-slate-900"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-500">
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-100 text-xs truncate">
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ${product.price.toFixed(2)} x {product.unit} ({product.taxType})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 rounded-md transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono text-xs w-6 text-center font-bold text-slate-200">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 rounded-md transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <p className="font-bold font-mono text-slate-100 text-xs">
                        ${itemTotal.toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromTicket(item.productId)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Totals & Cobrar footer */}
        <div className="bg-slate-950 p-5 space-y-3 border-t border-slate-800">
          <div className="space-y-1.5 text-xs text-slate-400 font-medium">
            <div className="flex justify-between">
              <span>Subtotal (sin imp.)</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Impuestos SAT (IVA / IEPS)</span>
              <span className="font-mono">${taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-200 font-semibold pt-1 border-t border-slate-800/80">
              <span>Total a pagar</span>
              <span className="font-mono text-white text-sm">${total.toFixed(2)} MXN</span>
            </div>
          </div>

          <button
            id="btn-cobrar-ticket"
            disabled={!activeSession || activeTicket.items.length === 0}
            onClick={() => {
              setPaymentMethod(activeTicket.isFiado ? "SPEI" : "EFECTIVO");
              setCashReceived("");
              setShowCheckoutModal(true);
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm mt-2"
          >
            <DollarSign className="h-4.5 w-4.5" />
            {activeTicket.isFiado ? "Fiar Venta e Imprimir" : "Cobrar Cliente e Imprimir"}
          </button>
        </div>
      </div>

      {/* MODAL: CASH REGISTER OPEN/CLOSE */}
      {cashAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {cashAction === "OPEN" ? "Apertura de Caja (Fondo de Cambio)" : "Corte de Caja (Cierre)"}
              </h3>
              <button onClick={() => setCashAction(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cashAction === "OPEN" ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Defina el fondo inicial en monedas y billetes sencillos que usará el cajero para dar cambio al inicio del turno.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Fondo Inicial (MXN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                    <input
                      id="input-fondo-apertura"
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={openBalanceInput}
                      onChange={(e) => setOpenBalanceInput(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setCashAction(null)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-confirmar-apertura"
                    onClick={() => {
                      onOpenSession(Number(openBalanceInput) || 0);
                      setCashAction(null);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Confirmar Apertura
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Fondo Inicial de Apertura</span>
                    <span className="font-bold font-mono">${activeSession?.openingBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Ventas Totales Registradas</span>
                    <span className="font-bold font-mono">${activeSession?.salesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pl-3">
                    <span>↳ Ventas en Efectivo</span>
                    <span className="font-bold font-mono">${activeSession?.cashSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pl-3">
                    <span>↳ Ventas con Tarjeta</span>
                    <span className="font-bold font-mono">${activeSession?.cardSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pl-3">
                    <span>↳ Ventas con SPEI/Fiado</span>
                    <span className="font-bold font-mono">${activeSession?.speiSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200/80 pt-2">
                    <span>Efectivo Esperado en Caja</span>
                    <span className="font-bold font-mono text-blue-800">
                      ${((activeSession?.openingBalance || 0) + (activeSession?.cashSales || 0)).toFixed(2)} MXN
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Efectivo Real Contado Físicamente
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                    <input
                      id="input-efectivo-corte"
                      type="number"
                      placeholder="Ingrese el conteo real en caja..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={closeCashInput}
                      onChange={(e) => setCloseCashInput(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    La diferencia (sobrante o faltante) será analizada automáticamente por la Auditoría de IA.
                  </p>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setCashAction(null)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-confirmar-cierre"
                    onClick={() => {
                      onCloseSession(Number(closeCashInput) || 0);
                      setCashAction(null);
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Realizar Corte
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: COBRAR TICKET (CHECKOUT) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 border border-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                {activeTicket.isFiado ? `Fiar Venta a: ${activeClient?.name}` : "Procesar Pago del Cliente"}
              </h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {checkoutError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex gap-2 items-center mb-4 text-xs text-rose-700 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{checkoutError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Totals & Payments */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide">Monto Neto de Compra</p>
                  <h2 className="text-2xl font-black text-slate-800 mt-1">${total.toFixed(2)} MXN</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Incluye IVA/IEPS del SAT mexicano</p>
                </div>

                {!activeTicket.isFiado && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Forma de Pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPaymentMethod("EFECTIVO")}
                        className={`py-3 px-2 rounded-xl text-center border font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === "EFECTIVO"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <DollarSign className="h-4.5 w-4.5" />
                        <span className="text-[10px]">Efectivo</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod("TARJETA")}
                        className={`py-3 px-2 rounded-xl text-center border font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === "TARJETA"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <CreditCard className="h-4.5 w-4.5" />
                        <span className="text-[10px]">Tarjeta</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod("SPEI")}
                        className={`py-3 px-2 rounded-xl text-center border font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === "SPEI"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <QrCode className="h-4.5 w-4.5" />
                        <span className="text-[10px]">SPEI / CoDi</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Calculations based on Payment Method */}
              <div className="flex flex-col justify-between">
                {activeTicket.isFiado ? (
                  <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-rose-900 text-xs">Aviso de Cargo de Crédito</h4>
                      <p className="text-xs text-rose-700/80 mt-1">
                        Esta venta será registrada bajo el concepto de <strong>"CRÉDITO FIADO"</strong>. No se solicita cobro en efectivo. El balance deudor de <strong>{activeClient?.name}</strong> aumentará por <strong>${total.toFixed(2)} MXN</strong>.
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-rose-100/80 text-xs text-rose-800 space-y-1 font-mono mt-4">
                      <div className="flex justify-between">
                        <span>Saldo anterior:</span>
                        <span>${activeClient?.balance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-rose-100 pt-1.5 mt-1">
                        <span>Nuevo saldo:</span>
                        <span>${((activeClient?.balance || 0) + total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ) : paymentMethod === "EFECTIVO" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Efectivo Recibido (MXN)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                        <input
                          id="input-efectivo-recibido"
                          type="number"
                          autoFocus
                          placeholder="0.00"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Quick bill selectors */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Billetes rápidos
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {quickCashBills.map((bill) => (
                          <button
                            key={bill}
                            onClick={() => handleQuickCash(bill)}
                            className="bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 py-1.5 rounded-lg text-xs font-bold text-slate-700"
                          >
                            +${bill}
                          </button>
                        ))}
                        <button
                          onClick={() => setCashReceived("")}
                          className="col-span-3 bg-slate-200 hover:bg-slate-300 py-1.5 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                        >
                          Limpiar conteo
                        </button>
                      </div>
                    </div>

                    {/* Change calculator display */}
                    {cashReceived && Number(cashReceived) >= total && (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex justify-between items-center text-emerald-800">
                        <span className="text-xs font-bold uppercase">Su cambio es:</span>
                        <span className="font-mono font-black text-base">
                          ${(Number(cashReceived) - total).toFixed(2)} MXN
                        </span>
                      </div>
                    )}
                  </div>
                ) : paymentMethod === "TARJETA" ? (
                  <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex-1 flex flex-col justify-between">
                    <div className="text-center py-6">
                      <CreditCard className="h-10 w-10 text-blue-600 mx-auto animate-pulse" />
                      <h4 className="font-bold text-blue-900 text-xs mt-2">Terminal Bancaria Conectada</h4>
                      <p className="text-[10px] text-blue-700/80 mt-1 max-w-[200px] mx-auto">
                        Inserte, acerque o deslice la tarjeta en el Pinpad para procesar el pago.
                      </p>
                    </div>
                    <div className="bg-blue-600 text-white p-2.5 rounded-xl text-center text-xs font-bold">
                      💳 Solicitando Aprobación...
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex-1 flex flex-col justify-between items-center text-center">
                    <div className="space-y-2">
                      <QrCode className="h-14 w-14 text-slate-800 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-xs">Código CoDi / SPEI Generado</h4>
                      <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto">
                        Pídale al cliente escanear este código QR dinámico desde su app de banco (Banxico CoDi).
                      </p>
                    </div>
                    <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] px-3 py-1.5 rounded-xl font-bold mt-2 animate-pulse">
                      ✓ Esperando transferencia bancaria...
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    id="btn-confirmar-venta"
                    onClick={handleCheckout}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100"
                  >
                    Confirmar Cobro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: SALE SLIP PRINT PREVIEW (After completing sale) */}
      {lastCompletedSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-100 shadow-2xl relative">
            <button
              onClick={() => setLastCompletedSale(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center border-b border-dashed border-slate-200 pb-3 mb-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-1.5" />
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">Venta Exitosa</h3>
              <p className="text-xs text-slate-400 font-mono">Ticket #{lastCompletedSale.ticketNumber}</p>
            </div>

            {/* Simulated thermal receipt paper roll */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-slate-700 text-[10px] space-y-3 leading-relaxed">
              <div className="text-center border-b border-dashed border-slate-200 pb-2">
                <p className="font-extrabold text-xs uppercase text-slate-900">TIENDA DE BARRIO JJM</p>
                <p>GIRO: {giro}</p>
                <p>Fecha: {new Date(lastCompletedSale.timestamp).toLocaleString()}</p>
                <p>Cajero: {lastCompletedSale.cajero}</p>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-slate-200 pb-2">
                {lastCompletedSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.quantity} x {item.product.name.slice(0, 18)}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right border-b border-dashed border-slate-200 pb-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${lastCompletedSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>IVA / IEPS</span>
                  <span>${lastCompletedSale.taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 text-xs">
                  <span>TOTAL MXN</span>
                  <span>${lastCompletedSale.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-400 pt-1">
                <p>Pago: {lastCompletedSale.paymentMethod}</p>
                {lastCompletedSale.paymentMethod === "EFECTIVO" && (
                  <>
                    <p>Recibido: ${lastCompletedSale.amountPaid.toFixed(2)}</p>
                    <p>Cambio: ${lastCompletedSale.change.toFixed(2)}</p>
                  </>
                )}
                <p className="mt-3">*** GRACIAS POR SU COMPRA ***</p>
                <p>SAT CFDI 4.0 CONCEPTUAL</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setLastCompletedSale(null)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                Cerrar Ventana
              </button>
              <button
                onClick={() => {
                  alert("🖨️ Mandando impresión al ticket térmico local de 58mm...");
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Imprimir Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// UI Locked session visual representation
const LockSessionVisual: React.FC = () => (
  <div className="relative w-16 h-16 flex items-center justify-center bg-rose-100 rounded-full text-rose-600">
    <div className="absolute inset-0 rounded-full border-4 border-rose-100 border-t-rose-500 animate-spin" style={{ animationDuration: "3s" }} />
    <DollarSign className="h-8 w-8" />
  </div>
);
