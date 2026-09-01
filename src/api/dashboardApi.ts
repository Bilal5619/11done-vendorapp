import api, { unwrapData } from './client';
import type { JobSummary } from '@/types/vendor';

export type DashboardSummary = {
  total_balance?: number | string | null;
  total_earned?: number | string | null;
  total_services?: number | string | null;
  total_appointments?: number | string | null;
  pending_appointments?: number | string | null;
  completed_appointments?: number | string | null;
  rejected_appointments?: number | string | null;
};

export type DashboardResponse = {
  summary?: DashboardSummary;
  recent_appointments?: JobSummary[];
};

export async function getVendorDashboard() {
  return unwrapData<DashboardResponse>(await api.get('/dashboard'));
}
