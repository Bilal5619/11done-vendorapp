import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthError, SignupPayload, useAuth } from '@/context/AuthContext';
import { BrandHeader, FieldError, styles } from '@/app/index';

const initialForm: SignupPayload = {
  username: '',
  name: '',
  email: '',
  phone: '',
  country: 'United Kingdom',
  city: '',
  state: '',
  zip_code: '',
  address: '',
  password: '',
  password_confirmation: '',
  details: '',
};

export default function SignupScreen() {
  const { signup } = useAuth();
  const [form, setForm] = useState<SignupPayload>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof SignupPayload, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSignup() {
    setIsSubmitting(true);
    setFieldErrors({});
    setMessage('');

    try {
      const response = await signup({
        ...form,
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip_code: form.zip_code.trim(),
        address: form.address.trim(),
        details: form.details?.trim(),
      });
      router.replace({ pathname: '/', params: { signupMessage: response.message } });
    } catch (error) {
      const authError = error as AuthError;
      setFieldErrors(authError.errors ?? {});
      setMessage(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.topGlow} />
      <View style={styles.bottomPanel} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <BrandHeader />

              <View style={styles.headingBlock}>
                <Text style={styles.title}>Create vendor account</Text>
                <Text style={styles.subtitle}>Register your company or engineer profile for 11DONE jobs.</Text>
              </View>

              {message ? <Text style={styles.formMessage}>{message}</Text> : null}

              <SignupField
                label="Username"
                field="username"
                value={form.username}
                errors={fieldErrors.username}
                onChange={updateField}
                placeholder="vendor_username"
              />
              <SignupField
                label="Vendor / company name"
                field="name"
                value={form.name}
                errors={fieldErrors.name}
                onChange={updateField}
                placeholder="Vendor / Company Name"
              />
              <SignupField
                label="Email address"
                field="email"
                value={form.email}
                errors={fieldErrors.email}
                onChange={updateField}
                placeholder="vendor@example.com"
                keyboardType="email-address"
              />
              <SignupField
                label="Phone"
                field="phone"
                value={form.phone}
                errors={fieldErrors.phone}
                onChange={updateField}
                placeholder="03001234567"
                keyboardType="phone-pad"
              />
              <SignupField
                label="Country"
                field="country"
                value={form.country}
                errors={fieldErrors.country}
                onChange={updateField}
                placeholder="United Kingdom"
              />
              <SignupField
                label="City"
                field="city"
                value={form.city}
                errors={fieldErrors.city}
                onChange={updateField}
                placeholder="London"
              />
              <SignupField
                label="State"
                field="state"
                value={form.state}
                errors={fieldErrors.state}
                onChange={updateField}
                placeholder="England"
              />
              <SignupField
                label="Postcode"
                field="zip_code"
                value={form.zip_code}
                errors={fieldErrors.zip_code}
                onChange={updateField}
                placeholder="SW1A 1AA"
              />
              <SignupField
                label="Address"
                field="address"
                value={form.address}
                errors={fieldErrors.address}
                onChange={updateField}
                placeholder="Full address"
              />
              <SignupField
                label="Details"
                field="details"
                value={form.details ?? ''}
                errors={fieldErrors.details}
                onChange={updateField}
                placeholder="Vendor description or extra info"
                multiline
              />
              <SignupField
                label="Password"
                field="password"
                value={form.password}
                errors={fieldErrors.password}
                onChange={updateField}
                placeholder="Password"
                secureTextEntry
              />
              <SignupField
                label="Confirm password"
                field="password_confirmation"
                value={form.password_confirmation}
                errors={fieldErrors.password_confirmation}
                onChange={updateField}
                placeholder="Confirm password"
                secureTextEntry
              />

              <Pressable
                disabled={isSubmitting}
                onPress={handleSignup}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isSubmitting) && styles.pressed,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#121212" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create account</Text>
                )}
              </Pressable>

              <View style={styles.createRow}>
                <Text style={styles.mutedText}>Already registered?</Text>
                <Pressable onPress={() => router.replace('/')}>
                  <Text style={styles.createText}>Sign in</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function SignupField({
  label,
  field,
  value,
  errors,
  onChange,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  multiline,
}: {
  label: string;
  field: keyof SignupPayload;
  value: string;
  errors?: string[];
  onChange: (field: keyof SignupPayload, value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  return (
    <FieldError label={label} errors={errors}>
      <View style={[styles.inputRow, errors && styles.inputError, multiline && styles.multilineInput]}>
        <TextInput
          value={value}
          onChangeText={(nextValue) => onChange(field, nextValue)}
          autoCapitalize={field === 'email' || field === 'username' ? 'none' : 'sentences'}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor="#6f7786"
          style={[styles.input, multiline && styles.multilineInput]}
        />
      </View>
    </FieldError>
  );
}
