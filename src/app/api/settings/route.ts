import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { debugToken } from "@/lib/meta-ads";

// GET - Retrieve settings for active organization
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    // Fetch settings for organization
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found, which is OK
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    // Return settings or empty object if not found
    // Don't return the actual secret value for security
    const hasSecret = !!(data?.helpship_client_secret);

    const hasVapiKey = !!(data?.vapi_api_key);
    const hasMetaAdsToken = !!(data?.meta_ads_access_token);

    return NextResponse.json({
      settings: {
        helpship_client_id: data?.helpship_client_id || "",
        helpship_client_secret: hasSecret ? "configured" : "", // Indicator that secret exists
        helpship_token_url: data?.helpship_token_url || "https://helpship-auth-develop.azurewebsites.net/connect/token",
        helpship_api_base_url: data?.helpship_api_base_url || "https://helpship-api-develop.azurewebsites.net",
        meta_test_mode: data?.meta_test_mode || false,
        meta_test_event_code: data?.meta_test_event_code || "",
        vat_enabled: data?.vat_enabled ?? false,
        vapi_api_key: hasVapiKey ? "configured" : "",
        vapi_phone_number_id: data?.vapi_phone_number_id || "",
        vapi_assistant_id: data?.vapi_assistant_id || "",
        meta_ads_access_token: hasMetaAdsToken ? "configured" : "",
        meta_ads_account_id: data?.meta_ads_account_id || "",
        meta_ads_token_expires_at: data?.meta_ads_token_expires_at || null,
      },
    });
  } catch (error) {
    console.error("Error fetching settings", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Update settings for active organization
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { helpshipClientId, helpshipClientSecret, vapiApiKey, vapiPhoneNumberId, vapiAssistantId, metaAdsAccessToken, metaAdsAccountId } = body;

    // Require at least one set of fields
    const hasHelpshipFields = helpshipClientId && helpshipClientSecret;
    const hasVapiFields = vapiApiKey !== undefined || vapiPhoneNumberId !== undefined || vapiAssistantId !== undefined;
    const hasMetaAdsFields = metaAdsAccessToken !== undefined || metaAdsAccountId !== undefined;

    if (!hasHelpshipFields && !hasVapiFields && !hasMetaAdsFields) {
      return NextResponse.json(
        { error: "At least one field is required" },
        { status: 400 },
      );
    }

    // Build update object conditionally
    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (hasHelpshipFields) {
      updateFields.helpship_client_id = helpshipClientId;
      updateFields.helpship_client_secret = helpshipClientSecret;
      updateFields.helpship_token_url = "https://helpship-auth-develop.azurewebsites.net/connect/token";
      updateFields.helpship_api_base_url = "https://helpship-api-develop.azurewebsites.net";
    }

    if (vapiApiKey !== undefined) updateFields.vapi_api_key = vapiApiKey;
    if (vapiPhoneNumberId !== undefined) updateFields.vapi_phone_number_id = vapiPhoneNumberId;
    if (vapiAssistantId !== undefined) updateFields.vapi_assistant_id = vapiAssistantId;

    if (metaAdsAccessToken !== undefined) {
      updateFields.meta_ads_access_token = metaAdsAccessToken;
      // Fetch and store token expiry
      if (metaAdsAccessToken) {
        const expiresAt = await debugToken(metaAdsAccessToken);
        if (expiresAt) {
          updateFields.meta_ads_token_expires_at = new Date(expiresAt * 1000).toISOString();
        }
      } else {
        updateFields.meta_ads_token_expires_at = null;
      }
    }
    if (metaAdsAccountId !== undefined) updateFields.meta_ads_account_id = metaAdsAccountId;

    // Check if settings exist
    const { data: existingSettings } = await supabaseAdmin
      .from("settings")
      .select("id")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (existingSettings) {
      // Update existing settings
      const { error } = await supabaseAdmin
        .from("settings")
        .update(updateFields)
        .eq("organization_id", activeOrganizationId);

      if (error) {
        throw new Error(`Failed to update settings: ${error.message}`);
      }
    } else {
      // Insert new settings
      const { error } = await supabaseAdmin
        .from("settings")
        .insert({
          organization_id: activeOrganizationId,
          ...updateFields,
        });

      if (error) {
        throw new Error(`Failed to create settings: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
