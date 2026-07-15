/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { Product, Client, Sale, CashSession, Supplier, BusinessType } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK safely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Database JSON File Path
const DB_FILE = path.join(process.cwd(), "data_pos_store.json");

// Default Catalog generator for Mexican market based on BusinessType
function getDefaultProducts(business: BusinessType): Product[] {
  switch (business) {
    case "ABARROTES":
      return [
        { id: "ab-1", code: "75010001", name: "Refresco de Cola 355ml", price: 18.0, cost: 11.5, stock: 45, minStock: 15, unit: "pza", taxType: "IVA_16", category: "Bebidas", images: ["https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&auto=format&fit=crop&q=60"] },
        { id: "ab-2", code: "75010111", name: "Papas Fritas Saladas 45g", price: 19.5, cost: 13.0, stock: 32, minStock: 10, unit: "pza", taxType: "IEPS_8", category: "Botanas", images: ["https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=60"] },
        { id: "ab-3", code: "75010222", name: "Leche Entera Ultra Pasteurizada 1L", price: 27.0, cost: 22.0, stock: 24, minStock: 8, unit: "pza", taxType: "IVA_0", category: "Lácteos", images: ["https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=60"] },
        { id: "ab-4", code: "75010333", name: "Huevo Blanco Kg", price: 46.0, cost: 36.0, stock: 15, minStock: 5, unit: "kg", taxType: "IVA_0", category: "Básicos", images: ["https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=200&auto=format&fit=crop&q=60"] },
        { id: "ab-5", code: "75010444", name: "Frijoles Refritos Negros Isadora 430g", price: 22.0, cost: 15.5, stock: 20, minStock: 6, unit: "pza", taxType: "IVA_0", category: "Abarrotes", images: ["https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=200&auto=format&fit=crop&q=60"] },
        { id: "ab-6", code: "75010555", name: "Pan de Caja Blanco Bimbo Grande", price: 49.0, cost: 41.0, stock: 12, minStock: 4, unit: "pza", taxType: "IEPS_8", category: "Panadería", images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=60"] }
      ];
    case "PAPELERIA":
      return [
        { id: "pap-1", code: "75020001", name: "Libreta Profesional Scribe Raya", price: 35.0, cost: 21.0, stock: 80, minStock: 25, unit: "pza", taxType: "IVA_16", category: "Cuadernos", images: ["https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=200&auto=format&fit=crop&q=60"] },
        { id: "pap-2", code: "75020111", name: "Lápiz Grafito Mirado No. 2", price: 7.5, cost: 3.2, stock: 150, minStock: 30, unit: "pza", taxType: "IVA_16", category: "Escritura", images: ["https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=200&auto=format&fit=crop&q=60"] },
        { id: "pap-3", code: "75020222", name: "Caja Colores Prismacolor 12 piezas", price: 125.0, cost: 82.0, stock: 18, minStock: 5, unit: "pza", taxType: "IVA_16", category: "Arte", images: ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&auto=format&fit=crop&q=60"] },
        { id: "pap-4", code: "75020333", name: "Cartulina Blanca Standard", price: 6.0, cost: 2.2, stock: 90, minStock: 20, unit: "pza", taxType: "IVA_16", category: "Papeles", images: ["https://images.unsplash.com/photo-1603484477859-abe6a73f9366?w=200&auto=format&fit=crop&q=60"] },
        { id: "pap-5", code: "75020444", name: "Cinta Adhesiva Transparente Tuk", price: 18.0, cost: 10.5, stock: 25, minStock: 8, unit: "pza", taxType: "IVA_16", category: "Oficina", images: ["https://images.unsplash.com/photo-1601247076559-47aca7ff15e9?w=200&auto=format&fit=crop&q=60"] },
        { id: "pap-6", code: "comp-pap", name: "Paquete Escolar Básico Scribe", price: 150.0, cost: 100.0, stock: 15, minStock: 5, unit: "pza", taxType: "IVA_16", category: "Paquetes", isCompound: true, components: [{ productId: "pap-1", quantity: 3 }, { productId: "pap-2", quantity: 2 }, { productId: "pap-3", quantity: 1 }], images: ["https://images.unsplash.com/photo-1452860687264-0e90189878d8?w=200&auto=format&fit=crop&q=60"] }
      ];
    case "PANADERIA":
      return [
        { id: "pan-1", code: "1001", name: "Concha de Vainilla Tradicional", price: 12.0, cost: 5.5, stock: 50, minStock: 15, unit: "pza", taxType: "IEPS_8", category: "Pan Dulce", images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=60"] },
        { id: "pan-2", code: "1002", name: "Bolillo Caliente crujiente", price: 4.5, cost: 1.5, stock: 180, minStock: 40, unit: "pza", taxType: "IVA_0", category: "Pan Blanco", images: ["https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200&auto=format&fit=crop&q=60"] },
        { id: "pan-3", code: "1003", name: "Oreja de Hojaldre con Azúcar", price: 14.0, cost: 6.8, stock: 40, minStock: 12, unit: "pza", taxType: "IEPS_8", category: "Pan Dulce", images: ["https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=200&auto=format&fit=crop&q=60"] },
        { id: "pan-4", code: "1004", name: "Dona Espolvoreada de Chocolate", price: 13.5, cost: 6.0, stock: 45, minStock: 12, unit: "pza", taxType: "IEPS_8", category: "Pan Dulce", images: ["https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&auto=format&fit=crop&q=60"] },
        { id: "pan-5", code: "1005", name: "Cuerno de mantequilla", price: 13.0, cost: 6.2, stock: 35, minStock: 10, unit: "pza", taxType: "IEPS_8", category: "Pan Dulce", images: ["https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&auto=format&fit=crop&q=60"] },
        { id: "pan-6", code: "comp-pan", name: "Charola del Antojo (4 Conchas + 2 Donas)", price: 65.0, cost: 34.0, stock: 10, minStock: 3, unit: "pza", taxType: "IEPS_8", category: "Paquetes", isCompound: true, components: [{ productId: "pan-1", quantity: 4 }, { productId: "pan-4", quantity: 2 }], images: ["https://images.unsplash.com/photo-1517433456452-f9633a875f6f?w=200&auto=format&fit=crop&q=60"] }
      ];
    case "CARNICERIA":
      return [
        { id: "carn-1", code: "2001", name: "Bistec de Res Selecto Kg", price: 185.0, cost: 138.0, stock: 25.5, minStock: 8.0, unit: "kg", taxType: "IVA_0", category: "Res", images: ["https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=200&auto=format&fit=crop&q=60"] },
        { id: "carn-2", code: "2002", name: "Pechuga de Pollo Sin Hueso Kg", price: 115.0, cost: 84.0, stock: 30.0, minStock: 10.0, unit: "kg", taxType: "IVA_0", category: "Aves", images: ["https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&auto=format&fit=crop&q=60"] },
        { id: "carn-3", code: "2003", name: "Carne Molida de Res Kg", price: 145.0, cost: 110.0, stock: 18.0, minStock: 5.0, unit: "kg", taxType: "IVA_0", category: "Res", images: ["https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=200&auto=format&fit=crop&q=60"] },
        { id: "carn-4", code: "3001", name: "Jitomate Saladet de Primera", price: 32.0, cost: 16.5, stock: 40.0, minStock: 12.0, unit: "kg", taxType: "IVA_0", category: "Verduras", images: ["https://images.unsplash.com/photo-1595855759920-86582396756a?w=200&auto=format&fit=crop&q=60"] },
        { id: "carn-5", code: "3002", name: "Aguacate Hass Selecto", price: 85.0, cost: 52.0, stock: 15.0, minStock: 5.0, unit: "kg", taxType: "IVA_0", category: "Frutas", images: ["https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&auto=format&fit=crop&q=60"] }
      ];
    case "FARMACIA":
      return [
        { id: "farm-1", code: "75030001", name: "Paracetamol 500mg Caja c/20 Tabletas", price: 24.5, cost: 6.2, stock: 65, minStock: 15, unit: "pza", taxType: "IVA_0", category: "Analgesicos", images: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=60"] },
        { id: "farm-2", code: "75030111", name: "Loratadina 10mg Caja c/10 Tabletas", price: 45.0, cost: 12.5, stock: 40, minStock: 10, unit: "pza", taxType: "IVA_0", category: "Antialergicos", images: ["https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=60"] },
        { id: "farm-3", code: "75030222", name: "Alcohol Etílico Desnaturalizado Jaloma 250ml", price: 34.0, cost: 18.0, stock: 30, minStock: 8, unit: "pza", taxType: "IVA_16", category: "Material Curacion", images: ["https://images.unsplash.com/photo-1607619056574-7b8d304f3cbd?w=200&auto=format&fit=crop&q=60"] },
        { id: "farm-4", code: "75030333", name: "Gasas Estériles Jaloma 10x10cm c/10", price: 42.0, cost: 22.0, stock: 35, minStock: 10, unit: "pza", taxType: "IVA_16", category: "Material Curacion", images: ["https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=200&auto=format&fit=crop&q=60"] },
        { id: "farm-5", code: "75030444", name: "Geles Desinfectante Antibacterial 500ml", price: 38.0, cost: 19.5, stock: 24, minStock: 6, unit: "pza", taxType: "IVA_16", category: "Higiene", images: ["https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=200&auto=format&fit=crop&q=60"] }
      ];
    case "MINISUPER":
    default:
      return [
        { id: "ms-1", code: "75040001", name: "Aceite Vegetal Comestible Nutrioli 850ml", price: 43.0, cost: 31.5, stock: 35, minStock: 10, unit: "pza", taxType: "IVA_0", category: "Abarrotes", images: ["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=60"] },
        { id: "ms-2", code: "75040111", name: "Arroz Súper Extra Valle Verde 1Kg", price: 32.5, cost: 22.0, stock: 40, minStock: 12, unit: "pza", taxType: "IVA_0", category: "Abarrotes", images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop&q=60"] },
        { id: "ms-3", code: "75040222", name: "Detergente en Polvo Multiusos Ariel 1Kg", price: 54.0, cost: 41.0, stock: 20, minStock: 6, unit: "pza", taxType: "IVA_16", category: "Limpieza", images: ["https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=200&auto=format&fit=crop&q=60"] },
        { id: "ms-4", code: "75040333", name: "Atún en Agua Herdez 130g", price: 21.5, cost: 14.5, stock: 55, minStock: 15, unit: "pza", taxType: "IVA_0", category: "Enlatados", images: ["https://images.unsplash.com/photo-1534482421-64566f976cfa?w=200&auto=format&fit=crop&q=60"] },
        { id: "ms-5", code: "75040444", name: "Café Soluble Nescafé Clásico 120g", price: 89.0, cost: 68.0, stock: 15, minStock: 5, unit: "pza", taxType: "IVA_0", category: "Desayuno", images: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=60"] },
        { id: "ms-6", code: "75040555", name: "Jabón de Tocador Palmolive Neutro 120g", price: 18.5, cost: 12.0, stock: 50, minStock: 15, unit: "pza", taxType: "IVA_16", category: "Higiene", images: ["https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=200&auto=format&fit=crop&q=60"] }
      ];
  }
}

// Initial default state
let dbState = {
  currentGiro: "ABARROTES" as BusinessType,
  products: getDefaultProducts("ABARROTES"),
  clients: [
    { id: "cl-1", name: "Don Pedro López (Crédito Fijo)", rfc: "XAXX010101000", email: "pedro.lopez@gmail.com", creditLimit: 2000, balance: 450, phone: "5512345678" },
    { id: "cl-2", name: "Doña Martha González", rfc: "GOMM850402AB3", email: "martha.g@hotmail.com", creditLimit: 1000, balance: 120, phone: "5587654321" },
    { id: "cl-3", name: "Público en General", rfc: "XAXX010101000", email: "", creditLimit: 0, balance: 0, phone: "" }
  ] as Client[],
  sales: [] as Sale[],
  sessions: [
    {
      id: "sess-1",
      userId: "user-1",
      userName: "Cajero Principal",
      openingTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      openingBalance: 1000.0,
      status: "OPEN",
      salesCount: 0,
      salesTotal: 0,
      cashSales: 0,
      cardSales: 0,
      speiSales: 0,
    }
  ] as CashSession[],
  suppliers: [
    { id: "sup-1", name: "Distribuidora de la Central de Abastos S.A.", contact: "Ing. Arturo Mendoza", phone: "5523456789", rfc: "DCA100412MN1", email: "ventas@centraldist.com.mx" },
    { id: "sup-2", name: "Papelera y Proveedora del Centro", contact: "Lic. Clara Gómez", phone: "5534567890", rfc: "PPC950201AA2", email: "contacto@papeleracentro.com" },
    { id: "sup-3", name: "Harinas y Materias Primas Elizondo", contact: "Don Roberto Elizondo", phone: "5545678901", rfc: "HMP780512KL9", email: "roberto@elizondomate.com.mx" }
  ] as Supplier[],
  creditPayments: [] as { id: string; clientId: string; amount: number; timestamp: string; type: "CARGO" | "ABONO"; description: string }[]
};

// Load database from file if exists
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const loaded = JSON.parse(data);
      dbState = { ...dbState, ...loaded };
      console.log("Database loaded from persistent file:", DB_FILE);
    } else {
      saveDatabase();
    }
  } catch (error) {
    console.error("Error loading database file, using in-memory defaults:", error);
  }
}

// Save database to file
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

loadDatabase();

// --- REST API ENDPOINTS ---

// Check Status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", giro: dbState.currentGiro, apiKeyConfigured: !!apiKey });
});

// Configure Business Giro
app.post("/api/giro", (req, res) => {
  const { giro, customProducts } = req.body;
  if (!giro) {
    return res.status(400).json({ error: "Giro field is required" });
  }
  dbState.currentGiro = giro as any;
  if (customProducts && Array.isArray(customProducts)) {
    dbState.products = customProducts;
  } else {
    dbState.products = getDefaultProducts(giro as any);
  }
  // Reset sessions and sales to prevent conflict for demo
  dbState.sales = [];
  dbState.sessions = [
    {
      id: "sess-" + Date.now(),
      userId: "user-1",
      userName: "Cajero Principal",
      openingTime: new Date().toISOString(),
      openingBalance: 1000.0,
      status: "OPEN",
      salesCount: 0,
      salesTotal: 0,
      cashSales: 0,
      cardSales: 0,
      speiSales: 0,
    }
  ];
  dbState.creditPayments = [];
  // Reset client balances but keep clients
  dbState.clients.forEach(c => c.balance = c.id === "cl-1" ? 450 : c.id === "cl-2" ? 120 : 0);
  saveDatabase();
  res.json({ message: "Business Giro adapted successfully", giro, products: dbState.products });
});

// Generate starter products for a custom business sector using AI
app.post("/api/ia/generar-giro", async (req, res) => {
  const { giroName, giroDesc } = req.body;
  if (!giroName) {
    return res.status(400).json({ error: "giroName is required" });
  }

  const systemPrompt = `Eres un consultor experto en el SAT y comercio minorista en México.
Tu tarea es generar un catálogo inicial de exactamente 6 productos representativos para un negocio del giro: "${giroName}" (Descripción: "${giroDesc || ''}").
Los productos deben ser realistas para el mercado de México.
Debes devolver estrictamente un arreglo JSON de objetos que cumplan exactamente con la interfaz Product en TypeScript:
interface Product {
  id: string; // ej. "p-cust-1"
  code: string; // código de barras numérico realista de 8 u 13 dígitos, ej. "7501234567890"
  name: string; // Nombre del producto con marca realista mexicana, ej. "Martillo de Uña Truper 16oz"
  price: number; // Precio al público realista en MXN (con IVA/IEPS incluido)
  cost: number; // Costo de adquisición realista (menor al precio, ej. un 30% a 40% menor)
  stock: number; // Cantidad inicial, ej. entre 15 y 50
  minStock: number; // Stock mínimo, ej. entre 5 y 10
  unit: "pza" | "kg" | "g" | "m" | "l"; // Unidad de medida
  taxType: "IVA_16" | "IVA_0" | "IEPS_8" | "EXENTO"; // Tipo de impuesto SAT aplicable en México
  category: string; // Categoría lógica del producto, ej. "Herramientas"
  images: string[]; // Un arreglo con exactamente una URL de imagen real y de alta resolución de Unsplash que coincida con el tipo de producto (ej. https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=200&auto=format&fit=crop&q=60)
}
No incluyas explicaciones en texto plano, devuelve solo el arreglo JSON válido.`;

  const userPrompt = `Genera el catálogo de inicio para: ${giroName}`;

  try {
    if (ai) {
      const jsonResponseText = await callGemini(systemPrompt, userPrompt);
      // Clean possible markdown code blocks
      const cleanJson = jsonResponseText.replace(/```json|```/g, "").replace(/```/g, "").trim();
      const products = JSON.parse(cleanJson);
      res.json(products);
    } else {
      // Fallback starter products if Gemini is not configured
      const fallbackProducts = [
        { id: "cust-1", code: "75099901", name: `${giroName} - Producto General A`, price: 50.0, cost: 35.0, stock: 20, minStock: 5, unit: "pza", taxType: "IVA_16", category: "General", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=60"] },
        { id: "cust-2", code: "75099902", name: `${giroName} - Producto General B`, price: 120.0, cost: 80.0, stock: 15, minStock: 4, unit: "pza", taxType: "IVA_16", category: "General", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60"] },
        { id: "cust-3", code: "75099903", name: `${giroName} - Premium C`, price: 250.0, cost: 170.0, stock: 10, minStock: 2, unit: "pza", taxType: "IVA_16", category: "Premium", images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=60"] },
        { id: "cust-4", code: "75099904", name: `${giroName} - Económico D`, price: 15.0, cost: 9.5, stock: 50, minStock: 10, unit: "pza", taxType: "IVA_16", category: "Económico", images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=60"] },
        { id: "cust-5", code: "75099905", name: `${giroName} - Servicio E`, price: 80.0, cost: 40.0, stock: 30, minStock: 5, unit: "pza", taxType: "EXENTO", category: "Servicios", images: ["https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&auto=format&fit=crop&q=60"] },
        { id: "cust-6", code: "75099906", name: `${giroName} - Granel F`, price: 45.0, cost: 30.0, stock: 40, minStock: 10, unit: "kg", taxType: "IVA_0", category: "Granel", images: ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=60"] }
      ];
      res.json(fallbackProducts);
    }
  } catch (error: any) {
    console.error("Error generating custom giro products:", error);
    // Return high quality fallback
    const fallbackProducts = [
      { id: "cust-1", code: "75099901", name: `${giroName} - Producto General A`, price: 50.0, cost: 35.0, stock: 20, minStock: 5, unit: "pza", taxType: "IVA_16", category: "General", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=60"] },
      { id: "cust-2", code: "75099902", name: `${giroName} - Producto General B`, price: 120.0, cost: 80.0, stock: 15, minStock: 4, unit: "pza", taxType: "IVA_16", category: "General", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60"] },
      { id: "cust-3", code: "75099903", name: `${giroName} - Premium C`, price: 250.0, cost: 170.0, stock: 10, minStock: 2, unit: "pza", taxType: "IVA_16", category: "Premium", images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=60"] },
      { id: "cust-4", code: "75099904", name: `${giroName} - Económico D`, price: 15.0, cost: 9.5, stock: 50, minStock: 10, unit: "pza", taxType: "IVA_16", category: "Económico", images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&auto=format&fit=crop&q=60"] },
      { id: "cust-5", code: "75099905", name: `${giroName} - Servicio E`, price: 80.0, cost: 40.0, stock: 30, minStock: 5, unit: "pza", taxType: "EXENTO", category: "Servicios", images: ["https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&auto=format&fit=crop&q=60"] },
      { id: "cust-6", code: "75099906", name: `${giroName} - Granel F`, price: 45.0, cost: 30.0, stock: 40, minStock: 10, unit: "kg", taxType: "IVA_0", category: "Granel", images: ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=60"] }
    ];
    res.json(fallbackProducts);
  }
});

// GET configuration
app.get("/api/config", (req, res) => {
  res.json({
    giro: dbState.currentGiro,
    apiKeyConfigured: !!apiKey
  });
});

// PRODUCTS ENDPOINTS
app.get("/api/products", (req, res) => {
  res.json(dbState.products);
});

app.post("/api/products", (req, res) => {
  const product = req.body;
  product.id = "p-" + Date.now();
  dbState.products.push(product);
  saveDatabase();
  res.status(201).json(product);
});

app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const index = dbState.products.findIndex((p) => p.id === id);
  if (index !== -1) {
    dbState.products[index] = { ...dbState.products[index], ...req.body };
    saveDatabase();
    res.json(dbState.products[index]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  dbState.products = dbState.products.filter((p) => p.id !== id);
  saveDatabase();
  res.json({ success: true });
});

// CLIENTS ENDPOINTS
app.get("/api/clients", (req, res) => {
  res.json(dbState.clients);
});

app.post("/api/clients", (req, res) => {
  const client = req.body;
  client.id = "c-" + Date.now();
  client.balance = 0;
  dbState.clients.push(client);
  saveDatabase();
  res.status(201).json(client);
});

app.post("/api/clients/:id/abono", (req, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  const client = dbState.clients.find((c) => c.id === id);
  if (client) {
    client.balance = Math.max(0, client.balance - Number(amount));
    const pay = {
      id: "cp-" + Date.now(),
      clientId: id,
      amount: Number(amount),
      timestamp: new Date().toISOString(),
      type: "ABONO" as const,
      description: description || "Abono a cuenta de crédito"
    };
    dbState.creditPayments.push(pay);
    saveDatabase();
    res.json({ client, payment: pay });
  } else {
    res.status(404).json({ error: "Client not found" });
  }
});

app.get("/api/clients/payments", (req, res) => {
  res.json(dbState.creditPayments);
});

// SUPPLIERS
app.get("/api/suppliers", (req, res) => {
  res.json(dbState.suppliers);
});

app.post("/api/suppliers", (req, res) => {
  const supplier = req.body;
  supplier.id = "s-" + Date.now();
  dbState.suppliers.push(supplier);
  saveDatabase();
  res.status(201).json(supplier);
});

// SESSIONS ENDPOINTS (Cash Register)
app.get("/api/sessions", (req, res) => {
  res.json(dbState.sessions);
});

app.post("/api/sessions/open", (req, res) => {
  const { openingBalance, userName } = req.body;
  // Close any open sessions first
  dbState.sessions.forEach((s) => {
    if (s.status === "OPEN") {
      s.status = "CLOSED";
      s.closingTime = new Date().toISOString();
      s.closingBalance = s.openingBalance + s.salesTotal;
    }
  });

  const session: CashSession = {
    id: "sess-" + Date.now(),
    userId: "user-1",
    userName: userName || "Cajero Principal",
    openingTime: new Date().toISOString(),
    openingBalance: Number(openingBalance) || 0,
    status: "OPEN",
    salesCount: 0,
    salesTotal: 0,
    cashSales: 0,
    cardSales: 0,
    speiSales: 0,
  };
  dbState.sessions.push(session);
  saveDatabase();
  res.status(201).json(session);
});

app.post("/api/sessions/close/:id", (req, res) => {
  const { id } = req.params;
  const { realCashCollected } = req.body;
  const session = dbState.sessions.find((s) => s.id === id);
  if (session) {
    session.status = "CLOSED";
    session.closingTime = new Date().toISOString();
    session.closingBalance = session.openingBalance + session.cashSales; // Cash flow closing
    session.realCashCollected = Number(realCashCollected);
    saveDatabase();
    res.json(session);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// SALES (TICKETS) ENDPOINTS
app.get("/api/sales", (req, res) => {
  res.json(dbState.sales);
});

app.post("/api/sales", (req, res) => {
  const { items, paymentMethod, amountPaid, change, clientId, cajero } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items in ticket" });
  }

  // Calculate subtotals, taxes based on Mexican regulations (IVA 16%, IEPS 8%, etc.)
  let subtotal = 0;
  let taxes = 0;
  let total = 0;

  const resolvedItems = items.map((item: any) => {
    const product = dbState.products.find((p) => p.id === item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }

    // Deduct stock
    product.stock = Math.max(0, product.stock - item.quantity);

    const price = product.price;
    const itemTotal = price * item.quantity;
    total += itemTotal;

    // Calculate individual tax
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
      price: price
    };
  });

  // Handle client credit ("Fiado")
  if (clientId && paymentMethod === "SPEI" && clientId !== "cl-3") {
    // SPEI can be SPEI or custom "Fiado" as requested
    // Let's check if the client chose "FIADO" (represented in paymentMethod or structured)
  }

  // If the customer used "Fiado" (which we will mark specially or if they selected an active client to accumulate balance)
  let actualPaymentMethod = paymentMethod;
  if (clientId && clientId !== "cl-3" && req.body.isFiado) {
    const client = dbState.clients.find((c) => c.id === clientId);
    if (client) {
      // Check credit limit
      if (client.balance + total > client.creditLimit) {
        return res.status(400).json({ error: `Límite de crédito excedido. Límite: $${client.creditLimit}, Saldo actual: $${client.balance}` });
      }
      client.balance += total;
      // Add a cargo history
      dbState.creditPayments.push({
        id: "cp-" + Date.now(),
        clientId: client.id,
        amount: total,
        timestamp: new Date().toISOString(),
        type: "CARGO",
        description: `Compra fiada - Ticket #${dbState.sales.length + 1001}`
      });
    }
    actualPaymentMethod = "SPEI"; // Map fiado under accounts receivable / transfer tracking
  }

  // Find active cash session
  const activeSession = dbState.sessions.find((s) => s.status === "OPEN");
  if (activeSession) {
    activeSession.salesCount += 1;
    activeSession.salesTotal += total;
    if (actualPaymentMethod === "EFECTIVO") activeSession.cashSales += total;
    if (actualPaymentMethod === "TARJETA") activeSession.cardSales += total;
    if (actualPaymentMethod === "SPEI") activeSession.speiSales += total;
  }

  const newSale: Sale = {
    id: "sale-" + Date.now(),
    ticketNumber: (dbState.sales.length + 1001).toString(),
    items: resolvedItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxes: Number(taxes.toFixed(2)),
    total: Number(total.toFixed(2)),
    paymentMethod: actualPaymentMethod,
    amountPaid: Number(amountPaid) || total,
    change: Number(change) || 0,
    timestamp: new Date().toISOString(),
    status: "COMPLETED",
    cajero: cajero || "Cajero Principal"
  };

  dbState.sales.push(newSale);
  saveDatabase();
  res.status(201).json(newSale);
});

