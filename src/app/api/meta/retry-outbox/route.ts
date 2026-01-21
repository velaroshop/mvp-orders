import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processOutboxRetries, getOutboxStats } from '@/lib/meta-outbox';

/**
 * POST /api/meta/retry-outbox
 * Manually trigger retry of failed Meta CAPI events
 * Requires authentication
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Meta Retry] Starting manual retry process');

    const result = await processOutboxRetries();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Meta Retry] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meta/retry-outbox
 * Get outbox statistics
 * Requires authentication
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getOutboxStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Meta Retry] Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
