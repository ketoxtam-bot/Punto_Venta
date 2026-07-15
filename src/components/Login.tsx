/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Logo } from "./Logo";
import {
  Lock,
  User,
  Shield,
  Briefcase,
  Eye,
  EyeOff,
  Plus,
  X,
  Sparkles,
  Loader2,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Tag
} from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: {
    username: string;
    role: "ADMINISTRADOR" | "CAJERO" | "SUPERVISOR";
    giro: string;
    customProducts?: any[];
  }) => void;
}

interface GiroItem {
  name: string;
  desc: string;
  isCustom?: boolean;
  categories?: string[];
  customProducts?: any[];
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("admin@jjm.com");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState<"ADMINISTRADOR" | "CAJERO" | "SUPERVISOR">("ADMINISTRADOR");
  const [giro, setGiro] = useState("Miscelánea (Abarrotes)");
  const [showPassword, setShowPassword] = useState(false);

  // Custom Giros management
  const [giros, setGiros] = useState<GiroItem[]>([]);
  const [showAddGiroModal, setShowAddGiroModal] = useState(false);
  const [newGiroName, setNewGiroName] = useState("");
  const [newGiroDesc, setNewGiroDesc] = useState("");
  const [generateWithAI, setGenerateWithAI] = useState(true);
  const [isGeneratingGiro, setIsGeneratingGiro] = useState(false);
  const [creationMessage, setCreationMessage] = useState<string | null>(null);

  // Initialize giros list from defaults + localStorage
  useEffect(() => {
    const defaultGiros: GiroItem[] = [
      { name: "Miscelánea (Abarrotes)", desc: "Tienda de abarrotes con IVA 16%, IVA 0% y tasa exenta." },
      { name: "Papelería Escolar", desc: "Papelería con cuadernos, lápices y servicios exentos e IVA 16%." },
      { name: "Panadería Tradicional", desc: "Pan dulce y bolillos con IEPS del 8% y tasa exenta." },
      { name: "Carnicería / Pollería", desc: "Venta de cárnicos frescos con tasa de IVA 0%." },
      { name: "Farmacia Local", desc: "Medicinas patentes con IVA 0% y abarrotes generales." },
      { name: "Minisuper Familiar", desc: "Catálogo completo mixto con combos y licores." }
    ];

    const stored = localStorage.getItem("jjm_custom_giros");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setGiros([...defaultGiros, ...parsed]);
      } catch (e) {
        setGiros(defaultGiros);
      }
    } else {
      setGiros(defaultGiros);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Por favor, ingrese sus credenciales completas.");
      return;
    }

    // Find if the selected giro has custom pre-populated products
    const selectedGiroObj = giros.find((g) => g.name === giro);
    const customProducts = selectedGiroObj?.customProducts;

