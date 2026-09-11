import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { buildAppointmentInvoicePayload, createAppointmentInvoice } from '@/api/jobsApi';
import { getInvoiceSettings, type InvoiceSettings } from '@/api/myWorkApi';
import { normalizeApiError } from '@/api';
import type { FieldErrors } from '@/api/client';
import { Card, ui } from '@/components/vendor-ui';
import type { JobSummary } from '@/types/vendor';

type InvoiceFormProps = {
  job: JobSummary;
  onCreated: () => Promise<void> | void;
  onCancel?: () => void;
};

type InvoiceFile = {
  uri: string;
  name: string;
  type?: string;
  file?: Blob;
};

/**
 * Sending the invoice for an 11Done job.
 *
 * This now goes straight to the customer the moment the vendor confirms — it
 * is not a request sent to admin for review any more. Because of that, what
 * the vendor sees here has to be exactly what the customer is about to
 * receive: their own business name, their VAT status, nothing typed by hand
 * that could disagree with it.
 *
 * The business details come from the same profile used for their private-job
 * invoicing (getInvoiceSettings) — one saved profile, not entered twice.
 */
export function InvoiceForm({ job, onCreated, onCancel }: InvoiceFormProps) {
  const autoPayload = useMemo(() => buildAppointmentInvoicePayload(job), [job]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [isComplete, setIsComplete] = useState(true);
  const [missing, setMissing] = useState<string[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<InvoiceFile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    (async () => {
      try {
        const data = await getInvoiceSettings();
        setSettings(data.settings);
        setIsComplete(data.is_complete);
        setMissing(data.missing);
      } catch (loadError) {
        setError(normalizeApiError(loadError).message);
      } finally {
        setIsLoadingSettings(false);
      }
    })();
  }, []);

  async function pickInvoiceFile() {
    setError('');
    setFieldErrors({});
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/png', 'image/jpeg'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setInvoiceFile({
      uri: asset.uri,
      name: asset.name ?? 'invoice.pdf',
      type: asset.mimeType ?? 'application/octet-stream',
      file: 'file' in asset ? (asset.file as Blob | undefined) : undefined,
    });
  }

  async function sendInvoice() {
    setIsSaving(true);
    setError('');
    setFieldErrors({});
    try {
      await createAppointmentInvoice(job.id, {
        ...autoPayload,
        notes,
        invoice_file: invoiceFile,
      });
      await onCreated();
    } catch (submitError) {
      const normalized = normalizeApiError(submitError, 'Invoice could not be sent.');
      setFieldErrors(normalized.errors);
      const details = Object.values(normalized.errors).flat().filter(Boolean);
      setError(details.length ? `${normalized.message} ${details.join(' ')}` : normalized.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingSettings) {
    return (
      <Card>
        <ActivityIndicator color="#ff6a00" />
      </Card>
    );
  }

  if (!isComplete) {
    return (
      <Card>
        <Text style={ui.cardTitle}>Finish your business profile first</Text>
        <Text style={ui.muted}>
          The invoice goes out under your own business name and details, so this needs to be filled
          in before you can send one.
          {missing.length ? ` Missing: ${missing.join(', ')}.` : ''}
        </Text>
        <View style={ui.wrapRow}>
          {onCancel ? (
            <Pressable onPress={onCancel} style={ui.secondaryButton}>
              <Text style={ui.secondaryButtonText}>Cancel</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push('/invoice-settings')} style={ui.primaryButton}>
            <Text style={ui.primaryButtonText}>Complete business profile</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={ui.cardTitle}>Send invoice to customer</Text>
      <Text style={ui.muted}>
        This is sent to the customer as soon as you confirm — there is no review step after this.
        Check the details below before sending.
      </Text>

      <Text style={[ui.label, { marginTop: 12 }]}>Issued as</Text>
      <View style={ui.infoBox}>
        <Text style={ui.value}>{settings?.trading_name}</Text>
        {settings?.address_line_1 ? <Text style={ui.muted}>{settings.address_line_1}</Text> : null}
        {settings?.postcode ? <Text style={ui.muted}>{settings.postcode}</Text> : null}
        <Text style={ui.muted}>
          {settings?.vat_registered
            ? `VAT registered — VAT No. ${settings.vat_number}`
            : 'Not VAT registered — no VAT will be added'}
        </Text>
      </View>

      <ReadonlyField label="Booking / Job ID" value={autoPayload.booking_id} />
      <ReadonlyField label="Service Title" value={autoPayload.service_title} />
      <ReadonlyField label="Invoice Date" value={autoPayload.invoice_date} />
      <ReadonlyField label="Customer Paid Amount" value={autoPayload.customer_paid_amount} />
      <Text style={ui.muted}>
        This is the price the customer already paid at checkout — it is already inclusive of VAT if
        you are registered. Nothing further is charged to them.
      </Text>

      <ReadonlyField label="Platform Commission" value={autoPayload.platform_commission} />
      <ReadonlyField label="Commission Amount" value={autoPayload.commission_amount} />
      <ReadonlyField label="Your Payout Amount" value={autoPayload.vendor_payout_amount} />
      <Text style={ui.muted}>
        Admin will transfer your payout and mark it paid once approved.
      </Text>

      <Text style={ui.label}>Invoice PDF / Image (optional)</Text>
      {invoiceFile ? <Text style={ui.value}>{invoiceFile.name}</Text> : null}
      <Pressable onPress={pickInvoiceFile} style={ui.secondaryButton}>
        <Text style={ui.secondaryButtonText}>{invoiceFile ? 'Change invoice file' : 'Choose invoice file'}</Text>
      </Pressable>
      <FieldErrorText errors={fieldErrors.invoice_file} />

      <EditableField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <FieldErrorText errors={fieldErrors.notes} />

      {error ? <Text style={[ui.muted, { color: '#ff8585' }]}>{error}</Text> : null}

      <View style={ui.wrapRow}>
        {onCancel ? (
          <Pressable disabled={isSaving} onPress={onCancel} style={ui.secondaryButton}>
            <Text style={ui.secondaryButtonText}>Cancel</Text>
          </Pressable>
        ) : null}
        <Pressable disabled={isSaving} onPress={sendInvoice} style={[ui.primaryButton, isSaving && { opacity: 0.5 }]}>
          <Text style={ui.primaryButtonText}>{isSaving ? 'Sending...' : 'Send invoice to customer'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function FieldErrorText({ errors = [] }: { errors?: string[] }) {
  return errors.length ? <Text style={[ui.muted, { color: '#ff8585' }]}>{errors.join(' ')}</Text> : null;
}

function ReadonlyField({ label, value }: { label: string; value: unknown }) {
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <TextInput value={String(value ?? '')} editable={false} style={[ui.input, { opacity: 0.75 }]} />
    </View>
  );
}

function EditableField({ label, value, onChangeText, multiline }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean }) {
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Optional"
        placeholderTextColor="#8f99aa"
        multiline={multiline}
        style={[ui.input, multiline && ui.textArea]}
      />
    </View>
  );
}
