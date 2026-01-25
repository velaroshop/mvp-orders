import { supabaseAdmin } from "./supabase";

export interface HelpshipCredentials {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  apiBaseUrl: string;
}

export type HelpshipEnvironment = "development" | "production";

// Helpship API URLs by environment
const HELPSHIP_URLS = {
  development: {
    tokenUrl: "https://helpship-auth-develop.azurewebsites.net/connect/token",
    apiBaseUrl: "https://helpship-api-develop.azurewebsites.net",
  },
  production: {
    tokenUrl: "https://helpship-auth.azurewebsites.net/connect/token",
    apiBaseUrl: "https://helpship-api.azurewebsites.net",
  },
};

/**
 * Get the current Helpship environment from system settings
 * Defaults to 'production' if not set
 */
export async function getHelpshipEnvironment(): Promise<HelpshipEnvironment> {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("helpship_environment")
      .single();

    if (error || !data) {
      console.warn("[Helpship] No system settings found, defaulting to production");
      return "production";
    }

    return data.helpship_environment as HelpshipEnvironment;
  } catch (error) {
    console.error("[Helpship] Error fetching system settings:", error);
    return "production";
  }
}

/**
 * Get Helpship credentials for an organization
 * Uses system_settings for environment (DEV/PROD) and organization settings for client credentials
 */
export async function getHelpshipCredentials(
  organizationId: string
): Promise<HelpshipCredentials> {
  try {
    // Get the current environment from system settings
    const environment = await getHelpshipEnvironment();
    const urls = HELPSHIP_URLS[environment];

    console.log(`[Helpship] Using ${environment.toUpperCase()} environment`);

    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("helpship_client_id, helpship_client_secret")
      .eq("organization_id", organizationId)
      .single();

    if (error || !data) {
      console.warn(
        `[Helpship] No settings found for organization ${organizationId}, using environment defaults`
      );
      return {
        clientId: process.env.HELPSHIP_CLIENT_ID || "",
        clientSecret: process.env.HELPSHIP_CLIENT_SECRET || "",
        tokenUrl: urls.tokenUrl,
        apiBaseUrl: urls.apiBaseUrl,
      };
    }

    // Use organization settings for credentials, system settings for URLs
    return {
      clientId: data.helpship_client_id || process.env.HELPSHIP_CLIENT_ID || "",
      clientSecret:
        data.helpship_client_secret || process.env.HELPSHIP_CLIENT_SECRET || "",
      tokenUrl: urls.tokenUrl,
      apiBaseUrl: urls.apiBaseUrl,
    };
  } catch (error) {
    console.error(
      `[Helpship] Error fetching credentials for organization ${organizationId}:`,
      error
    );
    // Fallback to production environment on error
    return {
      clientId: process.env.HELPSHIP_CLIENT_ID || "",
      clientSecret: process.env.HELPSHIP_CLIENT_SECRET || "",
      tokenUrl: HELPSHIP_URLS.production.tokenUrl,
      apiBaseUrl: HELPSHIP_URLS.production.apiBaseUrl,
    };
  }
}
