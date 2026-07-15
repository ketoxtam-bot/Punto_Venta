/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Loader2,
  DollarSign,
  Info,
  ArrowRight,
  TrendingDown,
  Percent,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Product, CashSession } from "../types";

interface AIPanelProps {
  products: Product[];
  activeSession: CashSession | null;
  giro: string;
}

export const AIPanel: React.FC<AIPanelProps> = ({ products, activeSession, giro }) => {
  const [activeIaTab, setActiveIaTab] = useState<"PRECIOS" | "DESABASTO" | "PROMOCIONES" | "MERMAS">("PRECIOS");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Price form states
  const [prodName, setProdName] = useState("");
  const [prodCost, setProdCost] = useState("");
  const [desiredMargin, setDesiredMargin] = useState("30");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [pricingResult, setPricingResult] = useState<any | null>(null);

  // 2. Stockout results
  const [stockoutList, setStockoutList] = useState<any[] | null>(null);

  // 3. Promos results
  const [promosList, setPromosList] = useState<any[] | null>(null);

  // 4. Merma audit states
  const [supervisorNotes, setSupervisorNotes] = useState("");
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const handleQueryPricingIa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodCost) {
      alert("Por favor escriba el nombre y el costo del producto.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setPricingResult(null);

    try {
      const res = await fetch("/api/ia/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: prodName,
          cost: Number(prodCost),
          desiredMargin: Number(desiredMargin),
          giro,
          competitorPrice: competitorPrice ? Number(competitorPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPricingResult(data);
      } else {
        setErrorMsg(data.error || "Ocurrió un error al contactar al asistente de IA.");
      }
    } catch (err: any) {
      setErrorMsg("No se pudo conectar con el servidor backend de IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleQueryStockoutIa = async () => {
    setLoading(true);
    setErrorMsg(null);
    setStockoutList(null);

    try {
      const res = await fetch("/api/ia/desabasto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentProducts: products.map((p) => ({
            name: p.name,
            stock: p.stock,
            minStock: p.minStock,
            unit: p.unit,
            category: p.category,
          })),
          giro,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStockoutList(data);
      } else {
        setErrorMsg(data.error || "Error al calcular predicciones de desabasto.");
      }
    } catch (err) {
      setErrorMsg("Error de red al consultar el predictor.");
    } finally {
      setLoading(false);
    }
  };

  const handleQueryPromosIa = async () => {
    setLoading(true);
    setErrorMsg(null);
    setPromosList(null);

    try {
      const res = await fetch("/api/ia/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentProducts: products.map((p) => ({
            name: p.name,
            price: p.price,
            category: p.category,
          })),
          giro,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPromosList(data);
      } else {
        setErrorMsg(data.error || "Error al generar combos promocionales.");
      }
    } catch (err) {
      setErrorMsg("Error de red al consultar promos.");
    } finally {
      setLoading(false);
    }
  };

  const handleQueryMermasIa = async () => {
    if (!activeSession) {
      alert("Abra una sesión de caja primero para realizar arqueos y auditorías.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setAuditResult(null);

    // Simulated cash expected total
    const expected = activeSession.openingBalance + activeSession.cashSales;
    // For demo/audit discrepancy let's check difference
    const real = activeSession.realCashCollected || expected;

    try {
      const res = await fetch("/api/ia/mermas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionTotals: {
            opening: activeSession.openingBalance,
            sales: activeSession.salesTotal,
            expected,
          },
          realCashCollected: real,
          notes: supervisorNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAuditResult(data);
      } else {
        setErrorMsg(data.error || "Error al auditar mermas.");
      }
    } catch (err) {
      setErrorMsg("Error de red al consultar auditor de mermas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-panel-main" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: IA ACTIONS SELECTION (4 columns) */}
      <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-950 text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" /> Capa de Inteligencia Artificial
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Módulos cognitivos para optimizar márgenes y prevenir mermas</p>
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <button
            onClick={() => {
              setActiveIaTab("PRECIOS");
              setErrorMsg(null);
            }}
            className={`w-full p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 border ${
              activeIaTab === "PRECIOS"
                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-50"
                : "bg-slate-50 border-slate-100 hover:bg-slate-100/50 text-slate-600"
            }`}
          >
            <TrendingUp className="h-4.5 w-4.5" />
            Asistente de Precios y Margen
          </button>

          <button
            onClick={() => {
              setActiveIaTab("DESABASTO");
              setErrorMsg(null);
            }}
            className={`w-full p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 border ${
              activeIaTab === "DESABASTO"
                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-50"
                : "bg-slate-50 border-slate-100 hover:bg-slate-100/50 text-slate-600"
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
            Predicción de Desabasto
          </button>

          <button
            onClick={() => {
              setActiveIaTab("PROMOCIONES");
              setErrorMsg(null);
            }}
            className={`w-full p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 border ${
              activeIaTab === "PROMOCIONES"
                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-50"
                : "bg-slate-50 border-slate-100 hover:bg-slate-100/50 text-slate-600"
            }`}
          >
            <Lightbulb className="h-4.5 w-4.5" />
            Sugeridor Cross-Selling
          </button>

          <button
            onClick={() => {
              setActiveIaTab("MERMAS");
              setErrorMsg(null);
            }}
            className={`w-full p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 border ${
              activeIaTab === "MERMAS"
                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-50"
                : "bg-slate-50 border-slate-100 hover:bg-slate-100/50 text-slate-600"
            }`}
          >
            <ShieldAlert className="h-4.5 w-4.5" />
            Auditoría de Mermas y Cortes
          </button>
        </div>

        {/* SAT context tip */}
        <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-150 text-[10px] text-slate-500 space-y-1.5">
          <div className="flex gap-1.5 items-center font-bold text-slate-700">
            <Info className="h-3.5 w-3.5 text-blue-600" /> SAT regulaciones mexicanas
          </div>
          <p className="leading-relaxed">
            La IA asocia de forma inteligente los impuestos SAT vigentes en México (ej. IEPS 8% para panadería de alto aporte calórico o IVA 16% para papelerías) para dar cotizaciones y márgenes 100% verídicos al comerciante.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: DETAILED INTERACTION PANEL (8 columns) */}
      <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[420px] flex flex-col justify-between">
        <div className="space-y-6">
          {/* Active Tab Explanation Header */}
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">
              {activeIaTab === "PRECIOS" && "Asistente de Precios y Margen de Ganancia"}
              {activeIaTab === "DESABASTO" && "Predicción de Desabasto y Compras Estacionales"}
              {activeIaTab === "PROMOCIONES" && "Sugeridor de Promociones y Combos Cross-Selling"}
              {activeIaTab === "MERMAS" && "Auditoría de Mermas y Cuadre de Caja"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeIaTab === "PRECIOS" && "Analiza los costos del tendero, introduce impuestos mexicanos e inflaciones sugeridas, recomendando el precio final al público óptimo."}
              {activeIaTab === "DESABASTO" && "Calcula el riesgo de desabastecimiento basado en existencias y predice demandas para épocas del año mexicanas (ej. Regreso a clases, Día de Muertos)."}
              {activeIaTab === "PROMOCIONES" && "Descubre patrones locales de consumo en el catálogo actual para crear ofertas conjuntas con slogans comerciales creativos al estilo mexicano."}
              {activeIaTab === "MERMAS" && "Dictamina discrepancias del arqueo de caja de forma inteligente y aconseja sobre seguridad, robos hormiga y mermas físicas."}
            </p>
          </div>

          {/* Loading state display */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-700 animate-pulse">Pensando y Calculando con IA...</p>
              <p className="text-[10px] mt-1 text-slate-400">Analizando regulaciones del SAT, comportamientos de inflación y estacionalidades locales.</p>
            </div>
          )}

          {/* Error display */}
          {errorMsg && !loading && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 text-xs text-rose-800">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Error en la consulta de IA</p>
                <p className="mt-1">{errorMsg}</p>
                <p className="mt-3 text-[10px] text-rose-600 font-bold">
                  * Asegúrese de tener configurada una API Key válida de Gemini en el panel de Secrets de Google AI Studio.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: PRICING ASSISTANT FORM & OUTPUT */}
          {activeIaTab === "PRECIOS" && !loading && !errorMsg && (
            <div className="space-y-6">
              {!pricingResult ? (
                <form onSubmit={handleQueryPricingIa} className="space-y-4 max-w-md">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Nombre Comercial del Producto</label>
                      <input
                        id="input-ai-prodname"
                        type="text"
                        required
                        placeholder="Ej. Libreta Italiana Raya Scribe o Bolillo tradicional"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Costo Adquisición ($ MXN)</label>
                      <input
                        id="input-ai-prodcost"
                        type="number"
                        step="0.01"
                        required
                        placeholder="Ej. 18.50"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={prodCost}
                        onChange={(e) => setProdCost(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Margen Deseado (%)</label>
                      <input
                        id="input-ai-prodmargin"
                        type="number"
                        required
                        placeholder="Ej. 30"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={desiredMargin}
                        onChange={(e) => setDesiredMargin(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Precio de Competencia OXXO / Mercado (Opcional)</label>
                      <input
                        id="input-ai-prodcompetitor"
                        type="number"
                        step="0.01"
                        placeholder="Ej. 29.90"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={competitorPrice}
                        onChange={(e) => setCompetitorPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    id="btn-ai-precios-consultar"
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-blue-50 transition-colors"
                  >
                    <Brain className="h-4 w-4" /> Analizar Costo con IA
                  </button>
                </form>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center">
                      <span className="block text-[10px] text-blue-700 uppercase font-black">Precio de Venta Sugerido</span>
                      <h2 className="text-2xl font-black text-blue-900 mt-1">
                        ${pricingResult.recommendedPriceWithTax?.toFixed(2)} MXN
                      </h2>
                      <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full mt-2 inline-block">
                        {pricingResult.applicableTaxes} Incluido
                      </span>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-center">
                      <span className="block text-[10px] text-emerald-700 uppercase font-black">Ganancia Bruta Real</span>
                      <h2 className="text-2xl font-black text-emerald-900 mt-1">
                        ${pricingResult.actualProfitInPesos?.toFixed(2)} MXN
                      </h2>
                      <span className="text-[9px] text-emerald-700 font-bold mt-1 block">
                        Margen real final: {pricingResult.actualMarginPercent?.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="h-4.5 w-4.5 text-blue-600" /> Impacto Inflación de México
                      </h4>
                      <p className="text-slate-600 leading-relaxed text-[11px]">{pricingResult.inflationAnalysis}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="h-4.5 w-4.5 text-blue-600" /> Estrategia de Venta Sugerida
                      </h4>
                      <p className="text-slate-600 leading-relaxed text-[11px]">{pricingResult.strategyNotes}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setPricingResult(null)}
                    className="border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-50 transition-colors"
                  >
                    Calcular Otro Producto
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 2: STOCKOUT PREDICTION */}
          {activeIaTab === "DESABASTO" && !loading && !errorMsg && (
            <div className="space-y-4">
              {!stockoutList ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    La IA analizará todo su stock actual y los umbrales de re-orden. Generará predicciones estacionales personalizadas (ej. si vende panes, anticipará la demanda de panes de muerto en octubre, o cuadernos en el regreso a clases de agosto).
                  </p>
                  <button
                    id="btn-ai-desabasto-consultar"
                    onClick={handleQueryStockoutIa}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Brain className="h-4 w-4" /> Predecir Riesgo de Desabasto
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Productos en Riesgo de Desabasto</h4>
                    <button
                      onClick={handleQueryStockoutIa}
                      className="text-xs text-blue-700 font-bold hover:underline"
                    >
                      Actualizar Análisis
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stockoutList.map((st, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs">{st.productName}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Stock actual: {st.currentStock} pcs</p>
                          </div>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded ${
                              st.riskLevel === "ALTO"
                                ? "bg-rose-100 text-rose-800 animate-pulse"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            RIESGO {st.riskLevel}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-1.5 border-t border-slate-200/60 pt-2">
                          <p>
                            <span className="font-bold text-slate-700 block">Factor Estacional Mexicano:</span>
                            {st.seasonalFactor}
                          </p>
                          <p>
                            <span className="font-bold text-slate-700 block">Días Estimados para Agotarse:</span>
                            Aproximadamente <strong className="text-rose-700">{st.estimatedDaysRemaining} días</strong>
                          </p>
                          <p>
                            <span className="font-bold text-slate-700 block">Pedido de Compra Sugerido:</span>
                            Comprar <strong>{st.recommendedPurchaseQty}</strong> piezas al proveedor local.
                          </p>
                          <p className="bg-blue-50/50 p-2 rounded text-[10px] text-blue-800 border border-blue-100/50 italic">
                            💡 {st.supplierTip}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 3: CROSS-SELLING PROMO SUGGESTER */}
          {activeIaTab === "PROMOCIONES" && !loading && !errorMsg && (
            <div className="space-y-4">
              {!promosList ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Al presionar el botón, la Inteligencia Artificial analizará la canasta de productos del catálogo actual de su "{giro}" para estructurar 3 combos promocionales empaquetados atractivos, con títulos divertidos y tradicionales de México.
                  </p>
                  <button
                    id="btn-ai-promos-consultar"
                    onClick={handleQueryPromosIa}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Brain className="h-4 w-4" /> Generar Combos Especiales
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Combos Promocionales Sugeridos por IA</h4>
                    <button onClick={handleQueryPromosIa} className="text-xs text-blue-700 font-bold hover:underline">
                      Generar Nuevas Promos
                    </button>
                  </div>

                  <div className="space-y-4">
                    {promosList.map((pr, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-150 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 space-y-2">
                          <span className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                            Combo #{i + 1}
                          </span>
                          <h4 className="font-black text-slate-900 text-sm">{pr.comboName}</h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            <strong>Incluye:</strong> {pr.includedProducts?.join(" + ")}
                          </p>
                          <p className="text-[10px] text-blue-800 bg-blue-50 border border-blue-100 p-2 rounded-lg italic">
                            📣 <strong>Cartel:</strong> "{pr.marketingSlogan}"
                          </p>
                        </div>

                        <div className="md:col-span-4 border-l border-slate-200/60 pl-4 space-y-1.5 text-right text-xs">
                          <p className="text-slate-400">Precio regular: <span className="line-through font-mono">${pr.regularPriceTotal?.toFixed(2)}</span></p>
                          <h3 className="text-lg font-black text-blue-900 font-mono">${pr.proposedComboPrice?.toFixed(2)} MXN</h3>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block">
                            -{pr.discountPercent}% Ahorro
                          </span>
                          <p className="text-[9px] text-slate-500 leading-tight mt-2 block">{pr.merchantBenefitReason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 4: LOSS AUDIT */}
          {activeIaTab === "MERMAS" && !loading && !errorMsg && (
            <div className="space-y-4">
              {!activeSession ? (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-2 text-xs text-rose-800 font-medium">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                  <p>Es necesario abrir el cajón de cobro en la pestaña "Ventas (Caja)" para poder calcular discrepancias y realizar auditorías de mermas.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                    <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200/60 pb-1.5">
                      <span>Arqueo de Caja Actual:</span>
                      <span className="text-blue-700 font-mono">Sesión #{activeSession.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Efectivo Esperado en Caja:</span>
                      <span className="font-bold font-mono">${(activeSession.openingBalance + activeSession.cashSales).toFixed(2)} MXN</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Dinero Real Contado por Cajero:</span>
                      <span className="font-bold font-mono">
                        ${activeSession.realCashCollected !== undefined ? activeSession.realCashCollected.toFixed(2) : "Caja No Cerrada (Sin conteo)"} MXN
                      </span>
                    </div>
                    {activeSession.realCashCollected !== undefined && (
                      <div className="flex justify-between text-slate-900 font-black pt-1.5 border-t border-slate-200">
                        <span>Diferencia Faltante/Sobrante:</span>
                        <span className={activeSession.realCashCollected - (activeSession.openingBalance + activeSession.cashSales) < 0 ? "text-rose-700 font-mono" : "text-emerald-700 font-mono"}>
                          ${(activeSession.realCashCollected - (activeSession.openingBalance + activeSession.cashSales)).toFixed(2)} MXN
                        </span>
                      </div>
                    )}
                  </div>

                  {!auditResult ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notas u Observaciones del Supervisor (Opcional)</label>
                        <textarea
                          id="textarea-ai-merma-notes"
                          rows={2}
                          placeholder="Ej. El cajero reportó que dio cambio incorrecto de $50 o se registraron mermas físicas..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:ring-1 focus:ring-blue-500"
                          value={supervisorNotes}
                          onChange={(e) => setSupervisorNotes(e.target.value)}
                        />
                      </div>
                      <button
                        id="btn-ai-merma-consultar"
                        onClick={handleQueryMermasIa}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-colors"
                      >
                        <Brain className="h-4 w-4" /> Auditar Desviación con IA
                      </button>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Dictamen de Auditoría de IA</h4>
                        <button onClick={() => setAuditResult(null)} className="text-xs text-blue-700 font-bold hover:underline">
                          Nueva Auditoría
                        </button>
                      </div>

                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 text-rose-800 text-xs">
                        <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                        <div>
                          <p className="font-bold uppercase">Estado de la discrepancia: {auditResult.discrepancyStatus}</p>
                          <p className="mt-1 leading-relaxed text-[11px]">{auditResult.discrepancyImpact}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                          <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                            🔍 Explicaciones/Causas Comunes
                          </h4>
                          <ul className="list-disc list-inside space-y-1.5 text-slate-600 text-[11px]">
                            {auditResult.possibleCauses?.map((c: string, idx: number) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                          <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                            🛡️ Medidas de Seguridad Sugeridas
                          </h4>
                          <ul className="list-disc list-inside space-y-1.5 text-slate-600 text-[11px]">
                            {auditResult.securityRecommendations?.map((r: string, idx: number) => (
                              <li key={idx}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                          📋 Política de Caja Preventiva Estándar
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-[11px] italic">"{auditResult.preventivePolicies}"</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
