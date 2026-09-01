import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getVendorDashboard, type DashboardResponse, type DashboardSummary } from '@/api/dashboardApi';
import { normalizeApiError } from '@/api';
import { Card, EmptyState, ErrorState, ProtectedScreen, SectionIntro, StatusPill, ui } from '@/components/vendor-ui';
import { useAuth } from '@/context/AuthContext';
import type { JobSummary } from '@/types/vendor';
import { getJobAddress, getJobBookingId, getJobCustomerName, getJobDateTime, getJobServiceName, getJobStatus } from '@/types/vendor';

const statItems: { key: keyof DashboardSummary; label: string }[] = [
  { key: 'total_earned', label: 'Total Earned' },
  { key: 'total_services', label: 'Services' },
  { key: 'total_appointments', label: 'All Appointments' },
  { key: 'pending_appointments', label: 'Pending' },
  { key: 'completed_appointments', label: 'Completed' },
  { key: 'rejected_appointments', label: 'Rejected' },
];

export default function DashboardScreen() {
  const { vendor } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const vendorName = vendor?.profile?.name || vendor?.username || 'Vendor';

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const dashboard = await getVendorDashboard();
      setData(dashboard);
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadDashboard, 0);
    return () => clearTimeout(timer);
  }, [loadDashboard]);

  const recentAppointments = data?.recent_appointments ?? [];

  return (
    <ProtectedScreen title="Home" activeRoute="/dashboard">
      <StatusBar style="light" />
      <SectionIntro
        kicker="11DONE Vendor"
        title={vendorName}
        text="Track your earnings, services, and appointment progress with live 11Done data."
      />

      {isLoading ? (
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadDashboard} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {statItems.map((item) => (
              <View key={item.key} style={{ width: '48%', minWidth: 150 }}>
                <Card>
                  <Text style={ui.label}>{item.label}</Text>
                  <Text style={[ui.value, { fontSize: 22, color: item.key === 'total_earned' ? '#ff6a00' : '#f8fafc' }]}>
                    {formatStat(data?.summary?.[item.key], item.key === 'total_earned')}
                  </Text>
                </Card>
              </View>
            ))}
          </View>

          <Card>
            <Text style={ui.cardTitle}>Recent Appointments / Jobs</Text>
            {recentAppointments.length > 0 ? (
              recentAppointments.map((job) => <RecentJobRow key={String(job.id)} job={job} />)
            ) : (
              <EmptyState title="No recent jobs" text="Recent appointments will appear here as soon as your dashboard data is available." />
            )}
          </Card>
        </>
      )}
    </ProtectedScreen>
  );
}

function RecentJobRow({ job }: { job: JobSummary }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/job-detail', params: { id: String(job.id) } })}
      style={({ pressed }) => [ui.card, { backgroundColor: '#151a22' }, pressed && ui.pressed]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.value}>#{getJobBookingId(job)}</Text>
        <StatusPill status={getJobStatus(job)} />
      </View>
      <Text style={ui.muted}>{getJobServiceName(job)}</Text>
      <Text style={ui.muted}>{getJobCustomerName(job) || 'Customer'} - {getJobAddress(job) || 'Address pending'}</Text>
      <View style={ui.row}>
        <SymbolView name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} size={16} tintColor="#ff6a00" />
        <Text style={ui.muted}>{getJobDateTime(job) || 'Date/time pending'}</Text>
      </View>
    </Pressable>
  );
}

function formatStat(value: unknown, money = false) {
  if (value === undefined || value === null || value === '') return money ? '\u00A30.00' : '0';
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  if (money) return `\u00A3${amount.toFixed(2)}`;
  return Number.isInteger(amount) ? String(amount) : String(value);
}

