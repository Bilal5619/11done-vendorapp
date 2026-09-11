import api, { unwrapData } from './client';

/**
 * The vendor's own work: jobs they found themselves and the invoices they
 * raise for them.
 *
 * Separate from jobsApi, which covers 11Done bookings. Nothing here is
 * commissioned or shared — it is their own paperwork, kept in the same app.
 */

export type InvoiceSettings = {
  trading_name?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  address_line_3?: string | null;
  postcode?: string | null;
  telephone?: string | null;
  email?: string | null;
  gas_safe_number?: string | null;
  company_number?: string | null;
  vat_registered: boolean;
  vat_number?: string | null;
  default_vat_rate: number | string;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_sort_code?: string | null;
  payment_terms?: string | null;
  invoice_notes?: string | null;
  invoice_prefix?: string | null;
};

export type MyJob = {
  id: string | number;
  reference?: string | null;
  title: string;
  description?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  customer_postcode?: string | null;
  job_date?: string | null;
  job_time?: string | null;
  price?: number | null;
  status: string;
  notes?: string | null;
  from_lead?: boolean;
  invoice_count?: number;
};

export type InvoiceItem = {
  id?: string | number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  vat_percent: number;
  line_total?: number;
  line_vat?: number;
};

export type MyInvoice = {
  id: string | number;
  invoice_number: string;
  invoice_date?: string | null;
  due_date?: string | null;
  status: string;
  client_name: string;
  client_address_1?: string | null;
  client_address_2?: string | null;
  client_address_3?: string | null;
  client_postcode?: string | null;
  client_telephone?: string | null;
  client_email?: string | null;
  installation_same_as_client: boolean;
  install_name?: string | null;
  install_address_1?: string | null;
  install_address_2?: string | null;
  install_address_3?: string | null;
  install_postcode?: string | null;
  sub_total: number;
  discount_total: number;
  vat_total: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  is_paid: boolean;
  payment_method?: string | null;
  payment_method_label?: string | null;
  bank_details?: string | null;
  terms?: string | null;
  notes?: string | null;
  pdf_url?: string | null;
  items?: InvoiceItem[];
};

// -------------------------------------------------------------- settings

export async function getInvoiceSettings() {
  return unwrapData<{ settings: InvoiceSettings; is_complete: boolean; missing: string[] }>(
    await api.get('/invoice-settings')
  );
}

export async function saveInvoiceSettings(payload: Partial<InvoiceSettings>) {
  return unwrapData<{ settings: InvoiceSettings; is_complete: boolean }>(
    await api.post('/invoice-settings', payload)
  );
}

// -------------------------------------------------------------- own jobs

export async function getMyJobs(status?: string) {
  const response = unwrapData<{ jobs?: MyJob[] }>(
    await api.get('/my-jobs', { params: status ? { status } : undefined })
  );
  return response.jobs ?? [];
}

export async function createMyJob(payload: Partial<MyJob> & { lead_id?: string | number }) {
  return unwrapData<{ job: MyJob }>(await api.post('/my-jobs', payload));
}

export async function updateMyJob(id: string | number, payload: Partial<MyJob>) {
  return unwrapData<{ job: MyJob }>(await api.post(`/my-jobs/${id}`, payload));
}

export async function deleteMyJob(id: string | number) {
  return unwrapData<unknown>(await api.delete(`/my-jobs/${id}`));
}

// -------------------------------------------------------------- invoices

export async function getMyInvoices(filter?: 'paid' | 'unpaid') {
  return unwrapData<{ invoices: MyInvoice[]; outstanding_total: number }>(
    await api.get('/my-invoices', { params: filter ? { filter } : undefined })
  );
}

export async function getMyInvoice(id: string | number) {
  return unwrapData<{ invoice: MyInvoice }>(await api.get(`/my-invoices/${id}`));
}

export type CreateInvoicePayload = {
  vendor_job_id?: string | number | null;
  invoice_date?: string;
  due_date?: string;
  client_name: string;
  client_address_1?: string;
  client_address_2?: string;
  client_address_3?: string;
  client_postcode?: string;
  client_telephone?: string;
  client_email?: string;
  installation_same_as_client?: boolean;
  install_name?: string;
  install_address_1?: string;
  install_address_2?: string;
  install_address_3?: string;
  install_postcode?: string;
  payment_method?: 'cash' | 'card' | 'bank' | null;
  is_paid?: boolean;
  paid_amount?: number;
  notes?: string;
  items: Omit<InvoiceItem, 'id' | 'line_total' | 'line_vat'>[];
};

export async function createMyInvoice(payload: CreateInvoicePayload) {
  return unwrapData<{ invoice: MyInvoice }>(await api.post('/my-invoices', payload));
}

export async function recordInvoicePayment(
  id: string | number,
  payload: { paid_amount?: number; is_paid?: boolean; payment_method?: 'cash' | 'card' | 'bank' }
) {
  return unwrapData<{ invoice: MyInvoice }>(await api.post(`/my-invoices/${id}/payment`, payload));
}
