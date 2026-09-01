import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { normalizeApiError } from '@/api';
import { acceptJob, claimAvailableJob, getAvailableJobs, getJob, getJobs, rejectJob } from '@/api/jobsApi';
import { getNotifications, markNotificationRead } from '@/api/notificationsApi';
import { IncomingJobModal, type IncomingJobAction } from '@/components/incoming-job-modal';
import { useAuth } from '@/context/AuthContext';
import type { JobDetail, VendorNotification } from '@/types/vendor';

const POLL_INTERVAL_MS = 30_000;
const MAX_HANDLED_KEYS = 200;
const INCOMING_JOB_TYPES = new Set(['job_assigned', 'new_job_available', 'new_job', 'assigned_job']);

type NotificationMonitorValue = {
  unreadCount: number;
  jobsRefreshVersion: number;
  refreshNotifications: () => void;
};

const NotificationMonitorContext = createContext<NotificationMonitorValue | null>(null);

export function NotificationMonitorProvider({ children }: PropsWithChildren) {
  const { token, vendor } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingNotification, setIncomingNotification] = useState<VendorNotification | null>(null);
  const [incomingJob, setIncomingJob] = useState<JobDetail | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [loadedStorageKey, setLoadedStorageKey] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [jobsRefreshVersion, setJobsRefreshVersion] = useState(0);
  const pollInFlightRef = useRef(false);
  const incomingRef = useRef<VendorNotification | null>(null);
  const handledKeysRef = useRef(new Set<string>());
  const knownAssignedJobIdsRef = useRef<Set<string> | null>(null);

  const storageKey = `incoming_job_handled:${vendor?.id ?? 'anonymous'}`;
  const handledReady = loadedStorageKey === storageKey;

  const setIncoming = useCallback((notification: VendorNotification | null) => {
    incomingRef.current = notification;
    setIncomingNotification(notification);
  }, []);

  useEffect(() => {
    let active = true;
    handledKeysRef.current = new Set();
    knownAssignedJobIdsRef.current = null;

    async function restoreHandledKeys() {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        const keys = stored ? JSON.parse(stored) : [];
        if (active && Array.isArray(keys)) {
          handledKeysRef.current = new Set(keys.filter((key): key is string => typeof key === 'string'));
        }
      } catch {
        if (active) handledKeysRef.current = new Set();
      } finally {
        if (active) setLoadedStorageKey(storageKey);
      }
    }

    void restoreHandledKeys();
    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (token) return;
    const timer = setTimeout(() => {
      setUnreadCount(0);
      setIncoming(null);
      setIncomingJob(null);
      setActionError('');
    }, 0);
    return () => clearTimeout(timer);
  }, [setIncoming, token]);

  useEffect(() => {
    if (!token || !handledReady) return;
    let active = true;

    async function pollNotifications() {
      if (!active || pollInFlightRef.current || AppState.currentState !== 'active') return;
      pollInFlightRef.current = true;

      try {
        const [notificationsResult, jobsResult] = await Promise.allSettled([
          getNotifications({ unread_only: true, limit: 50 }),
          getJobs('all'),
        ]);
        if (!active) return;

        const unreadNotifications = notificationsResult.status === 'fulfilled'
          ? notificationsResult.value.notifications.filter(isNotificationUnread)
          : [];
        const assignedJobs = jobsResult.status === 'fulfilled' ? jobsResult.value : null;

        if (notificationsResult.status === 'fulfilled') {
          setUnreadCount(notificationsResult.value.unread_count || unreadNotifications.length);
        }

        const matchingNotifications = unreadNotifications.filter((notification) => (
          INCOMING_JOB_TYPES.has(normalizeNotificationType(notification.type))
        ));

        const notificationCandidate = matchingNotifications.find((notification) => (
          !isHandled(notification, handledKeysRef.current)
        ));
        let fallbackCandidate: VendorNotification | null = null;
        let fallbackJob: JobDetail | null = null;
        let jobsChanged = false;

        if (assignedJobs) {
          const nextIds = new Set(assignedJobs.map((job) => String(job.id)));
          const knownIds = knownAssignedJobIdsRef.current;

          if (knownIds === null) {
            knownAssignedJobIdsRef.current = nextIds;
          } else {
            const newJob = assignedJobs.find((job) => !knownIds.has(String(job.id)));
            nextIds.forEach((id) => knownIds.add(id));

            if (newJob) {
              jobsChanged = true;
              const syntheticNotification: VendorNotification = {
                title: 'New assigned job',
                message: 'A new job has been assigned to you.',
                type: 'assigned_job',
                related_id: newJob.id,
                related_type: 'job',
                is_read: false,
              };

              if (!isHandled(syntheticNotification, handledKeysRef.current)) {
                fallbackCandidate = syntheticNotification;
                fallbackJob = newJob as JobDetail;
              }
            }
          }
        }

        const candidate = notificationCandidate ?? fallbackCandidate;
        if (notificationCandidate || jobsChanged) {
          setJobsRefreshVersion((current) => current + 1);
        }

        if (!candidate || incomingRef.current) return;
        setActionError('');
        setIncomingJob(fallbackJob);
        setIncoming(candidate);

        if (fallbackJob || candidate.related_id === undefined || candidate.related_id === null) return;
        setIsLoadingJob(true);
        try {
          const candidateType = normalizeNotificationType(candidate.type);
          const responseJob = candidateType === 'new_job_available' || candidateType === 'new_job'
            ? (await getAvailableJobs()).find((job) => String(job.id) === String(candidate.related_id)) ?? null
            : extractJob(await getJob(candidate.related_id));
          if (active && incomingRef.current && getNotificationKey(incomingRef.current) === getNotificationKey(candidate)) {
            setIncomingJob(responseJob);
          }
        } catch {
          // Notification details are enough to keep the incoming call usable.
        } finally {
          if (active) setIsLoadingJob(false);
        }
      } catch {
        // Polling failures must not affect the rest of the signed-in app.
      } finally {
        pollInFlightRef.current = false;
      }
    }

    void pollNotifications();
    const interval = setInterval(pollNotifications, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void pollNotifications();
    });

    return () => {
      active = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [handledReady, refreshTick, setIncoming, token]);

  const rememberHandled = useCallback(async (notification: VendorNotification) => {
    handledKeysRef.current.add(getNotificationKey(notification));
    const jobKey = getJobHandledKey(notification);
    if (jobKey) handledKeysRef.current.add(jobKey);
    const keys = Array.from(handledKeysRef.current).slice(-MAX_HANDLED_KEYS);
    handledKeysRef.current = new Set(keys);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(keys));
    } catch {
      // The in-memory key still prevents duplicate ringing for this session.
    }
  }, [storageKey]);

  const markReadSafely = useCallback(async (notification: VendorNotification) => {
    if (notification.id === undefined || notification.id === null) return;
    try {
      await markNotificationRead(notification.id);
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      // Local handled-state prevents repeated ringing when read-marking fails.
    }
  }, []);

  const closeIncoming = useCallback(() => {
    setIncoming(null);
    setIncomingJob(null);
    setIsLoadingJob(false);
    setIsActioning(false);
    setActionError('');
    setRefreshTick((current) => current + 1);
  }, [setIncoming]);

  const handleIncomingAction = useCallback(async (action: IncomingJobAction) => {
    const notification = incomingRef.current;
    if (!notification || isActioning) return;

    setActionError('');
    setIsActioning(true);
    const jobId = notification.related_id ?? incomingJob?.id;

    if (action === 'view' || action === 'dismiss') {
      await Promise.all([rememberHandled(notification), markReadSafely(notification)]);
      closeIncoming();
      if (action === 'view' && jobId !== undefined && jobId !== null) {
        const type = normalizeNotificationType(notification.type);
        if (type === 'new_job_available' || type === 'new_job') {
          router.push('/jobs');
        } else {
          router.push({ pathname: '/job-detail', params: { id: String(jobId) } });
        }
      }
      return;
    }

    if (jobId === undefined || jobId === null) {
      setActionError('This notification does not include a job ID. Please open the Jobs screen.');
      setIsActioning(false);
      return;
    }

    try {
      const type = normalizeNotificationType(notification.type);
      if (action === 'accept') {
        if (type === 'new_job_available' || type === 'new_job') {
          await claimAvailableJob(jobId);
        } else {
          await acceptJob(jobId);
        }
      } else if (type === 'job_assigned' || type === 'assigned_job') {
        await rejectJob(jobId);
      }

      await Promise.all([rememberHandled(notification), markReadSafely(notification)]);
      closeIncoming();
    } catch (error) {
      setActionError(normalizeApiError(error, `Could not ${action} this job.`).message);
      setIsActioning(false);
    }
  }, [closeIncoming, incomingJob?.id, isActioning, markReadSafely, rememberHandled]);

  const value = useMemo<NotificationMonitorValue>(() => ({
    unreadCount,
    jobsRefreshVersion,
    refreshNotifications: () => setRefreshTick((current) => current + 1),
  }), [jobsRefreshVersion, unreadCount]);

  return (
    <NotificationMonitorContext.Provider value={value}>
      {children}
      <IncomingJobModal
        notification={incomingNotification}
        job={incomingJob}
        isLoadingJob={isLoadingJob}
        isActioning={isActioning}
        actionError={actionError}
        onAction={(action) => void handleIncomingAction(action)}
      />
    </NotificationMonitorContext.Provider>
  );
}

