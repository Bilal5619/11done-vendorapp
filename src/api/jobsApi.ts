import api, { toFormDataAsync, unwrapData } from './client';
import type { CertificateSummary, JobDetail, JobSummary, JobTabKey } from '@/types/vendor';
import { getJobBookingId, getJobPrice, getJobServiceName } from '@/types/vendor';

export type JobsResponse = {
  jobs?: JobSummary[];
  appointments?: JobSummary[] | PaginatedJobs;
  data?: JobSummary[];
  all?: JobSummary[];
  available?: JobSummary[] | PaginatedJobs;
  available_jobs?: JobSummary[] | PaginatedJobs;
  accepted?: JobSummary[];
  pending?: JobSummary[];
  completed?: JobSummary[];
  rejected?: JobSummary[];
};

type PaginatedJobs = {
  data?: JobSummary[];
};

export type CompleteJobPayload = {
  certificate_id?: string | number;
  generated_certificate_id?: string | number;
  generated_certificate_path?: string;
  certificate_file?: unknown;
  job_certificate?: unknown;
  completion_photo?: unknown;
  completion_images?: unknown[];
  notes?: string;
};

export type AppointmentInvoicePayload = Record<string, unknown>;

export type StaffMember = {
  id: string | number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

const statusByTab: Record<JobTabKey, string | undefined> = {
  all: 'all',
  available: undefined,
  accepted: 'accepted',
  pending: 'pending',
  completed: 'completed',
  rejected: 'rejected',
};

const appointmentDetailFields = [
  'customer_address',
  'customer_zip_code',
  'customer_country',
  'site_name',
  'site_email',
  'site_phone',
  'site_number',
  'site_address',
  'site_zip_code',
  'site_country',
  'customer_name',
  'customer_email',
  'customer_phone',
  'service_name',
  'service_title',
  'notes',
  'appointment_date',
].join(',');

export async function getJobs(tab: JobTabKey) {
  if (tab === 'available') {
    return getAvailableJobs();
  }

  const response = unwrapData<JobsResponse | JobSummary[] | PaginatedJobs>(
    await api.get('/appointments', { params: { status: statusByTab[tab] ?? 'all', page: 1, search: '' } })
  );
  return extractJobs(response, ['appointments', 'jobs', tab]);
}

export async function getAvailableJobs() {
  const response = unwrapData<JobsResponse | JobSummary[] | PaginatedJobs>(await api.get('/available-jobs'));
  return extractJobs(response, ['available_jobs', 'available', 'jobs']);
}

export async function getJob(id: string | number) {
  return unwrapData<{ appointment?: JobDetail; job?: JobDetail } | JobDetail>(
    await api.get(`/appointments/${id}`, {
      params: {
        include_fields: appointmentDetailFields,
        fields: appointmentDetailFields,
      },
    })
  );
}

export async function acceptJob(id: string | number) {
  return updateAppointmentStatus(id, 'accepted');
}

export async function rejectJob(id: string | number) {
  return updateAppointmentStatus(id, 'rejected');
}

export async function updateAppointmentStatus(id: string | number, order_status: 'accepted' | 'rejected' | 'pending') {
  return unwrapData(await api.post(`/appointments/${id}/status`, { order_status }));
}

export async function claimAvailableJob(id: string | number) {
  return unwrapData(await api.post(`/available-jobs/${id}/claim`));
}

export async function completeJob(id: string | number, payload: CompleteJobPayload) {
  const formData = new FormData();
  await appendFormValue(formData, 'generated_certificate_id', payload.generated_certificate_id ?? payload.certificate_id);
  await appendFormValue(formData, 'generated_certificate_path', payload.generated_certificate_path);
  const certificateFile = payload.job_certificate ?? payload.certificate_file;
  await appendFormValue(formData, 'job_certificate', certificateFile);

  const completionImages = payload.completion_images ?? (payload.completion_photo ? [payload.completion_photo] : []);
  for (const image of completionImages) {
    await appendFormValue(formData, 'completion_images[]', image);
  }

  await appendFormValue(formData, 'notes', payload.notes);

  return unwrapData(
    await api.post(
      `/appointments/${id}/complete`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  );
}

export async function createAppointmentInvoice(id: string | number, payload: AppointmentInvoicePayload) {
  if (payload.invoice_file) {
    return unwrapData(
      await api.post(`/appointments/${id}/invoice`, await toFormDataAsync(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  }

  return unwrapData(await api.post(`/appointments/${id}/invoice`, payload));
}

export function buildAppointmentInvoicePayload(job: JobSummary): AppointmentInvoicePayload {
  const amount = parseMoney(getJobPrice(job));
  const commissionRate = 20;
  const commissionAmount = amount * (commissionRate / 100);
  const vendorPayoutAmount = amount - commissionAmount;

  return {
    booking_id: getJobBookingId(job),
    job_id: job.id,
    service_title: getJobServiceName(job),
    vendor_name: job.vendor?.profile?.name ?? job.vendor?.username ?? '',
    invoice_date: getTodayForInvoice(),
    date: getTodayForInvoice(),
    amount: amount.toFixed(2),
    customer_paid_amount: amount.toFixed(2),
    platform_commission: `${commissionRate}%`,
    commission_amount: commissionAmount.toFixed(2),
    vendor_payout_amount: vendorPayoutAmount.toFixed(2),
    vat_tax: '',
    bank_details: '',
    notes: '',
    invoice_status: 'submitted',
    payment_status: 'unpaid',
  };
}

export async function attachCertificateToJob(id: string | number, certificate: CertificateSummary | string | number) {
  const certificate_id = typeof certificate === 'object' ? certificate.id : certificate;
  return completeJob(id, { certificate_id });
}

export async function getStaff() {
  const response = unwrapData<{ staff?: StaffMember[]; data?: StaffMember[] }>(await api.get('/staff'));
  return response.staff ?? response.data ?? [];
}

export async function assignAppointmentStaff(payload: { appointment_id: string | number; staff_id: string | number }) {
  return unwrapData(await api.post('/appointments/staff-assign', payload));
}

async function appendFormValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return;

  const normalized = await toFormDataAsync({ [key]: value });
  const entries = normalized.entries?.();
  if (!entries) {
    formData.append(key, value as string | Blob);
    return;
  }

  for (const [, entryValue] of entries) {
    formData.append(key, entryValue);
  }
}

function extractJobs(response: unknown, keys: string[]): JobSummary[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== 'object') {
    return [];
  }

  const record = response as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    return record.data as JobSummary[];
  }

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value as JobSummary[];
    }

    if (value && typeof value === 'object' && Array.isArray((value as PaginatedJobs).data)) {
      return (value as PaginatedJobs).data ?? [];
    }
  }

  return [];
}

function getTodayForInvoice() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === 'number') return value;
  const normalized = String(value ?? '').replace(/[^0-9.-]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}
