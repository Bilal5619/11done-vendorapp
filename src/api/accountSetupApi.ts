import api, { toFormDataAsync, unwrapData } from './client';
import type { AccountSetupTask, Vendor, VendorDocument, VendorRegistrationNumber } from '@/types/vendor';

export type AccountSetupResponse = {
  vendor?: Vendor;
  tasks?: AccountSetupTask[];
  documents?: VendorDocument[];
  registration_numbers?: VendorRegistrationNumber[];
  verification_status?: string;
};

export type UploadDocumentPayload = {
  type: string;
  file?: unknown;
  id_type?: string;
  policy_number?: string;
  registration_number?: string;
  registration_authority?: string;
  account_name?: string;
  sort_code?: string;
  account_number?: string;
  right_to_work_is_british?: boolean;
  expiry_date?: string;
  date_of_birth?: string;
};

export async function getAccountSetup() {
  return unwrapData<AccountSetupResponse>(await api.get('/account-setup'));
}

export async function getVendorRegistrationNumbers() {
  const response = unwrapData<AccountSetupResponse>(await api.get('/account-setup'));
  return response.registration_numbers ?? [];
}

export async function getVendorDocuments() {
  const response = unwrapData<{ documents?: VendorDocument[] }>(await api.get('/account-setup'));
  return response.documents ?? [];
}

export async function uploadAccountSetupDocument(payload: UploadDocumentPayload) {
  return unwrapData<{ document?: VendorDocument }>(
    await api.post('/documents', await toFormDataAsync(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
}

export async function uploadVendorDocument(payload: UploadDocumentPayload) {
  return unwrapData<{ document?: VendorDocument }>(
    await api.post('/documents', await toFormDataAsync(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
}

export async function updateBusinessType(payload: { business_type: string }) {
  return unwrapData(await api.post('/business-type', payload));
}

export async function addRegistrationNumber(payload: Record<string, string>) {
  return unwrapData(await api.post('/registration-numbers', payload));
}

export async function deleteRegistrationNumber(id: string | number) {
  return unwrapData(await api.delete(`/registration-numbers/${id}`));
}

export async function submitVerification() {
  return unwrapData(await api.post('/submit-verification'));
}
