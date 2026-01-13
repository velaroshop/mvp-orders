import { randomUUID } from "crypto";
import type { Order, OfferCode } from "./types";

// Simple in-memory store for the MVP phase.
// Later we will replace this with a real database (Supabase / PostgreSQL).

const orders = new Map<string, Order>();

export function createOrder(input: {
  landingKey: string;
  offerCode: OfferCode;
  phone: string;
  fullName: string;
  county: string;
  city: string;
  address: string;
  upsells?: string[];
  subtotal: number;
  shippingCost: number;
  total: number;
}): Order {
  const id = randomUUID();
  const now = new Date().toISOString();

  const order: Order = {
    id,
    landingKey: input.landingKey,
    offerCode: input.offerCode,
    phone: input.phone,
    fullName: input.fullName,
    county: input.county,
    city: input.city,
    address: input.address,
    upsells: input.upsells ?? [],
    subtotal: input.subtotal,
    shippingCost: input.shippingCost,
    total: input.total,
    status: "pending",
    createdAt: now,
  };

  orders.set(id, order);
  return order;
}

export function listOrders(): Order[] {
  return Array.from(orders.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

