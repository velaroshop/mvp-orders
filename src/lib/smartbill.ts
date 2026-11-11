// SmartBill Cloud API (v1): invoices for the platform subscriptions.
// Credentials come from the environment: SMARTBILL_EMAIL, SMARTBILL_TOKEN, SMARTBILL_CIF.

const BASE_URL = "https://ws.smartbill.ro/SBORO/api";
const TIMEOUT_MS = 20000;

export class SmartbillError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "SmartbillError";
  }
}

export interface SmartbillClient {
  name: string;
  vatCode?: string; // CUI, with the RO prefix when the company is a VAT payer
  regCom?: string;
  isTaxPayer: boolean;
  address?: string;
  city?: string;
  county?: string;
  country?: string;
  email?: string;
}

export interface SmartbillInvoiceInput {
  series: string;
  client: SmartbillClient;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  currency: string;
  productName: string;
  productCode: string; // SmartBill requires a code on every line
  unit: string;
  quantity: number;
  price: number;
  mentions?: string;
  issuerName?: string; // printed as "Intocmit de"
}

export interface SmartbillPaymentInput {
  client: SmartbillClient;
  invoiceSeries: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  type: SmartbillPaymentType;
}

// Payment documents SmartBill accepts for a collection
export type SmartbillPaymentType = "Ordin plata" | "Card" | "Alta incasare";

export interface SmartbillPaymentStatus {
  total: number;
  paid: number;
  unpaid: number;
  isPaid: boolean;
}

export interface SmartbillInvoiceResult {
  series: string;
  number: string;
}

export function isSmartbillConfigured(): boolean {
  return !!(process.env.SMARTBILL_EMAIL && process.env.SMARTBILL_TOKEN && process.env.SMARTBILL_CIF);
}

function credentials() {
  const email = process.env.SMARTBILL_EMAIL;
  const token = process.env.SMARTBILL_TOKEN;
  const cif = process.env.SMARTBILL_CIF;
  if (!email || !token || !cif) {
    throw new SmartbillError("SmartBill nu este configurat (lipsesc variabilele SMARTBILL_*).");
  }
  return { cif, authorization: "Basic " + Buffer.from(`${email}:${token}`).toString("base64") };
}

async function request(path: string, init: { method?: string; body?: unknown; accept?: string } = {}): Promise<Response> {
  const { authorization } = credentials();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: init.method || "GET",
      headers: {
        Authorization: authorization,
        Accept: init.accept || "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new SmartbillError("SmartBill nu a răspuns la timp.");
    throw new SmartbillError(`Nu m-am putut conecta la SmartBill: ${err instanceof Error ? err.message : "eroare necunoscută"}`);
  } finally {
    clearTimeout(timer);
  }
}

async function jsonOrThrow(res: Response): Promise<any> {
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  if (!res.ok || (json && json.errorText)) {
    throw new SmartbillError(json?.errorText || `SmartBill a răspuns cu eroarea ${res.status}.`, res.status);
  }
  return json;
}

/** Invoice series of the account ("f" invoices, "p" proformas, "c" receipts). */
export async function listSeries(type: "f" | "p" | "c" = "f"): Promise<{ name: string; nextNumber: number }[]> {
  const { cif } = credentials();
  const json = await jsonOrThrow(await request(`/series?cif=${encodeURIComponent(cif)}&type=${type}`));
  return (json?.list || []).map((s: any) => ({ name: s.name, nextNumber: Number(s.nextNumber) }));
}

/** Issues a real invoice. The invoicing app sends it to e-Factura on its own schedule. */
export async function createInvoice(input: SmartbillInvoiceInput): Promise<SmartbillInvoiceResult> {
  const { cif } = credentials();
  const body = {
    companyVatCode: cif,
    client: {
      name: input.client.name,
      vatCode: input.client.vatCode || "",
      regCom: input.client.regCom || "",
      isTaxPayer: input.client.isTaxPayer,
      address: input.client.address || "",
      city: input.client.city || "",
      county: input.client.county || "",
      country: input.client.country || "Romania",
      email: input.client.email || "",
      saveToDb: false,
    },
    isDraft: false,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    seriesName: input.series,
    currency: input.currency,
    language: "RO",
    precision: 2,
    mentions: input.mentions || "",
    ...(input.issuerName ? { issuerName: input.issuerName } : {}),
    products: [
      {
        name: input.productName,
        code: input.productCode,
        isDiscount: false,
        measuringUnitName: input.unit,
        currency: input.currency,
        quantity: input.quantity,
        price: input.price,
        isTaxIncluded: false,
        saveToDb: false,
      },
    ],
  };
  const json = await jsonOrThrow(await request("/invoice", { method: "POST", body }));
  if (!json?.number) throw new SmartbillError("SmartBill nu a întors numărul facturii.");
  return { series: json.series || input.series, number: String(json.number) };
}

/** PDF of an issued invoice. */
export async function getInvoicePdf(series: string, number: string): Promise<Buffer> {
  const { cif } = credentials();
  const res = await request(
    `/invoice/pdf?cif=${encodeURIComponent(cif)}&seriesname=${encodeURIComponent(series)}&number=${encodeURIComponent(number)}`,
    { accept: "application/octet-stream" }
  );
  if (!res.ok) {
    throw new SmartbillError(`Nu s-a putut descărca PDF-ul (${res.status}).`, res.status);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Registers a collection (payment) against an issued invoice. */
export async function registerPayment(input: SmartbillPaymentInput): Promise<void> {
  const { cif } = credentials();
  const body = {
    companyVatCode: cif,
    client: {
      name: input.client.name,
      vatCode: input.client.vatCode || "",
      isTaxPayer: input.client.isTaxPayer,
      address: input.client.address || "",
      city: input.client.city || "",
      county: input.client.county || "",
      country: input.client.country || "Romania",
      email: input.client.email || "",
      saveToDb: false,
    },
    issueDate: input.date,
    currency: input.currency,
    precision: 2,
    value: input.amount,
    type: input.type,
    isCash: false,
    useInvoiceDetails: true,
    invoicesList: [{ seriesName: input.invoiceSeries, number: input.invoiceNumber }],
  };
  await jsonOrThrow(await request("/payment", { method: "POST", body }));
}

/** How much of an invoice has been collected. */
export async function getPaymentStatus(series: string, number: string): Promise<SmartbillPaymentStatus> {
  const { cif } = credentials();
  const json = await jsonOrThrow(
    await request(`/invoice/paymentstatus?cif=${encodeURIComponent(cif)}&seriesname=${encodeURIComponent(series)}&number=${encodeURIComponent(number)}`)
  );
  const total = Number(json?.invoiceTotalAmount ?? 0);
  const paid = Number(json?.paidAmount ?? 0);
  const unpaid = Number(json?.unpaidAmount ?? Math.max(total - paid, 0));
  return { total, paid, unpaid, isPaid: total > 0 && unpaid <= 0.005 };
}
