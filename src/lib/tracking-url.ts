/**
 * Get tracking URL for a given courier and tracking number.
 * Returns null if the courier is unknown/unsupported.
 */
export function getTrackingUrl(deliveryService: string | null | undefined, trackingNumber: string): string | null {
  if (!deliveryService) return null;

  const service = deliveryService.toLowerCase();

  if (service.includes("gls")) {
    return `https://gls-group.eu/RO/ro/urmarire-colet?match=${trackingNumber}`;
  }

  if (service.includes("cargus")) {
    return `https://www.cargus.ro/personal/urmareste-coletul/?tracking_number=${trackingNumber}`;
  }

  if (service.includes("fan")) {
    return `https://www.fancourier.ro/awb-tracking/?tracking=${trackingNumber}`;
  }

  if (service.includes("sameday")) {
    return `https://sameday.ro/#awb=${trackingNumber}`;
  }

  if (service.includes("dpd")) {
    return `https://services.dpd.ro/tracking/?shipmentNumber=${trackingNumber}&language=ro`;
  }

  // Unknown courier - no link
  return null;
}
