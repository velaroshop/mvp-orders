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
  // Vom completa structura exactă după ce testăm cu API-ul real
  // Deocamdată, structură generică bazată pe datele noastre
  customerName: string;
  customerPhone: string;
  shippingAddress: {
    county: string;
    city: string;
    address: string;
  };
  items: Array<{
    offerCode: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: "ONHOLD" | "PENDING";
  // Alte câmpuri necesare vor fi adăugate după testare
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
   */
  async createOrder(
    orderData: {
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
    // Construim payload-ul pentru Helpship
    // NOTĂ: Structura exactă va fi ajustată după ce testăm cu API-ul real
    const payload: HelpshipOrderPayload = {
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      shippingAddress: {
        county: orderData.county,
        city: orderData.city,
        address: orderData.address,
      },
      items: [
        {
          offerCode: orderData.offerCode,
          quantity: 1, // TODO: calculați cantitatea din offerCode
          price: orderData.subtotal,
        },
      ],
      total: orderData.total,
      status: "ONHOLD",
    };

    console.log("[Helpship] Creating order with payload:", JSON.stringify(payload, null, 2));
    
    // Încearcă mai multe variante de endpoint-uri comune
    // TODO: Ajustează după ce verifici documentația Swagger
    const possibleEndpoints = [
      "/api/orders",
      "/orders",
      "/api/v1/orders",
      "/v1/orders",
      "/api/order",
      "/order",
    ];
    
    let response: Response | null = null;
    let lastError: Error | null = null;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[Helpship] Trying endpoint: ${endpoint}`);
        response = await this.makeAuthenticatedRequest(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          console.log(`[Helpship] Success with endpoint: ${endpoint}`);
          break;
        } else if (response.status !== 404) {
          // Dacă nu e 404, înseamnă că endpoint-ul există dar are altă problemă
          console.log(`[Helpship] Endpoint ${endpoint} exists but returned ${response.status}`);
          break;
        }
        // Dacă e 404, continuă cu următorul endpoint
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.log(`[Helpship] Endpoint ${endpoint} failed:`, lastError.message);
        continue;
      }
    }
    
    if (!response) {
      throw new Error(
        `Failed to find valid endpoint. Tried: ${possibleEndpoints.join(", ")}. Last error: ${lastError?.message || "Unknown"}`,
      );
    }

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
    
    return {
      orderId: orderId || "unknown",
      rawResponse: responseData,
    };
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
    const response = await this.makeAuthenticatedRequest(
      `/api/orders/${helpshipOrderId}`,
      {
        method: "PUT", // sau PATCH, în funcție de API
        body: JSON.stringify(updates),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update Helpship order: ${response.status} ${errorText}`,
      );
    }
  }
}

// Exportăm o instanță singleton
export const helpshipClient = new HelpshipClient();
