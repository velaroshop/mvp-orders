/**
 * Helpship WMS API Integration
 * 
 * Autentificare: OAuth2 Client Credentials
 * Token URL: https://helpship-auth-develop.azurewebsites.net/connect/token
 * API Base: https://helpship-api-develop.azurewebsites.net
 */

import { getOrderPrefix } from "./store";

interface HelpshipTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface HelpshipOrderPayload {
  externalId: string;
  name: string;
  totalPrice: number;
  discountPrice: number;
  shippingPrice: number;
  shippingVatPercentage: number;
  currency: string;
  mailingAddress: {
    addressLine1: string;
    addressLine2?: string;
    street: string;
    number: string;
    zip: string;
    city: string;
    province: string;
    countryId: string | null; // countryId este în mailingAddress! (null dacă nu e setat)
    firstName?: string | null; // firstName este în mailingAddress!
    lastName?: string | null; // lastName este în mailingAddress!
    name?: string | null; // name (nume complet) este în mailingAddress!
    phone?: string | null; // phone este în mailingAddress!
    email?: string | null; // email este în mailingAddress!
  };
  firstName?: string; // Poate fi și la nivel principal (pentru compatibilitate)
  lastName?: string; // Poate fi și la nivel principal (pentru compatibilitate)
  phone?: string; // Poate fi și la nivel principal (pentru compatibilitate)
  email?: string | null;
  isTaxPayer: boolean;
  vatRegistrationNumber?: string | null;
  tradeRegisterNumber?: string | null;
  lockerId?: string | null;
  paymentProcessing?: string;
  deliveryServiceId?: string;
  paymentStatus?: string; // Status-ul plății (rămâne "Pending")
  status?: string; // Status-ul comenzii (trebuie "OnHold" la creare, "Pending" la confirmare)
  customerNote?: string | null;
  shopOwnerNote?: string | null;
  orderLines: Array<{
    accountId?: string;
    name: string;
    variantName?: string;
    quantity: number;
    price: number;
    vatPercentage?: number;
    vatName?: string;
    externalSku?: string;
    externalId?: string;
  }>;
  packagingType?: string;
}

class HelpshipClient {
  private clientId: string;
  private clientSecret: string;
  private tokenUrl: string;
  private apiBaseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = process.env.HELPSHIP_CLIENT_ID || "";
    this.clientSecret = process.env.HELPSHIP_CLIENT_SECRET || "";
    this.tokenUrl =
      process.env.HELPSHIP_TOKEN_URL ||
      "https://helpship-auth-develop.azurewebsites.net/connect/token";
    this.apiBaseUrl =
      process.env.HELPSHIP_API_BASE_URL ||
      "https://helpship-api-develop.azurewebsites.net";

