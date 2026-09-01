import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAxiosError } from 'axios';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { setAuthToken } from '@/api';
import { loginVendor, signupVendor } from '@/api/authApi';
import type { Vendor } from '@/types/vendor';

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  username: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  state: string;
  zip_code: string;
  address: string;
  password: string;
  password_confirmation: string;
  details?: string;
};

export type FieldErrors = Record<string, string[]>;

export type AuthError = {
  message: string;
  errors: FieldErrors;
};

type AuthContextValue = {
  vendor: Vendor | null;
  token: string | null;
  isRestoring: boolean;
  login: (payload: LoginPayload) => Promise<{ message: string; vendor: Vendor }>;
  signup: (payload: SignupPayload) => Promise<{ message: string }>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = 'vendor_token';
const VENDOR_KEY = 'vendor_data';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const [storedToken, storedVendor] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(VENDOR_KEY),
        ]);

        if (!isMounted) return;

        if (storedToken) {
          setAuthToken(storedToken);
          setToken(storedToken);
          setVendor(storedVendor ? JSON.parse(storedVendor) : null);
        }
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      vendor,
      token,
      isRestoring,
      async login(payload) {
        try {
          const response = await loginVendor(payload);
          const accessToken = response.access_token;
          const nextVendor = response.vendor;

          if (!accessToken || !nextVendor) {
            throw {
              message: 'Login response was missing vendor session data.',
              errors: {},
            } satisfies AuthError;
          }

          await Promise.all([
            AsyncStorage.setItem(TOKEN_KEY, accessToken),
            AsyncStorage.setItem(VENDOR_KEY, JSON.stringify(nextVendor)),
          ]);
          setAuthToken(accessToken);
          setToken(accessToken);
          setVendor(nextVendor);

          return {
            message: 'Login successful.',
            vendor: nextVendor,
          };
        } catch (error) {
          throw normalizeAuthError(error);
        }
      },
      async signup(payload) {
        try {
          await signupVendor(payload);

          return {
            message: 'Sign up successfully completed. Please login now.',
          };
        } catch (error) {
          throw normalizeAuthError(error);
        }
      },
      async logout() {
        await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(VENDOR_KEY)]);
        setAuthToken(null);
        setToken(null);
        setVendor(null);
      },
    }),
    [isRestoring, token, vendor]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

function normalizeAuthError(error: unknown): AuthError {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    return {
      message: data?.message ?? 'Unable to connect to 11DONE. Please try again.',
      errors: data?.errors ?? {},
    };
  }

  if (isAuthError(error)) {
    return error;
  }

  return {
    message: 'Something went wrong. Please try again.',
    errors: {},
  };
}

function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as AuthError).message === 'string'
  );
}


