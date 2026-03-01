import { API_PREFIX, publicJsonFetch } from './apiClient';

const DONATION_CHECKOUT_PATH = `${API_PREFIX}/donations/checkout-session`;
const DEFAULT_PAYMENT_LINK = 'https://buy.stripe.com/aFa5kx1qGg3s74Md4C2Ry00';

const isValidHttpUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const resolvePaymentLink = () => {
  const envLink = (import.meta.env.VITE_STRIPE_PAYMENT_LINK || '').trim();
  if (isValidHttpUrl(envLink)) return envLink;
  return DEFAULT_PAYMENT_LINK;
};

export async function createDonationCheckoutSession({ amountCents } = {}) {
  const paymentLink = resolvePaymentLink();
  if (paymentLink) {
    return paymentLink;
  }

  const payload = {};
  if (Number.isInteger(amountCents)) {
    payload.amount = amountCents;
  }

  const result = await publicJsonFetch({
    path: DONATION_CHECKOUT_PATH,
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return result?.url || '';
}
