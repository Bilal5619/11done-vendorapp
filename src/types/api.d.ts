declare module '@/api' {
  import type { AxiosInstance } from 'axios';
  import type { ApiError, FieldErrors } from '@/api/client';

  const api: AxiosInstance;
  export function setAuthToken(token?: string | null): void;
  export function normalizeApiError(error: unknown, fallback?: string): ApiError;
  export function unwrapData<T>(response: { data?: { data?: T } } | { data?: T }): T;
  export function toFormData(payload: Record<string, unknown>): FormData;
  export type { ApiError, FieldErrors };
  export default api;
}
