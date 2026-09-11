import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getAvailableLeads, getPurchasedLeads, requestLeadRefund, unlockLead, type Lead } from '@/api/leadsApi';
import { normalizeApiError } from '@/api';
import { EmptyState, ErrorState, openExternalUrl, ProtectedScreen, ui } from '@/components/vendor-ui';

type TabKey = 'available' | 'mine';

export default function LeadsScreen() {
  const [tab, setTab] = useState<TabKey>('available');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [balance, setBalance] = useState(0);
  const [freeAccess, setFreeAccess] = useState(false);
  const [freeCredits, setFreeCredits] = useState(0);
  const [needsCoverage, setNeedsCoverage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (tab === 'available') {
        const data = await getAvailableLeads();
        setLeads(data.leads ?? []);
        setBalance(data.balance ?? 0);
        setFreeAccess(Boolean(data.free_access));
        setFreeCredits(data.free_credits ?? 0);
        setNeedsCoverage(Boolean(data.needs_coverage));
      } else {
        setLeads(await getPurchasedLeads());
        setNeedsCoverage(false);
      }
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ProtectedScreen title="Leads" activeRoute="/leads">
      <StatusBar style="light" />

      {tab === 'available' ? (
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Your balance</Text>
            <Text style={styles.balanceValue}>£{balance.toFixed(2)}</Text>
          </View>
          {freeAccess ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>Free leads</Text>
            </View>
          ) : freeCredits > 0 ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>{freeCredits} free left</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.tabRow}>
        {([
          { key: 'available', label: 'Available' },
          { key: 'mine', label: 'My leads' },
        ] as { key: TabKey; label: string }[]).map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={({ pressed }) => [styles.tabChip, active && styles.tabChipActive, pressed && ui.pressed]}
            >
              <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : needsCoverage ? (
        <EmptyState
          title="Set your areas first"
          text="Add the postcodes and service categories you cover in Setup, and leads near you will show up here."
        />
      ) : leads.length ? (
        leads.map((lead) => (
          <LeadCard key={String(lead.id)} lead={lead} balance={balance} onChanged={load} />
        ))
      ) : (
        <EmptyState
          title={tab === 'available' ? 'No leads right now' : 'No leads bought yet'}
          text={
            tab === 'available'
              ? 'New enquiries in your area will appear here as soon as they come in.'
              : 'Leads you unlock will be kept here with the customer details.'
          }
        />
      )}
    </ProtectedScreen>
  );
}

function LeadCard({ lead, balance, onChanged }: { lead: Lead; balance: number; onChanged: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);

  const isFree = Boolean(lead.is_free) || lead.price <= 0;
  const canAfford = isFree || balance >= lead.price;

  async function handleUnlock() {
    setActionError('');

    // Paying is not undoable, so it is always confirmed first.
    Alert.alert(
      isFree ? 'Unlock this lead?' : `Unlock for £${lead.price.toFixed(2)}?`,
      isFree
        ? "You'll see the customer's details and can contact them."
        : `£${lead.price.toFixed(2)} will come off your balance and you'll get the customer's contact details.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            setIsSaving(true);
            try {
              await unlockLead(lead.id);
              await onChanged();
            } catch (error) {
              setActionError(normalizeApiError(error, 'This lead could not be unlocked.').message);
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={ui.card}>
      <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <Text style={[ui.cardTitle, { flex: 1, paddingRight: 10 }]}>{lead.title}</Text>
        {lead.urgency && lead.urgency !== 'standard' ? (
          <View style={styles.urgentPill}>
            <Text style={styles.urgentPillText}>{lead.urgency === 'emergency' ? 'Emergency' : 'Urgent'}</Text>
          </View>
        ) : null}
      </View>

      <View style={ui.wrapRow}>
        <Info icon="location_on" text={lead.area || lead.postcode_area || 'Area not set'} />
        {lead.category ? <Info icon="handyman" text={lead.category} /> : null}
        {lead.estimated_job_value ? (
          <Info icon="payments" text={`Job worth about £${Number(lead.estimated_job_value).toFixed(0)}`} />
        ) : null}
      </View>

      {lead.description ? <Text style={ui.muted}>{lead.description}</Text> : null}

      {lead.unlocked ? (
        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Customer details</Text>
          <Text style={ui.value}>{lead.customer_name}</Text>
          {lead.customer_address ? <Text style={ui.muted}>{lead.customer_address}</Text> : null}
          {lead.postcode ? <Text style={ui.muted}>{lead.postcode}</Text> : null}

          <View style={styles.contactActions}>
            {lead.customer_phone ? (
              <Pressable
                onPress={() => openExternalUrl(`tel:${lead.customer_phone}`, 'Could not start the call.')}
                style={({ pressed }) => [styles.contactButton, pressed && ui.pressed]}
              >
                <Text style={styles.contactButtonText}>Call {lead.customer_phone}</Text>
              </Pressable>
            ) : null}
            {lead.customer_email ? (
              <Pressable
                onPress={() => openExternalUrl(`mailto:${lead.customer_email}`, 'Could not open Mail.')}
                style={({ pressed }) => [styles.contactButtonAlt, pressed && ui.pressed]}
              >
                <Text style={styles.contactButtonAltText}>Email</Text>
              </Pressable>
            ) : null}
          </View>

          {lead.purchase?.refund_status ? (
            <Text style={[ui.muted, { marginTop: 8 }]}>
              Reported — {lead.purchase.refund_status}
            </Text>
          ) : lead.purchase?.can_request_refund ? (
            <Pressable onPress={() => setRefundOpen(true)} style={{ marginTop: 8 }}>
              <Text style={styles.reportLink}>Something wrong with this lead?</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.lockedRow}>
            <SymbolView
              name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
              size={15}
              tintColor="#8a94a6"
            />
            <Text style={styles.lockedText}>
              Customer name and number unlock when you take this lead
            </Text>
          </View>

          {typeof lead.slots_left === 'number' && (lead.max_purchases ?? 1) > 1 ? (
            <Text style={ui.muted}>
              {lead.slots_left} of {lead.max_purchases} places left
            </Text>
          ) : null}

          {actionError ? <Text style={[ui.muted, { color: '#ff8585' }]}>{actionError}</Text> : null}

          <Pressable
            disabled={isSaving || !canAfford}
            onPress={handleUnlock}
            style={[ui.primaryButton, (isSaving || !canAfford) && { opacity: 0.5 }]}
          >
            <Text style={ui.primaryButtonText}>
              {isSaving
                ? 'Unlocking...'
                : isFree
                  ? 'Unlock — free'
                  : canAfford
                    ? `Unlock for £${lead.price.toFixed(2)}`
                    : `Top up to unlock (£${lead.price.toFixed(2)})`}
            </Text>
          </Pressable>

          {!canAfford ? (
            <Text style={[ui.muted, { textAlign: 'center' }]}>
              Your balance is £{balance.toFixed(2)}.
            </Text>
          ) : null}
        </>
      )}

      <RefundModal
        visible={refundOpen}
        leadId={lead.id}
        onClose={() => setRefundOpen(false)}
        onDone={async () => {
          setRefundOpen(false);
          await onChanged();
        }}
      />
    </View>
  );
}

function RefundModal({
  visible,
  leadId,
  onClose,
  onDone,
}: {
  visible: boolean;
  leadId: string | number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!reason.trim()) {
      setError('Tell us briefly what was wrong.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await requestLeadRefund(leadId, reason.trim());
      setReason('');
      onDone();
    } catch (submitError) {
      setError(normalizeApiError(submitError, 'This could not be sent.').message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Report this lead</Text>
          <Text style={ui.muted}>
            Wrong number, already booked someone else, or not the job described — tell us and we&apos;ll
            look at refunding it.
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="What happened?"
            placeholderTextColor="#6b7484"
            multiline
            style={styles.modalInput}
          />
          {error ? <Text style={[ui.muted, { color: '#ff8585' }]}>{error}</Text> : null}
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable disabled={isSaving} onPress={submit} style={[ui.primaryButton, { flex: 1 }, isSaving && { opacity: 0.5 }]}>
              <Text style={ui.primaryButtonText}>{isSaving ? 'Sending...' : 'Send report'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// The icon name is a literal union in expo-symbols, so it is narrowed here
// rather than typed as a plain string.
type InfoIcon = 'location_on' | 'handyman' | 'payments';

function Info({ icon, text }: { icon: InfoIcon; text: string }) {
  return (
    <View style={ui.row}>
      <SymbolView name={{ ios: 'circle', android: icon, web: icon }} size={15} tintColor="#8a94a6" />
      <Text style={ui.muted}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#161b26',
    borderWidth: 1,
    borderColor: '#232a38',
  },
  balanceLabel: { color: '#8a94a6', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  freeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#1d3a2c' },
  freeBadgeText: { color: '#4ade80', fontSize: 12, fontWeight: '700' },

  tabRow: { flexDirection: 'row', gap: 8 },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#161b26',
    borderWidth: 1,
    borderColor: '#232a38',
  },
  tabChipActive: { backgroundColor: '#ff6a00', borderColor: '#ff6a00' },
  tabChipText: { color: '#d9dee8', fontSize: 13, fontWeight: '700' },
  tabChipTextActive: { color: '#ffffff' },

  urgentPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#3a1d1d' },
  urgentPillText: { color: '#ff8585', fontSize: 11, fontWeight: '800' },

  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  lockedText: { color: '#8a94a6', fontSize: 13, flex: 1 },

  contactBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#131a26',
    borderWidth: 1,
    borderColor: '#1f3a2e',
  },
  contactTitle: { color: '#4ade80', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  contactActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  contactButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#ff6a00', alignItems: 'center' },
  contactButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  contactButtonAlt: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#2c3444', alignItems: 'center' },
  contactButtonAltText: { color: '#d9dee8', fontSize: 14, fontWeight: '700' },
  reportLink: { color: '#8a94a6', fontSize: 13, textDecorationLine: 'underline' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 16, padding: 20, backgroundColor: '#161b26', borderWidth: 1, borderColor: '#232a38', gap: 10 },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  modalInput: {
    minHeight: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2c3444',
    backgroundColor: '#0f141d',
    color: '#ffffff',
    padding: 12,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  modalCancel: { paddingHorizontal: 18, paddingVertical: 13 },
  modalCancelText: { color: '#8a94a6', fontSize: 14, fontWeight: '700' },
});
