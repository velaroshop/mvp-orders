/**
 * Meta Conversions API (CAPI) Helper Functions
 *
 * This module provides utilities for sending server-side conversion events
 * to Meta (Facebook) using the Conversions API.
 *
 * Documentation: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from 'crypto';
import { supabaseAdmin } from './supabase';

/**
 * Hash a value using SHA256 (required for PII data sent to Meta)
 */
export function hashSHA256(value: string): string {
  if (!value) return '';
  // Normalize: trim and lowercase
  const normalized = value.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalize and format phone number to E.164 format
 * Example: 0722123456 -> +40722123456
 */
export function normalizePhone(phone: string, countryCode: string = '40'): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // If starts with 0, replace with country code
  if (digits.startsWith('0')) {
    return `+${countryCode}${digits.substring(1)}`;
  }

  // If already has country code
  if (digits.startsWith(countryCode)) {
    return `+${digits}`;
  }

  // Otherwise, add country code
  return `+${countryCode}${digits}`;
}

/**
 * Extract client IP address from Next.js request headers
 * Priority: cf-connecting-ip (Cloudflare) > x-forwarded-for > x-real-ip
 */
export function getClientIP(request: Request): string | null {
  const headers = request.headers;

  // Cloudflare
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.split(',')[0].trim();

  // Standard forwarded header
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  // Direct IP
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;

  return null;
}

/**
 * Build user_data object for Meta CAPI
 * Hashes all PII data as required by Meta
 */
export function buildUserData(params: {
  email?: string;
  phone?: string;
  fullName?: string;
  city?: string;
  county?: string;
  countryCode?: string;
  fbp?: string;
  fbc?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
}) {
  const userData: Record<string, any> = {};

  // Hash PII data
  if (params.email) {
    userData.em = hashSHA256(params.email);
  }

  if (params.phone) {
    const normalizedPhone = normalizePhone(params.phone, params.countryCode || '40');
    userData.ph = hashSHA256(normalizedPhone);
  }

  if (params.fullName) {
    // Split into first and last name (best effort)
    const nameParts = params.fullName.trim().split(' ');
    if (nameParts.length > 0) {
      userData.fn = hashSHA256(nameParts[0]);
    }
    if (nameParts.length > 1) {
      userData.ln = hashSHA256(nameParts.slice(1).join(' '));
    }
  }

  if (params.city) {
    userData.ct = hashSHA256(params.city);
  }

  if (params.county) {
    userData.st = hashSHA256(params.county);
  }

  // Country code (ISO 3166-1 alpha-2)
  userData.country = hashSHA256(params.countryCode?.toLowerCase() || 'ro');

  // Facebook browser ID and click ID (not hashed)
  if (params.fbp) {
    userData.fbp = params.fbp;
  }

  if (params.fbc) {
    userData.fbc = params.fbc;
  }

  // Client IP and User Agent (not hashed)
  if (params.clientIpAddress) {
    userData.client_ip_address = params.clientIpAddress;
  }

  if (params.clientUserAgent) {
    userData.client_user_agent = params.clientUserAgent;
  }

  return userData;
}

/**
 * Build custom_data object for Purchase event
 */
export function buildCustomData(params: {
  orderId: string;
  value: number;
  currency?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    item_price: number;
  }>;
}) {
  const customData: Record<string, any> = {
    value: params.value,
    currency: params.currency || 'RON',
    content_type: 'product',
  };

  // Order ID for deduplication and tracking
  customData.order_id = params.orderId;

  // Product contents
  if (params.contents && params.contents.length > 0) {
    customData.contents = params.contents;
    customData.num_items = params.contents.reduce((sum, item) => sum + item.quantity, 0);
  }

  return customData;
}

/**
 * Send Purchase event to Meta Conversions API
 */
export async function sendMetaPurchaseEvent(params: {
  orderId: string;
  pixelId: string;
  accessToken: string;
  eventSourceUrl: string;
  testEventCode?: string;
}) {
  try {
    const { orderId, pixelId, accessToken, eventSourceUrl, testEventCode } = params;

    // Fetch order data from database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customers (phone)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Calculate total including presale upsells
    let presaleUpsellsTotal = 0;
    if (order.upsells && Array.isArray(order.upsells)) {
      presaleUpsellsTotal = order.upsells
        .filter((u: any) => u.type === 'presale')
        .reduce((sum: number, upsell: any) => {
          return sum + ((upsell.price || 0) * (upsell.quantity || 1));
        }, 0);
    }

    // Build tracking data from order
    const trackingData = order.tracking_data || {};

    // Build user_data
    const userData = buildUserData({
      phone: order.phone,
      fullName: order.full_name,
      city: order.city,
      county: order.county,
      countryCode: 'ro',
      fbp: trackingData.fbp || order.fbc,
      fbc: order.fbc,
      clientIpAddress: trackingData.clientIpAddress,
      clientUserAgent: trackingData.clientUserAgent,
    });

    // Build contents array (main product + presale upsells)
    const contents = [];

    // Main product
    if (order.product_sku) {
      contents.push({
        id: order.product_sku,
        quantity: order.product_quantity || 1,
        item_price: order.subtotal - presaleUpsellsTotal,
      });
    }

    // Presale upsells
    if (order.upsells && Array.isArray(order.upsells)) {
      order.upsells
        .filter((u: any) => u.type === 'presale')
        .forEach((upsell: any) => {
          if (upsell.productSku) {
            contents.push({
              id: upsell.productSku,
              quantity: upsell.quantity || 1,
              item_price: upsell.price || 0,
            });
          }
        });
    }

    // Build custom_data
    const customData = buildCustomData({
      orderId: order.id,
      value: order.total,
      currency: 'RON',
      contents: contents.length > 0 ? contents : undefined,
    });

    // Build event payload
    const eventId = `purchase_${order.id}`;
    const eventTime = Math.floor(new Date(order.created_at).getTime() / 1000);

    const eventPayload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: eventTime,
          event_id: eventId,
          event_source_url: eventSourceUrl,
          action_source: 'website',
          user_data: userData,
          custom_data: customData,
        },
      ],
      test_event_code: testEventCode || undefined,
    };

    // Send to Meta CAPI
    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`;

    console.log('[Meta CAPI] Sending Purchase event:', {
      orderId,
      eventId,
      testMode: !!testEventCode,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Meta API error: ${JSON.stringify(result)}`);
    }

    // Update order status
    await supabaseAdmin
      .from('orders')
      .update({
        meta_purchase_status: 'sent',
        meta_purchase_event_id: eventId,
        meta_purchase_sent_at: new Date().toISOString(),
        meta_purchase_last_error: null,
      })
      .eq('id', orderId);

    console.log('[Meta CAPI] ✓ Purchase event sent successfully:', {
      orderId,
      eventId,
      eventsReceived: result.events_received,
    });

    return {
      success: true,
      eventId,
      result,
    };
  } catch (error) {
    console.error('[Meta CAPI] ✗ Failed to send Purchase event:', error);

    // Update order with error
    await supabaseAdmin
      .from('orders')
      .update({
        meta_purchase_status: 'failed',
        meta_purchase_last_error: error instanceof Error ? error.message : String(error),
      })
      .eq('id', params.orderId);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
