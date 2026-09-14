import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { getMyInvoices, type MyInvoice } from '@/api/myWorkApi';
import { normalizeApiError } from '@/api';
import { Card, EmptyState, ErrorState, openExternalUrl, ProtectedScreen, SectionIntro, ui } from '@/components/vendor-ui';
import { formatUkDate } from '@/types/vendor';

/**
 * Every invoice a vendor has raised for their own work — kept here the same
 * way finished certificates are kept in Folder, so "create own invoice"
 * doesn't just fire once and disappear. This is the separate feature from
 * 11Done job invoicing: nothing here ever touches a 11Done booking.
 */
export default function MyInvoiceFolderScreen() {
  const [invoices, setInvoices] = useState<MyInvoice[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMyInvoices();
      setInvoices(data.invoices ?? []);
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return invoices;
    return invoices.filter((invoice) =>
      [invoice.invoice_number, invoice.client_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [invoices, query]);

  async function handleShare(invoice: MyInvoice) {
    if (!invoice.pdf_url) {
      Alert.alert('Not ready yet', 'This invoice does not have a PDF yet.');
      return;
    }
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(invoice.pdf_url);
        return;
      }
      await openExternalUrl(invoice.pdf_url, 'This device could not open it directly.');
    } catch {
      Alert.alert('Could not share the PDF', 'Please try again in a moment.');
    }
  }

  return (
    <ProtectedScreen title="My Invoices" activeRoute="/my-invoice-folder">
      <StatusBar style="light" />
      <SectionIntro
        kicker="Your own work"
        title="Invoice Folder"
        text="Every invoice you've raised for your own jobs — separate from 11Done bookings."
      />

      <Pressable onPress={() => router.push('/new-invoice')} style={ui.primaryButton}>
        <Text style={ui.primaryButtonText}>New invoice</Text>
      </Pressable>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by invoice number or client"
        placeholderTextColor="#8f99aa"
        style={ui.input}
      />
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {isLoading ? (
        <View style={ui.stateCard}>
          <ActivityIndicator color="#ff6a00" />
        </View>
      ) : filtered.length ? (
        filtered.map((invoice) => (
          <Card key={String(invoice.id)}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.cardTitle}>{invoice.invoice_number}</Text>
              <Text style={[ui.value, invoice.is_paid ? { color: '#17c7a3' } : { color: '#ffb36e' }]}>
                {invoice.is_paid ? 'Paid' : 'Unpaid'}
              </Text>
            </View>
            <Text style={ui.muted}>{invoice.client_name}</Text>
            <Text style={ui.muted}>
              {invoice.invoice_date ? formatUkDate(invoice.invoice_date) : 'No date'} · Total: £
              {invoice.total.toFixed(2)}
            </Text>
            {!invoice.is_paid && invoice.balance_due > 0 ? (
              <Text style={ui.muted}>Balance due: £{invoice.balance_due.toFixed(2)}</Text>
            ) : null}
            <View style={ui.wrapRow}>
              {invoice.pdf_url ? (
                <>
                  <Pressable
                    onPress={() => openExternalUrl(invoice.pdf_url!, 'This device could not open it directly.')}
                    style={ui.secondaryButton}
                  >
                    <Text style={ui.secondaryButtonText}>View PDF</Text>
                  </Pressable>
                  <Pressable onPress={() => handleShare(invoice)} style={ui.secondaryButton}>
                    <Text style={ui.secondaryButtonText}>Share</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={ui.muted}>PDF not generated yet.</Text>
              )}
            </View>
          </Card>
        ))
      ) : (
        <EmptyState
          title="No invoices yet"
          text="Invoices you create for your own jobs will be saved here."
        />
      )}
    </ProtectedScreen>
  );
}
