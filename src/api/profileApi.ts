import api, { unwrapData } from './client';
import type { Vendor } from '@/types/vendor';

export type UpdateProfilePayload = Partial<{
  name: string;
  email: string;
  phone: string;
  business_type: string;
  address: string;
  postcode: string;
  service_category_ids: (string | number)[];
}>;

export async function getProfile() {
  return unwrapData<{ vendor?: Vendor } | Vendor>(await api.get('/me'));
}

export async function updateProfile(payload: UpdateProfilePayload) {
  return unwrapData<{ vendor?: Vendor } | Vendor>(await api.post('/profile', payload));
}

export async function changePassword(payload: { current_password: string; password: string; password_confirmation: string }) {
  return unwrapData(await api.post('/change-password', payload));
}

export async function logoutVendor() {
  return unwrapData(await api.post('/logout'));
}
