import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createMyJob, deleteMyJob, getMyJobs, updateMyJob, type MyJob } from '@/api/myWorkApi';
import { normalizeApiError } from '@/api';
import { EmptyState, ErrorState, ProtectedScreen, ui, useBottomSafeArea } from '@/components/vendor-ui';
import { formatUkDate } from '@/types/vendor';

/**
 * The vendor's own job book — work they found themselves, not through 11Done.
 */
export default function MyJobsScreen() {
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<MyJob | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setJobs(await getMyJobs());
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <ProtectedScreen title="My jobs" activeRoute="/my-jobs">
      <StatusBar style="light" />

      <Pressable onPress={openNew} style={[ui.primaryButton]}>
        <Text style={ui.primaryButtonText}>+ Add a job</Text>
      </Pressable>

      {isLoading ? (
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : jobs.length ? (
        jobs.map((job) => (
          <JobRow
            key={String(job.id)}
            job={job}
            onEdit={() => {
              setEditing(job);
              setFormOpen(true);
            }}
            onChanged={load}
          />
        ))
      ) : (
        <EmptyState
          title="No jobs yet"
          text="Add work you've taken on yourself. You can invoice straight from it."
        />
      )}

      <JobForm
        visible={formOpen}
        job={editing}
        onClose={() => setFormOpen(false)}
        onSaved={async () => {
          setFormOpen(false);
          await load();
        }}
      />
    </ProtectedScreen>
  );
}

