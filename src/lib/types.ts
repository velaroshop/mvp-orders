export type OrderStatus = "pending" | "confirmed" | "cancelled" | "hold" | "sync_error";

export type OfferCode = "offer_1" | "offer_2" | "offer_3";

export interface LandingPage {
  id: string;
  name: string;
  publicKey: string;
  active: boolean;
}

export interface Order {
  id: string;
  landingKey: string;
  offerCode: OfferCode;
  phone: string;
  fullName: string;
  county: string;
  city: string;
  address: string;
  postalCode?: string; // Cod poștal sugerat de Helpship
  productName?: string; // Numele produsului
  productSku?: string; // SKU-ul produsului
  productQuantity?: number; // Cantitatea produsului
  upsells: string[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  helpshipOrderId?: string;
  orderNumber?: number;
  orderNote?: string; // Notă pentru comanda (max 2 linii)
  holdFromStatus?: OrderStatus; // Status-ul înainte de hold (pentru UNHOLD)
  createdAt: string;
}

