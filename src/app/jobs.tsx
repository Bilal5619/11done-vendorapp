import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { acceptJob, claimAvailableJob, getJobs, rejectJob } from '@/api/jobsApi';
import { normalizeApiError } from '@/api';
import { EmptyState, ErrorState, ProtectedScreen, StatusPill, ui } from '@/components/vendor-ui';
import { useNotificationMonitor } from '@/context/NotificationMonitorContext';
import type { JobSummary, JobTabKey } from '@/types/vendor';
import { getJobAddress, getJobBookingId, getJobCustomerName, getJobDateTime, getJobPaymentStatus, getJobServiceName, getJobStatus } from '@/types/vendor';

const tabs: { key: JobTabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'available', label: 'Available Jobs' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

export default function JobsScreen() {
  const { jobsRefreshVersion } = useNotificationMonitor();
  const [activeTab, setActiveTab] = useState<JobTabKey>('all');
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setJobs(await getJobs(activeTab));
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(loadJobs, 0);
    return () => clearTimeout(timer);
  }, [jobsRefreshVersion, loadJobs]);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  return (
    <ProtectedScreen title="Jobs" activeRoute="/jobs">
      <StatusBar style="light" />

<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [styles.tabChip, active && styles.tabChipActive, pressed && ui.pressed]}
            >
              <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadJobs} />
      ) : jobs.length ? (
        jobs.map((job) => <JobCard key={String(job.id)} job={job} activeTab={activeTab} onChanged={loadJobs} />)
      ) : (
        <EmptyState title="No jobs found" text="Matching jobs will appear here as soon as they become available." />
      )}
    </ProtectedScreen>
  );
}

function JobCard({ job, activeTab, onChanged }: { job: JobSummary; activeTab: JobTabKey; onChanged: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const status = getNormalizedStatus(job);
  const isAvailable = activeTab === 'available';
  const canAccept = !isAvailable && (!status || status === 'pending');
  const canReject = !isAvailable && status !== 'completed' && status !== 'rejected';
  const canComplete = !isAvailable && status === 'accepted';

  async function handleClaim() {
    setIsSaving(true);
    setActionError('');
    try {
      await claimAvailableJob(job.id);
      await onChanged();
    } catch (error) {
      setActionError(normalizeApiError(error, 'Available job could not be claimed.').message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusAction(action: 'accept' | 'reject') {
    setIsSaving(true);
    setActionError('');
    try {
      if (action === 'accept') {
        await acceptJob(job.id);
      } else {
        await rejectJob(job.id);
      }
      await onChanged();
    } catch (error) {
      setActionError(normalizeApiError(error, `Job could not be ${action}ed.`).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Pressable
      onPress={() => isAvailable ? undefined : router.push({ pathname: '/job-detail', params: { id: String(job.id) } })}
      style={({ pressed }) => [ui.card, pressed && !isAvailable && ui.pressed]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.cardTitle}>#{getJobBookingId(job)}</Text>
        <StatusPill status={getJobStatus(job)} />
      </View>
      <Text style={ui.value}>{getJobServiceName(job)}</Text>
      <Text style={ui.muted}>{getJobCustomerName(job) || 'Customer details pending'}</Text>
      <Text style={ui.muted}>{getJobAddress(job) || 'Address details pending'}</Text>
      <View style={ui.wrapRow}>
        <Info icon="calendar_month" text={getJobDateTime(job) || 'Date and time pending'} />
        <Info icon="payments" text={`Payment: ${getJobPaymentStatus(job) || 'Pending'}`} />
      </View>
      {actionError ? <Text style={[ui.muted, { color: '#ff8585' }]}>{actionError}</Text> : null}
      {isAvailable ? (
        <Pressable disabled={isSaving} onPress={handleClaim} style={[ui.primaryButton, isSaving && { opacity: 0.5 }]}>
          <Text style={ui.primaryButtonText}>{isSaving ? 'Claiming...' : 'Claim job'}</Text>
        </Pressable>
      ) : null}
      {!isAvailable && (canAccept || canReject || canComplete) ? (
        <View style={ui.wrapRow}>
          {canAccept ? (
            <JobActionButton label="Accept" disabled={isSaving} onPress={() => handleStatusAction('accept')} />
          ) : null}
          {canReject ? (
            <JobActionButton label="Reject" disabled={isSaving} onPress={() => handleStatusAction('reject')} secondary />
          ) : null}
          {canComplete ? (
            <JobActionButton label="Complete" disabled={isSaving} onPress={() => router.push({ pathname: '/job-detail', params: { id: String(job.id) } })} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function JobActionButton({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [secondary ? ui.secondaryButton : ui.primaryButton, pressed && ui.pressed, disabled && { opacity: 0.5 }]}>
      <SymbolView name={{ ios: 'circle', android: label === 'Reject' ? 'close' : 'check', web: label === 'Reject' ? 'close' : 'check' }} size={16} tintColor={secondary ? '#f8fafc' : '#101214'} />
      <Text style={secondary ? ui.secondaryButtonText : ui.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function getNormalizedStatus(job: JobSummary) {
  return getJobStatus(job).toLowerCase();
}

const styles = StyleSheet.create({
  tabRow: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 4,
  },
  tabChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d3b52',
    backgroundColor: '#0f1727',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipActive: {
    backgroundColor: '#23150d',
    borderColor: '#ff8d42',
  },
  tabChipText: {
    fontFamily: 'System',
    color: '#d9e1f2',
    fontSize: 13,
    fontWeight: '800',
  },
  tabChipTextActive: {
    color: '#ffd8b8',
  },
});

function Info({ icon, text }: { icon: 'calendar_month' | 'payments'; text: string }) {
  return (
    <View style={ui.row}>
      <SymbolView name={{ ios: 'circle', android: icon, web: icon }} size={15} tintColor="#ff6a00" />
      <Text style={ui.muted}>{text}</Text>
    </View>
  );
}