// Cancel Sale
app.post("/api/sales/cancel/:id", (req, res) => {
  const { id } = req.params;
  const sale = dbState.sales.find((s) => s.id === id);
  if (sale && sale.status === "COMPLETED") {
    sale.status = "CANCELLED";

    // Restore stock
    sale.items.forEach((item) => {
      const product = dbState.products.find((p) => p.id === item.product.id);
      if (product) {
        product.stock += item.quantity;
      }
    });

    // Deduct from session
    const activeSession = dbState.sessions.find((s) => s.status === "OPEN");
    if (activeSession) {
      activeSession.salesCount = Math.max(0, activeSession.salesCount - 1);
      activeSession.salesTotal = Math.max(0, activeSession.salesTotal - sale.total);
      if (sale.paymentMethod === "EFECTIVO") activeSession.cashSales = Math.max(0, activeSession.cashSales - sale.total);
      if (sale.paymentMethod === "TARJETA") activeSession.cardSales = Math.max(0, activeSession.cardSales - sale.total);
      if (sale.paymentMethod === "SPEI") activeSession.speiSales = Math.max(0, activeSession.speiSales - sale.total);
    }

    saveDatabase();
    res.json(sale);
  } else {
    res.status(404).json({ error: "Sale not found or already cancelled" });
  }
});


