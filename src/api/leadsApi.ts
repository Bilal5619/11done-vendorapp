import api, { unwrapData } from './client';

/**
 * Leads are customer enquiries the vendor pays to unlock.
 *
 * They are not the same as the jobs in jobsApi: those are bookings the
 * customer has already paid 11Done for. A lead is an introduction — the
 * engineer settles up with the customer directly.
 *
 * Before it is unlocked the server sends only the teaser fields. The customer
 * name, phone, email and address are absent from the response entirely rather
 * than hidden in the app, so there is nothing to read out of the payload.
 */
export type Lead = {
  id: string | number;
  reference: string;
  title: string;
  description?: string | null;
  category?: string | null;
  area?: string | null;
  postcode_area?: string | null;
  urgency?: string | null;
  estimated_job_value?: number | null;
  price: number;
  is_free?: boolean;
  paid_with?: string | null;
  slots_left?: number;
  max_purchases?: number;
  created_at?: string | null;
  expires_at?: string | null;
  unlocked: boolean;
  can_afford?: boolean;

  // Only present once unlocked.
  postcode?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  preferred_contact?: string | null;
  preferred_time?: string | null;
  purchase?: {
    id: string | number;
    amount: number;
    paid_with: string;
    purchased_at?: string | null;
    can_request_refund?: boolean;
    refund_status?: string | null;
  } | null;
};

export type LeadsResponse = {
  leads: Lead[];
  balance: number;
  free_access: boolean;
  free_credits: number;
  needs_coverage: boolean;
};

export async function getAvailableLeads() {
  return unwrapData<LeadsResponse>(await api.get('/leads'));
}

export async function getPurchasedLeads() {
  const response = unwrapData<{ leads?: Lead[] }>(await api.get('/leads/purchased'));
  return response.leads ?? [];
}

export async function getLead(id: string | number) {
  return unwrapData<{ lead: Lead; balance?: number }>(await api.get(`/leads/${id}`));
}

export async function unlockLead(id: string | number) {
  return unwrapData<{ lead: Lead; balance: number; free_credits: number }>(
    await api.post(`/leads/${id}/unlock`)
  );
}

export async function requestLeadRefund(id: string | number, reason: string) {
  return unwrapData<{ refund_status: string }>(
    await api.post(`/leads/${id}/refund-request`, { reason })
  );
}

// The £10 minimum the server enforces, mirrored here only so the amount
// field can validate before a round trip — the server is what actually
// decides and never trusts this.
export const MINIMUM_WALLET_TOPUP = 10;

/**
 * A link to a hosted card-payment page for topping up the balance leads are
 * unlocked from. It always adds to whatever balance is already there — a
 * vendor short by £5 on a £10 lead still tops up the full amount they enter,
 * not just the shortfall. Card details never pass through this app; the
 * link is opened in the system browser and the balance is only credited
 * once the server has verified the payment directly with Stripe.
 */
export async function getWalletTopUpCheckoutUrl(amount: number) {
  return unwrapData<{ checkout_url: string; minimum_topup: number }>(
    await api.post('/wallet/topup-checkout', { amount })
  );
}
