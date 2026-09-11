import { SymbolView } from 'expo-symbols';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getJobs } from '@/api/jobsApi';
import { normalizeApiError } from '@/api';
import { InvoiceForm } from '@/components/invoice-form';
import { EmptyState, ErrorState, ProtectedScreen, StatusPill, ui } from '@/components/vendor-ui';
import type { JobSummary } from '@/types/vendor';
import {
  getJobAddress,
  getJobBookingId,
  getJobCustomerName,
  getJobDateTime,
  getJobInvoiceNumber,
  getJobInvoicePaidDate,
  getJobInvoicePaymentStatus,
  getJobInvoiceStatus,
  getJobInvoiceUrl,
  getJobPrice,
  getJobServiceName,
  getJobStatus,
  hasJobInvoice,
} from '@/types/vendor';

export default function InvoicesScreen() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const completedJobs = await getJobs('completed');
      setJobs(completedJobs.filter((job) => getJobStatus(job).toLowerCase() === 'completed'));
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadInvoices, 0);
    return () => clearTimeout(timer);
  }, [loadInvoices]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [loadInvoices])
  );

  return (
    <ProtectedScreen title="Invoices" activeRoute="/invoices">
      <StatusBar style="light" />

      {isLoading ? (
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadInvoices} />
      ) : jobs.length ? (
        jobs.map((job) => <InvoiceJobCard key={String(job.id)} job={job} onChanged={loadInvoices} />)
      ) : (
        <EmptyState title="No completed jobs" text="Completed appointments will appear here when they are ready for invoicing." />
      )}
    </ProtectedScreen>
  );
}

function InvoiceJobCard({ job, onChanged }: { job: JobSummary; onChanged: () => void }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const invoiceUrl = getJobInvoiceUrl(job);
  const invoiceNumber = getJobInvoiceNumber(job);
  const invoiceStatus = getJobInvoiceStatus(job);
  const invoicePaymentStatus = getJobInvoicePaymentStatus(job);
  const invoicePaidDate = getJobInvoicePaidDate(job);

  return (
    <>
      <Pressable
        onPress={() => router.push({ pathname: '/job-detail', params: { id: String(job.id) } })}
        style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.cardTitle}>#{getJobBookingId(job)}</Text>
          <StatusPill status={invoiceStatus || (hasJobInvoice(job) ? 'Invoice created' : 'Needs invoice')} />
        </View>
        <Text style={ui.value}>{getJobServiceName(job)}</Text>
        <Text style={ui.muted}>{getJobCustomerName(job) || 'Customer details pending'} - {getJobAddress(job) || 'Address details pending'}</Text>
        <View style={ui.wrapRow}>
          <Info icon="calendar_month" text={getJobDateTime(job) || 'Date/time pending'} />
          <Info icon="payments" text={`Amount: ${getJobPrice(job) || 'Not provided'}`} />
          <Info icon="check_circle" text={`Job: ${getJobStatus(job) || 'completed'}`} />
        </View>
        {invoiceNumber ? <Text style={ui.muted}>Invoice No: {invoiceNumber}</Text> : null}
        {invoiceStatus ? (
          <View style={ui.row}>
            {/* "submitted" now means the invoice already reached the customer
                — it's not waiting on a review. Relabelled so this doesn't
                read as still pending on our end. */}
            <Text style={ui.muted}>Invoice:</Text>
            <StatusPill status={invoiceStatus === 'submitted' ? 'Sent to customer' : invoiceStatus} />
          </View>
        ) : null}
        {invoicePaymentStatus ? (
          <View style={ui.row}>
            <Text style={ui.muted}>Your Payout:</Text>
            <StatusPill status={invoicePaymentStatus} />
          </View>
        ) : null}
        {invoicePaidDate ? <Text style={ui.muted}>Paid Date: {invoicePaidDate}</Text> : null}
        <View style={ui.wrapRow}>
          {invoiceUrl ? (
            <Pressable onPress={() => Linking.openURL(invoiceUrl)} style={ui.secondaryButton}>
              <Text style={ui.secondaryButtonText}>View invoice</Text>
            </Pressable>
          ) : null}
          {!hasJobInvoice(job) ? (
            <Pressable onPress={() => setIsFormOpen(true)} style={ui.primaryButton}>
              <Text style={ui.primaryButtonText}>Invoice customer</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      {isFormOpen ? (
        <InvoiceForm job={job} onCancel={() => setIsFormOpen(false)} onCreated={async () => {
          setIsFormOpen(false);
          await onChanged();
        }} />
      ) : null}
    </>
  );
}

function Info({ icon, text }: { icon: 'calendar_month' | 'payments' | 'check_circle'; text: string }) {
  return (
    <View style={ui.row}>
      <SymbolView name={{ ios: 'circle', android: icon, web: icon }} size={15} tintColor="#ff6a00" />
      <Text style={ui.muted}>{text}</Text>
    </View>
  );
}
