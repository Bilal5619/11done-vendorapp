import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthError, useAuth } from "@/context/AuthContext";

const fontFamily = Platform.select({
  web: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

export default function LoginScreen() {
  const { login, token, isRestoring } = useAuth();
  const params = useLocalSearchParams<{ signupMessage?: string }>();
  const signupMessage =
    typeof params.signupMessage === "string" ? params.signupMessage : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState(signupMessage);

  useEffect(() => {
    if (!isRestoring && token) {
      router.replace("/dashboard");
    }
  }, [isRestoring, token]);

  async function handleLogin() {
    setIsSubmitting(true);
    setFieldErrors({});
    setMessage("");

    try {
      await login({ email: email.trim(), password });
      router.replace("/dashboard");
    } catch (error) {
      const authError = error as AuthError;
      setFieldErrors(authError.errors ?? {});
      setMessage(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isRestoring) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator color="#ff6a00" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.topGlow} />
      <View style={styles.bottomPanel} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <BrandHeader />

              <View style={styles.headingBlock}>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>
                  Access your jobs, certificates, invoices and account tools.
                </Text>
              </View>

              {message ? (
                <Text style={styles.formMessage}>{message}</Text>
              ) : null}

              <FieldError label="Email address" errors={fieldErrors.email}>
                <View
                  style={[
                    styles.inputRow,
                    fieldErrors.email && styles.inputError,
                  ]}
                >
                  <SymbolView
                    name={{ ios: "envelope", android: "mail", web: "mail" }}
                    size={18}
                    tintColor="#7b8798"
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="engineer@example.co.uk"
                    placeholderTextColor="#6f7786"
                    style={styles.input}
                  />
                </View>
              </FieldError>

              <FieldError label="Password" errors={fieldErrors.password}>
                <View
                  style={[
                    styles.inputRow,
                    fieldErrors.password && styles.inputError,
                  ]}
                >
                  <SymbolView
                    name={{ ios: "lock", android: "lock", web: "lock" }}
                    size={18}
                    tintColor="#7b8798"
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    placeholder="Password"
                    placeholderTextColor="#6f7786"
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                    hitSlop={10}
                    style={styles.iconButton}
                  >
                    <SymbolView
                      name={{
                        ios: isPasswordVisible ? "eye.slash" : "eye",
                        android: isPasswordVisible
                          ? "visibility_off"
                          : "visibility",
                        web: isPasswordVisible
                          ? "visibility_off"
                          : "visibility",
                      }}
                      size={18}
                      tintColor="#8f99aa"
                    />
                  </Pressable>
                </View>
              </FieldError>

              <Pressable
                disabled={isSubmitting}
                onPress={handleLogin}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isSubmitting) && styles.pressed,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#121212" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                    <SymbolView
                      name={{
                        ios: "arrow.right",
                        android: "arrow_forward",
                        web: "arrow_forward",
                      }}
                      size={18}
                      tintColor="#121212"
                    />
                  </>
                )}
              </Pressable>

              <View style={styles.createRow}>
                <Text style={styles.mutedText}>New vendor?</Text>
                <Pressable onPress={() => router.push("/signup")}>
                  <Text style={styles.createText}>Create account</Text>
                </Pressable>
              </View>

              <View style={styles.badgeRow}>
                <TrustBadge label="Gas Safe" icon="verified_user" />
                <TrustBadge label="NICEIC" icon="engineering" />
                <TrustBadge label="Encrypted" icon="lock" />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function BrandHeader() {
  return (
    <View style={styles.logoWrap}>
      <Text style={styles.logo}>
        <Text style={styles.logoAccent}>11</Text>DONE
      </Text>
      <Text style={styles.logoSubline}>Vendor Engineer Portal</Text>
    </View>
  );
}

export function FieldError({
  label,
  errors,
  children,
}: {
  label: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {errors?.map((error) => (
        <Text key={error} style={styles.errorText}>
          {error}
        </Text>
      ))}
    </View>
  );
}

function TrustBadge({
  label,
  icon,
}: {
  label: string;
  icon: "verified_user" | "engineering" | "lock";
}) {
  return (
    <View style={styles.badge}>
      <SymbolView
        name={{ ios: "checkmark.shield", android: icon, web: icon }}
        size={14}
        tintColor="#17c7a3"
      />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: "#060708",
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
    backgroundColor: "#060708",
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "#11151b",
    opacity: 0.7,
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 190,
    backgroundColor: "#090d10",
    borderTopWidth: 1,
    borderTopColor: "#171d24",
  },
  card: {
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#1d2129",
    borderRadius: 16,
    padding: 24,
    gap: 19,
    ...Platform.select({
      web: {
        boxShadow: "0px 24px 80px rgba(0, 0, 0, 0.48)",
      },
      default: {
        elevation: 12,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 28,
      },
    }),
  },
  logoWrap: {
    alignItems: "center",
    gap: 5,
  },
  logo: {
    fontFamily,
    color: "#ffffff",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: 0,
  },
  logoAccent: {
    color: "#ff6a00",
  },
  logoSubline: {
    fontFamily,
    color: "#8b94a5",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  headingBlock: {
    gap: 6,
  },
  title: {
    fontFamily,
    color: "#f8fafc",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: 0,
  },
  subtitle: {
    fontFamily,
    color: "#a3adbc",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
  },
  formMessage: {
    fontFamily,
    color: "#ffb36e",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontFamily,
    color: "#a4adbc",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  inputRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#181821",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2d37",
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: "#e55b5b",
  },
  input: {
    fontFamily,
    flex: 1,
    color: "#f5f7fb",
    fontSize: 14,
    fontWeight: "500",
    minHeight: 48,
    paddingVertical: 0,
  },
  multilineInput: {
    minHeight: 88,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily,
    color: "#ff8585",
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#ff6a00",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: "0px 10px 28px rgba(255, 106, 0, 0.28)",
      },
      default: {
        elevation: 8,
        shadowColor: "#ff6a00",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
    }),
  },
  primaryButtonText: {
    fontFamily,
    color: "#121212",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.78,
  },
  createRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  mutedText: {
    fontFamily,
    color: "#929baa",
    fontSize: 13,
    fontWeight: "400",
  },
  createText: {
    fontFamily,
    color: "#ff7a1a",
    fontSize: 13,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  badge: {
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: "#1b2028",
    borderWidth: 1,
    borderColor: "#2a303b",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  badgeText: {
    fontFamily,
    color: "#aeb7c5",
    fontSize: 11,
    fontWeight: "600",
  },
});
