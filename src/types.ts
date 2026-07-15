/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "ADMIN" | "CAJERO" | "SUPERVISOR";

export type BusinessType =
  | "ABARROTES"
  | "PAPELERIA"
  | "PANADERIA"
  | "CARNICERIA"
  | "FARMACIA"
  | "MINISUPER";

export interface TaxConfig {
  iva: number; // e.g. 0.16, 0.08, 0
  ieps: number; // e.g. 0.08, 0
  exento: boolean;
}

export interface CompoundItem {
  productId: string;
  quantity: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: "pza" | "kg" | "g" | "m" | "l";
  taxType: "IVA_16" | "IVA_0" | "IEPS_8" | "EXENTO";
  category: string;
  isCompound?: boolean;
  components?: CompoundItem[]; // For packages / bundles
  images?: string[]; // Multiple photos/URLs for the product
}

export interface Client {
  id: string;
  name: string;
  rfc: string;
  email: string;
  creditLimit: number;
  balance: number;
  phone: string;
}

export interface CreditPayment {
  id: string;
  clientId: string;
  amount: number;
  timestamp: string;
  type: "CARGO" | "ABONO";
  description: string;
}

export interface SaleItem {
  product: Product;
  quantity: number;
  price: number; // price at time of sale
}

export interface Sale {
  id: string;
  ticketNumber: string;
  items: SaleItem[];
  subtotal: number;
  taxes: number; // Detailed sum of IVA and IEPS
  total: number;
  paymentMethod: "EFECTIVO" | "TARJETA" | "SPEI";
  amountPaid: number;
  change: number;
  timestamp: string;
  status: "COMPLETED" | "CANCELLED";
  cajero: string;
}

export interface CashSession {
  id: string;
  userId: string;
  userName: string;
  openingTime: string;
  closingTime?: string;
  openingBalance: number;
  closingBalance?: number;
  realCashCollected?: number;
  status: "OPEN" | "CLOSED";
  salesCount: number;
  salesTotal: number;
  cashSales: number;
  cardSales: number;
  speiSales: number;
  cashIn?: number;
  cashOut?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  rfc: string;
  email: string;
}

export interface StockPurchase {
  id: string;
  supplierId: string;
  items: { productId: string; quantity: number; cost: number }[];
  total: number;
  timestamp: string;
}
