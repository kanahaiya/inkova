export interface LicensingConfig {
  storeUrl: string;
  checkoutUrl: string;
  priceDisplay: string;
  apiBaseUrl: string;
  proTools: string[];
}

export const INKOVA_LICENSING_CONFIG: LicensingConfig = {
  storeUrl: 'https://inkova.lemonsqueezy.com',
  // Direct checkout link for the $29 Lifetime License
  checkoutUrl: 'https://inkova.lemonsqueezy.com/checkout/buy/inkova-pro-lifetime',
  priceDisplay: '$29 One-Time',
  apiBaseUrl: 'https://api.lemonsqueezy.com/v1/licenses',
  // Tools and presentation features reserved for Inkova Pro
  proTools: ['laser', 'spotlight', 'zoom', 'blur', 'step']
};