    onLoginSuccess({
      username: username.split("@")[0] || username,
      role,
      giro,
      customProducts,
    });
  };

  const handleQuickSelect = (r: "ADMINISTRADOR" | "CAJERO" | "SUPERVISOR") => {
    setRole(r);
    if (r === "ADMINISTRADOR") {
      setUsername("admin@jjm.com");
      setPassword("admin123");
    } else if (r === "CAJERO") {
      setUsername("cajero@jjm.com");
      setPassword("cajero123");
    } else {
      setUsername("supervisor@jjm.com");
      setPassword("super123");
    }
  };

  // Add Custom Giro flow
  const handleCreateGiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGiroName.trim()) return;

    setIsGeneratingGiro(true);
    setCreationMessage("Configurando entorno tributario y estructura comercial...");

    try {
      let starterProducts: any[] = [];

      if (generateWithAI) {
        setCreationMessage("Llamando al motor de Inteligencia Artificial Gemini para estructurar catálogo SAT...");
        const res = await fetch("/api/ia/generar-giro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giroName: newGiroName, giroDesc: newGiroDesc }),
        });

        if (res.ok) {
          starterProducts = await res.json();
        } else {
          throw new Error("No se pudo conectar con el motor de IA.");
        }
      } else {
        // Simple template fallback products
        starterProducts = [
          { id: `off-p-1`, code: "75001001", name: `${newGiroName} - Producto General`, price: 45.0, cost: 30.0, stock: 25, minStock: 5, unit: "pza", taxType: "IVA_16", category: "General" },
          { id: `off-p-2`, code: "75001002", name: `${newGiroName} - Insumo Básico`, price: 18.0, cost: 12.0, stock: 40, minStock: 10, unit: "pza", taxType: "IVA_0", category: "Básicos" },
          { id: `off-p-3`, code: "75001003", name: `${newGiroName} - Especialidad`, price: 150.0, cost: 95.0, stock: 10, minStock: 2, unit: "pza", taxType: "IVA_16", category: "Premium" }
        ];
      }

      const newGiro: GiroItem = {
        name: newGiroName,
        desc: newGiroDesc || "Giro personalizado de comercio independiente.",
        isCustom: true,
        customProducts: starterProducts,
      };

      // Update state and save to localStorage
      const customOnly = giros.filter((g) => g.isCustom);
      const updatedCustom = [...customOnly, newGiro];
      localStorage.setItem("jjm_custom_giros", JSON.stringify(updatedCustom));

      setGiros((prev) => [...prev, newGiro]);
      setGiro(newGiroName);

      setCreationMessage("✨ ¡Giro creado con éxito! Iniciando catálogo de inventario.");
      setTimeout(() => {
        setShowAddGiroModal(false);
        setNewGiroName("");
        setNewGiroDesc("");
        setCreationMessage(null);
        setIsGeneratingGiro(false);
      }, 1500);

    } catch (err: any) {
      alert("Hubo un error configurando el giro personalizado: " + err.message);
      setIsGeneratingGiro(false);
      setCreationMessage(null);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative luxury vector meshes in background */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/15 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl bg-slate-950/85 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden grid grid-cols-1 md:grid-cols-2 relative z-10">
        
        {/* Left column: Giro templates selection */}
        <div className="bg-gradient-to-br from-indigo-950/90 via-slate-950 to-slate-950 p-8 flex flex-col justify-between text-white border-r border-slate-800/60">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Logo className="h-12 w-auto" />
            </div>
            <div className="space-y-2">
              <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
                <Sparkles className="h-3 w-3 text-indigo-400" /> SISTEMA POS UNIVERSAL CFDI 4.0
              </span>
              <h2 className="text-xl font-black tracking-tight leading-snug">Adapte la Terminal a su Negocio</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seleccione el giro de su comercio para estructurar automáticamente el catálogo inicial de productos, códigos de barras e impuestos vigentes de acuerdo con el SAT.
              </p>
            </div>
          </div>

          {/* Giro selector grid */}
          <div className="space-y-3 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                1. GIRO DEL COMERCIO
              </span>
              
              <button
                id="btn-agregar-giro"
                type="button"
                onClick={() => setShowAddGiroModal(true)}
                className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus className="h-3 w-3" /> Agregar Giro
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {giros.map((g) => (
                <div
                  id={`giro-${g.name.replace(/\s+/g, "-").toLowerCase()}`}
                  key={g.name}
                  onClick={() => setGiro(g.name)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between h-[68px] ${
                    giro === g.name
                      ? "bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/5"
                      : "bg-slate-900/60 border-slate-800/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <p className="text-[10px] font-black truncate flex items-center gap-1">
                    {g.isCustom && <Tag className="h-2.5 w-2.5 text-indigo-400" />}
                    {g.name}
                  </p>
                  <p className="text-[8px] text-slate-500 line-clamp-2 leading-tight font-medium mt-1">
                    {g.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] text-slate-600 font-mono mt-4 pt-3 border-t border-slate-900">
            JJM Tecnologías Innovadoras S.A. de C.V. • Terminal POS Inteligente
          </div>
        </div>

        {/* Right column: Login form credentials */}
        <div className="p-8 flex flex-col justify-between bg-slate-950/50">
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-white text-lg">Inicie Sesión en Terminal</h3>
              <p className="text-xs text-slate-400 mt-1">Ingrese sus credenciales de cajero o administrador</p>
            </div>

            {/* Quick credentials selectors */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                Selección Rápida de Rol de Acceso
              </span>
              <div className="flex gap-1.5">
                {(["ADMINISTRADOR", "CAJERO", "SUPERVISOR"] as const).map((r) => (
                  <button
                    id={`btn-quick-role-${r.toLowerCase()}`}
                    type="button"
                    key={r}
                    onClick={() => handleQuickSelect(r)}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[9px] font-black border transition-all ${
                      role === r
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-350"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Login inputs */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Usuario o Email de Acceso
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="input-login-username"
                    type="text"
                    required
                    className="w-full bg-slate-900/80 border border-slate-800 text-slate-100 text-xs rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="correo@tienda.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Contraseña de Seguridad
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="input-login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full bg-slate-900/80 border border-slate-800 text-slate-100 text-xs rounded-xl pl-11 pr-10 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 mt-2"
              >
                <Shield className="h-4 w-4" /> Entrar al Sistema POS
              </button>
            </form>
          </div>

          <p className="text-center text-[10px] text-slate-600 mt-6 leading-relaxed">
            La información tributaria y las transacciones fiscales se transmiten bajo encriptación directa al SAT según el esquema de facturación CFDI 4.0.
          </p>
        </div>
      </div>

      {/* Add Custom Giro Modal */}
      {showAddGiroModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4.5 border-b border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h4 className="font-extrabold text-white text-sm">Nuevo Giro Comercial</h4>
              </div>
              <button
                onClick={() => !isGeneratingGiro && setShowAddGiroModal(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGiro} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Nombre del Giro Comercial
                </label>
                <input
                  type="text"
                  required
                  disabled={isGeneratingGiro}
                  placeholder="ej. Ferretería, Cafetería, Veterinaria"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-150 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  value={newGiroName}
                  onChange={(e) => setNewGiroName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Descripción Corta de Actividad
                </label>
                <textarea
                  rows={2}
                  disabled={isGeneratingGiro}
                  placeholder="ej. Venta de refacciones, herramientas y artículos de plomería con IVA al 16%."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-150 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 resize-none"
                  value={newGiroDesc}
                  onChange={(e) => setNewGiroDesc(e.target.value)}
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-indigo-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-400" /> Catálogo Inteligente IA
                  </p>
                  <p className="text-[8px] text-slate-400">
                    Gemini creará 6 productos base con códigos SAT, costos e impuestos realistas.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isGeneratingGiro}
                  checked={generateWithAI}
                  onChange={(e) => setGenerateWithAI(e.target.checked)}
                  className="h-4.5 w-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-800 bg-slate-900"
                />
              </div>

              {creationMessage && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-[9px] font-semibold text-slate-350 flex items-center gap-2">
                  {isGeneratingGiro ? (
                    <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  <span>{creationMessage}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isGeneratingGiro}
                  onClick={() => setShowAddGiroModal(false)}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingGiro}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isGeneratingGiro ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando...
                    </>
                  ) : (
                    "Crear Giro"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