function JobRow({ job, onEdit, onChanged }: { job: MyJob; onEdit: () => void; onChanged: () => void }) {
  function confirmDelete() {
    Alert.alert('Delete this job?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyJob(job.id);
            await onChanged();
          } catch (error) {
            Alert.alert('Could not delete', normalizeApiError(error).message);
          }
        },
      },
    ]);
  }

  return (
    <View style={ui.card}>
      <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <Text style={[ui.cardTitle, { flex: 1, paddingRight: 10 }]}>{job.title}</Text>
        <View style={[styles.statusPill, statusStyle(job.status)]}>
          <Text style={styles.statusPillText}>{statusLabel(job.status)}</Text>
        </View>
      </View>

      <Text style={ui.value}>{job.customer_name}</Text>
      {job.customer_address ? <Text style={ui.muted}>{job.customer_address}</Text> : null}
      {job.job_date ? <Text style={ui.muted}>{formatUkDate(job.job_date)}{job.job_time ? ` · ${job.job_time}` : ''}</Text> : null}
      {typeof job.price === 'number' ? <Text style={ui.value}>£{job.price.toFixed(2)}</Text> : null}

      <View style={styles.actionRow}>
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.secondaryButton, pressed && ui.pressed]}>
          <Text style={styles.secondaryButtonText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/new-invoice',
              params: {
                jobId: String(job.id),
                name: job.customer_name ?? '',
                phone: job.customer_phone ?? '',
                email: job.customer_email ?? '',
                address: job.customer_address ?? '',
                postcode: job.customer_postcode ?? '',
                title: job.title ?? '',
                price: job.price != null ? String(job.price) : '',
              },
            })
          }
          style={({ pressed }) => [styles.invoiceButton, pressed && ui.pressed]}
        >
          <Text style={styles.invoiceButtonText}>
            {job.invoice_count ? `Invoice (${job.invoice_count})` : 'Create invoice'}
          </Text>
        </Pressable>
        {!job.invoice_count ? (
          <Pressable onPress={confirmDelete} style={({ pressed }) => [styles.deleteButton, pressed && ui.pressed]}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function JobForm({
  visible,
  job,
  onClose,
  onSaved,
}: {
  visible: boolean;
  job: MyJob | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<MyJob>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  // This sheet fills the whole screen — the last field needs real clearance
  // from the Android nav bar, not a guessed pixel value.
  const bottomSafeArea = useBottomSafeArea(30);

  // Reset whenever the sheet is opened, so an edit never leaks into the next
  // new job.
  const [lastVisible, setLastVisible] = useState(false);
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) {
      setForm(job ? { ...job } : { status: 'scheduled' });
      setError('');
    }
  }

  function set(field: keyof MyJob, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    if (!form.title?.trim() || !form.customer_name?.trim()) {
      setError('The job and the customer name are both needed.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price: form.price ? Number(form.price) : undefined,
      };
      if (job) {
        await updateMyJob(job.id, payload);
      } else {
        await createMyJob(payload);
      }
      onSaved();
    } catch (saveError) {
      setError(normalizeApiError(saveError, 'This job could not be saved.').message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Pressable onPress={onClose}><Text style={styles.sheetCancel}>Cancel</Text></Pressable>
          <Text style={styles.sheetTitle}>{job ? 'Edit job' : 'New job'}</Text>
          <Pressable disabled={isSaving} onPress={save}>
            <Text style={styles.sheetSave}>{isSaving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.sheetBody, { paddingBottom: bottomSafeArea }]}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Field label="Job *" value={form.title} onChange={(v) => set('title', v)} placeholder="e.g. Boiler service" />
          <Field label="Customer name *" value={form.customer_name} onChange={(v) => set('customer_name', v)} />
          <Field label="Phone" value={form.customer_phone} onChange={(v) => set('customer_phone', v)} keyboard="phone-pad" />
          <Field label="Email" value={form.customer_email} onChange={(v) => set('customer_email', v)} keyboard="email-address" />
          <Field label="Address" value={form.customer_address} onChange={(v) => set('customer_address', v)} />
          <Field label="Postcode" value={form.customer_postcode} onChange={(v) => set('customer_postcode', v)} />
          <Field label="Date" value={form.job_date} onChange={(v) => set('job_date', v)} placeholder="YYYY-MM-DD" />
          <Field label="Time" value={form.job_time} onChange={(v) => set('job_time', v)} placeholder="e.g. 9am" />
          <Field label="Price" value={form.price != null ? String(form.price) : ''} onChange={(v) => set('price', v)} keyboard="decimal-pad" placeholder="£" />

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusRow}>
            {(['scheduled', 'in_progress', 'completed', 'cancelled'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => set('status', value)}
                style={[styles.statusChoice, form.status === value && styles.statusChoiceActive]}
              >
                <Text style={[styles.statusChoiceText, form.status === value && styles.statusChoiceTextActive]}>
                  {statusLabel(value)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Field label="Notes" value={form.notes} onChange={(v) => set('notes', v)} multiline />
        </ScrollView>
      </View>
    </Modal>
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
  value?: string | number | null;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'email-address' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value != null ? String(value) : ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6b7484"
        keyboardType={keyboard ?? 'default'}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 84, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function statusLabel(status?: string) {
  switch (status) {
    case 'in_progress': return 'In progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return 'Scheduled';
  }
}

function statusStyle(status?: string) {
  switch (status) {
    case 'completed': return { backgroundColor: '#1d3a2c' };
    case 'cancelled': return { backgroundColor: '#3a1d1d' };
    case 'in_progress': return { backgroundColor: '#3a331d' };
    default: return { backgroundColor: '#1d2a3a' };
  }
}

const styles = StyleSheet.create({
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { color: '#d9dee8', fontSize: 11, fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  secondaryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2c3444' },
  secondaryButtonText: { color: '#d9dee8', fontSize: 13.5, fontWeight: '700' },
  invoiceButton: { flex: 1, minWidth: 130, paddingVertical: 10, borderRadius: 10, backgroundColor: '#ff6a00', alignItems: 'center' },
  invoiceButtonText: { color: '#ffffff', fontSize: 13.5, fontWeight: '800' },
  deleteButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#4a2a2a' },
  deleteButtonText: { color: '#ff8585', fontSize: 13.5, fontWeight: '700' },

  sheet: { flex: 1, backgroundColor: '#0f141d' },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1f2633',
  },
  sheetTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  sheetCancel: { color: '#8a94a6', fontSize: 15 },
  sheetSave: { color: '#ff6a00', fontSize: 15, fontWeight: '800' },
  // Bottom padding is applied where this is used, from the real device inset.
  sheetBody: { padding: 18, gap: 14 },

  fieldLabel: { color: '#d9dee8', fontSize: 13, fontWeight: '700' },
  input: {
    borderRadius: 10, borderWidth: 1, borderColor: '#2c3444',
    backgroundColor: '#161b26', color: '#ffffff', paddingHorizontal: 13, paddingVertical: 12, fontSize: 15,
  },
  errorText: { color: '#ff8585', fontSize: 13.5 },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChoice: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#2c3444' },
  statusChoiceActive: { backgroundColor: '#ff6a00', borderColor: '#ff6a00' },
  statusChoiceText: { color: '#d9dee8', fontSize: 13, fontWeight: '700' },
  statusChoiceTextActive: { color: '#ffffff' },
});
