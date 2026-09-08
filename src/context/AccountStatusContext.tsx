import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getAccountSetup } from '@/api/accountSetupApi';
import { useAuth } from '@/context/AuthContext';
import type { AccountSetupTask } from '@/types/vendor';

type AccountStatusValue = {
  tasks: AccountSetupTask[];
  outstandingLabels: string[];
  isComplete: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

/** A task in one of these states still needs the vendor to do something. */
const outstandingStatuses = ['missing', 'rejected'];

const AccountStatusContext = createContext<AccountStatusValue | null>(null);

export function AccountStatusProvider({ children }: PropsWithChildren) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<AccountSetupTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setTasks([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getAccountSetup();
      setTasks(response.tasks ?? []);
    } catch {
      // A failed check must not lock the vendor out of the app.
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const value = useMemo<AccountStatusValue>(() => {
    const outstanding = tasks.filter(
      (task) =>
        String(task.status ?? '') !== 'optional' &&
        outstandingStatuses.includes(String(task.status ?? ''))
    );

    return {
      tasks,
      outstandingLabels: outstanding.map(
        (task) => task.label?.trim() || String(task.type ?? task.key ?? 'Account detail')
      ),
      isComplete: outstanding.length === 0,
      isLoading,
      refresh,
    };
  }, [isLoading, refresh, tasks]);

  return <AccountStatusContext.Provider value={value}>{children}</AccountStatusContext.Provider>;
}

export function useAccountStatus() {
  const context = useContext(AccountStatusContext);

  if (!context) {
    throw new Error('useAccountStatus must be used inside AccountStatusProvider');
  }

  return context;
}
