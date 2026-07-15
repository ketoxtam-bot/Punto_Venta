/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Package,
  Plus,
  AlertTriangle,
  Users,
  Search,
  ShoppingCart,
  TrendingUp,
  X,
  Check,
  Edit2,
  Trash2,
  ListFilter
} from "lucide-react";
import { Product, Supplier } from "../types";

interface InventoryManagerProps {
  products: Product[];
  suppliers: Supplier[];
  onAddProduct: (product: any) => Promise<Product>;
  onUpdateProduct: (id: string, updates: any) => Promise<Product>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onAddSupplier: (supplier: any) => Promise<Supplier>;
  onRefreshProducts: () => void;
  onRefreshSuppliers: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  suppliers,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddSupplier,
  onRefreshProducts,
  onRefreshSuppliers,
}) => {
  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "SUPPLIERS" | "PURCHASES">("PRODUCTS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");

  // Add Product Form State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [unit, setUnit] = useState<"pza" | "kg" | "g" | "m" | "l">("pza");
  const [taxType, setTaxType] = useState<"IVA_16" | "IVA_0" | "IEPS_8" | "EXENTO">("IVA_16");
  const [category, setCategory] = useState("");
  const [productImages, setProductImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");

  // Add Supplier Form State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supRfc, setSupRfc] = useState("");
  const [supEmail, setSupEmail] = useState("");

  // Purchase merchandise State
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [purchaseBasket, setPurchaseBasket] = useState<{ productId: string; quantity: number; cost: number }[]>([]);

  // Category list derived from products
  const categories = ["TODOS", ...Array.from(new Set(products.map((p) => p.category)))];

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !price || !cost || !stock || !minStock || !category) {
      alert("Por favor rellene todos los campos requeridos.");
      return;
    }

    const payload = {
      code,
      name,
      price: Number(price),
      cost: Number(cost),
      stock: Number(stock),
      minStock: Number(minStock),
      unit,
      taxType,
      category,
      images: productImages,
    };

    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, payload);
      } else {
        await onAddProduct(payload);
      }
      onRefreshProducts();
      setShowAddProductModal(false);
      resetProductForm();
    } catch (err) {
      alert("Error al guardar el producto.");
    }
  };

  const handleEditProductClick = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setPrice(p.price.toString());
    setCost(p.cost.toString());
    setStock(p.stock.toString());
    setMinStock(p.minStock.toString());
    setUnit(p.unit);
    setTaxType(p.taxType);
    setCategory(p.category);
    setProductImages(p.images || []);
    setImageUrlInput("");
    setShowAddProductModal(true);
  };

  const handleDeleteProductClick = async (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar este producto del catálogo?")) {
      await onDeleteProduct(id);
      onRefreshProducts();
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setCode("");
    setName("");
    setPrice("");
    setCost("");
    setStock("");
    setMinStock("");
    setUnit("pza");
    setTaxType("IVA_16");
    setCategory("");
    setProductImages([]);
    setImageUrlInput("");
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supContact || !supPhone || !supRfc) {
      alert("Por favor rellene todos los campos.");
      return;
    }

    const payload = {
      name: supName,
      contact: supContact,
      phone: supPhone,
      rfc: supRfc,
      email: supEmail,
    };

    try {
      await onAddSupplier(payload);
      onRefreshSuppliers();
      setShowAddSupplierModal(false);
      setSupName("");
      setSupContact("");
      setSupPhone("");
      setSupRfc("");
      setSupEmail("");
    } catch (err) {
      alert("Error al guardar el proveedor.");
    }
  };

  // Add Item to Purchase Basket
  const handleAddToPurchaseBasket = () => {
    if (!selectedProductId || !purchaseQty || !purchaseCost) {
      alert("Complete el producto, cantidad y costo de adquisición.");
      return;
    }

    const existing = purchaseBasket.find((item) => item.productId === selectedProductId);
    if (existing) {
      alert("Este producto ya está en la orden de compra. Modifíquelo o elimínelo.");
      return;
    }

    setPurchaseBasket([
      ...purchaseBasket,
      {
        productId: selectedProductId,
        quantity: Number(purchaseQty),
        cost: Number(purchaseCost),
      },
    ]);

    setSelectedProductId("");
    setPurchaseQty("");
    setPurchaseCost("");
  };

  // Complete Order Purchase and Replenish Stock
  const handleCompletePurchase = async () => {
    if (!selectedSupplierId || purchaseBasket.length === 0) {
      alert("Seleccione un proveedor y agregue productos a la canasta.");
      return;
    }

    try {
      // Replenish stock on server side iteratively
      for (const item of purchaseBasket) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const updatedStock = prod.stock + item.quantity;
          // Sync cost to latest purchase price
          await onUpdateProduct(item.productId, {
            stock: updatedStock,
            cost: item.cost,
          });
        }
      }

      alert("✓ ¡Compra registrada! El stock se ha reabastecido en tiempo real.");
      onRefreshProducts();
      setPurchaseBasket([]);
      setSelectedSupplierId("");
      setShowPurchaseModal(false);
    } catch (err) {
      alert("Ocurrió un error al procesar las compras.");
    }
  };

  // Filters products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.includes(searchQuery);
    const matchesCategory = selectedCategory === "TODOS" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="inventory-manager-main" className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("PRODUCTS")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "PRODUCTS" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📦 Inventario de Productos
        </button>
        <button
          onClick={() => setActiveTab("SUPPLIERS")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "SUPPLIERS" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🚛 Proveedores Locales
        </button>
        <button
          onClick={() => setActiveTab("PURCHASES")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "PURCHASES" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📥 Compras de Mercancía (Reabastecer)
        </button>
      </div>

      {activeTab === "PRODUCTS" && (
        <div id="tab-inventory-products" className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
              <input
                id="search-product-inventory"
                type="text"
                placeholder="Buscar por nombre o código de barras..."
                className="w-full bg-slate-50 pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <ListFilter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  id="select-category-filter"
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <button
                id="btn-agregar-producto-modal"
                onClick={() => {
                  resetProductForm();
                  setShowAddProductModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors ml-auto md:ml-0"
              >
                <Plus className="h-4 w-4" /> Registrar Producto
              </button>
            </div>
          </div>

          {/* Warning Stock Threshold banner */}
          {products.some((p) => p.stock <= p.minStock) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs font-medium">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">¡Alerta de Desabasto!</span> Hay productos con existencias por debajo del stock mínimo. Esto afectará sus ventas pronto si no realiza compras. Use el módulo de IA para predecir cuándo se agotarán.
              </div>
            </div>
          )}

          {/* Products Catalog Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Cód. SAT / Barras</th>
                  <th className="py-3 px-4">Nombre del Producto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Costo Adq.</th>
                  <th className="py-3 px-4">P. Venta</th>
                  <th className="py-3 px-4 text-center">Existencias</th>
                  <th className="py-3 px-4">Impuesto</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{p.code}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.images && p.images.length > 0 ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-250 shrink-0 bg-slate-50 shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                            <Package className="h-5 w-5 stroke-1" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400">Unidad: {p.unit}</p>
                          {p.isCompound && (
                            <span className="bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0.2 rounded font-black uppercase mt-1 inline-block">
                              Paquete Compuesto
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{p.category}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">${p.cost.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">${p.price.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-1 rounded-md ${
                          p.stock <= p.minStock
                            ? "bg-rose-100 text-rose-800"
                            : p.stock <= p.minStock * 1.5
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        {p.taxType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditProductClick(p)}
                          className="text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-slate-100"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProductClick(p.id)}
                          className="text-slate-500 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "SUPPLIERS" && (
        <div id="tab-inventory-suppliers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Directorio de Distribuidores</h3>
            <button
              id="btn-agregar-proveedor-modal"
              onClick={() => setShowAddSupplierModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" /> Agregar Proveedor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">RFC: {s.rfc}</p>
                </div>
                <div className="text-xs text-slate-600 space-y-1.5">
                  <p>
                    <span className="font-semibold text-slate-400 text-[10px] uppercase block">Contacto</span>
                    {s.contact}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400 text-[10px] uppercase block">Teléfono</span>
                    {s.phone}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400 text-[10px] uppercase block">Correo Electrónico</span>
                    {s.email || "No registrado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "PURCHASES" && (
        <div id="tab-inventory-purchases" className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Registrar Compra a Proveedor</h3>
              <p className="text-xs text-slate-500 mt-0.5">Capture facturas de proveedores locales para aumentar automáticamente el stock en tienda.</p>
            </div>
            <button
              id="btn-lanzar-compra"
              onClick={() => {
                setPurchaseBasket([]);
                setSelectedSupplierId(suppliers[0]?.id || "");
                setShowPurchaseModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
            >
              <ShoppingCart className="h-4 w-4" /> Nueva Orden de Entrada
            </button>
          </div>

          {/* Historical explanation / mock log */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs text-slate-600">
            <span className="font-bold text-slate-700">Flujo de Entrada de Mercancía:</span>
            <ul className="list-disc list-inside mt-1.5 space-y-1">
              <li>Mantiene cuadradas sus existencias físicas en el local.</li>
              <li>Actualiza dinámicamente los costos de adquisición para calcular correctamente los márgenes de ganancia e inflación vía IA.</li>
              <li>Facilita la auditoría interna de mermas o productos robados.</li>
            </ul>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-100 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? "Editar Datos del Producto" : "Registrar Nuevo Producto"}
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cód. SAT o Barras</label>
                  <input
                    id="input-product-code"
                    type="text"
                    required
                    placeholder="Ej. 75010111"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría</label>
                  <input
                    id="input-product-category"
                    type="text"
                    required
                    placeholder="Ej. Bebidas, Cuadernos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Comercial</label>
                <input
                  id="input-product-name"
                  type="text"
                  required
                  placeholder="Ej. Refresco de Cola Sabor Limón 355ml"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Costo Adquisición (Adq.)</label>
                  <input
                    id="input-product-cost"
                    type="number"
                    step="0.01"
                    required
                    placeholder="Precio compra sin IVA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Precio de Venta</label>
                  <input
                    id="input-product-price"
                    type="number"
                    step="0.01"
                    required
                    placeholder="Al público con impuestos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stock Actual</label>
                  <input
                    id="input-product-stock"
                    type="number"
                    required
                    placeholder="Ej. 100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    id="input-product-minstock"
                    type="number"
                    required
                    placeholder="Límite mínimo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidad Medida</label>
                  <select
                    id="select-product-unit"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                  >
                    <option value="pza">Pza (Pieza)</option>
                    <option value="kg">Kg (Kilogramo)</option>
                    <option value="g">g (Gramos)</option>
                    <option value="m">m (Metro)</option>
                    <option value="l">L (Litro)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Impuesto SAT México</label>
                  <select
                    id="select-product-taxtype"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value as any)}
                  >
                    <option value="IVA_16">IVA General 16%</option>
                    <option value="IVA_0">IVA Tasa 0% (Básicos/Medicinas)</option>
                    <option value="IEPS_8">IEPS 8% (Comida chatarra/Pan dulce)</option>
                    <option value="EXENTO">Exento</option>
                  </select>
                </div>
              </div>

              {/* Fotos del Producto */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">Fotos del Producto (Una o Más)</label>
                
                {/* Upload or URL selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Subir Imagen Local</span>
                    <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg py-2.5 px-3 bg-white hover:bg-blue-50/20 cursor-pointer transition-all">
                      <Plus className="h-4 w-4 text-blue-600 mb-0.5" />
                      <span className="text-[10px] font-semibold text-slate-600">Seleccionar Archivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            Array.from(files).forEach((file: any) => {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setProductImages((prev) => [...prev, event.target!.result as string]);
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Agregar URL de Imagen</span>
                      <div className="flex gap-1.5 mt-1">
                        <input
                          type="text"
                          placeholder="https://ejemplo.com/foto.jpg"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (imageUrlInput.trim()) {
                              setProductImages((prev) => [...prev, imageUrlInput.trim()]);
                              setImageUrlInput("");
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 rounded-lg text-[10px] transition-colors"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid of current product images */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {productImages.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No se han agregado fotos para este producto.</p>
                  ) : (
                    productImages.map((img, index) => (
                      <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 group bg-slate-50 shadow-sm">
                        <img
                          src={img}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setProductImages((prev) => prev.filter((_, i) => i !== index))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          title="Eliminar Foto"
                        >
                          <X className="h-4 w-4 text-rose-400" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-50"
                >
                  {editingProduct ? "Actualizar Cambios" : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">Registrar Nuevo Proveedor</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Razón Social / Nombre Comercial</label>
                <input
                  id="input-sup-name"
                  type="text"
                  required
                  placeholder="Ej. Sabritas Distribuidora S.A. de C.V."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">RFC Local</label>
                  <input
                    id="input-sup-rfc"
                    type="text"
                    required
                    placeholder="Ej. SDF120302KL8"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={supRfc}
                    onChange={(e) => setSupRfc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input
                    id="input-sup-phone"
                    type="text"
                    required
                    placeholder="Ej. 5512345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Asesor / Contacto</label>
                <input
                  id="input-sup-contact"
                  type="text"
                  required
                  placeholder="Ej. Lic. José Manuel"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Correo de Pedidos (Opcional)</label>
                <input
                  id="input-sup-email"
                  type="email"
                  placeholder="ejemplo@ventas.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-50"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT INVENTORY PURCHASE */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 border border-slate-100 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base">Registrar Entrada de Mercancía</h3>
              <button onClick={() => setShowPurchaseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Capture Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Proveedor</label>
                  <select
                    id="select-supplier-purchase"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                  >
                    <option value="">-- Proveedor Local --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Agregar Artículo</span>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Producto</label>
                      <select
                        id="select-product-purchase"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                        value={selectedProductId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedProductId(val);
                          const prod = products.find((p) => p.id === val);
                          if (prod) {
                            setPurchaseCost(prod.cost.toString());
                          }
                        }}
                      >
                        <option value="">-- Seleccionar --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Cantidad Entrada</label>
                        <input
                          id="input-purchase-qty"
                          type="number"
                          placeholder="0"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                          value={purchaseQty}
                          onChange={(e) => setPurchaseQty(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Costo Unitario ($)</label>
                        <input
                          id="input-purchase-cost"
                          type="number"
                          step="0.01"
                          placeholder="Costo compra"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                          value={purchaseCost}
                          onChange={(e) => setPurchaseCost(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddToPurchaseBasket}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Añadir a la Lista
                    </button>
                  </div>
                </div>
              </div>

              {/* Basket list summary */}
              <div className="flex flex-col justify-between border-l border-slate-100 pl-6">
                <div>
                  <span className="block text-xs font-bold text-slate-700 uppercase mb-2">Canasta de Compra</span>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-[180px] overflow-y-auto space-y-2">
                    {purchaseBasket.length === 0 ? (
                      <p className="text-[10px] text-slate-400 text-center py-8">La canasta está vacía.</p>
                    ) : (
                      purchaseBasket.map((item, i) => {
                        const prod = products.find((p) => p.id === item.productId);
                        return (
                          <div key={i} className="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                            <div>
                              <p className="font-bold text-slate-800">{prod?.name.slice(0, 20)}...</p>
                              <p className="text-[10px] text-slate-400">Qty: {item.quantity} x ${item.cost}</p>
                            </div>
                            <span className="font-mono font-bold">${(item.quantity * item.cost).toFixed(2)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>Monto Total Compra:</span>
                    <span className="font-mono text-blue-700">
                      ${purchaseBasket.reduce((acc, item) => acc + item.quantity * item.cost, 0).toFixed(2)} MXN
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPurchaseModal(false)}
                      className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCompletePurchase}
                      disabled={purchaseBasket.length === 0 || !selectedSupplierId}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                    >
                      Registrar Entrada
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
