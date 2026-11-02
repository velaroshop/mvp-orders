// Coarse device facts from the User-Agent, enough for the statistics screen (no fingerprinting, nothing stored but these labels)

export const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pagespeed|gtmetrix|python|curl|wget/i;
const IN_APP_RE = /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Snapchat/i;

export type UaInfo = { device: "mobile" | "tablet" | "desktop"; os: string; browser: string; inApp: boolean };

export function parseUserAgent(ua: string): UaInfo {
  const tablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
  const mobile = !tablet && /Mobi|iPhone|iPod|Android/i.test(ua);
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "iOS"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Altul";
  const inApp = IN_APP_RE.test(ua);
  const browser = /FBAN|FBAV|FB_IAB/i.test(ua)
    ? "Facebook"
    : /Instagram/i.test(ua)
      ? "Instagram"
      : /TikTok|musical_ly/i.test(ua)
        ? "TikTok"
        : /SamsungBrowser/i.test(ua)
          ? "Samsung"
          : /Firefox|FxiOS/i.test(ua)
            ? "Firefox"
            : /Edg/i.test(ua)
              ? "Edge"
              : /OPR|Opera/i.test(ua)
                ? "Opera"
                : /Chrome|CriOS/i.test(ua)
                  ? "Chrome"
                  : /Safari/i.test(ua)
                    ? "Safari"
                    : "Altul";
  return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", os, browser, inApp };
}
