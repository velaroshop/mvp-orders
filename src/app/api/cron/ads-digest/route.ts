import { NextRequest, NextResponse } from "next/server";
import { buildAdsDigest } from "@/lib/ads-digest";
import { sendHtmlEmail } from "@/lib/email";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const ORGANIZATION_ID = process.env.ADS_DIGEST_ORG_ID || "26311df6-5e43-4bbf-87aa-1719a11de36f"; // REDUXIO SRL
const RECIPIENT = process.env.ADS_DIGEST_TO || "contact@reduxio.ro";
const SEND_HOUR = 8; // Romania time

const bucharestHour = (now: Date) =>
  Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Bucharest", hour: "numeric", hourCycle: "h23" }).format(now));

/**
 * Daily ads report by email at 08:00 Romania time.
 * Vercel crons run in UTC, so the job is scheduled twice (05:00 and 06:00 UTC) and only the run that falls on 08:00
 * in Romania (summer or winter time) goes on.
 * ?force=1 skips the hour check; ?dryRun=1 returns the HTML without sending. Both need the cron secret.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const force = params.get("force") === "1";
    const dryRun = params.get("dryRun") === "1";
    const now = new Date();
    if (!force && !dryRun && bucharestHour(now) !== SEND_HOUR) {
      return NextResponse.json({ skipped: true, reason: "Not 08:00 in Romania", hour: bucharestHour(now) });
    }

    const digest = await buildAdsDigest(ORGANIZATION_ID, now);
    if (dryRun) return new NextResponse(digest.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });

    const sent = await sendHtmlEmail({ to: RECIPIENT, subject: digest.subject, html: digest.html });
    if (!sent.ok) {
      console.error("[Cron Ads Digest] Send failed:", sent.error);
      return NextResponse.json({ success: false, error: sent.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, subject: digest.subject, counts: digest.counts });
  } catch (error) {
    console.error("[Cron Ads Digest] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
