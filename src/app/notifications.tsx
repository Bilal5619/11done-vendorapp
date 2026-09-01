import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { markAllNotificationsRead, markNotificationRead, getNotifications } from '@/api/notificationsApi';
import { normalizeApiError } from '@/api';
import { EmptyState, ErrorState, ProtectedScreen, ui } from '@/components/vendor-ui';
import { useNotificationMonitor } from '@/context/NotificationMonitorContext';
import type { VendorNotification } from '@/types/vendor';

export default function NotificationsScreen() {
  const { refreshNotifications } = useNotificationMonitor();
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getNotifications({ limit: 100 });
      setNotifications(response.notifications ?? []);
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadNotifications, 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  async function handleMarkRead(id: string | number) {
    try {
      await markNotificationRead(id);
      await loadNotifications();
      refreshNotifications();
    } catch (readError) {
      setError(normalizeApiError(readError).message);
    }
  }

  async function handleMarkAllRead() {
    setIsBusy(true);
    try {
      await markAllNotificationsRead();
      await loadNotifications();
      refreshNotifications();
    } catch (readError) {
      setError(normalizeApiError(readError).message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <ProtectedScreen title="Notifications" activeRoute="/notifications">
      <StatusBar style="light" />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={ui.cardTitle}>Your updates</Text>
        <Pressable disabled={isBusy || !notifications.some((item) => !item.is_read)} onPress={handleMarkAllRead} style={[ui.secondaryButton, { paddingHorizontal: 12, minHeight: 38 }]}> 
          <Text style={ui.secondaryButtonText}>{isBusy ? 'Working...' : 'Mark all read'}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadNotifications} />
      ) : notifications.length ? (
        notifications.map((notification) => (
          <View key={String(notification.id)} style={[ui.card, !notification.is_read && { borderColor: '#ff8d42' }]}> 
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={ui.cardTitle}>{notification.title || 'Notification'}</Text>
                <Text style={ui.muted}>{notification.message || 'No details available.'}</Text>
                <Text style={[ui.muted, { color: '#7c8798' }]}>{notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Recently updated'}</Text>
              </View>
              {!notification.is_read && notification.id !== undefined && notification.id !== null ? (
                <Pressable onPress={() => handleMarkRead(notification.id as string | number)} style={[ui.primaryButton, { minHeight: 34, paddingHorizontal: 10 }]}> 
                  <Text style={ui.primaryButtonText}>Read</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))
      ) : (
        <EmptyState title="No notifications yet" text="You’ll see new job, document, invoice, and profile updates here." />
      )}
    </ProtectedScreen>
  );
}
