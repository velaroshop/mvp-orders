/**
 * Meta Events Outbox - Retry Mechanism
 *
 * Implements the outbox pattern for reliable Meta Conversions API event delivery.
 * Failed events are stored in the outbox table and can be retried.
 */

import { supabaseAdmin } from './supabase';
import { sendMetaPurchaseEvent } from './meta-tracking';
import type { MetaEventsOutbox } from './types';

/**
 * Create an outbox entry for a failed Meta event
 */
export async function createOutboxEntry(params: {
  orderId: string;
  eventName: 'Purchase';
  payload: Record<string, any>;
  error: string;
}) {
  const { orderId, eventName, payload, error } = params;

  // Calculate next retry time (exponential backoff: 5 minutes)
  const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data, error: insertError } = await supabaseAdmin
    .from('meta_events_outbox')
    .insert({
      order_id: orderId,
      event_name: eventName,
      payload,
      attempts: 1,
      status: 'pending',
      last_attempt_at: new Date().toISOString(),
      next_retry_at: nextRetryAt,
      last_error: error,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Outbox] Failed to create outbox entry:', insertError);
    throw insertError;
  }

  console.log('[Outbox] Created entry for retry:', {
    outboxId: data.id,
    orderId,
    nextRetryAt,
  });

  return data;
}

/**
 * Retry a single outbox entry
 */
export async function retryOutboxEntry(outboxId: string) {
  try {
    // Fetch outbox entry
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('meta_events_outbox')
      .select('*')
      .eq('id', outboxId)
      .single();

    if (fetchError || !entry) {
      throw new Error(`Outbox entry not found: ${outboxId}`);
    }

    // Check if already sent
    if (entry.status === 'sent') {
      console.log('[Outbox] Entry already sent:', outboxId);
      return { success: true, alreadySent: true };
    }

    // Extract payload data
    const payload = entry.payload;

    console.log('[Outbox] Retrying event:', {
      outboxId,
      orderId: entry.order_id,
      attempts: entry.attempts + 1,
    });

    // Retry the event
    const result = await sendMetaPurchaseEvent({
      orderId: entry.order_id,
      pixelId: payload.pixelId,
      accessToken: payload.accessToken,
      eventSourceUrl: payload.eventSourceUrl,
      testEventCode: payload.testEventCode,
    });

    if (result.success) {
      // Mark as sent
      await supabaseAdmin
        .from('meta_events_outbox')
        .update({
          status: 'sent',
          last_attempt_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', outboxId);

      console.log('[Outbox] ✓ Retry successful:', outboxId);
      return { success: true };
    } else {
      // Increment attempts and schedule next retry
      const newAttempts = entry.attempts + 1;
      const maxAttempts = 5;

      if (newAttempts >= maxAttempts) {
        // Mark as failed after max attempts
        await supabaseAdmin
          .from('meta_events_outbox')
          .update({
            status: 'failed',
            attempts: newAttempts,
            last_attempt_at: new Date().toISOString(),
            last_error: result.error,
          })
          .eq('id', outboxId);

        console.error('[Outbox] ✗ Max retry attempts reached:', {
          outboxId,
          attempts: newAttempts,
        });

        return { success: false, maxAttemptsReached: true };
      } else {
        // Schedule next retry with exponential backoff
        // Backoff: 5min, 15min, 45min, 2h15min
        const backoffMinutes = 5 * Math.pow(3, newAttempts - 1);
        const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

        await supabaseAdmin
          .from('meta_events_outbox')
          .update({
            attempts: newAttempts,
            last_attempt_at: new Date().toISOString(),
            next_retry_at: nextRetryAt,
            last_error: result.error,
          })
          .eq('id', outboxId);

        console.log('[Outbox] Retry scheduled:', {
          outboxId,
          attempts: newAttempts,
          nextRetryAt,
        });

        return { success: false, retryScheduled: true, nextRetryAt };
      }
    }
  } catch (error) {
    console.error('[Outbox] Error retrying entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process all pending outbox entries that are ready for retry
 */
export async function processOutboxRetries() {
  try {
    const now = new Date().toISOString();

    // Fetch all pending entries ready for retry
    const { data: entries, error: fetchError } = await supabaseAdmin
      .from('meta_events_outbox')
      .select('id, order_id, attempts')
      .eq('status', 'pending')
      .lte('next_retry_at', now)
      .order('created_at', { ascending: true })
      .limit(10); // Process max 10 at a time

    if (fetchError) {
      throw fetchError;
    }

    if (!entries || entries.length === 0) {
      console.log('[Outbox] No entries ready for retry');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`[Outbox] Processing ${entries.length} entries`);

    let succeeded = 0;
    let failed = 0;

    // Process each entry
    for (const entry of entries) {
      const result = await retryOutboxEntry(entry.id);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    console.log('[Outbox] Batch complete:', {
      total: entries.length,
      succeeded,
      failed,
    });

    return {
      processed: entries.length,
      succeeded,
      failed,
    };
  } catch (error) {
    console.error('[Outbox] Error processing retries:', error);
    throw error;
  }
}

/**
 * Get outbox statistics
 */
export async function getOutboxStats() {
  try {
    const { data: stats, error } = await supabaseAdmin
      .from('meta_events_outbox')
      .select('status', { count: 'exact' });

    if (error) throw error;

    const pending = stats?.filter(s => s.status === 'pending').length || 0;
    const sent = stats?.filter(s => s.status === 'sent').length || 0;
    const failed = stats?.filter(s => s.status === 'failed').length || 0;

    return { pending, sent, failed, total: (stats?.length || 0) };
  } catch (error) {
    console.error('[Outbox] Error fetching stats:', error);
    throw error;
  }
}
