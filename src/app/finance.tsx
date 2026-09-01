import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles as authStyles } from '@/app/index';
import { useAuth } from '@/context/AuthContext';

const fontFamily = Platform.select({
  web: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

const financeSections = [
  {
    title: 'Quotes',
    items: [
      { label: 'New Quote', icon: 'add_circle' },
      { label: 'Quote Folder', icon: 'folder' },
    ],
  },
  {
    title: 'Invoices',
    items: [
      { label: 'New Invoice', icon: 'receipt_long' },
      { label: 'Invoice Folder', icon: 'folder' },
      { label: 'Paid Invoices', icon: 'check_circle' },
    ],
  },
  {
    title: 'Payment',
    items: [{ label: 'Add a new payment', icon: 'payments' }],
  },
] as const;

export default function FinanceScreen() {
  const { token, isRestoring } = useAuth();

  useEffect(() => {
    if (!isRestoring && !token) {
      router.replace('/');
    }
  }, [isRestoring, token]);

  if (isRestoring) {
    return (
      <View style={authStyles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator color="#ff6a00" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerIcon}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={22}
              tintColor="#f8fafc"
            />
          </Pressable>
          <Text style={styles.headerTitle}>Finance</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headingBlock}>
            <Text style={styles.kicker}>Vendor accounts</Text>
            <Text style={styles.title}>Finance</Text>
            <Text style={styles.subtitle}>Create, manage and review quotes, invoices and payments.</Text>
          </View>

          {financeSections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.optionList}>
                {section.items.map((item) => (
                  <Pressable key={item.label} style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <View style={styles.optionIcon}>
                      <SymbolView
                        name={{
                          ios: 'doc.text',
                          android: item.icon,
                          web: item.icon,
                        }}
                        size={20}
                        tintColor="#ff6a00"
                      />
                    </View>
                    <Text style={styles.optionText}>{item.label}</Text>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      size={18}
                      tintColor="#8a94a6"
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#060708',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 58,
    backgroundColor: '#11151b',
    borderBottomWidth: 1,
    borderBottomColor: '#1e2530',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily,
    color: '#f8fafc',
    fontSize: 19,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 18,
  },
  headingBlock: {
    backgroundColor: '#0f1115',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1d2129',
    padding: 18,
    gap: 6,
  },
  kicker: {
    fontFamily,
    color: '#ff6a00',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily,
    color: '#f8fafc',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  subtitle: {
    fontFamily,
    color: '#a3adbc',
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  optionList: {
    gap: 12,
  },
  optionRow: {
    minHeight: 54,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff3eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontFamily,
    color: '#202946',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
