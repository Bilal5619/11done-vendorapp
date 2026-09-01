import * as DocumentPicker from 'expo-document-picker';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { buildAppointmentInvoicePayload, createAppointmentInvoice } from '@/api/jobsApi';
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

export function InvoiceForm({ job, onCreated, onCancel }: InvoiceFormProps) {
  const autoPayload = useMemo(() => buildAppointmentInvoicePayload(job), [job]);
  const [vatTax, setVatTax] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<InvoiceFile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

  async function submitInvoice() {
    setIsSaving(true);
    setError('');
    setFieldErrors({});
    try {
      await createAppointmentInvoice(job.id, {
        ...autoPayload,
        vat: vatTax,
        bank_details: bankDetails,
        notes,
        invoice_file: invoiceFile,
      });
      await onCreated();
    } catch (submitError) {
      const normalized = normalizeApiError(submitError, 'Invoice could not be created.');
      setFieldErrors(normalized.errors);
      const details = Object.values(normalized.errors).flat().filter(Boolean);
      setError(details.length ? `${normalized.message} ${details.join(' ')}` : normalized.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <Text style={ui.cardTitle}>Create invoice</Text>
      <Text style={ui.muted}>Auto-filled fields are locked. Add optional details only if needed.</Text>

      <ReadonlyField label="Booking / Job ID" value={autoPayload.booking_id} />
      <ReadonlyField label="Service Title" value={autoPayload.service_title} />
      <ReadonlyField label="Vendor Name" value={autoPayload.vendor_name} />
      <ReadonlyField label="Invoice Number" value="Auto-generated" />
      <ReadonlyField label="Invoice Date" value={autoPayload.invoice_date} />
      <ReadonlyField label="Amount" value={autoPayload.amount} />
      <ReadonlyField label="Customer Paid Amount" value={autoPayload.customer_paid_amount} />
      <ReadonlyField label="Platform Commission" value={autoPayload.platform_commission} />
      <ReadonlyField label="Commission Amount" value={autoPayload.commission_amount} />
      <ReadonlyField label="Vendor Payout Amount" value={autoPayload.vendor_payout_amount} />

      <EditableField label="VAT / Tax (optional)" value={vatTax} onChangeText={setVatTax} />
      <FieldErrorText errors={fieldErrors.vat ?? fieldErrors.vat_tax} />

      <Text style={ui.label}>Invoice PDF / Image (optional)</Text>
      {invoiceFile ? <Text style={ui.value}>{invoiceFile.name}</Text> : null}
      <Pressable onPress={pickInvoiceFile} style={ui.secondaryButton}>
        <Text style={ui.secondaryButtonText}>{invoiceFile ? 'Change invoice file' : 'Choose invoice file'}</Text>
      </Pressable>
      <FieldErrorText errors={fieldErrors.invoice_file} />

      <EditableField label="Bank Details (optional)" value={bankDetails} onChangeText={setBankDetails} multiline />
      <FieldErrorText errors={fieldErrors.bank_details} />
      <EditableField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <FieldErrorText errors={fieldErrors.notes} />

      {error ? <Text style={[ui.muted, { color: '#ff8585' }]}>{error}</Text> : null}

      <View style={ui.wrapRow}>
        {onCancel ? (
          <Pressable disabled={isSaving} onPress={onCancel} style={ui.secondaryButton}>
            <Text style={ui.secondaryButtonText}>Cancel</Text>
          </Pressable>
        ) : null}
        <Pressable disabled={isSaving} onPress={submitInvoice} style={[ui.primaryButton, isSaving && { opacity: 0.5 }]}>
          <Text style={ui.primaryButtonText}>{isSaving ? 'Submitting...' : 'Submit invoice'}</Text>
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
