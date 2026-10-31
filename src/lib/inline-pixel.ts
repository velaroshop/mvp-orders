// Meta Pixel for forms that live directly on the page (no iframe/embed.js relay).
// Mirrors what embed.js does on the parent page: standard base code, PageView on init,
// standard events via 'track' and custom events via 'trackCustom', optional test event code.

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

// window.fbq is already declared elsewhere in the project, so read it through a local view of window
type PixelWindow = { fbq?: Fbq; _fbq?: Fbq };
const pixelWindow = () => window as unknown as PixelWindow;

const STANDARD_EVENTS = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];

let initialized = false;
let testEventCode: string | null = null;

function getCookie(name: string): string | null {
  const parts = `; ${document.cookie}`.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop()!.split(";").shift() || null : null;
}

/** _fbp / _fbc written first-party by the pixel on this page */
export function readMetaCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  const fbp = getCookie("_fbp");
  const fbc = getCookie("_fbc");
  return { ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) };
}

/** Initializes the pixel once per page load. `onLoaded` runs after fbevents.js has loaded (cookies exist then). */
export function initInlinePixel(pixelId: string, testCode?: string | null, onLoaded?: () => void) {
  if (typeof window === "undefined" || initialized || !pixelId) return;
  initialized = true;
  testEventCode = testCode || null;

  // Another pixel snippet already on the page: reuse it
  const pw = pixelWindow();
  if (pw.fbq) {
    pw.fbq("init", pixelId);
    pw.fbq("track", "PageView");
    onLoaded?.();
    return;
  }

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  } as Fbq;
  if (!pw._fbq) pw._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  pw.fbq = fbq;

  fbq("init", pixelId);
  fbq("track", "PageView");

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.onload = () => onLoaded?.();
  document.head.appendChild(script);
}

export function trackInlinePixel(event: string, params?: Record<string, unknown>, eventID?: string) {
  if (typeof window === "undefined") return;
  const fbq = pixelWindow().fbq;
  if (!fbq) return;

  const options: Record<string, unknown> = {};
  if (eventID) options.eventID = eventID;
  if (testEventCode) options.test_event_code = testEventCode;
  const hasOptions = Object.keys(options).length > 0;
  const method = STANDARD_EVENTS.includes(event) ? "track" : "trackCustom";

  if (hasOptions) {
    fbq(method, event, params || {}, options);
  } else {
    fbq(method, event, params || {});
  }
}
