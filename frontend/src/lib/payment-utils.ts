// Payment utilities and types
export type PaymentMethod = 'alipay' | 'wechat' | 'credit_card';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type MembershipTier = 'free' | 'basic' | 'premium' | 'super';
export type BillingCycle = 'monthly' | 'yearly';

export interface PaymentOrder {
  id: string;
  userId: string;
  plan: MembershipTier;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentUrl?: string;
  qrCode?: string;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export interface PaymentSession {
  orderId: string;
  sessionId: string;
  paymentUrl: string;
  qrCode?: string;
  expiresAt: Date;
}

export interface PricingInfo {
  tier: MembershipTier;
  monthly: number;
  yearly: number;
  currency: string;
}

// Pricing configuration
export const PRICING: Record<MembershipTier, PricingInfo> = {
  free: {
    tier: 'free',
    monthly: 0,
    yearly: 0,
    currency: 'CNY'
  },
  basic: {
    tier: 'basic',
    monthly: 29,
    yearly: 290,
    currency: 'CNY'
  },
  premium: {
    tier: 'premium',
    monthly: 99,
    yearly: 990,
    currency: 'CNY'
  },
  super: {
    tier: 'super',
    monthly: 299,
    yearly: 2990,
    currency: 'CNY'
  }
};

// Calculate price based on tier and billing cycle
export function calculatePrice(
  tier: MembershipTier,
  cycle: BillingCycle,
  currency: string = 'CNY'
): number {
  const pricing = PRICING[tier];
  const basePrice = cycle === 'monthly' ? pricing.monthly : pricing.yearly;

  // Convert currency if needed (mock conversion rates)
  if (currency === 'USD' && pricing.currency === 'CNY') {
    return Math.round(basePrice / 7); // Approximate CNY to USD
  }

  return basePrice;
}

// Calculate discount percentage for yearly billing
export function calculateYearlyDiscount(tier: MembershipTier): number {
  if (tier === 'free') return 0;

  const pricing = PRICING[tier];
  const monthlyTotal = pricing.monthly * 12;
  const yearlyPrice = pricing.yearly;

  if (monthlyTotal === 0) return 0;

  return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
}

// Format price with currency
export function formatPrice(
  amount: number,
  currency: string = 'CNY'
): string {
  const symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$'
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString()}`;
}

// Validate credit card number (Luhn algorithm)
export function validateCreditCard(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '');

  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Format credit card number with spaces
export function formatCreditCard(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  const parts = [];

  for (let i = 0; i < cleanNumber.length; i += 4) {
    parts.push(cleanNumber.slice(i, i + 4));
  }

  return parts.join(' ');
}

// Validate CVV
export function validateCVV(cvv: string): boolean {
  const cleanCVV = cvv.replace(/\D/g, '');
  return cleanCVV.length === 3 || cleanCVV.length === 4;
}

// Validate expiry date
export function validateExpiry(expiry: string): boolean {
  const parts = expiry.split('/');
  if (parts.length !== 2) return false;

  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);

  if (month < 1 || month > 12) return false;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100;
  const currentMonth = currentDate.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
}

// Generate mock order ID
export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD${timestamp}${random}`;
}

// Generate mock session ID
export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `SES${timestamp}${random}`;
}

// Generate mock QR code data
export function generateQRCode(paymentMethod: PaymentMethod, orderId: string): string {
  const baseUrls: Record<PaymentMethod, string> = {
    alipay: 'alipay://pay/',
    wechat: 'weixin://pay/',
    credit_card: 'https://pay.example.com/'
  };

  return `${baseUrls[paymentMethod]}${orderId}`;
}

// Mock payment processor delay
export function mockPaymentDelay(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 2000 + Math.random() * 2000); // 2-4 seconds delay
  });
}

// Test card numbers for development
export const TEST_CARDS = {
  success: '4242 4242 4242 4242',
  decline: '4000 0000 0000 0002',
  insufficientFunds: '4000 0000 0000 9995',
  expired: '4000 0000 0000 0069',
  processingError: '4000 0000 0000 0119'
};

// Get test card behavior
export function getTestCardBehavior(cardNumber: string): 'success' | 'decline' | 'error' {
  const cleanNumber = cardNumber.replace(/\D/g, '');

  switch (cleanNumber) {
    case '4242424242424242':
      return 'success';
    case '4000000000000002':
    case '4000000000009995':
    case '4000000000000069':
      return 'decline';
    case '4000000000000119':
      return 'error';
    default:
      return 'success'; // Default to success for other test cards
  }
}