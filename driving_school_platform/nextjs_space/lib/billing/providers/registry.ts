import type { BillingProvider, BillingProviderId } from "@/lib/billing";
import { sibsBillingProvider } from "./sibs/sibs-provider";
import { createEnvelopeBillingProvider } from "./skeleton/envelope-provider";

const stripeBillingProvider = createEnvelopeBillingProvider("stripe");
const paypalBillingProvider = createEnvelopeBillingProvider("paypal");

export const BILLING_PROVIDERS: Readonly<
  Record<BillingProviderId, BillingProvider>
> = {
  sibs: sibsBillingProvider,
  stripe: stripeBillingProvider,
  paypal: paypalBillingProvider,
};

export function getBillingProvider(id: BillingProviderId): BillingProvider {
  return BILLING_PROVIDERS[id];
}

export function isSupportedBillingProviderId(
  x: string,
): x is BillingProviderId {
  return x === "sibs" || x === "stripe" || x === "paypal";
}
