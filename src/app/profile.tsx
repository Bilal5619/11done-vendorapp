import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { changePassword, deleteProfilePhoto, getProfile, logoutVendor, updateProfile, uploadProfilePhoto } from '@/api/profileApi';
import { getServiceCategories, type ServiceCategory } from '@/api/authApi';
import { normalizeApiError } from '@/api';
import { Card, ErrorState, ProtectedScreen, SectionIntro, ui } from '@/components/vendor-ui';
import { useAuth } from '@/context/AuthContext';
import type { Vendor } from '@/types/vendor';

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ focus?: string }>();
  const focusSection = params.focus;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const { vendor: storedVendor, logout } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(storedVendor);
  const [form, setForm] = useState<Record<string, string>>({});
  const [availableCategories, setAvailableCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [response, categories] = await Promise.all([getProfile(), getServiceCategories()]);
      const nextVendor = getVendorFromResponse(response);
      setVendor(nextVendor);
      setAvailableCategories(categories);
      setSelectedCategoryIds(getSelectedCategoryIds(nextVendor));
      setForm({
        name: nextVendor.profile?.name ?? nextVendor.username ?? '',
        email: nextVendor.email ?? '',
        phone: nextVendor.phone ?? '',
        business_type: nextVendor.business_type ?? '',
        address: nextVendor.profile?.address ?? '',
        postcode: nextVendor.profile?.postcode ?? nextVendor.profile?.zip_code ?? '',
      });
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
      if (storedVendor) {
        setVendor(storedVendor);
        setSelectedCategoryIds(getSelectedCategoryIds(storedVendor));
        setForm({
          name: storedVendor.profile?.name ?? storedVendor.username ?? '',
          email: storedVendor.email ?? '',
          phone: storedVendor.phone ?? '',
          business_type: storedVendor.business_type ?? '',
          address: storedVendor.profile?.address ?? '',
          postcode: storedVendor.profile?.postcode ?? storedVendor.profile?.zip_code ?? '',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [storedVendor]);

  useEffect(() => {
    const timer = setTimeout(loadProfile, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  useEffect(() => {
    if (!focusSection) return;
    const timeout = setTimeout(() => {
      const y = sectionPositions.current[focusSection];
      if (typeof y === 'number') {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [focusSection]);

  function updateField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(id: string | number) {
    const value = String(id);
    setSelectedCategoryIds((current) => current.includes(value)
      ? current.filter((categoryId) => categoryId !== value)
      : [...current, value]);
    setError('');
    setSuccess('');
  }

  async function saveProfile() {
    if (!selectedCategoryIds.length) {
      setError('Please select at least one service category.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await updateProfile({ ...form, service_category_ids: selectedCategoryIds.map(Number) });
      const nextVendor = getVendorFromResponse(response);
      setVendor(nextVendor);
      setSelectedCategoryIds(getSelectedCategoryIds(nextVendor));
      setSuccess('Profile updated successfully. Your selected service categories are now active.');
    } catch (saveError) {
      setError(normalizeApiError(saveError, 'Profile update failed.').message);
    } finally {
      setIsSaving(false);
    }
  }

  async function savePassword() {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await changePassword(passwords);
      setPasswords({ current_password: '', password: '', password_confirmation: '' });
      setSuccess('Password updated successfully.');
    } catch (saveError) {
      setError(normalizeApiError(saveError, 'Password change failed.').message);
    } finally {
      setIsSaving(false);
    }
  }

  async function savePhoto(uri: string) {
    setIsUploadingPhoto(true);
    setError('');
    setSuccess('');
    try {
      const response = await uploadProfilePhoto(await buildPhotoUpload(uri));
      setVendor(getVendorFromResponse(response));
      setSuccess('Company logo updated. It will be printed on your certificates.');
    } catch (uploadError) {
      setError(normalizeApiError(uploadError, 'Logo upload failed.').message);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function takeLogoPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Please allow camera access to capture your company logo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await savePhoto(result.assets[0].uri);
    }
  }

  async function chooseLogoPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission required', 'Please allow photo access to select your company logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await savePhoto(result.assets[0].uri);
    }
  }

  async function removeLogoPhoto() {
    setIsUploadingPhoto(true);
    setError('');
    setSuccess('');
    try {
      const response = await deleteProfilePhoto();
      setVendor(getVendorFromResponse(response));
      setSuccess('Company logo removed.');
    } catch (removeError) {
      setError(normalizeApiError(removeError, 'Unable to remove the logo.').message);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutVendor();
    } catch {
      // Local logout should still clear the mobile session if token revocation fails.
    }
    await logout();
    router.replace('/');
  }

  const logoUri = vendor?.photo_url ?? vendor?.photo ?? '';

  return (
    <ProtectedScreen title="Profile" activeRoute="/profile" scrollRef={scrollViewRef}>
      <StatusBar style="light" />
      <SectionIntro kicker="Vendor Profile" title={form.name || vendor?.username || 'Profile'} text="Manage your contact, business, and account details in one place." />

      {isLoading ? <View style={ui.stateCard}><ActivityIndicator color="#ff6a00" /></View> : null}
      {error ? <ErrorState message={error} onRetry={loadProfile} /> : null}
      {success ? <Card><Text style={[ui.value, { color: '#17c7a3' }]}>{success}</Text></Card> : null}

      <Card style={focusSection === 'logo' ? styles.focusCard : undefined}>
        <View onLayout={(event: LayoutChangeEvent) => { sectionPositions.current.logo = event.nativeEvent.layout.y; }}>
          <Text style={ui.cardTitle}>Company logo</Text>
          <Text style={ui.muted}>
            Upload your company logo. It is printed in the header of every certificate you generate, next to the Gas Safe logo.
          </Text>

          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>No logo uploaded yet</Text>
            </View>
          )}

          <View style={ui.wrapRow}>
            <Pressable disabled={isUploadingPhoto} onPress={takeLogoPhoto} style={[ui.secondaryButton, styles.logoButton]}>
              <Text style={ui.secondaryButtonText}>{logoUri ? 'Retake photo' : 'Take photo'}</Text>
            </Pressable>
            <Pressable disabled={isUploadingPhoto} onPress={chooseLogoPhoto} style={[ui.secondaryButton, styles.logoButton]}>
              <Text style={ui.secondaryButtonText}>{logoUri ? 'Choose another' : 'Choose photo'}</Text>
            </Pressable>
            {logoUri ? (
              <Pressable disabled={isUploadingPhoto} onPress={removeLogoPhoto} style={[ui.secondaryButton, styles.logoButton]}>
                <Text style={[ui.secondaryButtonText, { color: '#ff8585' }]}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          {isUploadingPhoto ? <ActivityIndicator color="#ff6a00" style={{ marginTop: 10 }} /> : null}
        </View>
      </Card>

      <Card style={focusSection === 'profile' ? styles.focusCard : undefined}>
        <Text style={ui.cardTitle}>Vendor details</Text>
        <View onLayout={(event: LayoutChangeEvent) => { sectionPositions.current.profile = event.nativeEvent.layout.y; }}>
          <View onLayout={(event: LayoutChangeEvent) => { sectionPositions.current.serviceCategory = event.nativeEvent.layout.y; }}>
            <View style={styles.categoryField}>
              <Text style={ui.label}>Services you offer</Text>
              <Text style={ui.muted}>Select every trade you currently provide. You can return here and add more later.</Text>
              <View style={styles.categoryGrid}>
                {availableCategories.map((category) => {
                  const selected = selectedCategoryIds.includes(String(category.id));
                  return (
                    <Pressable
                      key={String(category.id)}
                      disabled={isSaving}
                      onPress={() => toggleCategory(category.id)}
                      style={({ pressed }) => [styles.categoryOption, selected && styles.categoryOptionSelected, pressed && ui.pressed]}>
                      <View style={[styles.categoryCheck, selected && styles.categoryCheckSelected]}>
                        <Text style={[styles.categoryCheckText, selected && styles.categoryCheckTextSelected]}>{selected ? '✓' : '+'}</Text>
                      </View>
                      <Text style={[styles.categoryName, selected && styles.categoryNameSelected]}>{category.name || `Category ${category.id}`}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {!selectedCategoryIds.length ? <Text style={styles.categoryError}>Choose at least one service.</Text> : null}
            </View>
          </View>
        </View>
        <Input label="Vendor name" value={form.name} onChangeText={(value) => updateField('name', value)} />
        <Input label="Email" value={form.email} onChangeText={(value) => updateField('email', value)} />
        <Input label="Phone" value={form.phone} onChangeText={(value) => updateField('phone', value)} />
        <Input label="Business type" value={form.business_type} onChangeText={(value) => updateField('business_type', value)} />
        <Input label="Address" value={form.address} onChangeText={(value) => updateField('address', value)} />
        <View onLayout={(event: LayoutChangeEvent) => { sectionPositions.current.postcode = event.nativeEvent.layout.y; }}>
          <Input label="Postcode" value={form.postcode} onChangeText={(value) => updateField('postcode', value)} />
        </View>
        <Pressable disabled={isSaving} onPress={saveProfile} style={ui.primaryButton}>
          <Text style={ui.primaryButtonText}>{isSaving ? 'Saving...' : 'Save profile'}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={ui.cardTitle}>Change password</Text>
        <Input label="Current password" value={passwords.current_password} secure onChangeText={(value) => setPasswords((current) => ({ ...current, current_password: value }))} />
        <Input label="New password" value={passwords.password} secure onChangeText={(value) => setPasswords((current) => ({ ...current, password: value }))} />
        <Input label="Confirm new password" value={passwords.password_confirmation} secure onChangeText={(value) => setPasswords((current) => ({ ...current, password_confirmation: value }))} />
        <Pressable disabled={isSaving} onPress={savePassword} style={ui.secondaryButton}>
          <Text style={ui.secondaryButtonText}>Update password</Text>
        </Pressable>
      </Card>

      <Pressable onPress={handleLogout} style={ui.secondaryButton}>
        <Text style={[ui.secondaryButtonText, { color: '#ff8f4a' }]}>Logout</Text>
      </Pressable>
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  focusCard: {
    borderColor: '#ff9a4b',
  },
  categoryField: { gap: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  categoryOption: { minHeight: 46, minWidth: 170, flexGrow: 1, flexBasis: 180, maxWidth: 300, borderRadius: 13, borderWidth: 1, borderColor: '#2b3b53', backgroundColor: '#0d1726', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryOptionSelected: { borderColor: '#ff8d42', backgroundColor: '#2b211c' },
  categoryCheck: { width: 25, height: 25, borderRadius: 8, borderWidth: 1, borderColor: '#53617a', alignItems: 'center', justifyContent: 'center' },
  categoryCheckSelected: { borderColor: '#ff8d42', backgroundColor: '#ff8d42' },
  categoryCheckText: { color: '#9aa5b8', fontSize: 15, fontWeight: '900' },
  categoryCheckTextSelected: { color: '#1b1009' },
  categoryName: { color: '#d6deeb', fontSize: 13, fontWeight: '800', flex: 1 },
  categoryNameSelected: { color: '#ffd5b8' },
  categoryError: { color: '#ff8585', fontSize: 12, fontWeight: '700' },
  logoPreview: { width: '100%', height: 150, borderRadius: 12, marginVertical: 12, backgroundColor: '#ffffff' },
  logoPlaceholder: { width: '100%', height: 150, borderRadius: 12, marginVertical: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#2b3b53', alignItems: 'center', justifyContent: 'center' },
  logoPlaceholderText: { color: '#8f99aa', fontSize: 13, fontWeight: '700' },
  logoButton: { flexGrow: 1, flexBasis: 150 },
});

async function buildPhotoUpload(uri: string) {
  const extension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const type = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  const file = Platform.OS === 'web' ? await fetch(uri).then((response) => response.blob()) : undefined;

  return { uri, name: `vendor-logo-${Date.now()}.${extension}`, type, file };
}

function Input({ label, value, onChangeText, secure }: { label: string; value?: string; onChangeText: (value: string) => void; secure?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput value={value ?? ''} onChangeText={onChangeText} secureTextEntry={secure} placeholder={label} placeholderTextColor="#8f99aa" style={ui.input} />
    </View>
  );
}

function getVendorFromResponse(response: unknown): Vendor {
  if (response && typeof response === 'object' && 'vendor' in response && (response as { vendor?: Vendor }).vendor) {
    return (response as { vendor: Vendor }).vendor;
  }

  if (response && typeof response === 'object' && 'id' in response) {
    return response as Vendor;
  }

  throw { message: 'Profile API did not return vendor JSON data.', errors: {} };
}

function getSelectedCategoryIds(vendor: Vendor) {
  return vendor.service_categories?.map((category) => category.id).filter((id): id is string | number => id !== undefined).map(String) ?? [];
}
