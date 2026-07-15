/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { SalesRegister } from "./components/SalesRegister";
import { InventoryManager } from "./components/InventoryManager";
import { ClientManager } from "./components/ClientManager";
import { InvoicingModule } from "./components/InvoicingModule";
import { AIPanel } from "./components/AIPanel";
import { Logo } from "./components/Logo";
import {
  TrendingUp,
  Package,
  Users,
  Brain,
  FileText,
  LogOut,
  ShoppingBag,
  ShieldCheck,
  Store,
  Wifi,
  WifiOff,
  CloudLightning,
  RefreshCw,
  Database,
  HelpCircle,
  FolderSync,
  Settings,
  Plus
} from "lucide-react";
import { Product, Client, Sale, CashSession, Supplier } from "./types";

interface OfflineAction {
  id: string;
  type: "ADD_SALE" | "ADD_CLIENT" | "ADD_PRODUCT" | "UPDATE_PRODUCT" | "DELETE_PRODUCT" | "REGISTER_ABONO" | "OPEN_SESSION" | "CLOSE_SESSION";
  data: any;
  timestamp: string;
}

export default function App() {
  const [user, setUser] = useState<{ username: string; role: "ADMINISTRADOR" | "CAJERO" | "SUPERVISOR"; giro: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"VENTAS" | "INVENTARIO" | "CLIENTES" | "FACTURACION" | "IA">("VENTAS");

  // Core POS State
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);

  // Connection Mode State: ONLINE vs LOCAL (Offline)
  const [connectionMode, setConnectionMode] = useState<"ONLINE" | "LOCAL">("ONLINE");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState("");
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);

  // Sound play helper for offline cues
  const playOfflineChime = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.frequency.setValueAtTime(523.25, context.currentTime); // C5 note
      osc.frequency.setValueAtTime(659.25, context.currentTime + 0.1); // E5 note
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      osc.start();
      osc.stop(context.currentTime + 0.3);
    } catch (e) {
      // Ignored if blocked
    }
  };

  // Sync state on login or manually
  useEffect(() => {
    if (user) {
      if (connectionMode === "ONLINE") {
        fetchAllData();
      } else {
        loadFromLocalBackup();
      }
    }
  }, [user, connectionMode]);

  // Load offline queue on mount
  useEffect(() => {
    const queue = localStorage.getItem("jjm_offline_queue");
    if (queue) {
      try {
        setOfflineQueue(JSON.parse(queue));
      } catch (e) {}
    }

    // Auto-detect browser online status
    const handleBrowserOnline = () => {
      console.log("Internet link restored by browser.");
    };
    const handleBrowserOffline = () => {
      console.log("Internet link disconnected. Safeguarding terminal.");
      setConnectionMode("LOCAL");
    };

    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);
    return () => {
      window.removeEventListener("online", handleBrowserOnline);
      window.removeEventListener("offline", handleBrowserOffline);
    };
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchProducts(),
        fetchClients(),
        fetchSuppliers(),
        fetchSales(),
        fetchSessions(),
      ]);
    } catch (err) {
      console.warn("Unable to fetch fresh data from cloud server, falling back to local isolated database.");
      setConnectionMode("LOCAL");
      loadFromLocalBackup();
    }
  };

  const saveToLocalBackup = (key: string, data: any) => {
    localStorage.setItem(`jjm_backup_${key}`, JSON.stringify(data));
  };

  const loadFromLocalBackup = () => {
    const backupProducts = localStorage.getItem("jjm_backup_products");
    const backupClients = localStorage.getItem("jjm_backup_clients");
    const backupSuppliers = localStorage.getItem("jjm_backup_suppliers");
    const backupSales = localStorage.getItem("jjm_backup_sales");
    const backupSessions = localStorage.getItem("jjm_backup_sessions");

    if (backupProducts) setProducts(JSON.parse(backupProducts));
    if (backupClients) setClients(JSON.parse(backupClients));
    if (backupSuppliers) setSuppliers(JSON.parse(backupSuppliers));
    if (backupSales) setSales(JSON.parse(backupSales));
    
    if (backupSessions) {
      const sessList = JSON.parse(backupSessions);
      setSessions(sessList);
      const active = sessList.find((s: CashSession) => s.status === "OPEN");
      setActiveSession(active || null);
    }
  };

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      setProducts(data);
      saveToLocalBackup("products", data);
    }
  };

  const fetchClients = async () => {
    const res = await fetch("/api/clients");
    if (res.ok) {
      const data = await res.json();
      setClients(data);
      saveToLocalBackup("clients", data);
    }
  };

  const fetchSuppliers = async () => {
    const res = await fetch("/api/suppliers");
    if (res.ok) {
      const data = await res.json();
      setSuppliers(data);
      saveToLocalBackup("suppliers", data);
    }
  };

  const fetchSales = async () => {
    const res = await fetch("/api/sales");
    if (res.ok) {
      const data = await res.json();
      setSales(data);
      saveToLocalBackup("sales", data);
    }
  };

  const fetchSessions = async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
      saveToLocalBackup("sessions", data);
      const active = data.find((s: CashSession) => s.status === "OPEN");
      setActiveSession(active || null);
    }
  };

  // Login handler that configures the backend Giro
  const handleLoginSuccess = async (loginData: {
    username: string;
    role: "ADMINISTRADOR" | "CAJERO" | "SUPERVISOR";
    giro: string;
    customProducts?: any[];
    connectionMode?: "ONLINE" | "LOCAL";
  }) => {
    try {
      let internalGiro = loginData.giro;
      if (loginData.giro.includes("Abarrotes")) internalGiro = "ABARROTES";
      if (loginData.giro.includes("Papelería")) internalGiro = "PAPELERIA";
      if (loginData.giro.includes("Panadería")) internalGiro = "PANADERIA";
      if (loginData.giro.includes("Carnicería")) internalGiro = "CARNICERIA";
      if (loginData.giro.includes("Farmacia")) internalGiro = "FARMACIA";
      if (loginData.giro.includes("Minisuper")) internalGiro = "MINISUPER";

      const targetMode = loginData.connectionMode || "ONLINE";

      if (targetMode === "ONLINE") {
        // Configure business type on Express server
        const res = await fetch("/api/giro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giro: internalGiro, customProducts: loginData.customProducts }),
        });

        if (res.ok) {
          setUser(loginData);
          setConnectionMode("ONLINE");
          setActiveTab("VENTAS");
        } else {
          alert("Iniciando en modo local para este giro comercial.");
          setUser(loginData);
          setConnectionMode("LOCAL");
          setActiveTab("VENTAS");
        }
      } else {
        // Local mode chosen explicitly
        setUser(loginData);
        setConnectionMode("LOCAL");
        setActiveTab("VENTAS");

        // Seed products locally if backup is empty
        const backupProducts = localStorage.getItem("jjm_backup_products");
        if (!backupProducts || JSON.parse(backupProducts).length === 0) {
          const starter = loginData.customProducts || [];
          localStorage.setItem("jjm_backup_products", JSON.stringify(starter));
          setProducts(starter);
        }
      }
    } catch (err) {
      alert("Iniciando terminal en modo offline aislado debido a indisponibilidad de red.");
      setUser(loginData);
      setConnectionMode("LOCAL");
      setActiveTab("VENTAS");
    }
  };

  // Add item to local offline queue
  const appendToOfflineQueue = (type: OfflineAction["type"], data: any) => {
    const newAction: OfflineAction = {
      id: "act-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      type,
      data,
      timestamp: new Date().toISOString()
    };
    const updated = [...offlineQueue, newAction];
    setOfflineQueue(updated);
    localStorage.setItem("jjm_offline_queue", JSON.stringify(updated));
    playOfflineChime();
  };

  // Switch Giro Commercial inside the Session
  const handleSwitchGiro = async (selectedGiroName: string) => {
    if (connectionMode === "LOCAL") {
      alert("⚠️ El cambio de giro requiere conexión activa con el servidor fiscal para reestructurar catálogos.");
      return;
    }
    if (!confirm(`¿Está seguro de cambiar el giro a "${selectedGiroName}"? Esto reiniciará el historial de ventas actual.`)) {
      return;
    }

    let internalGiro = selectedGiroName;
    if (selectedGiroName.includes("Abarrotes")) internalGiro = "ABARROTES";
    if (selectedGiroName.includes("Papelería")) internalGiro = "PAPELERIA";
    if (selectedGiroName.includes("Panadería")) internalGiro = "PANADERIA";
    if (selectedGiroName.includes("Carnicería")) internalGiro = "CARNICERIA";
    if (selectedGiroName.includes("Farmacia")) internalGiro = "FARMACIA";
    if (selectedGiroName.includes("Minisuper")) internalGiro = "MINISUPER";

    // Load custom products if it's a custom giro
    const storedCustom = localStorage.getItem("jjm_custom_giros");
    let customProducts: any[] | undefined = undefined;
    if (storedCustom) {
      try {
        const parsed = JSON.parse(storedCustom);
        const matched = parsed.find((p: any) => p.name === selectedGiroName);
        if (matched) customProducts = matched.customProducts;
      } catch (e) {}
    }

    try {
      const res = await fetch("/api/giro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giro: internalGiro, customProducts }),
      });
      if (res.ok) {
        setUser(prev => prev ? { ...prev, giro: selectedGiroName } : null);
        await fetchAllData();
        alert(`¡Giro cambiado exitosamente a ${selectedGiroName}!`);
      }
    } catch (e) {
      alert("Error de red cambiando el giro.");
    }
  };

  // Dynamic Sequential Sync playback engine
  const handleSyncQueue = async () => {
    if (offlineQueue.length === 0) return;
    setIsSyncing(true);
    setSyncProgress(5);
    setSyncStatusText("Estableciendo enlace de seguridad fiscal...");

    try {
      let currentIdx = 0;
      for (const action of offlineQueue) {
        currentIdx++;
        const percent = Math.floor((currentIdx / offlineQueue.length) * 90);
        setSyncProgress(percent);
        setSyncStatusText(`Replicando: ${action.type.replace("_", " ")} (${currentIdx}/${offlineQueue.length})...`);

        // Replay call
        if (action.type === "OPEN_SESSION") {
          await fetch("/api/sessions/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.data),
          });
        } else if (action.type === "CLOSE_SESSION") {
          // Find if there is an active session id to close
          const activeRes = await fetch("/api/sessions");
          if (activeRes.ok) {
            const list = await activeRes.json();
            const openSess = list.find((s: any) => s.status === "OPEN");
            if (openSess) {
              await fetch(`/api/sessions/close/${openSess.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action.data),
              });
            }
          }
        } else if (action.type === "ADD_SALE") {
          await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.data),
          });
        } else if (action.type === "ADD_PRODUCT") {
          await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.data),
          });
        } else if (action.type === "UPDATE_PRODUCT") {
          const { id, updates } = action.data;
          await fetch(`/api/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
        } else if (action.type === "DELETE_PRODUCT") {
          await fetch(`/api/products/${action.data.id}`, { method: "DELETE" });
        } else if (action.type === "ADD_CLIENT") {
          await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.data),
          });
        } else if (action.type === "REGISTER_ABONO") {
          const { clientId, amount, description } = action.data;
          await fetch(`/api/clients/${clientId}/abono`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, description }),
          });
        }

        // Mini delay for smoother visual flow
        await new Promise((r) => setTimeout(r, 200));
      }

      setSyncProgress(95);
      setSyncStatusText("Sincronizando catálogos locales...");
      await fetchAllData();
      
      setOfflineQueue([]);
      localStorage.removeItem("jjm_offline_queue");
      setSyncProgress(100);
      setSyncStatusText("¡Sincronización de Terminal Exitosa!");
      setTimeout(() => setIsSyncing(false), 1200);

    } catch (e) {
      alert("⚠️ Error al sincronizar algunos datos. Verifique su conexión.");
      setIsSyncing(false);
    }
  };

  // --- API / LOCAL INTERCEPTORS WRAPPERS ---

  const handleOpenSession = async (openingBalance: number) => {
    if (connectionMode === "ONLINE") {
      const res = await fetch("/api/sessions/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance, userName: user?.username || "Cajero Principal" }),
      });
      if (res.ok) {
        await fetchSessions();
      } else {
        throw new Error("No se pudo iniciar la sesión de caja.");
      }
    } else {
      // Local Implementation
      const newSession: CashSession = {
        id: "sess-local-" + Date.now(),
        userId: "user-local-1",
        userName: user?.username || "Cajero Principal",
        openingTime: new Date().toISOString(),
        openingBalance,
        status: "OPEN",
        salesCount: 0,
        salesTotal: 0,
        cashSales: 0,
        cardSales: 0,
        speiSales: 0,
      };

      const updatedSess = [...sessions, newSession];
      setSessions(updatedSess);
      setActiveSession(newSession);
      saveToLocalBackup("sessions", updatedSess);
      
      appendToOfflineQueue("OPEN_SESSION", { openingBalance, userName: user?.username || "Cajero Principal" });
    }
  };

  const handleCloseSession = async (realCashCollected: number) => {
    if (connectionMode === "ONLINE") {
      if (!activeSession) return;
      const res = await fetch(`/api/sessions/close/${activeSession.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realCashCollected }),
      });
      if (res.ok) {
        await fetchSessions();
      } else {
        throw new Error("No se pudo registrar el arqueo de cierre.");
      }
    } else {
      // Local Implementation
      if (!activeSession) return;
      const updatedSess = sessions.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            status: "CLOSED" as const,
            closingTime: new Date().toISOString(),
            closingBalance: s.openingBalance + s.cashSales,
            realCashCollected,
          };
        }
        return s;
      });

      setSessions(updatedSess);
      setActiveSession(null);
      saveToLocalBackup("sessions", updatedSess);

      appendToOfflineQueue("CLOSE_SESSION", { realCashCollected });
    }
  };

  const handleAddSale = async (saleData: any) => {
    if (connectionMode === "ONLINE") {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });
      if (res.ok) {
        const newSale = await res.json();
        await Promise.all([fetchSales(), fetchSessions()]);
        return newSale;
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Error al completar la transacción.");
      }
    } else {
      // Offline-Local Implementation with taxes matching Mexican rules
      let subtotal = 0;
      let taxes = 0;
      let total = 0;

      const resolvedItems = saleData.items.map((item: any) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error("Producto no encontrado.");

        // Deduct local stock
        product.stock = Math.max(0, product.stock - item.quantity);

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

        return {
          product,
          quantity: item.quantity,
          price: product.price
        };
      });

      // Handle client credit ("Fiado") offline
      if (saleData.clientId && saleData.clientId !== "cl-3" && saleData.isFiado) {
        const client = clients.find((c) => c.id === saleData.clientId);
        if (client) {
          client.balance += total;
          saveToLocalBackup("clients", clients);
        }
      }

      // Update local cash sessions stats
      if (activeSession) {
        activeSession.salesCount += 1;
        activeSession.salesTotal += total;
        if (saleData.paymentMethod === "EFECTIVO") activeSession.cashSales += total;
        if (saleData.paymentMethod === "TARJETA") activeSession.cardSales += total;
        if (saleData.paymentMethod === "SPEI") activeSession.speiSales += total;
      }

      const newSale: Sale = {
        id: "sale-local-" + Date.now(),
        ticketNumber: (sales.length + 1001).toString(),
        items: resolvedItems,
        subtotal: Number(subtotal.toFixed(2)),
        taxes: Number(taxes.toFixed(2)),
        total: Number(total.toFixed(2)),
        paymentMethod: saleData.paymentMethod,
        amountPaid: saleData.amountPaid,
        change: saleData.change,
        timestamp: new Date().toISOString(),
        status: "COMPLETED",
        cajero: user?.username || "Cajero Principal"
      };

      const updatedSales = [...sales, newSale];
      setSales(updatedSales);

      saveToLocalBackup("products", products);
      saveToLocalBackup("sales", updatedSales);
      saveToLocalBackup("sessions", sessions);

      appendToOfflineQueue("ADD_SALE", saleData);
      return newSale;
    }
  };

  const handleAddProduct = async (productData: any) => {
    if (connectionMode === "ONLINE") {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchProducts();
        return data;
      }
      throw new Error("Error registrando producto.");
    } else {
      const localProduct: Product = {
        id: "p-local-" + Date.now(),
        ...productData
      };
      const updated = [...products, localProduct];
      setProducts(updated);
      saveToLocalBackup("products", updated);
      appendToOfflineQueue("ADD_PRODUCT", productData);
      return localProduct;
    }
  };

  const handleUpdateProduct = async (id: string, updates: any) => {
    if (connectionMode === "ONLINE") {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchProducts();
        return data;
      }
      throw new Error("Error actualizando producto.");
    } else {
      const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
      setProducts(updated);
      saveToLocalBackup("products", updated);
      appendToOfflineQueue("UPDATE_PRODUCT", { id, updates });
      return updated.find((p) => p.id === id);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (connectionMode === "ONLINE") {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchProducts();
        return true;
      }
      return false;
    } else {
      const updated = products.filter((p) => p.id !== id);
      setProducts(updated);
      saveToLocalBackup("products", updated);
      appendToOfflineQueue("DELETE_PRODUCT", { id });
      return true;
    }
  };

  const handleAddSupplier = async (supplierData: any) => {
    if (connectionMode === "ONLINE") {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierData),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchSuppliers();
        return data;
      }
      throw new Error("Error agregando distribuidor.");
    } else {
      const localSupplier: Supplier = {
        id: "s-local-" + Date.now(),
        ...supplierData
      };
      const updated = [...suppliers, localSupplier];
      setSuppliers(updated);
      saveToLocalBackup("suppliers", updated);
      alert("⚠️ Distribuidor registrado en base de datos local. Se sincronizará al conectar.");
      return localSupplier;
    }
  };

  const handleAddClient = async (clientData: any) => {
    if (connectionMode === "ONLINE") {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchClients();
        return data;
      }
      throw new Error("Error registrando cliente.");
    } else {
      const localClient: Client = {
        id: "cl-local-" + Date.now(),
        balance: 0,
        ...clientData
      };
      const updated = [...clients, localClient];
      setClients(updated);
      saveToLocalBackup("clients", updated);
      appendToOfflineQueue("ADD_CLIENT", clientData);
      return localClient;
    }
  };

  const handleRegisterAbono = async (clientId: string, amount: number, description: string) => {
    if (connectionMode === "ONLINE") {
      const res = await fetch(`/api/clients/${clientId}/abono`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchClients();
        return data;
      }
      throw new Error("Error registrando abono en cuenta.");
    } else {
      const updated = clients.map((c) => {
        if (c.id === clientId) {
          return { ...c, balance: Math.max(0, c.balance - amount) };
        }
        return c;
      });
      setClients(updated);
      saveToLocalBackup("clients", updated);
      appendToOfflineQueue("REGISTER_ABONO", { clientId, amount, description });
      return { client: updated.find((c) => c.id === clientId) };
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab("VENTAS");
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Helper stats for widgets
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const totalReceivables = clients.filter((c) => c.id !== "cl-3" && c.id !== "cl-local-3").reduce((acc, c) => acc + c.balance, 0);
  const totalSalesToday = sales.filter((s) => s.status === "COMPLETED" && new Date(s.timestamp).toDateString() === new Date().toDateString()).reduce((acc, s) => acc + s.total, 0);

  // Get active list of giros including custom ones
  const customGirosString = localStorage.getItem("jjm_custom_giros");
  const parsedCustomGiros = customGirosString ? JSON.parse(customGirosString) : [];
  const defaultGirosNames = [
    "Miscelánea (Abarrotes)",
    "Papelería Escolar",
    "Panadería Tradicional",
    "Carnicería / Pollería",
    "Farmacia Local",
    "Minisuper Familiar"
  ];
  const allGirosNames = [...defaultGirosNames, ...parsedCustomGiros.map((g: any) => g.name)];

  return (
    <div id="dashboard-app-shell" className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      
      {/* PROFESSIONAL EXECUTIVE GLASSMORPHIC HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-6 py-3 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4.5 w-full xl:w-auto justify-between sm:justify-start">
          <Logo className="h-11 w-auto" />
          
          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4.5 w-full sm:w-auto">
            {/* GIRO SELECTOR DROPDOWN */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <Store className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
                value={user.giro}
                onChange={(e) => handleSwitchGiro(e.target.value)}
              >
                {allGirosNames.map((name) => (
                  <option key={name} value={name} className="bg-white text-slate-800 font-bold">
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CONNECTION & NETWORK CONTROLLER HUB */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200/50 p-1.5 rounded-2xl shadow-sm">
          {/* Status signal lights */}
          <div className="flex items-center gap-2 px-3">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionMode === "ONLINE" ? "bg-emerald-400" : "bg-amber-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionMode === "ONLINE" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {connectionMode === "ONLINE" ? "Terminal Online" : "Terminal Local Offline"}
            </span>
          </div>

          {/* Connection manual toggle switch */}
          <div className="flex bg-white border border-slate-200/60 rounded-xl p-0.5">
            <button
              onClick={() => {
                if (offlineQueue.length > 0 && connectionMode === "ONLINE") {
                  if (!confirm("⚠️ Al forzar modo local, las transacciones pendientes seguirán en cola hasta volver a sincronizar.")) return;
                }
                setConnectionMode("ONLINE");
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                connectionMode === "ONLINE" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Wifi className="h-3.5 w-3.5" /> Nube
            </button>
            <button
              onClick={() => setConnectionMode("LOCAL")}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                connectionMode === "LOCAL" ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <WifiOff className="h-3.5 w-3.5" /> Local
            </button>
          </div>

          {/* Pending Sync indicators */}
          {offlineQueue.length > 0 && (
            <button
              onClick={handleSyncQueue}
              disabled={connectionMode === "LOCAL" || isSyncing}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                connectionMode === "LOCAL"
                  ? "bg-amber-100 text-amber-800 border border-amber-200/50 cursor-not-allowed"
                  : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200 animate-pulse"
              }`}
              title={connectionMode === "LOCAL" ? "Active conexión a Nube para sincronizar" : "Presione para sincronizar ahora"}
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "3s" }} />
              {offlineQueue.length} por Sincronizar
            </button>
          )}
        </div>

        {/* GLOBAL TAB NAVIGATOR */}
        <div className="flex flex-wrap gap-1 bg-slate-100 border border-slate-200/40 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab("VENTAS")}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === "VENTAS" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/20" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> Caja POS
          </button>

          {user.role !== "CAJERO" && (
            <>
              <button
                onClick={() => setActiveTab("INVENTARIO")}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  activeTab === "INVENTARIO" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/20" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="h-4 w-4" /> Inventario
              </button>
              <button
                onClick={() => setActiveTab("CLIENTES")}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  activeTab === "CLIENTES" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/20" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="h-4 w-4" /> Crédito Fiado
              </button>
              <button
                onClick={() => setActiveTab("FACTURACION")}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  activeTab === "FACTURACION" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/20" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="h-4 w-4" /> Facturas SAT
              </button>
              <button
                onClick={() => setActiveTab("IA")}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  activeTab === "IA" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/20" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Brain className="h-4 w-4 text-indigo-600" /> Consultor IA
              </button>
            </>
          )}
        </div>

        {/* ACTIVE USER SESSION PROFILES */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="font-bold text-slate-900 text-xs truncate max-w-[125px]">{user.username}</p>
            </div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-0.5">{user.role}</p>
          </div>

          <button
            onClick={handleLogout}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200/60"
            title="Cerrar Sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Connection status notice bar if local offline is on */}
        {connectionMode === "LOCAL" && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                <WifiOff className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h5 className="font-extrabold text-amber-900 text-xs">Modo Local Protegido (Trabajando Sin Conexión)</h5>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Su terminal POS está operando en aislamiento seguro. Las ventas, egresos y clientes se respaldan de forma inmediata en el almacenamiento físico local de este dispositivo. Puede seguir vendiendo con normalidad.
                </p>
              </div>
            </div>
            {offlineQueue.length > 0 && (
              <span className="bg-amber-150 text-amber-900 text-[10px] font-black px-3 py-1.5 rounded-xl border border-amber-300/30 shrink-0">
                {offlineQueue.length} Transacciones en Espera
              </span>
            )}
          </div>
        )}

        {/* TOP LEVEL HIGHLIGHT STATS */}
        {user.role !== "CAJERO" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Ventas de Hoy</span>
                <p className="text-base font-black text-slate-900 font-mono">${totalSalesToday.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Cuentas Fiadas Activas</span>
                <p className="text-base font-black text-rose-700 font-mono">${totalReceivables.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Alertas de Stock</span>
                <p className={`text-base font-black font-mono ${lowStockCount > 0 ? "text-amber-600 animate-pulse" : "text-slate-900"}`}>
                  {lowStockCount} Alerta{lowStockCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Servicio Inteligente</span>
                <p className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> IA Multigiro Lista
                </p>
              </div>
            </div>

          </div>
        )}

        {/* MAIN MODULE ROUTERS */}
        <div className="w-full">
          {activeTab === "VENTAS" && (
            <SalesRegister
              products={products}
              clients={clients}
              activeSession={activeSession}
              onOpenSession={handleOpenSession}
              onCloseSession={handleCloseSession}
              onAddSale={handleAddSale}
              onRefreshClients={connectionMode === "ONLINE" ? fetchClients : loadFromLocalBackup}
              onRefreshProducts={connectionMode === "ONLINE" ? fetchProducts : loadFromLocalBackup}
              giro={user.giro}
            />
          )}

          {activeTab === "INVENTARIO" && (
            <InventoryManager
              products={products}
              suppliers={suppliers}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddSupplier={handleAddSupplier}
              onRefreshProducts={connectionMode === "ONLINE" ? fetchProducts : loadFromLocalBackup}
              onRefreshSuppliers={connectionMode === "ONLINE" ? fetchSuppliers : loadFromLocalBackup}
            />
          )}

          {activeTab === "CLIENTES" && (
            <ClientManager
              clients={clients}
              onAddClient={handleAddClient}
              onRegisterAbono={handleRegisterAbono}
              onRefreshClients={connectionMode === "ONLINE" ? fetchClients : loadFromLocalBackup}
            />
          )}

          {activeTab === "FACTURACION" && <InvoicingModule sales={sales} clients={clients} />}

          {activeTab === "IA" && (
            <AIPanel
              products={products}
              activeSession={activeSession}
              giro={user.giro}
            />
          )}
        </div>
      </main>

      {/* CORE BRANDING FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-[10px] text-slate-400 mt-12 space-y-1">
        <p className="font-extrabold text-slate-500">JJM Tecnologías Innovadoras S.A. de C.V. • Terminal POS Multigiro Segura, Autónoma e Inteligente</p>
        <p>Cumplimiento Estricto de Regulaciones de Facturación CFDI 4.0 del Servicio de Administración Tributaria (SAT)</p>
      </footer>

      {/* SEQUENTIAL PROGRESS OVERLAY FOR ONLINE CLOUD SYNCING */}
      {isSyncing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl">
            <div className="relative mx-auto h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <FolderSync className="h-8 w-8 text-indigo-400 animate-pulse" />
              {/* Outer orbit loader */}
              <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" style={{ animationDuration: "1s" }} />
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-white text-base">Sincronizando Terminal POS</h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Transmitiendo de forma secuencial y segura las ventas y arqueos realizados localmente hacia la nube fiscal.
              </p>
            </div>

            {/* Micro progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>{syncStatusText}</span>
                <span>{syncProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850 p-0.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>

            <p className="text-[9px] font-mono text-slate-500">
              Por favor, no cierre esta pestaña mientras se consolida la sincronización.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
