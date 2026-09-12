import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getJobs } from '@/api/jobsApi';
import { normalizeApiError } from '@/api';
import { Card, EmptyState, ErrorState, ProtectedScreen, ui } from '@/components/vendor-ui';
import type { JobSummary } from '@/types/vendor';
import {
  getJobCommissionAmount,
  getJobCommissionPercentage,
  getJobCustomerName,
  getJobInvoicePaymentStatus,
  getJobPrice,
  getJobServiceName,
  getJobStatus,
  getJobVatOnCommission,
  getJobVendorPayoutAmount,
  hasJobInvoice,
} from '@/types/vendor';

/**
 * What a vendor actually takes home on 11Done jobs: the price the customer
 * paid, what 11Done's commission took out of it, and what's left as their
 * payout — plus, only ever for their own records, what they'd owe VAT on for
 * that commission if they're VAT registered. Nothing here is a second copy of
 * the money logic; every figure comes straight off the invoice 11Done already
 * calculated (see Invoice::getVatOnCommissionAttribute on the server) so this
 * screen can't drift out of step with what actually gets paid.
 */
export default function EarningsScreen() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const completedJobs = await getJobs('completed');
      setJobs(
        completedJobs.filter(
          (job) => getJobStatus(job).toLowerCase() === 'completed' && hasJobInvoice(job),
        ),
      );
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ProtectedScreen title="Earnings" activeRoute="/earnings">
      <StatusBar style="light" />

      {isLoading ? (
        <View style={ui.stateCard}>
          <ActivityIndicator color="#ff6a00" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : jobs.length ? (
        jobs.map((job) => <EarningsCard key={String(job.id)} job={job} />)
      ) : (
        <EmptyState
          title="No payouts yet"
          text="Once you invoice a completed 11Done job, the commission and your payout for it will show up here."
        />
      )}
    </ProtectedScreen>
  );
}

function EarningsCard({ job }: { job: JobSummary }) {
  const commissionPercentage = getJobCommissionPercentage(job);
  const commissionAmount = getJobCommissionAmount(job);
  const vatOnCommission = getJobVatOnCommission(job);
  const payoutAmount = getJobVendorPayoutAmount(job);
  const payoutStatus = getJobInvoicePaymentStatus(job);
  const vatOwed = Number(vatOnCommission) > 0;

  return (
    <Card>
      <Pressable
        onPress={() => router.push({ pathname: '/job-detail', params: { id: String(job.id) } })}
      >
        <Text style={ui.cardTitle}>{getJobServiceName(job)}</Text>
        <Text style={ui.muted}>{getJobCustomerName(job) || 'Customer details pending'}</Text>
      </Pressable>

      <Row label="Customer paid" value={getJobPrice(job) || 'Not provided'} />
      <Row
        label={`11Done commission${commissionPercentage ? ` (${commissionPercentage}%)` : ''}`}
        value={commissionAmount ? `− ${commissionAmount}` : 'Not provided'}
      />
      <Row
        label="VAT on our commission"
        value={vatOwed ? vatOnCommission ?? 'N/A' : 'N/A'}
        hint={vatOwed ? 'For your own VAT records — this is not deducted from your payout.' : "You're not VAT registered, so there's nothing to account for here."}
      />
      <View style={{ height: 1, backgroundColor: '#232a35', marginVertical: 8 }} />
      <Row label="Your payout" value={payoutAmount || 'Not provided'} bold />
      {payoutStatus ? <Row label="Payout status" value={payoutStatus} /> : null}
    </Card>
  );
}

function Row({
  label,
  value,
  hint,
  bold,
}: {
  label: string;
  value: string;
  hint?: string;
  bold?: boolean;
}) {
  return (
    <View style={{ marginTop: 6 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.muted}>{label}</Text>
        <Text style={bold ? ui.cardTitle : ui.value}>{value}</Text>
      </View>
      {hint ? (
        <View style={[ui.row, { marginTop: 2 }]}>
          <SymbolView
            name={{ ios: 'info.circle', android: 'info', web: 'info' }}
            size={12}
            tintColor="#737e8e"
          />
          <Text style={[ui.muted, { fontSize: 11 }]}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}
