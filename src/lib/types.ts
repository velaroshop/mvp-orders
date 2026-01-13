export type OrderStatus = "pending" | "confirmed" | "cancelled" | "hold";

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
  upsells: string[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  helpshipOrderId?: string;
  orderNumber?: number;
  orderNote?: string; // Notă pentru comanda (max 2 linii)
  createdAt: string;
}

