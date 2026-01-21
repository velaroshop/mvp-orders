export type OrderStatus = "queue" | "pending" | "confirmed" | "cancelled" | "hold" | "sync_error" | "testing";

export type PartialOrderStatus = "pending" | "accepted" | "refused" | "unanswered" | "call_later" | "duplicate";

export type OfferCode = "offer_1" | "offer_2" | "offer_3";

export type UserRole = "owner" | "admin" | "store_manager";

export type MetaPurchaseStatus = "pending" | "sent" | "failed";

export type MetaEventName = "Purchase" | "InitiateCheckout" | "ViewContent" | "PageView";

export interface TrackingData {
  fbp?: string; // Facebook browser ID cookie (_fbp)
  fbc?: string; // Facebook click ID cookie (_fbc)
  utm_source?: string;
  utm_medium?: string;
  utm_term?: string;
  utm_content?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  [key: string]: any; // Allow additional tracking params
}

export interface Customer {
  id: string;
  organizationId: string;
  phone: string;
  name?: string; // Name from most recent order
  firstOrderDate?: string;
  lastOrderDate?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPage {
  id: string;
  name: string;
  publicKey: string;
  active: boolean;
}

export interface Order {
  id: string;
  customerId: string; // Reference to customer
  landingKey: string;
  offerCode: OfferCode;
  phone: string; // Kept in order for historical record
  fullName: string; // Kept in order for historical record
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
  orderSeries?: string; // Order series from store (e.g., "JMR-TEST-", "VELARO-")
  orderNote?: string; // Notă pentru comanda (max 2 linii)
  holdFromStatus?: OrderStatus; // Status-ul înainte de hold (pentru UNHOLD)
  fromPartialId?: string; // ID-ul partial order-ului din care provine
  source?: string; // Sursa comenzii: "direct" sau "partial"
  queueExpiresAt?: string; // Timestamp when queue expires (3 minutes from creation)
  promotedFromTesting?: boolean; // Flag to indicate order was promoted from testing status
  confirmerName?: string; // Name of the user who confirmed/created the order
  // Meta Tracking fields
  fbclid?: string; // Facebook click ID from URL
  fbc?: string; // Facebook click cookie
  gclid?: string; // Google click ID
  ttclid?: string; // TikTok click ID
  utmCampaign?: string; // UTM campaign parameter
  trackingData?: TrackingData; // Additional tracking data (JSONB)
  landingUrl?: string; // Original landing page URL
  eventSourceUrl?: string; // Widget iframe URL (event_source_url for CAPI)
  metaPurchaseStatus?: MetaPurchaseStatus; // CAPI delivery status
  metaPurchaseEventId?: string; // Event ID for deduplication
  metaPurchaseSentAt?: string; // Timestamp when Purchase event was sent
  metaPurchaseLastError?: string; // Last error message if failed
  createdAt: string;
}

export interface PartialOrder {
  id: string;
  organizationId: string;
  partialNumber?: number; // Auto-incrementing number starting from 1
  landingKey: string;
  offerCode?: OfferCode;
  phone?: string;
  fullName?: string;
  county?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  productName?: string;
  productSku?: string;
  productQuantity?: number;
  upsells: string[];
  subtotal?: number;
  shippingCost?: number;
  total?: number;
  lastCompletedField?: string;
  completionPercentage: number;
  status: PartialOrderStatus;
  convertedToOrderId?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
  abandonedAt?: string;
  storeUrl?: string | null; // URL of the store from which the partial order originated
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  createdBy?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  creator?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface MetaEventsOutbox {
  id: string;
  orderId: string;
  eventName: MetaEventName;
  payload: Record<string, any>; // JSONB payload for CAPI
  attempts: number;
  status: MetaPurchaseStatus;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

