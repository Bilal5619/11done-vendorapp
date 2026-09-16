import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  clearNotifications,
  getNotifications,
  markAllNotificationsRead,
} from "@/api/notificationsApi";

import { normalizeApiError } from "@/api";

import {
  EmptyState,
  ErrorState,
  ProtectedScreen,
  ui,
} from "@/components/vendor-ui";

import { useNotificationMonitor } from "@/context/NotificationMonitorContext";

import type { VendorNotification } from "@/types/vendor";

export default function NotificationsScreen() {
  const { refreshNotifications } = useNotificationMonitor();

  const [notifications, setNotifications] = useState<VendorNotification[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isClearing, setIsClearing] = useState(false);

  const [error, setError] = useState("");

  /*
   * Each notification gets its own animation value.
   *
   * 0 = normal position
   * 1 = moved to the right and invisible
   */
  const animationValues = useRef(new Map<string, Animated.Value>()).current;

  /*
   * Get/create animation value for one notification.
   */
  const getAnimationValue = useCallback(
    (id: string) => {
      let value = animationValues.get(id);

      if (!value) {
        value = new Animated.Value(0);
        animationValues.set(id, value);
      }

      return value;
    },
    [animationValues],
  );

  /*
   * Load notifications from the backend.
   */
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getNotifications({
        limit: 100,
      });

      const loadedNotifications = response.notifications ?? [];

      /*
       * Prepare animation values.
       */
      loadedNotifications.forEach((notification) => {
        if (notification.id !== undefined && notification.id !== null) {
          const animation = getAnimationValue(String(notification.id));

          /*
           * Reset it in case this notification
           * has previously been animated.
           */
          animation.setValue(0);
        }
      });

      setNotifications(loadedNotifications);

      /*
       * As soon as the vendor opens this screen,
       * automatically mark all notifications as read.
       */
      if (loadedNotifications.some((notification) => !notification.is_read)) {
        await markAllNotificationsRead();

        /*
         * Update the screen immediately.
         * No Read buttons are required anymore.
         */
        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            is_read: true,
          })),
        );

        /*
         * Update the notification badge in the rest
         * of the app.
         */
        refreshNotifications();
      }
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);

      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [getAnimationValue, refreshNotifications]);

  /*
   * Every time the vendor opens / returns to
   * the Notifications screen:
   *
   * 1. Load notifications
   * 2. Automatically mark unread ones as read
   */
  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  /*
   * Animate ONE notification to the right.
   */
  const animateNotificationOut = useCallback(
    (notification: VendorNotification) => {
      return new Promise<void>((resolve) => {
        if (notification.id === undefined || notification.id === null) {
          resolve();
          return;
        }

        const animation = getAnimationValue(String(notification.id));

        Animated.timing(animation, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          resolve();
        });
      });
    },
    [getAnimationValue],
  );

  /*
   * Clear notifications.
   */
  async function handleClearNotifications() {
    if (isClearing || notifications.length === 0) {
      return;
    }

    setIsClearing(true);
    setError("");

    try {
      /*
       * STEP 1:
       * Permanently delete notifications
       * from the backend.
       */
      await clearNotifications();

      /*
       * STEP 2:
       * Reverse the array.
       *
       * This means the LAST/BOTTOM notification
       * will animate first.
       */
      const notificationsFromBottom = [...notifications].reverse();

      /*
       * STEP 3:
       * Animate them one at a time.
       */
      for (const notification of notificationsFromBottom) {
        await animateNotificationOut(notification);

        /*
         * Remove that card from the screen
         * after its animation finishes.
         */
        setNotifications((current) =>
          current.filter((item) => String(item.id) !== String(notification.id)),
        );

        /*
         * Small pause gives a clean
         * cascading animation.
         */
        await delay(70);
      }

      /*
       * STEP 4:
       * Update notification badge.
       */
      refreshNotifications();
    } catch (clearError) {
      setError(
        normalizeApiError(clearError, "Could not clear notifications.").message,
      );

      /*
       * If anything failed,
       * reload real data from backend.
       */
      await loadNotifications();
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <ProtectedScreen title="Notifications" activeRoute="/notifications">
      <StatusBar style="light" />

      {/* TOP AREA */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <Text style={ui.cardTitle}>Your updates</Text>

          {notifications.length > 0 ? (
            <Text
              style={[
                ui.muted,
                {
                  marginTop: 4,
                  fontSize: 12,
                },
              ]}
            >
              {notifications.length}{" "}
              {notifications.length === 1 ? "notification" : "notifications"}
            </Text>
          ) : null}
        </View>

        {/* CLEAR BUTTON */}
        {notifications.length > 0 ? (
          <Pressable
            disabled={isClearing}
            onPress={() => {
              void handleClearNotifications();
            }}
            style={({ pressed }) => [
              ui.secondaryButton,
              {
                paddingHorizontal: 12,
                minHeight: 38,
                opacity: isClearing ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={ui.secondaryButtonText}>
              {isClearing ? "Clearing..." : "Clear notifications"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* LOADING */}
      {isLoading ? (
        <View style={ui.stateCard}>
          <ActivityIndicator color="#ff6a00" />
        </View>
      ) : error ? (
        /*
         * ERROR
         */
        <ErrorState message={error} onRetry={loadNotifications} />
      ) : notifications.length > 0 ? (
        /*
         * NOTIFICATION LIST
         */
        notifications.map((notification) => {
          const notificationId =
            notification.id !== undefined && notification.id !== null
              ? String(notification.id)
              : `${notification.title}-${notification.created_at}`;

          const animation = getAnimationValue(notificationId);

          /*
           * Move from:
           *
           * 0px → 500px right
           */
          const translateX = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500],
          });

          /*
           * Fade out near the end.
           */
          const opacity = animation.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [1, 1, 0],
          });

          return (
            <Animated.View
              key={notificationId}
              style={{
                transform: [
                  {
                    translateX,
                  },
                ],
                opacity,
              }}
            >
              <View
                style={[
                  ui.card,
                  {
                    marginBottom: 10,
                  },
                ]}
              >
                <View
                  style={{
                    gap: 6,
                  }}
                >
                  <Text style={ui.cardTitle}>
                    {notification.title || "Notification"}
                  </Text>

                  <Text style={ui.muted}>
                    {notification.message || "No details available."}
                  </Text>

                  <Text
                    style={[
                      ui.muted,
                      {
                        color: "#7c8798",
                        fontSize: 12,
                      },
                    ]}
                  >
                    {notification.created_at
                      ? new Date(notification.created_at).toLocaleString()
                      : "Recently updated"}
                  </Text>
                </View>
              </View>
            </Animated.View>
          );
        })
      ) : (
        /*
         * EMPTY SCREEN
         */
        <EmptyState
          title="You're all caught up"
          text="New job, document, invoice and profile updates will appear here."
        />
      )}
    </ProtectedScreen>
  );
}

/*
 * Small pause used between notification animations.
 */
function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