// --- MÓDULO 3: CAPA DE INTELIGENCIA ARTIFICIAL (IA INTEGRADA ENDPOINTS) ---

// Helper function to call Gemini safely
async function callGemini(systemPrompt: string, userPrompt: string, schema?: any) {
  if (!ai) {
    throw new Error("API de Gemini no configurada. Configure su llave en Settings > Secrets.");
  }
  
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.2,
      responseMimeType: schema ? "application/json" : "text/plain",
      responseSchema: schema ? schema : undefined,
    }
  });

  return response.text;
}

// 1. Asistente de Precios y Margen de Ganancia
app.post("/api/ia/precios", async (req, res) => {
  const { productName, cost, desiredMargin, giro, competitorPrice } = req.body;

  if (!productName || !cost) {
    return res.status(400).json({ error: "productName and cost are required" });
  }

  const systemPrompt = `Eres un consultor financiero experto en el mercado minorista de México (Misceláneas, Papelerías, Panaderías, etc.).
Analizas los costos de productos, impuestos aplicables en México (IVA 16%, IEPS 8%, Exento) y sugieres el precio de venta al público óptimo.
Debes considerar el giro del negocio: "${giro || 'Abarrotes'}".
Devuelve la respuesta estrictamente en formato JSON utilizando el esquema requerido. No incluyas explicaciones en texto plano fuera del JSON.`;

  const userPrompt = `Analiza este producto:
Nombre: "${productName}"
Costo de adquisición: $${cost} MXN
Margen de ganancia deseado por el comerciante: ${desiredMargin || 30}%
Precio estimado de competencia (ej. OXXO o supermercado): ${competitorPrice ? `$${competitorPrice} MXN` : "No disponible"}

Calcula e incluye en tu respuesta JSON:
1. Precio sugerido de venta al público sin impuestos y con impuestos (incluyendo IVA o IEPS que aplique según las regulaciones del SAT en México para este tipo de producto en el giro ${giro}).
2. Margen de ganancia real final (porcentaje y pesos).
3. Análisis breve del mercado local, impacto de la inflación mexicana estimada en este producto, y estrategia de precios competitiva (si conviene ponerlo más barato o igual que la competencia).`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      recommendedPriceWithTax: { type: Type.NUMBER, description: "Precio final sugerido al público con impuestos incluidos en MXN" },
      recommendedPriceBeforeTax: { type: Type.NUMBER, description: "Precio sugerido antes de impuestos en MXN" },
      applicableTaxes: { type: Type.STRING, description: "Impuestos aplicados, ej. IVA 16%, IEPS 8% o Exento" },
      actualMarginPercent: { type: Type.NUMBER, description: "Margen de ganancia real final obtenido en porcentaje" },
      actualProfitInPesos: { type: Type.NUMBER, description: "Ganancia real en pesos mexicanos por pieza" },
      inflationAnalysis: { type: Type.STRING, description: "Breve análisis de cómo afecta la inflación de México a la materia prima de este producto" },
      strategyNotes: { type: Type.STRING, description: "Recomendaciones estratégicas de venta y posicionamiento contra competidores" }
    },
    required: ["recommendedPriceWithTax", "recommendedPriceBeforeTax", "applicableTaxes", "actualMarginPercent", "actualProfitInPesos", "inflationAnalysis", "strategyNotes"]
  };

  try {
    const jsonResponseText = await callGemini(systemPrompt, userPrompt, schema);
    const result = JSON.parse(jsonResponseText);
    res.json(result);
  } catch (error: any) {
    console.error("Gemini API pricing error:", error);
    res.status(500).json({ error: error.message || "Error al procesar con la Inteligencia Artificial" });
  }
});

