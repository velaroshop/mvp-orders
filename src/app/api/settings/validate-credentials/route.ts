import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHelpshipEnvironment } from "@/lib/helpship-credentials";

// Helpship API URLs by environment
const HELPSHIP_AUTH_URLS = {
  development: "https://helpship-auth-develop.azurewebsites.net/connect/token",
  production: "https://helpship-auth.azurewebsites.net/connect/token",
};

// POST - Validate Helpship credentials by attempting to get an access token
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { helpshipClientId, helpshipClientSecret } = body;

    if (!helpshipClientId || !helpshipClientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 },
      );
    }

    // Get current environment and use appropriate URL
    const environment = await getHelpshipEnvironment();
    const tokenUrl = HELPSHIP_AUTH_URLS[environment];

    console.log(`[Validate Credentials] Using ${environment.toUpperCase()} environment`);
    console.log("[Validate Credentials] Attempting to validate Helpship credentials...");

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: helpshipClientId,
        client_secret: helpshipClientSecret,
        scope: "helpship.api",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Validate Credentials] Failed to validate credentials:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      // Return validation failure
      return NextResponse.json({
        valid: false,
        error: "Invalid credentials - authentication failed",
        details: `${response.status}: ${response.statusText}`,
      });
    }

    const data = await response.json();
    console.log("[Validate Credentials] Credentials validated successfully!");

    // Credentials are valid
    return NextResponse.json({
      valid: true,
      message: "Credentials validated successfully",
      expiresIn: data.expires_in,
    });
  } catch (error) {
    console.error("[Validate Credentials] Error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Failed to validate credentials",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
