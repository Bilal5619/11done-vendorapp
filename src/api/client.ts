import { create, isAxiosError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export type FieldErrors = Record<string, string[]>;

export type ApiError = {
  message: string;
  errors: FieldErrors;
  status?: number;
  endpoint?: string;
  contentType?: string;
};

type ApiResponseLike<T> = {
  data?: { data?: T } | T;
  headers?: unknown;
  status?: number;
  config?: InternalAxiosRequestConfig;
};

const defaultApiBaseURL = 'https://11done.co.uk/api/v1/vendor';

const apiBaseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseURL;

const api = create({
  baseURL: apiBaseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export function setAuthToken(token?: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

export function unwrapData<T>(response: AxiosResponse<{ data?: T } | T> | ApiResponseLike<T>): T {
  const responseData = response.data as { data?: T } | T | undefined;
  const contentType = getContentType(response);
  const endpoint = getEndpoint(response);

  if (isHtmlResponse(responseData)) {
    throw {
      message: buildApiMessage('Backend returned HTML instead of JSON.', endpoint, getStatus(response)),
      errors: {},
      status: getStatus(response),
      endpoint,
      contentType,
    } satisfies ApiError;
  }

  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return (responseData as { data?: T }).data ?? ({} as T);
  }

  return (responseData ?? {}) as T;
}

export function normalizeApiError(error: unknown, fallback = 'Unable to load 11DONE data. Please try again.'): ApiError {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: FieldErrors } | string | undefined;
    const endpoint = getEndpoint(error.response ?? error.config);
    const status = error.response?.status;
    const contentType = getContentType(error.response);
    const htmlMessage = isHtmlResponse(data) ? 'Backend returned HTML instead of JSON.' : null;
    const unauthorizedMessage = status === 401 ? 'Please login again.' : null;
    const apiMessage = typeof data === 'object' ? data?.message : undefined;

    return {
      message: buildApiMessage(unauthorizedMessage ?? htmlMessage ?? apiMessage ?? fallback, endpoint, status),
      errors: typeof data === 'object' ? data?.errors ?? {} : {},
      status,
      endpoint,
      contentType,
    };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return error as ApiError;
  }

  return { message: fallback, errors: {} };
}

function isHtmlResponse(value: unknown) {
  return typeof value === 'string' && /<(!doctype|html|head|body)\b/i.test(value);
}

function getContentType(response?: unknown) {
  const headers = typeof response === 'object' && response !== null && 'headers' in response
    ? (response as { headers?: unknown }).headers
    : undefined;
  if (!headers || typeof headers !== 'object') return undefined;

  const headerRecord = headers as Record<string, string | string[] | undefined>;
  const value = headerRecord['content-type'] ?? headerRecord['Content-Type'];
  return Array.isArray(value) ? value.join(', ') : value;
}

function getStatus(response?: unknown) {
  return typeof response === 'object' && response !== null && 'status' in response
    ? (response as { status?: number }).status
    : undefined;
}

function getEndpoint(source?: unknown) {
  const config = typeof source === 'object' && source !== null && 'config' in source
    ? (source as { config?: InternalAxiosRequestConfig }).config
    : source as InternalAxiosRequestConfig | undefined;
  if (!config) return undefined;

  const url = config.url ?? '';
  if (/^https?:\/\//i.test(url)) return url;
  return url || undefined;
}

function buildApiMessage(message: string, endpoint?: string, status?: number) {
  const details = [endpoint, status ? `status ${status}` : null].filter(Boolean).join(' - ');
  return details ? `${message} (${details})` : message;
}

export function toFormData(payload: Record<string, unknown>) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    formData.append(key, value as string | Blob);
  });

  return formData;
}

export async function toFormDataAsync(payload: Record<string, unknown>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === '') continue;
    formData.append(key, await normalizeFormValue(value));
  }

  return formData;
}

async function normalizeFormValue(value: unknown) {
  if (isUploadFile(value)) {
    if (value.file instanceof Blob) {
      return withFileName(value.file, value.name);
    }

    if (typeof value.uri === 'string' && typeof fetch === 'function' && /^(blob:|data:)/.test(value.uri)) {
      const blob = await fetch(value.uri).then((response) => response.blob());
      return withFileName(blob, value.name);
    }
  }

  return value as string | Blob;
}

function withFileName(blob: Blob, name?: string) {
  if (typeof File !== 'undefined') {
    return new File([blob], name || 'upload', { type: blob.type || 'application/octet-stream' });
  }

  return blob;
}

function isUploadFile(value: unknown): value is { uri?: string; name?: string; type?: string; file?: Blob } {
  return typeof value === 'object' && value !== null && ('uri' in value || 'file' in value);
}

export default api;

