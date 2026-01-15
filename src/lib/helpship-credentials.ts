import { supabaseAdmin } from "./supabase";

export interface HelpshipCredentials {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  apiBaseUrl: string;
}

/**
 * Get Helpship credentials for an organization
 * Falls back to environment variables if not configured
 */
export async function getHelpshipCredentials(
  organizationId: string
): Promise<HelpshipCredentials> {
  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("helpship_client_id, helpship_client_secret, helpship_token_url, helpship_api_base_url")
      .eq("organization_id", organizationId)
      .single();

    if (error || !data) {
      console.warn(
        `[Helpship] No settings found for organization ${organizationId}, using environment defaults`
      );
      return {
        clientId: process.env.HELPSHIP_CLIENT_ID || "",
        clientSecret: process.env.HELPSHIP_CLIENT_SECRET || "",
        tokenUrl:
          process.env.HELPSHIP_TOKEN_URL ||
          "https://helpship-auth-develop.azurewebsites.net/connect/token",
        apiBaseUrl:
          process.env.HELPSHIP_API_BASE_URL ||
          "https://helpship-api-develop.azurewebsites.net",
      };
    }

    // Use organization settings if available
    return {
      clientId: data.helpship_client_id || process.env.HELPSHIP_CLIENT_ID || "",
      clientSecret:
        data.helpship_client_secret || process.env.HELPSHIP_CLIENT_SECRET || "",
      tokenUrl:
        data.helpship_token_url ||
        process.env.HELPSHIP_TOKEN_URL ||
        "https://helpship-auth-develop.azurewebsites.net/connect/token",
      apiBaseUrl:
        data.helpship_api_base_url ||
        process.env.HELPSHIP_API_BASE_URL ||
        "https://helpship-api-develop.azurewebsites.net",
    };
  } catch (error) {
    console.error(
      `[Helpship] Error fetching credentials for organization ${organizationId}:`,
      error
    );
    // Fallback to environment variables on error
    return {
      clientId: process.env.HELPSHIP_CLIENT_ID || "",
      clientSecret: process.env.HELPSHIP_CLIENT_SECRET || "",
      tokenUrl:
        process.env.HELPSHIP_TOKEN_URL ||
        "https://helpship-auth-develop.azurewebsites.net/connect/token",
      apiBaseUrl:
        process.env.HELPSHIP_API_BASE_URL ||
        "https://helpship-api-develop.azurewebsites.net",
    };
  }
}
