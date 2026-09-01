import { setAudioModeAsync, useAudioPlaylist } from 'expo-audio';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, type ComponentProps } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { JobDetail, VendorNotification } from '@/types/vendor';
import {
  getJobBookingId,
  getJobDateTime,
  getJobServiceName,
  getJobServicePostcode,
} from '@/types/vendor';

export type IncomingJobAction = 'view' | 'accept' | 'reject' | 'dismiss';

const RINGTONE_URL = 'https://upload.wikimedia.org/wikipedia/commons/c/cd/US_ringback_tone.ogg';

export function IncomingJobModal({
  notification,
  job,
  isLoadingJob,
  isActioning,
  actionError,
  onAction,
}: {
  notification: VendorNotification | null;
  job: JobDetail | null;
  isLoadingJob: boolean;
  isActioning: boolean;
  actionError: string;
  onAction: (action: IncomingJobAction) => void;
}) {
  const player = useAudioPlaylist({ sources: [RINGTONE_URL], loop: 'single' });
  const visible = notification !== null;
  const notificationKey = getNotificationKey(notification);

  const stopRinging = useCallback(() => {
    try {
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    } catch {
      // The incoming job UI must remain usable when audio is unavailable.
    }
  }, [player]);

  useEffect(() => {
    if (!visible) {
      stopRinging();
      return;
    }

    let cancelled = false;

    async function startRinging() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
        if (cancelled) return;

        await player.seekTo(0);
        if (!cancelled) player.play();
      } catch {
        // A failed or unsupported ringtone must not hide the incoming job.
      }
    }

    void startRinging();

    return () => {
      cancelled = true;
      stopRinging();
    };
  }, [notificationKey, player, stopRinging, visible]);

  const handleAction = useCallback((action: IncomingJobAction) => {
    stopRinging();
    onAction(action);
  }, [onAction, stopRinging]);

  const serviceTitle = job ? getJobServiceName(job) : notification?.title || 'New job';
  const bookingId = job ? getJobBookingId(job) : notification?.related_id;
  const dateTime = job ? getJobDateTime(job) : '';
  const postcode = job ? getJobServicePostcode(job) : '';

  return (
    <Modal
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
      onRequestClose={() => handleAction('dismiss')}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.glowTop} />
        <View style={styles.content}>
          <Text style={styles.eyebrow}>INCOMING JOB</Text>

          <View style={styles.phoneCircle}>
            <View style={styles.phoneCircleInner}>
              <SymbolView
                name={{ ios: 'phone.fill', android: 'call', web: 'call' }}
                size={54}
                tintColor="#ffffff"
              />
            </View>
          </View>

          <Text style={styles.title}>{serviceTitle}</Text>
          {notification?.message ? <Text style={styles.message}>{notification.message}</Text> : null}

          <View style={styles.detailsCard}>
            <Detail label="Booking / Job ID" value={bookingId ? String(bookingId) : 'Not provided'} />
            {dateTime ? <Detail label="Date & time" value={dateTime} /> : null}
            {postcode ? <Detail label="Postcode" value={postcode} /> : null}
            {isLoadingJob ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#ff8d42" size="small" />
                <Text style={styles.loadingText}>Loading job details...</Text>
              </View>
            ) : null}
          </View>

          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

          <View style={styles.actionRow}>
            <CallAction
              color="#ef4444"
              disabled={isActioning}
              icon={{ ios: 'phone.down.fill', android: 'call_end', web: 'call_end' }}
              label="Reject"
              onPress={() => handleAction('reject')}
            />
            <CallAction
              color="#22c55e"
              disabled={isActioning}
              icon={{ ios: 'phone.fill', android: 'call', web: 'call' }}
              label="Accept"
              onPress={() => handleAction('accept')}
            />
          </View>

          <View style={styles.secondaryActions}>
            <Pressable disabled={isActioning} onPress={() => handleAction('view')} style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Job</Text>
            </Pressable>
            <Pressable disabled={isActioning} onPress={() => handleAction('dismiss')} style={styles.dismissButton}>
              <Text style={styles.dismissButtonText}>Dismiss / Stop Ringing</Text>
            </Pressable>
          </View>

          {isActioning ? (
            <View style={styles.workingRow}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.workingText}>Updating job...</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function CallAction({
  color,
  disabled,
  icon,
  label,
  onPress,
}: {
  color: string;
  disabled: boolean;
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.callAction}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.callButton,
          { backgroundColor: color },
          (pressed || disabled) && styles.pressed,
        ]}>
        <SymbolView name={icon} size={32} tintColor="#ffffff" />
      </Pressable>
      <Text style={styles.callLabel}>{label}</Text>
    </View>
  );
}

function getNotificationKey(notification: VendorNotification | null) {
  if (!notification) return '';
  return String(notification.id ?? `${notification.type ?? 'job'}:${notification.related_id ?? 'unknown'}`);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07111f' },
  glowTop: {
    position: 'absolute',
    top: -180,
    left: -80,
    right: -80,
    height: 420,
    borderRadius: 240,
    backgroundColor: '#123963',
    opacity: 0.6,
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  eyebrow: { color: '#8fb5dc', fontSize: 13, fontWeight: '900', letterSpacing: 2.4, marginBottom: 24 },
  phoneCircle: { width: 132, height: 132, borderRadius: 66, padding: 12, backgroundColor: 'rgba(34,197,94,0.16)', marginBottom: 24 },
  phoneCircleInner: { flex: 1, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#22c55e' },
  title: { color: '#ffffff', fontSize: 30, lineHeight: 36, fontWeight: '900', textAlign: 'center' },
  message: { color: '#aebdd0', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8, maxWidth: 440 },
  detailsCard: { width: '100%', maxWidth: 520, marginTop: 24, padding: 18, gap: 13, borderRadius: 20, backgroundColor: 'rgba(20,38,61,0.94)', borderWidth: 1, borderColor: '#244462' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  detailLabel: { color: '#8295aa', fontSize: 13, flex: 1 },
  detailValue: { color: '#f8fafc', fontSize: 14, fontWeight: '800', flex: 1.4, textAlign: 'right' },
  loadingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 2 },
  loadingText: { color: '#aebdd0', fontSize: 13 },
  error: { color: '#fca5a5', fontSize: 14, textAlign: 'center', marginTop: 14, maxWidth: 520 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', maxWidth: 380, marginTop: 28 },
  callAction: { alignItems: 'center', gap: 9 },
  callButton: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  callLabel: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  secondaryActions: { width: '100%', maxWidth: 520, marginTop: 26, gap: 10 },
  viewButton: { minHeight: 50, borderRadius: 14, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  viewButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  dismissButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: '#39536d', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  dismissButtonText: { color: '#b7c5d5', fontSize: 14, fontWeight: '800' },
  workingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  workingText: { color: '#ffffff', fontSize: 13 },
  pressed: { opacity: 0.55, transform: [{ scale: 0.97 }] },
});