// 2. Predicción de Desabasto y Compras Inteligentes
app.post("/api/ia/desabasto", async (req, res) => {
  const { currentProducts, giro } = req.body;

  const systemPrompt = `Eres un analista de inventarios de IA experto en abasto minorista en México.
Tu labor es identificar qué productos corren riesgo de agotarse rápido (desabasto) basándote en su stock actual, stock mínimo y estacionalidad del mercado mexicano (ej. regreso a clases en agosto, Día de Muertos en octubre/noviembre, temporada de calor en primavera, fiestas patrias en septiembre, Navidad, etc.).
Devuelve tu respuesta estrictamente en un arreglo JSON de objetos de desabasto utilizando el esquema requerido.`;

  const userPrompt = `Giro del negocio: "${giro || 'Abarrotes'}".
Aquí tienes el inventario actual de productos:
${JSON.stringify(currentProducts, null, 2)}

Analiza cuáles están en un nivel crítico de stock o sufrirán picos de demanda estacional mexicana próximamente. Genera recomendaciones inteligentes de compras.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        productName: { type: Type.STRING, description: "Nombre del producto" },
        currentStock: { type: Type.NUMBER, description: "Stock actual" },
        minStock: { type: Type.NUMBER, description: "Stock mínimo configurado" },
        riskLevel: { type: Type.STRING, description: "Nivel de riesgo: ALTO, MEDIO, BAJO" },
        seasonalFactor: { type: Type.STRING, description: "Factor estacional mexicano que alterará la demanda (ej. Vacaciones, Regreso a clases, Cuaresma, Clima)" },
        estimatedDaysRemaining: { type: Type.NUMBER, description: "Días estimados para quedarse en cero si no se surte" },
        recommendedPurchaseQty: { type: Type.NUMBER, description: "Cantidad de piezas/kilos recomendados a comprar al proveedor en la próxima visita" },
        supplierTip: { type: Type.STRING, description: "Consejo para negociar con el distribuidor local" }
      },
      required: ["productName", "currentStock", "minStock", "riskLevel", "seasonalFactor", "estimatedDaysRemaining", "recommendedPurchaseQty", "supplierTip"]
    }
  };

  try {
    const jsonResponseText = await callGemini(systemPrompt, userPrompt, schema);
    const result = JSON.parse(jsonResponseText);
    res.json(result);
  } catch (error: any) {
    console.error("Gemini API stockout predictor error:", error);
    res.status(500).json({ error: error.message || "Error al procesar la predicción con IA" });
  }
});

// 3. Sugeridor de Promociones Cross-Selling
app.post("/api/ia/promociones", async (req, res) => {
  const { currentProducts, giro } = req.body;

  const systemPrompt = `Eres un mercadólogo experto en tiendas de autoservicio y comercio de barrio en México.
Tu objetivo es sugerir 3 promociones combinadas (combos) atractivas para aumentar el ticket promedio del cliente, basándote en los productos del catálogo.
Inventa nombres muy creativos, populares y divertidos al estilo mexicano (ej. "Combo Desayuno de Campeones", "Kit Tarea Completa", "Charola del Antojo Familiar", "Paquete Sube-Defensas").
Devuelve la respuesta estrictamente en JSON usando el esquema solicitado.`;

  const userPrompt = `Giro del negocio: "${giro || 'Abarrotes'}".
Catálogo de productos:
${JSON.stringify(currentProducts, null, 2)}

Genera 3 promociones o combos con productos relacionados para aumentar la venta cruzada.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        comboName: { type: Type.STRING, description: "Nombre creativo y comercial mexicano del combo" },
        includedProducts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nombres de los productos incluidos" },
        regularPriceTotal: { type: Type.NUMBER, description: "Suma de los precios individuales regulares" },
        proposedComboPrice: { type: Type.NUMBER, description: "Precio especial sugerido para el combo en MXN" },
        discountPercent: { type: Type.NUMBER, description: "Porcentaje de descuento aplicado en el combo" },
        merchantBenefitReason: { type: Type.STRING, description: "Por qué le conviene al tendero (ej. saca mercancía estancada, aprovecha compras de impulso)" },
        marketingSlogan: { type: Type.STRING, description: "Frase publicitaria corta y llamativa para cartel en el mostrador" }
      },
      required: ["comboName", "includedProducts", "regularPriceTotal", "proposedComboPrice", "discountPercent", "merchantBenefitReason", "marketingSlogan"]
    }
  };

  try {
    const jsonResponseText = await callGemini(systemPrompt, userPrompt, schema);
    const result = JSON.parse(jsonResponseText);
    res.json(result);
  } catch (error: any) {
    console.error("Gemini API promotions error:", error);
    res.status(500).json({ error: error.message || "Error al procesar promociones de IA" });
  }
});

