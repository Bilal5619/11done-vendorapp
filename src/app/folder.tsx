import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { getBookingCertificates, getCertificates } from '@/api/certificatesApi';
import { normalizeApiError } from '@/api';
import { Card, EmptyState, ErrorState, openExternalUrl, ProtectedScreen, SectionIntro, ui } from '@/components/vendor-ui';
import type { CertificateSummary } from '@/types/vendor';
import { getCertificateDate, getCertificateService, getCertificateTitle } from '@/types/vendor';

export default function FolderScreen() {
  const params = useLocalSearchParams<{ job_id?: string }>();
  const [certificates, setCertificates] = useState<CertificateSummary[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success] = useState('');

  const loadFolder = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const items = params.job_id ? await getBookingCertificates(params.job_id) : await getCertificates();
      setCertificates(items);
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
    } finally {
      setIsLoading(false);
    }
  }, [params.job_id]);

  useEffect(() => {
    const timer = setTimeout(loadFolder, 0);
    return () => clearTimeout(timer);
  }, [loadFolder]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return certificates;
    return certificates.filter((certificate) => [
      certificate.customer_name,
      certificate.booking_id,
      certificate.booking_number,
      getCertificateTitle(certificate),
      certificate.service_name,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized)));
  }, [certificates, query]);

  async function openPdfUrl(url: string) {
    await openExternalUrl(url, 'This device could not open it directly. Try again in a moment.');
  }

  async function handleShare(certificate: CertificateSummary) {
    const url = certificate.pdf_url ?? certificate.url;
    if (!url) {
      setError('This certificate does not have a PDF URL yet.');
      return;
    }
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(String(url));
        return;
      }
      await openPdfUrl(String(url));
    } catch {
      Alert.alert('Could not share the PDF', 'Please try again in a moment.');
    }
  }

  function handleAttach(certificate: CertificateSummary) {
    if (!params.job_id) return;
    router.replace({
      pathname: '/job-detail',
      params: {
        id: params.job_id,
        certificate_id: String(certificate.id),
        certificate_title: getCertificateTitle(certificate),
      },
    });
  }

  return (
    <ProtectedScreen title="Folder" activeRoute="/folder">
      <StatusBar style="light" />
      <SectionIntro kicker="Saved certificates" title="Folder" text="Search saved certificates by customer, booking, date, certificate type, or service." />

      <TextInput value={query} onChangeText={setQuery} placeholder="Search certificates" placeholderTextColor="#8f99aa" style={ui.input} />
      {error ? <ErrorState message={error} onRetry={loadFolder} /> : null}
      {success ? <Card><Text style={[ui.value, { color: '#17c7a3' }]}>{success}</Text></Card> : null}

      {isLoading ? (
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      ) : filtered.length ? (
        filtered.map((certificate) => (
          <Card key={String(certificate.id)}>
            <Text style={ui.cardTitle}>{getCertificateTitle(certificate)}</Text>
            <Text style={ui.muted}>{certificate.customer_name || 'Customer pending'}</Text>
            <Text style={ui.muted}>Booking: {certificate.booking_id ?? certificate.booking_number ?? 'Not linked'}</Text>
            <Text style={ui.muted}>Date: {getCertificateDate(certificate) || 'Not provided'}</Text>
            <Text style={ui.muted}>Service: {getCertificateService(certificate) || 'Not provided'}</Text>
            <View style={ui.wrapRow}>
              {certificate.pdf_url || certificate.url ? (
                <>
                  <Pressable onPress={() => openPdfUrl(String(certificate.pdf_url ?? certificate.url))} style={ui.secondaryButton}>
                    <Text style={ui.secondaryButtonText}>View PDF</Text>
                  </Pressable>
                  <Pressable onPress={() => handleShare(certificate)} style={ui.secondaryButton}>
                    <Text style={ui.secondaryButtonText}>Share</Text>
                  </Pressable>
                </>
              ) : null}
              {params.job_id && certificate.status === 'generated' ? (
                <Pressable onPress={() => handleAttach(certificate)} style={ui.primaryButton}>
                  <Text style={ui.primaryButtonText}>Use for completion</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))
      ) : (
        <EmptyState title="No certificates found" text="Saved certificates from your connected system will appear here." />
      )}
    </ProtectedScreen>
  );
}

