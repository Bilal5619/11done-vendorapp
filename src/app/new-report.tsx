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
import { reportGroups } from '@/constants/report-flow';
import { useAuth } from '@/context/AuthContext';

const fontFamily = Platform.select({
  web: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

export default function NewReportScreen() {
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

  function createReport(groupTitle: string, option: string) {
    if (groupTitle !== 'Electrical Reports') return;
    const types: Record<string, string> = {
      'Electrical Installation Certificate (EIC)': 'eic',
      'Electrical Installation Condition Report (EICR)': 'eicr',
      'Emergency Lighting Inspection and Test': 'emergency_lighting',
      'Minor Electrical Installation Works (MEIWC)': 'meiwc',
      'Portable Appliance Testing (PAT)': 'pat',
      'Smoke Alarm Design/Commissioning': 'smoke_alarm',
    };
    router.push({ pathname: '/certificates', params: { type: types[option] } });
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
          <Text style={styles.headerTitle}>New Report</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headingBlock}>
            <Text style={styles.kicker}>Create certificate or report</Text>
            <Text style={styles.title}>New Report</Text>
            <Text style={styles.subtitle}>
              Create or upload a certificate/report for any client.
            </Text>
          </View>

          {reportGroups.map((group, index) => (
            <View key={group.title} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupNumber, { backgroundColor: group.accent }]}>
                  <Text style={styles.groupNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.groupTitleBlock}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <Text style={styles.groupHint}>Use these options:</Text>
                </View>
              </View>

              <View style={styles.optionList}>
                {group.options.map((option) => (
                  <View key={option} style={styles.optionRow}>
                    <Text style={styles.optionText}>{option}</Text>
                    <View style={styles.optionActions}>
                      <Pressable onPress={() => createReport(group.title, option)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                        <SymbolView
                          name={{ ios: 'square.and.pencil', android: 'edit_document', web: 'edit_document' }}
                          size={16}
                          tintColor="#101214"
                        />
                        <Text style={styles.actionButtonText}>Create</Text>
                      </Pressable>
                      <Pressable style={({ pressed }) => [styles.uploadButton, pressed && styles.pressed]}>
                        <SymbolView
                          name={{ ios: 'arrow.up.doc', android: 'upload_file', web: 'upload_file' }}
                          size={16}
                          tintColor="#f8fafc"
                        />
                        <Text style={styles.uploadButtonText}>Upload</Text>
                      </Pressable>
                    </View>
                  </View>
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
  group: {
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupNumberText: {
    fontFamily,
    color: '#101214',
    fontSize: 16,
    fontWeight: '900',
  },
  groupTitleBlock: {
    flex: 1,
    gap: 2,
  },
  groupTitle: {
    fontFamily,
    color: '#f8fafc',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },
  groupHint: {
    fontFamily,
    color: '#a3adbc',
    fontSize: 13,
    fontWeight: '600',
  },
  optionList: {
    backgroundColor: '#0f1115',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1d2129',
    overflow: 'hidden',
  },
  optionRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1d2129',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontFamily,
    color: '#f2f5f9',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    flex: 1,
  },
  optionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: '#ff6a00',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  actionButtonText: {
    fontFamily,
    color: '#101214',
    fontSize: 12,
    fontWeight: '800',
  },
  uploadButton: {
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: '#252b35',
    borderWidth: 1,
    borderColor: '#384252',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  uploadButtonText: {
    fontFamily,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
    backgroundColor: '#181d25',
  },
});
