import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import {
  createMyInvoice,
  getInvoiceSettings,
  type CreateInvoicePayload,
  type InvoiceSettings,
} from '@/api/myWorkApi';
import { normalizeApiError } from '@/api';
import { ProtectedScreen, ui } from '@/components/vendor-ui';

type DraftItem = {
  description: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  vat_percent: string;
};

/**
 * Creating an invoice, in the order agreed: who it's for, the work, then
 * payment. The totals are worked out here as they type so they can see the
 * figures build — the server recalculates them anyway, so nothing depends on
 * this arithmetic being trusted.
 */
export default function NewInvoiceScreen() {
  const params = useLocalSearchParams<{
    jobId?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    postcode?: string;
    title?: string;
    price?: string;
  }>();

  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [settingsComplete, setSettingsComplete] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [client, setClient] = useState({
    client_name: params.name ?? '',
    client_address_1: params.address ?? '',
    client_address_2: '',
    client_address_3: '',
    client_postcode: params.postcode ?? '',
    client_telephone: params.phone ?? '',
    client_email: params.email ?? '',
  });

  const [sameAddress, setSameAddress] = useState(true);
  const [install, setInstall] = useState({
    install_name: '',
    install_address_1: '',
    install_address_2: '',
    install_address_3: '',
    install_postcode: '',
  });

  const [items, setItems] = useState<DraftItem[]>([
    {
      description: params.title ?? '',
      quantity: '1',
      unit_price: params.price ?? '',
      discount_percent: '0',
      vat_percent: '20',
    },
  ]);

  const [isPaid, setIsPaid] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getInvoiceSettings();
        setSettings(data.settings);
        setSettingsComplete(data.is_complete);

        // Not VAT registered means every line is zero-rated, and the VAT
        // column is not shown at all.
        if (!data.settings.vat_registered) {
          setItems((current) => current.map((item) => ({ ...item, vat_percent: '0' })));
        } else {
          const rate = String(data.settings.default_vat_rate ?? 20);
          setItems((current) => current.map((item) => ({ ...item, vat_percent: rate })));
        }
      } catch (loadError) {
        setError(normalizeApiError(loadError).message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const vatRegistered = Boolean(settings?.vat_registered);

  const totals = useMemo(() => {
    let subTotal = 0;
    let vatTotal = 0;

    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const discount = Number(item.discount_percent) || 0;
      const vat = vatRegistered ? Number(item.vat_percent) || 0 : 0;

      const gross = qty * price;
      const net = gross - gross * (discount / 100);
      subTotal += net;
      vatTotal += net * (vat / 100);
    }

    const total = subTotal + vatTotal;
    const paid = isPaid ? total : Number(paidAmount) || 0;

    return {
      subTotal: round(subTotal),
      vatTotal: round(vatTotal),
      total: round(total),
      paid: round(Math.min(paid, total)),
      balance: round(total - Math.min(paid, total)),
    };
  }, [items, isPaid, paidAmount, vatRegistered]);

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        description: '',
        quantity: '1',
        unit_price: '',
        discount_percent: '0',
        vat_percent: vatRegistered ? String(settings?.default_vat_rate ?? 20) : '0',
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  }

  async function save() {
    if (!client.client_name.trim()) {
      setError('The invoice needs a name to go to.');
      return;
    }

    const usable = items.filter((item) => item.description.trim());
    if (!usable.length) {
      setError('Add at least one line with a description.');
      return;
    }

    setIsSaving(true);
    setError('');

    const payload: CreateInvoicePayload = {
      ...client,
      vendor_job_id: params.jobId ? Number(params.jobId) : null,
      installation_same_as_client: sameAddress,
      ...(sameAddress ? {} : install),
      payment_method: paymentMethod,
      is_paid: isPaid,
      paid_amount: isPaid ? undefined : Number(paidAmount) || 0,
      notes: notes || undefined,
      items: usable.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        discount_percent: Number(item.discount_percent) || 0,
        vat_percent: vatRegistered ? Number(item.vat_percent) || 0 : 0,
      })),
    };

    try {
      const result = await createMyInvoice(payload);
      Alert.alert('Invoice created', `${result.invoice.invoice_number} is ready to send.`, [
        { text: 'OK', onPress: () => router.replace('/invoices') },
      ]);
    } catch (saveError) {
      setError(normalizeApiError(saveError, 'The invoice could not be created.').message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <ProtectedScreen title="My Own Invoice" activeRoute="/new-invoice">
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      </ProtectedScreen>
    );
  }

  return (
    <ProtectedScreen title="My Own Invoice" activeRoute="/new-invoice">
      <StatusBar style="light" />

      {!settingsComplete ? (
        <Pressable onPress={() => router.push('/invoice-settings')} style={styles.warningCard}>
          <Text style={styles.warningTitle}>Finish your invoice settings first</Text>
          <Text style={styles.warningText}>
            Your company name, address and bank details go on every invoice. Tap to add them.
          </Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* 1. Who it's for */}
      <View style={ui.card}>
        <Text style={styles.stepTitle}>1. Invoice to</Text>
        <Field label="Name *" value={client.client_name} onChange={(v) => setClient({ ...client, client_name: v })} />
        <Field label="Address line 1" value={client.client_address_1} onChange={(v) => setClient({ ...client, client_address_1: v })} />
        <Field label="Address line 2" value={client.client_address_2} onChange={(v) => setClient({ ...client, client_address_2: v })} />
        <Field label="Address line 3" value={client.client_address_3} onChange={(v) => setClient({ ...client, client_address_3: v })} />
        <Field label="Postcode" value={client.client_postcode} onChange={(v) => setClient({ ...client, client_postcode: v })} />
        <Field label="Telephone" value={client.client_telephone} onChange={(v) => setClient({ ...client, client_telephone: v })} keyboard="phone-pad" />
        <Field label="Email" value={client.client_email} onChange={(v) => setClient({ ...client, client_email: v })} keyboard="email-address" />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Work was at this address</Text>
          <Switch value={sameAddress} onValueChange={setSameAddress} trackColor={{ true: '#ff6a00' }} />
        </View>

        {!sameAddress ? (
          <>
            <Text style={styles.stepTitle}>Installation address</Text>
            <Field label="Name" value={install.install_name} onChange={(v) => setInstall({ ...install, install_name: v })} />
            <Field label="Address line 1" value={install.install_address_1} onChange={(v) => setInstall({ ...install, install_address_1: v })} />
            <Field label="Address line 2" value={install.install_address_2} onChange={(v) => setInstall({ ...install, install_address_2: v })} />
            <Field label="Address line 3" value={install.install_address_3} onChange={(v) => setInstall({ ...install, install_address_3: v })} />
            <Field label="Postcode" value={install.install_postcode} onChange={(v) => setInstall({ ...install, install_postcode: v })} />
          </>
        ) : null}
      </View>

      {/* 2. The work */}
      <View style={ui.card}>
        <Text style={styles.stepTitle}>2. The work</Text>

        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={styles.itemNumber}>Line {index + 1}</Text>
              {items.length > 1 ? (
                <Pressable onPress={() => removeItem(index)}>
                  <Text style={styles.removeLink}>Remove</Text>
                </Pressable>
              ) : null}
            </View>

            <Field label="Description" value={item.description} onChange={(v) => updateItem(index, 'description', v)} multiline />

            <View style={styles.itemRow}>
              <View style={styles.itemCol}>
                <Field label="Qty" value={item.quantity} onChange={(v) => updateItem(index, 'quantity', v)} keyboard="decimal-pad" />
              </View>
              <View style={styles.itemCol}>
                <Field label="Unit price" value={item.unit_price} onChange={(v) => updateItem(index, 'unit_price', v)} keyboard="decimal-pad" placeholder="£" />
              </View>
            </View>

            <View style={styles.itemRow}>
              <View style={styles.itemCol}>
                <Field label="Discount %" value={item.discount_percent} onChange={(v) => updateItem(index, 'discount_percent', v)} keyboard="decimal-pad" />
              </View>
              {vatRegistered ? (
                <View style={styles.itemCol}>
                  <Field label="VAT %" value={item.vat_percent} onChange={(v) => updateItem(index, 'vat_percent', v)} keyboard="decimal-pad" />
                </View>
              ) : (
                <View style={styles.itemCol} />
              )}
            </View>

            <Text style={styles.lineTotal}>
              £{round(lineTotal(item, vatRegistered)).toFixed(2)}
            </Text>
          </View>
        ))}

        <Pressable onPress={addItem} style={({ pressed }) => [styles.addLine, pressed && ui.pressed]}>
          <Text style={styles.addLineText}>+ Add another line</Text>
        </Pressable>
      </View>

      {/* 3. Payment */}
      <View style={ui.card}>
        <Text style={styles.stepTitle}>3. Payment</Text>

        <View style={styles.totalsBox}>
          <TotalRow label="Sub total" value={totals.subTotal} />
          {vatRegistered ? <TotalRow label="VAT" value={totals.vatTotal} /> : null}
          <TotalRow label="Total" value={totals.total} bold />
          <TotalRow label="Paid" value={totals.paid} />
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>BALANCE DUE</Text>
            <Text style={styles.balanceValue}>£{totals.balance.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Already paid in full</Text>
          <Switch value={isPaid} onValueChange={setIsPaid} trackColor={{ true: '#ff6a00' }} />
        </View>

        {!isPaid ? (
          <Field label="Amount paid so far" value={paidAmount} onChange={setPaidAmount} keyboard="decimal-pad" placeholder="£0.00" />
        ) : null}

        <Text style={styles.fieldLabel}>Payment method</Text>
        <View style={styles.methodRow}>
          {([
            { key: 'cash', label: 'Cash' },
            { key: 'card', label: 'Card' },
            { key: 'bank', label: 'Bank transfer' },
          ] as const).map((method) => (
            <Pressable
              key={method.key}
              onPress={() => setPaymentMethod(paymentMethod === method.key ? null : method.key)}
              style={[styles.methodChip, paymentMethod === method.key && styles.methodChipActive]}
            >
              <Text style={[styles.methodChipText, paymentMethod === method.key && styles.methodChipTextActive]}>
                {method.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field label="Notes" value={notes} onChange={setNotes} multiline placeholder="Anything else for the customer" />
      </View>

      <Pressable disabled={isSaving} onPress={save} style={[ui.primaryButton, isSaving && { opacity: 0.5 }]}>
        <Text style={ui.primaryButtonText}>{isSaving ? 'Creating…' : 'Create invoice'}</Text>
      </Pressable>

      <View style={{ height: 30 }} />
    </ProtectedScreen>
  );
}

function lineTotal(item: DraftItem, vatRegistered: boolean) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  const discount = Number(item.discount_percent) || 0;
  const vat = vatRegistered ? Number(item.vat_percent) || 0 : 0;
  const gross = qty * price;
  const net = gross - gross * (discount / 100);
  return net + net * (vat / 100);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function TotalRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.totalBold]}>£{value.toFixed(2)}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  multiline,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'email-address' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6, marginTop: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6b7484"
        keyboardType={keyboard ?? 'default'}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 64, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stepTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  fieldLabel: { color: '#d9dee8', fontSize: 13, fontWeight: '700' },
  input: {
    borderRadius: 10, borderWidth: 1, borderColor: '#2c3444',
    backgroundColor: '#0f141d', color: '#ffffff', paddingHorizontal: 13, paddingVertical: 11, fontSize: 15,
  },
  errorText: { color: '#ff8585', fontSize: 14, fontWeight: '600' },

  warningCard: { padding: 16, borderRadius: 12, backgroundColor: '#3a331d', borderWidth: 1, borderColor: '#5a5030' },
  warningTitle: { color: '#ffd28a', fontSize: 14.5, fontWeight: '800' },
  warningText: { color: '#d9c9a8', fontSize: 13, marginTop: 3 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  switchLabel: { color: '#d9dee8', fontSize: 14, fontWeight: '700', flex: 1 },

  itemCard: { marginTop: 12, padding: 13, borderRadius: 12, backgroundColor: '#0f141d', borderWidth: 1, borderColor: '#232a38' },
  itemNumber: { color: '#8a94a6', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  removeLink: { color: '#ff8585', fontSize: 13, fontWeight: '700' },
  itemRow: { flexDirection: 'row', gap: 10 },
  itemCol: { flex: 1 },
  lineTotal: { color: '#ffffff', fontSize: 16, fontWeight: '800', textAlign: 'right', marginTop: 10 },

  addLine: { marginTop: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2c3444', borderStyle: 'dashed', alignItems: 'center' },
  addLineText: { color: '#d9dee8', fontSize: 14, fontWeight: '700' },

  totalsBox: { marginTop: 10, padding: 14, borderRadius: 12, backgroundColor: '#0f141d', borderWidth: 1, borderColor: '#232a38' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: '#8a94a6', fontSize: 14 },
  totalValue: { color: '#d9dee8', fontSize: 14 },
  totalBold: { color: '#ffffff', fontWeight: '800' },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 12,
    marginHorizontal: -14, marginBottom: -14,
    backgroundColor: '#0d2b3a', borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  balanceLabel: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  balanceValue: { color: '#ffffff', fontSize: 18, fontWeight: '800' },

  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  methodChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#2c3444' },
  methodChipActive: { backgroundColor: '#ff6a00', borderColor: '#ff6a00' },
  methodChipText: { color: '#d9dee8', fontSize: 13.5, fontWeight: '700' },
  methodChipTextActive: { color: '#ffffff' },
});
