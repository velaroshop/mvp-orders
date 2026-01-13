/**
 * Helpship WMS API Integration
 * 
 * Autentificare: OAuth2 Client Credentials
 * Token URL: https://helpship-auth-develop.azurewebsites.net/connect/token
 * API Base: https://helpship-api-develop.azurewebsites.net
 */

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
    countryId: string; // countryId este în mailingAddress!
  };
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  isTaxPayer: boolean;
  vatRegistrationNumber?: string;
  tradeRegisterNumber?: string;
  lockerId?: string;
  paymentProcessing?: string;
  deliveryServiceId?: string;
  paymentStatus?: string; // Probabil controlează status-ul comenzii
  customerNote?: string;
  shopOwnerNote?: string;
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

    // Parsăm adresa pentru a extrage street, number, etc.
    // Pentru MVP, punem tot în addressLine1 și street
    const addressParts = orderData.address.match(/^(.+?)\s+(\d+.*)$/);
    const street = addressParts ? addressParts[1].trim() : orderData.address;
    const number = addressParts ? addressParts[2].trim() : "";

    // Construim payload-ul conform documentației Helpship
    const payload: HelpshipOrderPayload = {
      externalId: orderData.orderId,
      name: `Comandă ${orderData.offerCode} - ${orderData.customerName}`,
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
        countryId: "", // TODO: obțineți countryId pentru România din API (GUID)
      },
      firstName: firstName,
      lastName: lastName,
      phone: orderData.customerPhone,
      email: "", // TODO: adăugați email dacă îl colectați
      isTaxPayer: false,
      vatRegistrationNumber: undefined,
      tradeRegisterNumber: undefined,
      lockerId: undefined,
      paymentProcessing: "Checkout", // Sau altă valoare conform documentației
      // NU setăm paymentStatus la creare - îl setăm după pentru a controla status-ul
      // paymentStatus: "Pending", // Va fi setat după creare
      customerNote: undefined,
      shopOwnerNote: undefined,
      orderLines: [
        {
          name: `Produs ${orderData.offerCode}`,
          quantity: 1, // TODO: calculați din offerCode
          price: orderData.subtotal,
          vatPercentage: 0, // TODO: adăugați TVA dacă e necesar
        },
      ],
      packagingType: "Envelope", // Sau alt tip conform documentației
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

    // După creare, setăm paymentStatus la o valoare care să indice ONHOLD
    // Încearcă mai multe variante: "OnHold", "On Hold", sau poate trebuie un câmp separat
    if (orderId && orderId !== "unknown") {
      try {
        console.log(`[Helpship] Setting order ${orderId} paymentStatus to OnHold...`);
        // Încearcă să seteze paymentStatus la "OnHold" sau altă valoare
        await this.setPaymentStatus(orderId, "OnHold");
      } catch (statusError) {
        console.warn("[Helpship] Failed to set paymentStatus to OnHold, trying alternative methods:", statusError);
        // Încearcă și metoda veche pentru status
        try {
          await this.setOrderStatus(orderId, "ONHOLD");
        } catch (altError) {
          console.warn("[Helpship] Also failed to set order status, but order was created:", altError);
        }
      }
    }

    return {
      orderId: orderId || "unknown",
      rawResponse: responseData,
    };
  }

  /**
   * Setează paymentStatus-ul unei comenzi în Helpship
   */
  private async setPaymentStatus(
    helpshipOrderId: string,
    paymentStatus: string,
  ): Promise<void> {
    // Încearcă să actualizeze paymentStatus prin update-ul comenzii
    const possibleEndpoints = [
      `/api/Order/${helpshipOrderId}`,
      `/api/orders/${helpshipOrderId}`,
    ];

    const methods = ["PUT", "PATCH"];

    for (const endpoint of possibleEndpoints) {
      for (const method of methods) {
        try {
          console.log(`[Helpship] Trying ${method} ${endpoint} to set paymentStatus to ${paymentStatus}`);
          
          const response = await this.makeAuthenticatedRequest(endpoint, {
            method,
            body: JSON.stringify({ paymentStatus }),
          });

          if (response.ok) {
            console.log(`[Helpship] Success setting paymentStatus with ${method} ${endpoint}`);
            return;
          } else if (response.status !== 404) {
            const errorText = await response.text();
            console.error(`[Helpship] Endpoint ${endpoint} exists but returned ${response.status}:`, errorText);
            // Continuă să încerce alte variante
          }
        } catch (err) {
          console.log(`[Helpship] ${method} ${endpoint} failed:`, err instanceof Error ? err.message : String(err));
          continue;
        }
      }
    }

    throw new Error(`Failed to set paymentStatus. Tried: ${possibleEndpoints.join(", ")}`);
  }

  /**
   * Setează status-ul unei comenzi în Helpship (metodă alternativă)
   */
  private async setOrderStatus(
    helpshipOrderId: string,
    status: "ONHOLD" | "PENDING",
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
          
          // Încearcă cu payload simplu { status: "ONHOLD" }
          let response = await this.makeAuthenticatedRequest(endpoint, {
            method,
            body: JSON.stringify({ status }),
          });

          // Dacă nu merge, încearcă cu { orderStatus: "ONHOLD" }
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

    // Dacă se schimbă doar status-ul, folosim metoda dedicată
    if (updates.status && Object.keys(updates).length === 1) {
      try {
        // Mapăm status-ul nostru la paymentStatus
        const paymentStatus = updates.status === "PENDING" ? "Pending" : "OnHold";
        await this.setPaymentStatus(helpshipOrderId, paymentStatus);
        return;
      } catch (statusError) {
        console.warn("[Helpship] Failed to set paymentStatus, trying alternative methods:", statusError);
        // Încearcă și metoda veche pentru status
        try {
          await this.setOrderStatus(helpshipOrderId, updates.status);
          return;
        } catch (altError) {
          console.warn("[Helpship] Also failed to set order status, trying full update:", altError);
          // Continuă cu update-ul complet
        }
      }
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
          console.log(`[Helpship] Trying ${method} ${endpoint} for full update`);
          const response = await this.makeAuthenticatedRequest(endpoint, {
            method,
            body: JSON.stringify(updates),
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