// 4. Auditoría de Mermas y Cierres de Caja
app.post("/api/ia/mermas", async (req, res) => {
  const { sessionTotals, realCashCollected, notes } = req.body;

  const systemPrompt = `Eres un auditor interno especializado en prevención de pérdidas y mermas en comercios minoristas de México.
Analizas discrepancias entre el balance del sistema en el arqueo y el dinero real recaudado por el cajero, o diferencias de inventario.
Proporcionas un dictamen objetivo con sugerencias de seguridad física, control de efectivo y buenas prácticas.
Devuelve la respuesta en formato JSON usando el esquema solicitado.`;

  const userPrompt = `Resumen de corte de caja actual:
- Dinero esperado en caja (según ventas del sistema + fondo de apertura): $${sessionTotals.expected || 0} MXN
- Dinero real contado físicamente: $${realCashCollected || 0} MXN
- Diferencia (Faltante/Sobrante): $${(realCashCollected || 0) - (sessionTotals.expected || 0)} MXN
- Notas adicionales del supervisor: "${notes || "Sin observaciones adicionales."}"

Proporciona una auditoría analítica y recomendaciones prácticas para el negocio.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      discrepancyStatus: { type: Type.STRING, description: "Dictamen: SIN_DISCREPANCIA, FALTANTE_MENOR, FALTANTE_GRAVE, SOBRANTE_SOSPECHOSO" },
      discrepancyImpact: { type: Type.STRING, description: "Análisis financiero del impacto de esta discrepancia en el margen del mes" },
      possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Posibles explicaciones de la diferencia (ej. error en cambio, robo hormiga, no registrar venta a granel)" },
      securityRecommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Recomendaciones específicas de seguridad y control para este cajero" },
      preventivePolicies: { type: Type.STRING, description: "Política preventiva estándar sugerida para aplicar en el negocio" }
    },
    required: ["discrepancyStatus", "discrepancyImpact", "possibleCauses", "securityRecommendations", "preventivePolicies"]
  };

  try {
    const jsonResponseText = await callGemini(systemPrompt, userPrompt, schema);
    const result = JSON.parse(jsonResponseText);
    res.json(result);
  } catch (error: any) {
    console.error("Gemini API audit error:", error);
    res.status(500).json({ error: error.message || "Error al procesar la auditoría con IA" });
  }
});


// --- VITE MIDDLEWARE CONFIGURATION ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[JJM POS SERVER] Running at http://localhost:${PORT}`);
    console.log(`[JJM POS SERVER] Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
