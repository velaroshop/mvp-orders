/**
 * Vapi.ai Voice AI Integration
 *
 * Handles outbound AI phone calls for order confirmation.
 * API Docs: https://docs.vapi.ai/api-reference
 * Auth: Bearer token (API key)
 */

export interface VapiCallParams {
  phoneNumberId: string;
  assistantId: string;
  customerNumber: string; // E.164 format: +407xxxxxxxx
  assistantOverrides?: {
    variableValues?: Record<string, string>;
  };
}

export interface VapiCallResponse {
  id: string;
  status: string;
  [key: string]: any;
}

export class VapiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(credentials: { apiKey: string }) {
    this.apiKey = credentials.apiKey;
    this.baseUrl = "https://api.vapi.ai";
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log("[Vapi] Request:", options.method || "GET", url);

    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  /**
   * Create an outbound phone call
   * POST https://api.vapi.ai/call
   */
  async createOutboundCall(
    params: VapiCallParams,
  ): Promise<VapiCallResponse> {
    const payload = {
      phoneNumberId: params.phoneNumberId,
      assistantId: params.assistantId,
      customer: {
        number: params.customerNumber,
      },
      assistantOverrides: params.assistantOverrides,
    };

    console.log(
      "[Vapi] Creating outbound call to:",
      params.customerNumber,
    );

    const response = await this.makeRequest("/call", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Vapi] Call creation failed:", {
        status: response.status,
        body: errorText,
      });
      throw new Error(
        `Vapi call failed: ${response.status} ${errorText}`,
      );
    }

    const data = await response.json();
    console.log("[Vapi] Call created:", data.id);
    return data;
  }

  /**
   * Get call details
   * GET https://api.vapi.ai/call/{callId}
   */
  async getCall(callId: string): Promise<VapiCallResponse> {
    const response = await this.makeRequest(`/call/${callId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Vapi get call failed: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }
}