export function useNotificationMonitor() {
  const context = useContext(NotificationMonitorContext);
  if (!context) throw new Error('useNotificationMonitor must be used inside NotificationMonitorProvider');
  return context;
}

function getNotificationKey(notification: VendorNotification) {
  return String(notification.id ?? `${notification.type ?? 'job'}:${notification.related_id ?? 'unknown'}`);
}

function getJobHandledKey(notification: VendorNotification) {
  return notification.related_id === undefined || notification.related_id === null
    ? null
    : `job:${notification.related_id}`;
}

function isHandled(notification: VendorNotification, handledKeys: Set<string>) {
  const jobKey = getJobHandledKey(notification);
  return handledKeys.has(getNotificationKey(notification))
    || (jobKey !== null && handledKeys.has(jobKey));
}

function normalizeNotificationType(type: VendorNotification['type']) {
  return String(type ?? '').trim().toLowerCase();
}

function isNotificationUnread(notification: VendorNotification) {
  const value = notification.is_read as unknown;
  return value !== true && value !== 1 && value !== '1';
}

function extractJob(response: { appointment?: JobDetail; job?: JobDetail } | JobDetail): JobDetail | null {
  if ('id' in response) return response as JobDetail;
  const wrapped = response as { appointment?: JobDetail; job?: JobDetail };
  return wrapped.appointment ?? wrapped.job ?? null;
}
