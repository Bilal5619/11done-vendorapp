import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { getInvoiceSettings, saveInvoiceSettings, type InvoiceSettings } from '@/api/myWorkApi';
import { normalizeApiError } from '@/api';
import { ProtectedScreen, ui } from '@/components/vendor-ui';

/**
 * Company and bank details, entered once and printed on every invoice.
 */
export default function InvoiceSettingsScreen() {
  const [form, setForm] = useState<Partial<InvoiceSettings>>({ vat_registered: false, default_vat_rate: 20 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getInvoiceSettings();
        setForm(data.settings);
      } catch (loadError) {
        setError(normalizeApiError(loadError).message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function set(field: keyof InvoiceSettings, value: string | boolean | number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    // Charging VAT without being registered is not allowed, so the number is
    // required the moment they say they are.
    if (form.vat_registered && !String(form.vat_number ?? '').trim()) {
      setError('A VAT number is needed when the business is VAT registered.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await saveInvoiceSettings({
        ...form,
        default_vat_rate: Number(form.default_vat_rate) || 20,
      });
      Alert.alert('Saved', 'Your invoice details are set up.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (saveError) {
      setError(normalizeApiError(saveError, 'These could not be saved.').message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <ProtectedScreen title="Invoice settings" activeRoute="/invoices">
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      </ProtectedScreen>
    );
  }

  return (
    <ProtectedScreen title="Invoice settings" activeRoute="/invoices">
      <StatusBar style="light" />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={ui.card}>
        <Text style={styles.stepTitle}>Your business</Text>
        <Text style={styles.stepHint}>This appears at the top of every invoice you send.</Text>

        <Field label="Trading name *" value={form.trading_name} onChange={(v) => set('trading_name', v)} />
        <Field label="Address line 1 *" value={form.address_line_1} onChange={(v) => set('address_line_1', v)} />
        <Field label="Address line 2" value={form.address_line_2} onChange={(v) => set('address_line_2', v)} />
        <Field label="Address line 3" value={form.address_line_3} onChange={(v) => set('address_line_3', v)} />
        <Field label="Postcode *" value={form.postcode} onChange={(v) => set('postcode', v)} />
        <Field label="Telephone" value={form.telephone} onChange={(v) => set('telephone', v)} keyboard="phone-pad" />
        <Field label="Email" value={form.email} onChange={(v) => set('email', v)} keyboard="email-address" />
        <Field label="Gas Safe number" value={form.gas_safe_number} onChange={(v) => set('gas_safe_number', v)} />
        <Field label="Company number" value={form.company_number} onChange={(v) => set('company_number', v)} />
      </View>

      <View style={ui.card}>
        <Text style={styles.stepTitle}>VAT</Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Is your business VAT registered?</Text>
            <Text style={styles.stepHint}>
              If you are not registered, VAT will not appear on your invoices at all.
            </Text>
          </View>
          <Switch
            value={Boolean(form.vat_registered)}
            onValueChange={(value) => set('vat_registered', value)}
            trackColor={{ true: '#ff6a00' }}
          />
        </View>

        {form.vat_registered ? (
          <>
            <Field label="VAT number *" value={form.vat_number} onChange={(v) => set('vat_number', v)} placeholder="GB123456789" />
            <Field
              label="Default VAT rate %"
              value={form.default_vat_rate != null ? String(form.default_vat_rate) : ''}
              onChange={(v) => set('default_vat_rate', v)}
              keyboard="decimal-pad"
            />
            <Text style={styles.stepHint}>
              20% covers most work. You can change the rate on an individual line when a job
              qualifies for the reduced 5% rate.
            </Text>
          </>
        ) : null}
      </View>

      <View style={ui.card}>
        <Text style={styles.stepTitle}>Bank details</Text>
        <Text style={styles.stepHint}>Printed on unpaid invoices so the customer knows where to pay.</Text>

        <Field label="Account name" value={form.bank_account_name} onChange={(v) => set('bank_account_name', v)} />
        <Field label="Account number" value={form.bank_account_number} onChange={(v) => set('bank_account_number', v)} keyboard="decimal-pad" />
        <Field label="Sort code" value={form.bank_sort_code} onChange={(v) => set('bank_sort_code', v)} placeholder="00-00-00" />
        <Field label="Payment terms" value={form.payment_terms} onChange={(v) => set('payment_terms', v)} placeholder="Payment due within 14 days" />
        <Field label="Invoice prefix" value={form.invoice_prefix} onChange={(v) => set('invoice_prefix', v)} placeholder="INV-" />
      </View>

      <Pressable disabled={isSaving} onPress={save} style={[ui.primaryButton, isSaving && { opacity: 0.5 }]}>
        <Text style={ui.primaryButtonText}>{isSaving ? 'Saving…' : 'Save settings'}</Text>
      </Pressable>

      <View style={{ height: 30 }} />
    </ProtectedScreen>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
}: {
  label: string;
  value?: string | number | null;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'email-address' | 'decimal-pad';
}) {
  return (
    <View style={{ gap: 6, marginTop: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value != null ? String(value) : ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6b7484"
        keyboardType={keyboard ?? 'default'}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stepTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  stepHint: { color: '#8a94a6', fontSize: 13, marginTop: 3, lineHeight: 18 },
  fieldLabel: { color: '#d9dee8', fontSize: 13, fontWeight: '700' },
  input: {
    borderRadius: 10, borderWidth: 1, borderColor: '#2c3444',
    backgroundColor: '#0f141d', color: '#ffffff', paddingHorizontal: 13, paddingVertical: 11, fontSize: 15,
  },
  errorText: { color: '#ff8585', fontSize: 14, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  switchLabel: { color: '#d9dee8', fontSize: 14, fontWeight: '700' },
});
