import { publicJsonFetch } from './apiClient';

const DONATION_CHECKOUT_PATH = '/donations/checkout-session';

export async function createDonationCheckoutSession({ amountCents } = {}) {
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
