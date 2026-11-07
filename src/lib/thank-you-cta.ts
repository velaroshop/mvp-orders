import type { ThankYouCta } from "@/components/thank-you/ThankYouProvider";

// Editor preview only: builds the store button the way /api/thank-you/verify does (same defaults), from a row of /api/stores.
// The live endpoint keeps its own copy on purpose, so changing the preview can never touch real orders.
const DEFAULT_MESSAGE =
  "Comanda ta este înregistrată. Un coleg te va suna în curând pentru confirmare.\nDacă vrei, să vezi și alte produse pe care le vindem, apasă butonul de mai jos:";
const DEFAULT_BUTTON_TEXT = "Vezi și alte produse la ofertă";
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface PreviewStore {
  id: string;
  name?: string | null;
  url?: string | null;
  primary_color?: string | null;
  thank_you_cta_message?: string | null;
  thank_you_cta_button_text?: string | null;
  thank_you_cta_button_color?: string | null;
  thank_you_cta_button_text_color?: string | null;
  thank_you_cta_url?: string | null;
}

const pickColor = (value: string | null | undefined, fallback: string) =>
  value && HEX_COLOR.test(value.trim()) ? value.trim() : fallback;

/** null when the store has neither a button link nor a store url (the live page then shows no button either) */
export function previewCtaFromStore(store: PreviewStore): ThankYouCta | null {
  if (!(store.thank_you_cta_url || store.url || "").trim()) return null;
  return {
    message: (store.thank_you_cta_message || "").trim() || DEFAULT_MESSAGE,
    buttonText: (store.thank_you_cta_button_text || "").trim() || DEFAULT_BUTTON_TEXT,
    buttonColor: pickColor(store.thank_you_cta_button_color, pickColor(store.primary_color, "#22c55e")),
    buttonTextColor: pickColor(store.thank_you_cta_button_text_color, "#ffffff"),
    url: "#",
  };
}
