import { supabaseAdmin } from "@/lib/supabase";

type EntityType = "landing_page" | "product" | "upsell" | "store" | "team_member";
type AuditAction = "create" | "update" | "delete" | "status_change" | "toggle_active";

interface AuditLogParams {
  organizationId: string;
  userId: string;
  userEmail: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}

/**
 * Log an audit entry. Non-blocking — errors are caught and logged,
 * never propagated to the caller.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("audit_log")
      .insert({
        organization_id: params.organizationId,
        user_id: params.userId,
        user_email: params.userEmail,
        entity_type: params.entityType,
        entity_id: params.entityId,
        action: params.action,
        changes: params.changes || {},
        metadata: params.metadata || {},
      });
    if (error) {
      console.error("[AuditLog] Failed to log:", error.message, params);
    }
  } catch (err) {
    console.error("[AuditLog] Unexpected error:", err);
  }
}
