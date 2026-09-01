import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  PropsWithChildren,
  RefObject,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useNotificationMonitor } from "@/context/NotificationMonitorContext";

export const fontFamily = Platform.select({
  web: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

export const appRoutes = [
  { label: "Home", route: "/dashboard", icon: "home" },
  { label: "Jobs", route: "/jobs", icon: "work" },
  { label: "Invoices", route: "/invoices", icon: "receipt_long" },
  { label: "Certificate", route: "/certificates", icon: "description" },
  { label: "Folder", route: "/folder", icon: "folder" },
  { label: "Setup", route: "/account-setup", icon: "verified_user" },
  { label: "Profile", route: "/profile", icon: "person" },
] as const;

export type AppRoute = (typeof appRoutes)[number]["route"] | "/notifications";

export function ProtectedScreen({
  title,
  activeRoute,
  children,
  scroll = true,
  scrollRef,
}: PropsWithChildren<{
  title: string;
  activeRoute: AppRoute;
  scroll?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
}>) {
  const { token, isRestoring } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isRestoring && !token) {
      router.replace("/");
    }
  }, [isRestoring, token]);

  if (isRestoring) {
    return <LoadingScreen />;
  }

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={ui.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={ui.content}>{children}</View>
  );

  return (
    <View style={ui.screen}>
      <SafeAreaView style={ui.safeArea}>
        <Header title={title} onOpenDrawer={() => setIsDrawerOpen(true)} />

        <KeyboardAvoidingView
          style={ui.keyboardArea}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>

        <DrawerMenu
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          activeRoute={activeRoute}
        />
      </SafeAreaView>
    </View>
  );
}
export function Header({
  title,
  onOpenDrawer,
}: {
  title: string;
  onOpenDrawer?: () => void;
}) {
  const { unreadCount } = useNotificationMonitor();

  return (
    <View style={ui.header}>
      <Pressable
        onPress={() =>
          onOpenDrawer
            ? onOpenDrawer()
            : router.canGoBack()
              ? router.back()
              : router.replace("/dashboard")
        }
        hitSlop={12}
        style={ui.headerIcon}
      >
        <SymbolView
          name={{ ios: "line.horizontal.3", android: "menu", web: "menu" }}
          size={22}
          tintColor="#f8fafc"
        />
      </Pressable>
      <Text style={ui.headerTitle}>{title}</Text>
      <View style={ui.headerActions}>
        <Pressable
          onPress={() => router.push("/notifications")}
          hitSlop={10}
          style={ui.headerIcon}
        >
          <SymbolView
            name={{
              ios: "bell.fill",
              android: "notifications",
              web: "notifications",
            }}
            size={20}
            tintColor="#f8fafc"
          />
          {unreadCount > 0 ? (
            <View style={ui.notificationBadge}>
              <Text style={ui.notificationBadgeText}>
                {unreadCount > 9 ? "9+" : String(unreadCount)}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <View style={ui.headerIcon} />
      </View>
    </View>
  );
}

export function BottomNav({ activeRoute }: { activeRoute: AppRoute }) {
  return (
    <View style={ui.bottomNav}>
      {appRoutes.map((item) => {
        const isActive = item.route === activeRoute;
        return (
          <Pressable
            key={item.route}
            onPress={() => router.replace(item.route)}
            style={({ pressed }) => [ui.bottomTab, pressed && ui.pressed]}
          >
            <SymbolView
              name={{
                ios: isActive ? "circle.fill" : "circle",
                android: item.icon,
                web: item.icon,
              }}
              size={18}
              tintColor={isActive ? "#ff6a00" : "#d9dee8"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function DrawerMenu({
  open,
  onClose,
  activeRoute,
}: {
  open: boolean;
  onClose: () => void;
  activeRoute: AppRoute;
}) {
  const [slide] = useState(() => new Animated.Value(0));
  const screenWidth = Dimensions.get("window").width;
  const drawerWidth = Math.min(340, Math.round(screenWidth * 0.82));
  const { vendor, logout } = useAuth();

  const menuItems: {
    label: string;
    route?: string;
    icon: string;
    key: string;
  }[] = [
    { label: "Home", route: "/dashboard", icon: "home", key: "home" },
    { label: "Jobs / Appointments", route: "/jobs", icon: "work", key: "jobs" },
    {
      label: "invoices",
      route: "/invoices",
      icon: "receipt_long",
      key: "invoices",
    },
    {
      label: "Certificates",
      route: "/certificates",
      icon: "description",
      key: "certificates",
    },
    { label: "folder", route: "/folder", icon: "folder", key: "folder" },
    {
      label: "Documents",
      route: "/account-setup",
      icon: "description",
      key: "documents",
    },
    { label: "Profile", route: "/profile", icon: "person", key: "profile" },
    { label: "Logout", route: undefined, icon: "logout", key: "logout" },
  ];

  const iconMap: Record<string, { ios: string; android: string; web: string }> =
    {
      home: { ios: "house.fill", android: "home", web: "home" },
      work: { ios: "briefcase.fill", android: "work", web: "work" },
      receipt_long: {
        ios: "doc.text",
        android: "receipt_long",
        web: "receipt_long",
      },
      description: {
        ios: "doc.text",
        android: "description",
        web: "description",
      },
      folder: { ios: "folder.fill", android: "folder", web: "folder" },
      person: { ios: "person.fill", android: "person", web: "person" },
      logout: { ios: "arrow.right.square", android: "logout", web: "logout" },
    };

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });
  const overlayOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  async function handleItemPress(item: {
    label: string;
    route?: string;
    key: string;
  }) {
    onClose();
    if (item.key === "logout") {
      await logout();
      router.replace("/");
      return;
    }

    if (item.route) {
      router.replace(item.route as any);
    }
  }

  return (
    <View pointerEvents={open ? "auto" : "none"} style={ui.drawerContainer}>
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[ui.drawerOverlay, { opacity: overlayOpacity }]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[ui.drawer, { width: drawerWidth, transform: [{ translateX }] }]}
      >
        <View style={ui.drawerHeader}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={ui.drawerLogo}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={ui.drawerVendorName}>
              {vendor?.profile?.name ?? vendor?.username ?? "Vendor"}
            </Text>
            <Text style={ui.drawerVendorInfo}>
              {vendor?.email ?? vendor?.phone ?? ""}
            </Text>
          </View>
        </View>

        <View style={ui.drawerMenu}>
          {menuItems.map((item) => {
            const isActive = item.route === activeRoute;
            const mapped = iconMap[item.icon] ?? {
              ios: item.icon,
              android: item.icon,
              web: item.icon,
            };
            return (
              <Pressable
                key={item.key}
                onPress={() => handleItemPress(item)}
                style={({ pressed }) => [
                  ui.drawerItem,
                  pressed && ui.pressed,
                  isActive && ui.drawerItemActive,
                ]}
              >
                <SymbolView
                  name={{
                    ios: mapped.ios as any,
                    android: mapped.android as any,
                    web: mapped.web as any,
                  }}
                  size={20}
                  tintColor={isActive ? "#ff6a00" : "#ffffff"}
                />
                <Text
                  style={[ui.drawerItemText, isActive && { color: "#ff6a00" }]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

export function LoadingScreen() {
  return (
    <View style={ui.loadingScreen}>
      <ActivityIndicator color="#ff6a00" />
    </View>
  );
}

export function SectionIntro({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text?: string;
}) {
  return (
    <View style={ui.introCard}>
      <Text style={ui.kicker}>{kicker}</Text>
      <Text style={ui.title}>{title}</Text>
      {text ? <Text style={ui.subtitle}>{text}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: any }>) {
  return <View style={[ui.card, style]}>{children}</View>;
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={ui.stateCard}>
      <Text style={ui.stateTitle}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [ui.secondaryButton, pressed && ui.pressed]}
        >
          <Text style={ui.secondaryButtonText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={ui.stateCard}>
      <Text style={ui.stateTitle}>{title}</Text>
      <Text style={ui.stateText}>{text}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status?: string | null }) {
  const value = status || "Missing";
  const normalized = value.toLowerCase();
  const color =
    normalized === "paid" ||
    normalized.includes("approved") ||
    normalized.includes("completed")
      ? "#17c7a3"
      : normalized.includes("reject")
        ? "#ff6b6b"
        : normalized.includes("unpaid")
          ? "#8b72ff"
          : normalized.includes("submitted") ||
              normalized.includes("upload") ||
              normalized.includes("review") ||
              normalized.includes("accepted")
            ? "#ffb36e"
            : "#8f99aa";

  return (
    <View style={[ui.pill, { borderColor: color }]}>
      <Text style={[ui.pillText, { color }]}>{value}</Text>
    </View>
  );
}

export const ui: Record<string, any> = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#05070b" },
  safeArea: { flex: 1 },
  keyboardArea: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#05070b",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    height: 58,
    backgroundColor: "#0d1723",
    borderBottomWidth: 1,
    borderBottomColor: "#16243a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  headerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: {
    fontFamily,
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#ff8d42",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontFamily,
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 14,
  },
  introCard: {
    backgroundColor: "#101826",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1d2b44",
    padding: 14,
    gap: 10,
  },
  kicker: {
    fontFamily,
    color: "#ff9a4b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    fontFamily,
    color: "#f8fafc",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  subtitle: { fontFamily, color: "#b0bacd", fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#22314a",
    padding: 14,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  cardTitle: { fontFamily, color: "#f8fafc", fontSize: 16, fontWeight: "800" },
  label: {
    fontFamily,
    color: "#9aa5be",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: { fontFamily, color: "#f8fafc", fontSize: 16, fontWeight: "700" },
  muted: { fontFamily, color: "#b0bacd", fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#253549",
    backgroundColor: "#0f1828",
    color: "#f8fafc",
    paddingHorizontal: 12,
    fontFamily,
    fontSize: 14,
  },
  textArea: { minHeight: 94, paddingTop: 12, textAlignVertical: "top" },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#ff8d42",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    fontFamily,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#33415d",
    backgroundColor: "#0f1727",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontFamily,
    color: "#d9e1f2",
    fontSize: 13,
    fontWeight: "800",
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    backgroundColor: "#0f1723",
  },
  pillText: {
    fontFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  stateCard: {
    minHeight: 130,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#22314a",
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  stateTitle: {
    fontFamily,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    fontFamily,
    color: "#b0bacd",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  bottomNav: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 74,
    backgroundColor: "#101826",
    borderWidth: 1,
    borderColor: "#24324b",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 0,
    paddingVertical: 4,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  bottomTabText: {
    fontFamily,
    color: "#b7c4db",
    fontSize: 10,
    fontWeight: "700",
  },
  bottomTabActive: { color: "#ff9a4b" },
  pressed: { opacity: 0.72 },
  /* Drawer styles */
  drawerContainer: {
    ...Platform.select({
      web: { position: "fixed" },
      default: { position: "absolute" },
    }),
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  drawerOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#071019",
    paddingTop: 36,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#132033",
  },
  drawerLogo: { width: 56, height: 56, resizeMode: "contain", borderRadius: 8 },
  drawerVendorName: {
    fontFamily,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  drawerVendorInfo: {
    fontFamily,
    color: "#b7c4db",
    fontSize: 13,
    marginTop: 2,
  },
  drawerMenu: { paddingTop: 12, gap: 6 },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  drawerItemText: {
    fontFamily,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  drawerItemActive: { backgroundColor: "rgba(255,106,0,0.08)" },
});
