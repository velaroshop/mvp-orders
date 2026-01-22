/**
 * Helpship WMS API Integration
 * 
 * Autentificare: OAuth2 Client Credentials
 * Token URL: https://helpship-auth-develop.azurewebsites.net/connect/token
 * API Base: https://helpship-api-develop.azurewebsites.net
 */

// Removed getOrderPrefix import - now using orderSeries from store

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
  status?: string | number; // Status-ul comenzii: 7 = OnHold, 0 = Pending (poate fi string sau number)
  statusName?: string; // Numele status-ului: "OnHold", "Pending", etc.
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

  constructor(credentials?: {
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    apiBaseUrl?: string;
  }) {
    this.clientId = credentials?.clientId || process.env.HELPSHIP_CLIENT_ID || "";
    this.clientSecret = credentials?.clientSecret || process.env.HELPSHIP_CLIENT_SECRET || "";
    this.tokenUrl =
      credentials?.tokenUrl ||
      process.env.HELPSHIP_TOKEN_URL ||
      "https://helpship-auth-develop.azurewebsites.net/connect/token";
    this.apiBaseUrl =
      credentials?.apiBaseUrl ||
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
      orderSeries: string; // Order series din store (ex: "VLR", "JMR-TEST")
      customerName: string;
      customerPhone: string;
      county: string;
      city: string;
      address: string;
      offerCode: string;
      productSku?: string | null; // SKU-ul produsului pentru Helpship (același pentru toate ofertele)
      productName?: string | null; // Numele produsului din baza noastră
      productQuantity?: number; // Cantitatea produsului din oferta selectată
      subtotal: number;
      shippingCost: number;
      discount?: number; // Discount amount
      total: number;
      upsells?: Array<{
        upsellId: string;
        title: string;
        quantity: number;
        price: number;
        productSku?: string | null;
        productName?: string;
      }>;
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

    // Folosește order_series din store pentru numele comenzii
    const orderName = `${orderData.orderSeries}-${String(orderData.orderNumber).padStart(5, "0")}`;

    // Construim payload-ul conform documentației Helpship
    const payload: HelpshipOrderPayload = {
      externalId: orderData.orderId,
      name: orderName, // Format: JMR-TEST-00001, JMR-TEST-00002, etc.
      totalPrice: orderData.total,
      discountPrice: orderData.discount || 0,
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
      status: 7, // Status-ul comenzii: 7 = OnHold (enum: 0=Pending, 1=Packing, 2=Packed, 3=Fulfilled, 4=Incomplete, 5=Error, 6=Archived, 7=OnHold)
      statusName: "OnHold", // Încercăm și cu statusName (string)
      customerNote: null,
      shopOwnerNote: null,
      orderLines: [
        // Main product
        {
          name: orderData.productName || orderData.productSku || "Product", // Numele produsului din baza noastră sau SKU ca fallback
          quantity: orderData.productQuantity || 1, // Cantitatea din oferta selectată
          price: (orderData.productQuantity || 1) > 0
            ? orderData.subtotal / (orderData.productQuantity || 1)
            : orderData.subtotal, // Preț per bucată (subtotal împărțit la cantitate)
          vatPercentage: 0, // TODO: adăugați TVA dacă e necesar
          externalSku: orderData.productSku || undefined, // SKU-ul produsului (același pentru toate ofertele)
          // accountId, variantName, vatName, externalId - opționale
        },
        // Add upsells as separate products
        ...(orderData.upsells || []).map(upsell => ({
          name: upsell.productName || upsell.title, // Use product name from products table, fallback to upsell title
          quantity: upsell.quantity,
          price: upsell.price,
          vatPercentage: 0,
          externalSku: upsell.productSku || undefined,
        })),
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

    // Setăm status-ul la "OnHold" după creare folosind endpoint-ul specific /hold
    // Helpship creează comenzile cu status "Pending" (0) și trebuie să le punem pe hold explicit
    if (orderId && orderId !== "unknown") {
      console.log(`[Helpship] Setting order ${orderId} to OnHold using /hold endpoint...`);
      try {
        await this.setOrderStatus(orderId, "OnHold");
        console.log(`[Helpship] Order ${orderId} successfully set to OnHold`);
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
   * Setează status-ul comenzii în Helpship
   * Folosește endpoint-uri specifice pentru diferite statusuri:
   * - POST /api/Order/{id}/hold pentru OnHold
   * - POST /api/Order/{id}/unhold pentru Pending
   * - PUT /api/Order/{id} pentru Archived
   */
  async setOrderStatus(
    helpshipOrderId: string,
    status: "OnHold" | "Pending" | "Archived",
  ): Promise<void> {
    if (status === "OnHold") {
      // Folosim endpoint-ul specific pentru a pune comanda pe hold
      const endpoint = `/api/Order/${helpshipOrderId}/hold`;
      console.log(`[Helpship] Setting order to OnHold using endpoint: ${endpoint}`);
      
      try {
        const response = await this.makeAuthenticatedRequest(endpoint, {
          method: "POST",
          // Endpoint-ul /hold nu necesită body, doar POST la endpoint
        });

        if (response.ok) {
          console.log(`[Helpship] Success setting order to OnHold using ${endpoint}`);
          return;
        } else {
          const errorText = await response.text();
          throw new Error(
            `Failed to set order to OnHold: ${response.status} ${errorText}`,
          );
        }
      } catch (err) {
        console.error(`[Helpship] Failed to set order to OnHold:`, err);
        throw err;
      }
    } else if (status === "Pending") {
      // Folosim endpoint-ul specific pentru a scoate comanda de pe hold (unhold)
      const endpoint = `/api/Order/${helpshipOrderId}/unhold`;
      console.log(`[Helpship] Setting order to Pending using endpoint: ${endpoint}`);
      
      try {
        const response = await this.makeAuthenticatedRequest(endpoint, {
          method: "POST",
          // Endpoint-ul /unhold nu necesită body, doar POST la endpoint
        });

        if (response.ok) {
          console.log(`[Helpship] Success setting order to Pending using ${endpoint}`);
          return;
        } else {
          const errorText = await response.text();
          throw new Error(
            `Failed to set order to Pending: ${response.status} ${errorText}`,
          );
        }
      } catch (err) {
        console.error(`[Helpship] Failed to set order to Pending:`, err);
        throw err;
      }
    } else if (status === "Archived") {
      // Pentru Archived, folosim endpoint-ul general de update sau un endpoint specific
      // Încercăm mai întâi cu endpoint-ul general PUT /api/Order/{id}
      const endpoint = `/api/Order/${helpshipOrderId}`;
      console.log(`[Helpship] Setting order to Archived using endpoint: ${endpoint}`);
      
      try {
        // Obținem comanda curentă pentru a păstra datele
        const currentOrderResponse = await this.makeAuthenticatedRequest(endpoint, {
          method: "GET",
        });

        if (!currentOrderResponse.ok) {
          const errorText = await currentOrderResponse.text();
          throw new Error(`Failed to get order: ${currentOrderResponse.status} ${errorText}`);
        }

        const currentOrder = await currentOrderResponse.json();
        
        // Actualizăm doar status-ul
        const updatePayload = {
          ...currentOrder,
          status: 6, // 6 = Archived (conform enum-ului din documentație)
          statusName: "Archived",
        };

        const response = await this.makeAuthenticatedRequest(endpoint, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });

        if (response.ok) {
          console.log(`[Helpship] Success setting order to Archived using ${endpoint}`);
          return;
        } else {
          const errorText = await response.text();
          throw new Error(
            `Failed to set order to Archived: ${response.status} ${errorText}`,
          );
        }
      } catch (err) {
        console.error(`[Helpship] Failed to set order to Archived:`, err);
        throw err;
      }
    } else {
      throw new Error(`Unsupported status: ${status}`);
    }
  }

  /**
   * Obține status-ul unei comenzi din Helpship
   */
  async getOrderStatus(helpshipOrderId: string): Promise<{ status: number; statusName: string } | null> {
    try {
      console.log(`[Helpship] Getting order status for ${helpshipOrderId}...`);
      const response = await this.makeAuthenticatedRequest(`/api/Order/${helpshipOrderId}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Helpship] Failed to get order status: ${response.status} ${errorText}`);
        return null;
      }

      const order = await response.json();
      const status = order.status ?? null;
      const statusName = order.statusName ?? null;

      console.log(`[Helpship] Order ${helpshipOrderId} has status: ${status} (${statusName})`);
      return { status, statusName };
    } catch (err) {
      console.error(`[Helpship] Error getting order status:`, err);
      return null;
    }
  }

  /**
   * Anulează o comandă în Helpship folosind endpoint-ul specific
   * POST /api/order/cancel cu array de order IDs în body
   */
  async cancelOrder(helpshipOrderId: string): Promise<void> {
    const endpoint = `/api/order/cancel`;
    console.log(`[Helpship] Canceling order ${helpshipOrderId} using endpoint: ${endpoint}`);
    
    try {
      const response = await this.makeAuthenticatedRequest(endpoint, {
        method: "POST",
        body: JSON.stringify([helpshipOrderId]), // Array cu order ID
      });

      if (response.ok) {
        console.log(`[Helpship] Success canceling order ${helpshipOrderId}`);
        return;
      } else {
        const errorText = await response.text();
        throw new Error(
          `Failed to cancel order: ${response.status} ${errorText}`,
        );
      }
    } catch (err) {
      console.error(`[Helpship] Failed to cancel order:`, err);
      throw err;
    }
  }

  /**
   * Anulează anularea unei comenzi în Helpship folosind endpoint-ul specific
   * POST /api/Order/uncancel cu array de order IDs în body
   */
  async uncancelOrder(helpshipOrderId: string): Promise<void> {
    const endpoint = `/api/Order/uncancel`;
    console.log(`[Helpship] Uncanceling order ${helpshipOrderId} using endpoint: ${endpoint}`);
    
    try {
      const response = await this.makeAuthenticatedRequest(endpoint, {
        method: "POST",
        body: JSON.stringify([helpshipOrderId]), // Array cu order ID
      });

      if (response.ok) {
        console.log(`[Helpship] Success uncanceling order ${helpshipOrderId}`);
        return;
      } else {
        const errorText = await response.text();
        throw new Error(
          `Failed to uncancel order: ${response.status} ${errorText}`,
        );
      }
    } catch (err) {
      console.error(`[Helpship] Failed to uncancel order:`, err);
      throw err;
    }
  }

  /**
   * Obține datele complete ale unei comenzi din Helpship
   */
  async getOrder(helpshipOrderId: string): Promise<any | null> {
    try {
      console.log(`[Helpship] Getting order data for ${helpshipOrderId}...`);
      const response = await this.makeAuthenticatedRequest(`/api/Order/${helpshipOrderId}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Helpship] Failed to get order: ${response.status} ${errorText}`);
        return null;
      }

      const order = await response.json();
      console.log(`[Helpship] Order ${helpshipOrderId} retrieved successfully`);
      return order;
    } catch (err) {
      console.error(`[Helpship] Error getting order:`, err);
      return null;
    }
  }

  /**
   * Actualizează o comandă existentă în Helpship
   * Poate actualiza datele comenzii și/sau status-ul
   */
  async updateOrder(
    helpshipOrderId: string,
    updates: {
      status?: "PENDING" | "ONHOLD";
      paymentStatus?: "Pending" | "Paid";
      customerName?: string;
      customerPhone?: string;
      postalCode?: string;
      discount?: number;
      shippingPrice?: number;
      shippingAddress?: {
        county?: string;
        city?: string;
        address?: string;
        addressLine2?: string;
        zip?: string;
      };
      // Alte câmpuri care pot fi actualizate
    },
  ): Promise<void> {
    console.log(`[Helpship] Updating order ${helpshipOrderId} with:`, JSON.stringify(updates, null, 2));

    // Dacă trebuie să setăm doar status-ul (fără alte update-uri), folosim direct /hold sau /unhold
    if (updates.status && Object.keys(updates).length === 1) {
      try {
        const helpshipStatus = updates.status === "PENDING" ? "Pending" : "OnHold";
        console.log(`[Helpship] Only status update requested, calling setOrderStatus directly...`);
        await this.setOrderStatus(helpshipOrderId, helpshipStatus);
        return;
      } catch (statusError) {
        console.warn("[Helpship] Failed to set order status, trying full update:", statusError);
        // Continuă cu update-ul complet
      }
    }

    // Dacă trebuie să setăm status-ul, o facem separat folosind /hold sau /unhold
    // Status-ul se setează DUPĂ update-ul datelor
    let shouldSetStatus: "OnHold" | "Pending" | null = null;
    if (updates.status) {
      shouldSetStatus = updates.status === "PENDING" ? "Pending" : "OnHold";
      console.log(`[Helpship] Will set status to ${shouldSetStatus} after data update`);
    } else {
      console.log(`[Helpship] No status update requested in updates object`);
    }

    // IMPORTANT: Nu putem folosi endpoint-ul general /api/Order/{id} pentru update
    // deoarece necesită permisiuni de administrator pentru modificarea status-ului
    // Folosim doar endpoint-uri specifice:
    // - /api/order/{id}/updateAddress pentru adresă
    // - /api/Order/{id}/unhold sau /hold pentru status
    
    // Dacă trebuie să actualizăm adresa, folosim endpoint-ul specific /updateAddress
    if (updates.customerName || updates.customerPhone || updates.shippingAddress || updates.postalCode) {
      try {
        // Obținem comanda curentă pentru a păstra datele existente
        const currentOrderResponse = await this.makeAuthenticatedRequest(`/api/Order/${helpshipOrderId}`, {
          method: "GET",
        });
        
        if (currentOrderResponse.ok) {
          const currentOrder = await currentOrderResponse.json();
          const currentAddress = currentOrder.mailingAddress || {};
          
          // Construim mailingAddress cu datele actualizate
          const nameParts = updates.customerName?.trim().split(/\s+/) || 
                           currentAddress.name?.trim().split(/\s+/) || [];
          const firstName = nameParts[0] || null;
          const lastName = nameParts.slice(1).join(" ") || null;
          
          // Street = full address string, Number = extracted number from addressLine2
          const street = updates.shippingAddress?.address || currentAddress.addressLine1 || "";
          const number = updates.shippingAddress?.addressLine2 || currentAddress.number || null;

          // Construim payload-ul pentru updateAddress
          const addressPayload: any = {
            firstName: firstName || currentAddress.firstName || null,
            lastName: lastName || currentAddress.lastName || null,
            addressLine1: street,
            addressLine2: number,
            street: street,
            number: number,
            zip: updates.postalCode || updates.shippingAddress?.zip || currentAddress.zip || null,
            city: updates.shippingAddress?.city || currentAddress.city || "",
            province: updates.shippingAddress?.county || currentAddress.province || "",
            countryId: currentAddress.countryId || null,
            phone: updates.customerPhone || currentAddress.phone || null,
            email: currentAddress.email || "clienti@velaro-shop.ro",
            isTaxpayer: currentAddress.isTaxPayer || false,
            vatRegistrationNumber: currentAddress.vatRegistrationNumber || null,
            tradeRegisterNumber: currentAddress.tradeRegisterNumber || null,
            lockerId: currentAddress.lockerId || null,
          };
          
          // Folosim endpoint-ul specific pentru actualizarea adresei
          // Încercăm ambele variante (Order și order) pentru compatibilitate
          const updateAddressEndpoints = [
            `/api/order/${helpshipOrderId}/updateAddress`,
            `/api/Order/${helpshipOrderId}/updateAddress`,
          ];
          
          let addressUpdated = false;
          for (const updateAddressEndpoint of updateAddressEndpoints) {
            try {
              console.log(`[Helpship] Updating address using endpoint: ${updateAddressEndpoint}`);
          
              const addressResponse = await this.makeAuthenticatedRequest(updateAddressEndpoint, {
                method: "POST",
                body: JSON.stringify(addressPayload),
              });
              
              if (addressResponse.ok) {
                console.log(`[Helpship] Address updated successfully using ${updateAddressEndpoint}`);
                addressUpdated = true;
                break; // Ieșim din loop dacă a reușit
              } else {
                const errorText = await addressResponse.text();
                console.log(`[Helpship] Endpoint ${updateAddressEndpoint} returned ${addressResponse.status}:`, errorText.substring(0, 200));
              }
            } catch (err) {
              console.log(`[Helpship] Endpoint ${updateAddressEndpoint} failed:`, err instanceof Error ? err.message : String(err));
              continue;
            }
          }
          
          if (!addressUpdated) {
            console.error(`[Helpship] Failed to update address. Tried: ${updateAddressEndpoints.join(", ")}`);
            // Nu aruncăm eroarea, continuăm cu setarea status-ului dacă e necesar
            console.warn("[Helpship] Continuing with status update despite address update failure");
          } else {
            console.log(`[Helpship] ✓ Address updated successfully`);
          }
        } else {
          console.warn(`[Helpship] Failed to fetch current order for address update`);
        }
      } catch (err) {
        console.error("[Helpship] Failed to update address:", err);
        // Nu aruncăm eroarea, continuăm cu setarea status-ului dacă e necesar
        console.warn("[Helpship] Continuing with status update despite address update failure");
      }
    } else {
      console.log("[Helpship] No address update needed");
    }

    // NOTĂ: Nu folosim endpoint-ul general /api/Order/{id} pentru update
    // deoarece necesită permisiuni de administrator și returnează eroare 500/405
    // Folosim doar endpoint-uri specifice:
    // - /api/order/{id}/updateAddress pentru adresă (deja făcut mai sus)
    // - /api/Order/{id}/unhold sau /hold pentru status (se face mai jos)
    // - Testăm PUT /api/Order/{id} pentru pricing fields (discount, shipping)

    // Încercăm să actualizăm pricing fields (discount, shippingPrice)
    if (updates.discount !== undefined || updates.shippingPrice !== undefined) {
      try {
        const pricingPayload: any = {};

        if (updates.discount !== undefined) {
          pricingPayload.discountPrice = updates.discount;
        }

        if (updates.shippingPrice !== undefined) {
          pricingPayload.shippingPrice = updates.shippingPrice;
        }

        console.log(`[Helpship] Attempting to update pricing fields:`, pricingPayload);

        const pricingResponse = await this.makeAuthenticatedRequest(`/api/Order/${helpshipOrderId}`, {
          method: "PUT",
          body: JSON.stringify(pricingPayload),
        });

        if (pricingResponse.ok) {
          console.log(`[Helpship] ✓ Pricing fields updated successfully`);
        } else {
          const errorText = await pricingResponse.text();
          console.warn(`[Helpship] Failed to update pricing fields (${pricingResponse.status}):`, errorText.substring(0, 200));
          console.warn(`[Helpship] Pricing fields will need to be updated manually in Helpship admin panel`);
        }
      } catch (err) {
        console.warn("[Helpship] Failed to update pricing fields:", err instanceof Error ? err.message : String(err));
        console.warn("[Helpship] Pricing fields will need to be updated manually in Helpship admin panel");
      }
    }

    // PaymentStatus - nu poate fi actualizat fără permisiuni admin
    if (updates.paymentStatus) {
      console.log(`[Helpship] Note: paymentStatus update requested (${updates.paymentStatus}), but cannot update via API (requires admin permissions)`);
    }

    // După update-ul datelor, setăm status-ul dacă e necesar
    // IMPORTANT: Status-ul se setează ÎNTOTDEAUNA după update-ul datelor
    console.log(`[Helpship] ========================================`);
    console.log(`[Helpship] Checking if status update is needed. shouldSetStatus: ${shouldSetStatus}`);
    console.log(`[Helpship] updates.status: ${updates.status}`);
    console.log(`[Helpship] ========================================`);
    
    if (shouldSetStatus) {
      console.log(`[Helpship] ✓ Status update needed: ${shouldSetStatus}`);
      console.log(`[Helpship] Calling setOrderStatus(${helpshipOrderId}, "${shouldSetStatus}")...`);
      try {
        await this.setOrderStatus(helpshipOrderId, shouldSetStatus);
        console.log(`[Helpship] ✓✓✓ Order status successfully set to ${shouldSetStatus}`);
      } catch (statusError) {
        console.error("[Helpship] ✗✗✗ Failed to set order status after update:", statusError);
        // Aruncăm eroarea pentru a vedea problema
        throw new Error(`Failed to set order status to ${shouldSetStatus}: ${statusError instanceof Error ? statusError.message : String(statusError)}`);
      }
    } else {
      console.log("[Helpship] ⚠️⚠️⚠️ No status update requested - shouldSetStatus is null/undefined");
      console.log("[Helpship] This should not happen if status: 'PENDING' was passed in updates");
    }
  }
}

// Exportăm clasa pentru a putea crea instanțe cu credențiale custom
export { HelpshipClient };

// Exportăm o instanță singleton cu credențiale din env (pentru backward compatibility)
export const helpshipClient = new HelpshipClient();