    if (!this.clientId || !this.clientSecret) {
      console.warn(
        "Helpship credentials not configured. API calls will fail.",
      );
    }
  }

  /**
   * Obține un access token OAuth2 folosind client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Verifică dacă token-ul existent este încă valid (cu 5 minute buffer)
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt > now + 5 * 60 * 1000) {
      console.log("[Helpship] Using cached access token");
      return this.accessToken;
    }

    console.log("[Helpship] Requesting new access token...");
    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: "helpship.api",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Helpship] Token request failed:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Failed to get Helpship access token: ${response.status} ${errorText}`,
      );
    }

    const data: HelpshipTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = now + data.expires_in * 1000;

    console.log("[Helpship] Access token obtained successfully");
    return this.accessToken;
  }

  /**
   * Face o cerere autentificată către Helpship API
   */
  private async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getAccessToken();

    const url = `${this.apiBaseUrl}${endpoint}`;
    console.log("[Helpship] Making request to:", url);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Creează o comandă nouă în Helpship cu status ONHOLD
   * 
   * NOTĂ: Pentru status ONHOLD, probabil trebuie creată normal și apoi actualizată
   * sau există un câmp special. Vom verifica după testare.
   */
  async createOrder(
    orderData: {
      orderId: string; // ID-ul nostru intern (externalId)
      orderNumber: number; // Numărul comenzii (pentru ORDER NAME)
      customerName: string;
      customerPhone: string;
      county: string;
      city: string;
      address: string;
      offerCode: string;
      subtotal: number;
      shippingCost: number;
      total: number;
      upsells?: string[];
    },
  ): Promise<{ orderId: string; rawResponse?: any }> {
    // Separăm numele în firstName și lastName
    const nameParts = orderData.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    
    console.log("[Helpship] Parsed customer name:", {
      fullName: orderData.customerName,
      firstName,
      lastName,
    });

    // Parsăm adresa pentru a extrage street, number, etc.
    // Pentru MVP, punem tot în addressLine1 și street
    const addressParts = orderData.address.match(/^(.+?)\s+(\d+.*)$/);
    const street = addressParts ? addressParts[1].trim() : orderData.address;
    const number = addressParts ? addressParts[2].trim() : "";

    // Obține GUID-ul pentru România (sau folosește null dacă nu se găsește)
    let countryId: string | null = null;
    try {
      countryId = await this.getRomaniaCountryId();
    } catch (err) {
      console.warn("[Helpship] Failed to get Romania countryId, using null:", err);
    }

    // Obține prefix-ul pentru numărul comenzii
    const orderPrefix = await getOrderPrefix();
    const orderName = `${orderPrefix}-${String(orderData.orderNumber).padStart(5, "0")}`;

    // Construim payload-ul conform documentației Helpship
    const payload: HelpshipOrderPayload = {
      externalId: orderData.orderId,
      name: orderName, // Format: JMR-TEST-00001, JMR-TEST-00002, etc.
      totalPrice: orderData.total,
      discountPrice: 0, // TODO: calculați dacă există discount
      shippingPrice: orderData.shippingCost,
      shippingVatPercentage: 0, // TODO: adăugați TVA dacă e necesar
      currency: "RON",
      mailingAddress: {
        addressLine1: orderData.address,
        street: street,
        number: number || "",
        zip: "", // TODO: adăugați cod poștal dacă îl aveți
        city: orderData.city,
        province: orderData.county,
        countryId: countryId, // GUID pentru România (sau null dacă nu s-a găsit)
        firstName: firstName || null, // firstName în mailingAddress!
        lastName: lastName || null, // lastName în mailingAddress!
        name: orderData.customerName || null, // Nume complet în mailingAddress!
        phone: orderData.customerPhone || null, // phone în mailingAddress!
        email: "clienti@velaro-shop.ro", // Email fix pentru test
      },
      firstName: firstName || undefined, // Poate fi și la nivel principal (pentru compatibilitate)
      lastName: lastName || undefined, // Poate fi și la nivel principal (pentru compatibilitate)
      phone: orderData.customerPhone || undefined, // Poate fi și la nivel principal (pentru compatibilitate)
      email: "clienti@velaro-shop.ro", // Email fix pentru test
      isTaxPayer: false,
      vatRegistrationNumber: null,
      tradeRegisterNumber: null,
      lockerId: null,
      paymentProcessing: "Manual", // Metoda de plată: Manual (nu Checkout)
      paymentStatus: "Pending", // Status-ul plății (rămâne "Pending")
      status: "OnHold", // Status-ul comenzii (trebuie "OnHold" la creare)
      customerNote: null,
      shopOwnerNote: null,
      orderLines: [
        {
          name: `Produs ${orderData.offerCode}`,
          quantity: 1, // TODO: calculați din offerCode
          price: orderData.subtotal,
          vatPercentage: 0, // TODO: adăugați TVA dacă e necesar
          // accountId, variantName, vatName, externalSku, externalId - opționale
        },
      ],
      packagingType: "Envelope", // Sau alt tip conform documentației
      // deliveryServiceId - opțional, probabil trebuie obținut din API
    };

    console.log("[Helpship] Creating order with payload:", JSON.stringify(payload, null, 2));

    const response = await this.makeAuthenticatedRequest("/api/Order", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("[Helpship] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Helpship] Order creation failed:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Failed to create Helpship order: ${response.status} ${errorText}`,
      );
    }

    const responseData = await response.json();
    console.log("[Helpship] Order creation response:", JSON.stringify(responseData, null, 2));

    // Helpship ar trebui să returneze un orderId
    // Ajustăm câmpul exact după ce testăm
    const orderId = responseData.id || responseData.orderId || responseData.order_id;
    if (!orderId) {
      console.warn("[Helpship] No orderId found in response, full response:", responseData);
    }

    // Setăm status-ul la "OnHold" după creare
    // Helpship poate ignora status-ul din payload la creare, deci îl setăm explicit după
    if (orderId && orderId !== "unknown") {
      console.log(`[Helpship] Setting order status to OnHold for order ${orderId}...`);
      try {
        await this.setOrderStatus(orderId, "OnHold");
        console.log(`[Helpship] Order ${orderId} status set to OnHold successfully`);
      } catch (statusError) {
        console.error("[Helpship] Failed to set order status to OnHold after creation:", statusError);
        // Nu aruncăm eroarea, comanda a fost creată cu succes, doar status-ul nu s-a setat
      }
    }

    return {
      orderId: orderId || "unknown",
      rawResponse: responseData,
    };
  }


  /**
   * Obține GUID-ul pentru România din API (dacă există endpoint pentru țări)
   * TODO: Verifică în Swagger dacă există GET /api/Countries sau similar
   */
  async getRomaniaCountryId(): Promise<string | null> {
    // Folosim GET /api/Country pentru a obține lista de țări
    const endpoint = "/api/Country";

    try {
      console.log(`[Helpship] Getting countries from ${endpoint}...`);
      const response = await this.makeAuthenticatedRequest(endpoint, {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Helpship] Countries response (first 100 chars):`, JSON.stringify(data).substring(0, 100));
        
        // Caută România în listă
        const countries = Array.isArray(data) ? data : data.items || data.data || [];
        const romania = countries.find(
          (c: any) =>
            c.name?.toLowerCase() === "romania" ||
            c.name?.toLowerCase() === "românia" ||
            c.alpha2Code === "RO" ||
            c.alpha2Code === "ROU" ||
            c.code === "RO" ||
            c.code === "ROU",
        );

        if (romania?.id) {
          console.log(`[Helpship] Found Romania countryId: ${romania.id}`);
          return romania.id;
        } else {
          console.warn(`[Helpship] Romania not found in countries list. Total countries: ${countries.length}`);
          // Log primul country pentru debugging
          if (countries.length > 0) {
            console.log(`[Helpship] First country example:`, JSON.stringify(countries[0], null, 2));
          }
        }
      } else {
        const errorText = await response.text();
        console.error(`[Helpship] Failed to get countries: ${response.status} ${errorText}`);
      }
    } catch (err) {
      console.error(`[Helpship] Error getting countries:`, err instanceof Error ? err.message : String(err));
    }

    console.warn("[Helpship] Could not find Romania countryId from API");
    return null;
  }

  /**
   * Setează status-ul comenzii în Helpship (nu paymentStatus!)
   */
  private async setOrderStatus(
    helpshipOrderId: string,
    status: "OnHold" | "Pending",
  ): Promise<void> {
    // Încearcă mai multe variante de endpoint pentru setarea status-ului
    const possibleEndpoints = [
      `/api/Order/${helpshipOrderId}/status`,
      `/api/Order/${helpshipOrderId}`,
      `/api/orders/${helpshipOrderId}/status`,
    ];

    const methods = ["PUT", "PATCH", "POST"];

    let lastError: Error | null = null;

    for (const endpoint of possibleEndpoints) {
      for (const method of methods) {
        try {
          console.log(`[Helpship] Trying ${method} ${endpoint} to set status to ${status}`);
          
          // Încearcă cu payload simplu { status: "OnHold" sau "Pending" }
          let response = await this.makeAuthenticatedRequest(endpoint, {
            method,
            body: JSON.stringify({ status }),
          });

          // Dacă nu merge, încearcă cu { orderStatus: "OnHold" sau "Pending" }
          if (!response.ok && method === "PUT") {
            response = await this.makeAuthenticatedRequest(endpoint, {
              method,
              body: JSON.stringify({ orderStatus: status }),
            });
          }

          if (response.ok) {
            console.log(`[Helpship] Success setting status with ${method} ${endpoint}`);
            return;
          } else if (response.status !== 404) {
            const errorText = await response.text();
            console.error(`[Helpship] Endpoint ${endpoint} exists but returned ${response.status}:`, errorText);
            // Continuă să încerce alte variante
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.log(`[Helpship] ${method} ${endpoint} failed:`, lastError.message);
          continue;
        }
      }
    }

    // Dacă niciun endpoint nu funcționează, aruncă eroare
    throw new Error(
      `Failed to set order status. Tried: ${possibleEndpoints.join(", ")}. Last error: ${lastError?.message || "Unknown"}`,
    );
  }

  /**
   * Actualizează o comandă existentă în Helpship (schimbă status din ONHOLD în PENDING)
   */
  async updateOrder(
    helpshipOrderId: string,
    updates: {
      status?: "PENDING" | "ONHOLD";
      paymentStatus?: "Pending" | "Paid";
      customerName?: string;
      customerPhone?: string;
      shippingAddress?: {
        county?: string;
        city?: string;
        address?: string;
      };
      // Alte câmpuri care pot fi actualizate
    },
  ): Promise<void> {
    console.log(`[Helpship] Updating order ${helpshipOrderId} with:`, JSON.stringify(updates, null, 2));

    // Dacă se schimbă doar status-ul (și nu paymentStatus), folosim metoda dedicată
    // Dar dacă trebuie să setăm și paymentStatus, facem update complet
    if (updates.status && !updates.paymentStatus && Object.keys(updates).length === 1) {
      try {
        // Mapăm status-ul nostru la formatul Helpship
        const helpshipStatus = updates.status === "PENDING" ? "Pending" : "OnHold";
        await this.setOrderStatus(helpshipOrderId, helpshipStatus);
        return;
      } catch (statusError) {
        console.warn("[Helpship] Failed to set order status, trying full update:", statusError);
        // Continuă cu update-ul complet
      }
    }

    // Construim payload-ul pentru update, mapând corect status-ul
    const payload: any = {};
    if (updates.status) {
      payload.status = updates.status === "PENDING" ? "Pending" : "OnHold";
    }
    if (updates.paymentStatus) {
      payload.paymentStatus = updates.paymentStatus;
    }
    if (updates.customerName) {
      payload.customerName = updates.customerName;
    }
    if (updates.customerPhone) {
      payload.customerPhone = updates.customerPhone;
    }
    if (updates.shippingAddress) {
      payload.shippingAddress = updates.shippingAddress;
    }

    // Pentru update-uri complete, încearcă mai multe variante
    const possibleEndpoints = [
      `/api/Order/${helpshipOrderId}`,
      `/api/orders/${helpshipOrderId}`,
    ];

    const methods = ["PUT", "PATCH"];

    let lastError: Error | null = null;

    for (const endpoint of possibleEndpoints) {
      for (const method of methods) {
        try {
          console.log(`[Helpship] Trying ${method} ${endpoint} for update`);
          const response = await this.makeAuthenticatedRequest(endpoint, {
            method,
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            console.log(`[Helpship] Success updating order with ${method} ${endpoint}`);
            const responseData = await response.json().catch(() => ({}));
            console.log("[Helpship] Update response:", JSON.stringify(responseData, null, 2));
            return;
          } else if (response.status !== 404) {
            const errorText = await response.text();
            console.error(`[Helpship] Endpoint ${endpoint} exists but returned ${response.status}:`, errorText);
            throw new Error(
              `Failed to update Helpship order: ${response.status} ${errorText}`,
            );
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (err instanceof Error && err.message.includes("Failed to update")) {
            throw err;
          }
          console.log(`[Helpship] ${method} ${endpoint} failed:`, lastError.message);
          continue;
        }
      }
    }

    throw new Error(
      `Failed to find valid endpoint for update. Tried: ${possibleEndpoints.join(", ")}. Last error: ${lastError?.message || "Unknown"}`,
    );
  }
}

// Exportăm o instanță singleton
export const helpshipClient = new HelpshipClient();
