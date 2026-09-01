import api, { unwrapData } from './client';
import type { LoginPayload, SignupPayload } from '@/context/AuthContext';
import type { Vendor } from '@/types/vendor';

export type ServiceCategory = {
  id: string | number;
  name?: string | null;
};

export async function getServiceCategories() {
  const response = unwrapData<{ service_categories?: ServiceCategory[]; categories?: ServiceCategory[]; data?: ServiceCategory[] }>(
    await api.get('/service-categories')
  );
  return response.service_categories ?? response.categories ?? response.data ?? [];
}

export async function loginVendor(payload: LoginPayload) {
  return unwrapData<{ access_token: string; vendor: Vendor }>(await api.post('/login', payload));
}

export async function signupVendor(payload: SignupPayload) {
  return unwrapData<{ vendor?: Vendor }>(await api.post('/signup', payload));
}
