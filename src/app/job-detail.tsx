import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { normalizeApiError } from "@/api";
import type { FieldErrors } from "@/api/client";
import { acceptJob, completeJob, getJob, rejectJob } from "@/api/jobsApi";
import { InvoiceForm } from "@/components/invoice-form";
import {
  Card,
  EmptyState,
  ErrorState,
  fontFamily,
  ProtectedScreen,
  StatusPill,
  ui,
} from "@/components/vendor-ui";
import type { JobDetail } from "@/types/vendor";
import {
  getJobAddress,
  getJobBookingDate,
  getJobBookingId,
  getJobInvoiceNumber,
  getJobInvoicePaidDate,
  getJobInvoicePaymentStatus,
  getJobInvoiceStatus,
  getJobInvoiceUrl,
  getJobPaymentStatus,
  getJobServiceName,
  getJobSiteAddress,
  getJobSiteName,
  getJobSitePhone,
  getJobStatus,
  hasJobInvoice,
} from "@/types/vendor";

export default function JobDetailScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{
    id?: string;
    certificate_id?: string;
    certificate_title?: string;
  }>();
  const id = params.id;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [completionErrors, setCompletionErrors] = useState<FieldErrors>({});
  const [certificateId, setCertificateId] = useState("");
  const [certificateTitle, setCertificateTitle] = useState("");
  const [certificateFile, setCertificateFile] = useState<{
    uri: string;
    name: string;
    type?: string;
    file?: Blob;
  } | null>(null);
  const [completionPhoto, setCompletionPhoto] = useState<{
    uri: string;
    name: string;
    type?: string;
    file?: Blob;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  function openCompletionSection() {
    setIsCompletionOpen(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 150);
  }
  const loadJob = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await getJob(id);
      setJob(getJobFromResponse(response));
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(loadJob, 0);
    return () => clearTimeout(timer);
  }, [loadJob]);

  useEffect(() => {
    if (typeof params.certificate_id === "string") {
      const timer = setTimeout(() => {
        setCertificateId(params.certificate_id as string);
        setCertificateTitle(
          typeof params.certificate_title === "string"
            ? params.certificate_title
            : `Certificate #${params.certificate_id}`,
        );
        setCertificateFile(null);
        setCompletionErrors({});
        setIsCompletionOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [params.certificate_id, params.certificate_title]);

  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [loadJob]),
  );

  const mapUrl = useMemo(() => {
    if (job?.map_url) return job.map_url;
    const query = job ? getJobAddress(job) : "";
    return query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : "";
  }, [job]);
  const canAccept = job ? isPending(job) : false;
  const canReject = job ? isPending(job) : false;
  const canComplete = job ? isAccepted(job) : false;
  const generatedCertificateId = job
    ? certificateId || getGeneratedCertificateId(job)
    : "";
  const hasCompletionCertificate = Boolean(
    certificateFile || generatedCertificateId,
  );

  async function runAction(action: "accept" | "reject" | "complete") {
    if (!id || !job) return;
    setIsSaving(true);
    setError("");
    setCompletionErrors({});
    setSuccess("");

    try {
      if (action === "complete") {
        await completeJob(id, {
          generated_certificate_id: generatedCertificateId || undefined,
          job_certificate: certificateFile,
          completion_images: completionPhoto ? [completionPhoto] : [],
          notes,
        });
      } else if (action === "accept") {
        await acceptJob(id);
      } else if (action === "reject") {
        await rejectJob(id);
      }

      setSuccess(
        `Appointment ${action === "complete" ? "completed successfully. You can create the invoice below when ready." : `${action}ed successfully.`}`,
      );
      if (action === "complete") {
        setIsCompletionOpen(false);
        setJob((current) =>
          current ? { ...current, order_status: "completed" } : current,
        );
      } else if (action === "accept") {
        setJob((current) =>
          current ? { ...current, order_status: "accepted" } : current,
        );
      } else if (action === "reject") {
        setJob((current) =>
          current ? { ...current, order_status: "rejected" } : current,
        );
      }
      await loadJob();
    } catch (actionError) {
      const normalized = normalizeApiError(
        actionError,
        "The appointment action failed.",
      );
      setCompletionErrors(normalized.errors);
      const details = Object.values(normalized.errors).flat().filter(Boolean);
      setError(
        details.length
          ? `${normalized.message} ${details.join(" ")}`
          : normalized.message,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function pickCertificateFile() {
    setError("");
    setCompletionErrors({});
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/png", "image/jpeg"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setCertificateFile({
      uri: asset.uri,
      name: asset.name ?? "job-certificate.pdf",
      type: asset.mimeType ?? "application/octet-stream",
      file: "file" in asset ? (asset.file as Blob | undefined) : undefined,
    });
    setCertificateId("");
    setCertificateTitle("");
  }

  async function pickCompletionPhoto() {
    setError("");
    setCompletionErrors({});
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        "Photo library permission is required to upload a completion photo.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setCompletionPhoto({
      uri: asset.uri,
      name: asset.fileName ?? `completion-photo-${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
      file: "file" in asset ? (asset.file as Blob | undefined) : undefined,
    });
  }

  async function takeCompletionPhoto() {
    setError("");
    setCompletionErrors({});
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to take a completion photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setCompletionPhoto({
      uri: asset.uri,
      name: asset.fileName ?? `completion-photo-${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
      file: "file" in asset ? (asset.file as Blob | undefined) : undefined,
    });
  }

  return (
    <ProtectedScreen
      title="Job Detail"
      activeRoute="/jobs"
      scrollRef={scrollRef}
    >
      {isLoading ? (
        <View style={ui.stateCard}>
          <ActivityIndicator color="#ff6a00" />
        </View>
      ) : error && !job ? (
        <ErrorState message={error} onRetry={loadJob} />
      ) : job ? (
        <View style={styles.page}>
          <View style={styles.hero}>
            <View style={styles.heroAccent} />
            <View style={styles.heroTopline}>
              <View style={styles.referenceBadge}>
                <SymbolView
                  name={{ ios: "briefcase.fill", android: "work", web: "work" }}
                  size={15}
                  tintColor="#ff9a4b"
                />
                <Text style={styles.referenceText}>
                  JOB #{getJobBookingId(job)}
                </Text>
              </View>
              <StatusPill status={getJobStatus(job)} />
            </View>
            <Text style={styles.heroTitle}>{getJobServiceName(job)}</Text>
            <Text style={styles.heroAddress} numberOfLines={2}>
              {getJobSiteAddress(job) ||
                getJobAddress(job) ||
                "Site address pending"}
            </Text>

            <View style={styles.metrics}>
              <Metric
                icon="calendar_month"
                label="Appointment"
                value={getJobBookingDate(job)}
              />
              <Metric
                icon="payments"
                label="Payment"
                value={getJobPaymentStatus(job)}
              />
            </View>

            <View style={styles.heroActions}>
              {mapUrl ? (
                <QuickAction
                  icon="directions"
                  label="Directions"
                  onPress={() => Linking.openURL(mapUrl)}
                />
              ) : null}
              {getJobSitePhone(job) ? (
                <QuickAction
                  icon="phone"
                  label="Call site"
                  onPress={() => Linking.openURL(`tel:${getJobSitePhone(job)}`)}
                />
              ) : null}
            </View>

            {canAccept || canReject || (canComplete && !isCompletionOpen) ? (
              <View style={styles.primaryActions}>
                {canAccept ? (
                  <ActionButton
                    label="Accept job"
                    disabled={isSaving}
                    onPress={() => runAction("accept")}
                  />
                ) : null}
                {canComplete && !isCompletionOpen ? (
                  <ActionButton
                    label="Complete job"
                    disabled={isSaving}
                    onPress={openCompletionSection}
                  />
                ) : null}
                {canReject ? (
                  <ActionButton
                    label="Reject"
                    disabled={isSaving}
                    onPress={() => runAction("reject")}
                    secondary
                  />
                ) : null}
              </View>
            ) : null}
          </View>

          {error ? <ErrorState message={error} /> : null}
          {success ? (
            <View style={styles.successBanner}>
              <SymbolView
                name={{
                  ios: "checkmark.circle.fill",
                  android: "check_circle",
                  web: "check_circle",
                }}
                size={19}
                tintColor="#5ee1bd"
              />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <View style={[styles.detailsGrid, isWide && styles.detailsGridWide]}>
            <View style={styles.detailsColumn}>
              <InfoPanel title="Site Details" subtitle="" icon="location_on">
                <InfoRow
                  icon="person"
                  label="Contact name"
                  value={getJobSiteName(job)}
                />
                <InfoRow
                  icon="location_on"
                  label="Service address"
                  value={getJobSiteAddress(job)}
                />

                <InfoRow
                  icon="phone"
                  label="Phone"
                  value={getJobSitePhone(job)}
                />
              </InfoPanel>
            </View>
            <View style={styles.detailsColumn}>
              {job.vendor ? (
                <InfoPanel
                  title="Assigned vendor"
                  subtitle="Engineer handling this appointment"
                  icon="engineering"
                >
                  <InfoRow
                    icon="person"
                    label="Name"
                    value={job.vendor.profile?.name ?? job.vendor.username}
                  />
                  <InfoRow icon="mail" label="Email" value={job.vendor.email} />
                  <InfoRow
                    icon="phone"
                    label="Phone"
                    value={job.vendor.phone}
                  />
                </InfoPanel>
              ) : null}
            </View>
          </View>

          {job.answers?.length ? (
            <Card>
              <Text style={ui.cardTitle}>Job Details / Customer Answers</Text>
              {job.answers.map((answer, index) => (
                <View key={`${answer.question ?? "question"}-${index}`}>
                  <Text style={ui.label}>
                    {answer.question || `Question ${index + 1}`}
                  </Text>
                  <Text style={ui.value}>
                    {answer.answer || "Not provided"}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {isCompleted(job) ? (
            <Card>
              <Text style={ui.cardTitle}>Invoice</Text>
              <Detail label="Invoice No" value={getJobInvoiceNumber(job)} />
              <Detail label="Invoice Status" value={getJobInvoiceStatus(job)} />
              <Detail label="Payment" value={getJobInvoicePaymentStatus(job)} />
              <Detail label="Paid Date" value={getJobInvoicePaidDate(job)} />
              <View style={ui.wrapRow}>
                {getJobInvoiceUrl(job) ? (
                  <Pressable
                    onPress={() => Linking.openURL(getJobInvoiceUrl(job))}
                    style={ui.secondaryButton}
                  >
                    <Text style={ui.secondaryButtonText}>View invoice</Text>
                  </Pressable>
                ) : null}
                {!hasJobInvoice(job) ? (
                  <Pressable
                    onPress={() => setIsInvoiceFormOpen(true)}
                    style={ui.primaryButton}
                  >
                    <Text style={ui.primaryButtonText}>Create invoice</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          ) : null}

          {isCompleted(job) && isInvoiceFormOpen && !hasJobInvoice(job) ? (
            <InvoiceForm
              job={job}
              onCancel={() => setIsInvoiceFormOpen(false)}
              onCreated={async () => {
                setIsInvoiceFormOpen(false);
                setSuccess("Invoice submitted successfully.");
                await loadJob();
              }}
            />
          ) : null}

          {isCompleted(job) ? (
            <Card>
              <Text style={ui.cardTitle}>Job completed</Text>
              <Text style={ui.muted}>
                This appointment is already marked completed.
              </Text>
            </Card>
          ) : !canComplete ? (
            <Card>
              <Text style={ui.cardTitle}>Complete job</Text>
              <Text style={ui.muted}>
                Accept this appointment before submitting completion details.
              </Text>
            </Card>
          ) : isCompletionOpen ? (
            <Card>
              <Text style={ui.cardTitle}>Complete job</Text>
              <Text style={ui.muted}>
                Upload or select a certificate, then upload a completion photo.
                Submitting will mark the appointment completed in Laravel, so
                the website status updates automatically.
              </Text>
              <Text style={ui.label}>Certificate</Text>
              {certificateFile ? (
                <Text style={ui.value}>
                  Device certificate: {certificateFile.name}
                </Text>
              ) : null}
              {certificateId ? (
                <Text style={ui.value}>
                  Folder certificate:{" "}
                  {certificateTitle || `Certificate #${certificateId}`}
                </Text>
              ) : null}
              <View style={ui.wrapRow}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/certificates",
                      params: { job_id: String(job.id) },
                    })
                  }
                  style={ui.secondaryButton}
                >
                  <Text style={ui.secondaryButtonText}>Create certificate</Text>
                </Pressable>
                <Pressable
                  onPress={pickCertificateFile}
                  style={ui.secondaryButton}
                >
                  <Text style={ui.secondaryButtonText}>
                    Upload certificate from device
                  </Text>
                </Pressable>
              </View>

              <CompletionFieldErrors
                errors={
                  completionErrors.job_certificate ??
                  completionErrors.generated_certificate_id ??
                  completionErrors.generated_certificate_path
                }
              />
              <Text style={ui.label}>Completion photo</Text>
              {completionPhoto ? (
                <Text style={ui.value}>
                  Selected photo: {completionPhoto.name}
                </Text>
              ) : null}
              <View style={ui.wrapRow}>
                <Pressable
                  onPress={pickCompletionPhoto}
                  style={ui.secondaryButton}
                >
                  <Text style={ui.secondaryButtonText}>
                    Upload photo from device
                  </Text>
                </Pressable>
                <Pressable
                  onPress={takeCompletionPhoto}
                  style={ui.secondaryButton}
                >
                  <Text style={ui.secondaryButtonText}>
                    Take completion photo
                  </Text>
                </Pressable>
              </View>
              <CompletionFieldErrors
                errors={
                  completionErrors.completion_images ??
                  completionErrors["completion_images.0"]
                }
              />
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Completion notes"
                placeholderTextColor="#8f99aa"
                multiline
                style={[ui.input, ui.textArea]}
              />
              <Pressable
                disabled={
                  isSaving || !completionPhoto || !hasCompletionCertificate
                }
                onPress={() => runAction("complete")}
                style={[
                  ui.primaryButton,
                  (isSaving ||
                    !completionPhoto ||
                    !hasCompletionCertificate) && { opacity: 0.5 },
                ]}
              >
                <Text style={ui.primaryButtonText}>
                  {isSaving ? "Submitting..." : "Submit completion"}
                </Text>
              </Pressable>
            </Card>
          ) : (
            <Pressable onPress={openCompletionSection} style={ui.primaryButton}>
              <Text style={ui.primaryButtonText}>Complete job</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <EmptyState
          title="Job not found"
          text="The API did not return this appointment."
        />
      )}
    </ProtectedScreen>
  );
}

const jobIcons = {
  calendar_month: {
    ios: "calendar",
    android: "calendar_month",
    web: "calendar_month",
  },
  payments: { ios: "creditcard.fill", android: "payments", web: "payments" },
  receipt_long: {
    ios: "banknote.fill",
    android: "receipt_long",
    web: "receipt_long",
  },
  directions: {
    ios: "location.fill",
    android: "directions",
    web: "directions",
  },
  phone: { ios: "phone.fill", android: "phone", web: "phone" },
  mail: { ios: "envelope.fill", android: "mail", web: "mail" },
  location_on: {
    ios: "mappin.and.ellipse",
    android: "location_on",
    web: "location_on",
  },
  person: { ios: "person.fill", android: "person", web: "person" },
  engineering: {
    ios: "wrench.and.screwdriver.fill",
    android: "engineering",
    web: "engineering",
  },
} as const;

type JobIcon = keyof typeof jobIcons;

function Metric({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: JobIcon;
  label: string;
  value?: string | number | null;
  accent?: boolean;
}) {
  return (
    <View style={[styles.metric, accent && styles.metricAccent]}>
      <View style={[styles.metricIcon, accent && styles.metricIconAccent]}>
        <SymbolView
          name={jobIcons[icon]}
          size={18}
          tintColor={accent ? "#1b1009" : "#9ec5ff"}
        />
      </View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text
          style={[styles.metricValue, accent && styles.metricValueAccent]}
          numberOfLines={1}
        >
          {displayValue(value)}
        </Text>
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: JobIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && ui.pressed]}
    >
      <SymbolView name={jobIcons[icon]} size={17} tintColor="#dbe9ff" />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function InfoPanel({
  title,
  subtitle,
  icon,
  children,
}: PropsWithChildren<{ title: string; subtitle: string; icon: JobIcon }>) {
  return (
    <View style={styles.infoPanel}>
      <View style={styles.panelHeader}>
        <View style={styles.panelIcon}>
          <SymbolView name={jobIcons[icon]} size={19} tintColor="#ff9a4b" />
        </View>
        <View style={styles.panelHeading}>
          <Text style={styles.panelTitle}>{title}</Text>
          <Text style={styles.panelSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.infoRows}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: JobIcon;
  label: string;
  value?: string | number | null;
}) {
  return (
    <View style={styles.infoRow}>
      <SymbolView name={jobIcons[icon]} size={17} tintColor="#72819b" />
      <View style={styles.infoRowCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} selectable>
          {displayValue(value)}
        </Text>
      </View>
    </View>
  );
}

function displayValue(value?: string | number | null) {
  return value === undefined || value === null || value === ""
    ? "Not provided"
    : String(value);
}

function CompletionFieldErrors({ errors = [] }: { errors?: string[] }) {
  return errors.length ? (
    <Text style={styles.fieldError}>{errors.join(" ")}</Text>
  ) : null;
}

function getGeneratedCertificateId(job: JobDetail) {
  if (job.certificate_id) return String(job.certificate_id);
  if (
    job.certificate &&
    typeof job.certificate === "object" &&
    job.certificate.id
  )
    return String(job.certificate.id);
  return "";
}

function isCompleted(job: JobDetail) {
  return getStatus(job) === "completed";
}

function isAccepted(job: JobDetail) {
  return getStatus(job) === "accepted";
}


function isPending(job: JobDetail) {
  const status = getStatus(job);
  return !status || status === "pending";
}

function getStatus(job: JobDetail) {
  return getJobStatus(job).toLowerCase();
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <Text style={ui.value}>
        {value === undefined || value === null || value === ""
          ? "Not provided"
          : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1160, alignSelf: "center", gap: 16 },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#253855",
    backgroundColor: "#101d30",
    padding: 22,
    gap: 15,
  },
  heroAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: "#ff7a1a",
  },
  heroTopline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  referenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    backgroundColor: "#1b2a41",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  referenceText: {
    fontFamily,
    color: "#ffd0ad",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily,
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    maxWidth: 760,
  },
  heroAddress: {
    fontFamily,
    color: "#aebdd3",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 760,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    minWidth: 170,
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: "#14243a",
    borderWidth: 1,
    borderColor: "#263b5a",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  metricAccent: { backgroundColor: "#ff8d42", borderColor: "#ffae77" },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#213754",
    alignItems: "center",
    justifyContent: "center",
  },
  metricIconAccent: { backgroundColor: "rgba(255,255,255,0.34)" },
  metricCopy: { flex: 1, gap: 3, minWidth: 0 },
  metricLabel: {
    fontFamily,
    color: "#8fa2bd",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  metricValue: {
    fontFamily,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  metricValueAccent: { color: "#1f120a" },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickAction: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334966",
    backgroundColor: "#15243a",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickActionText: {
    fontFamily,
    color: "#dbe9ff",
    fontSize: 12,
    fontWeight: "800",
  },
  primaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    paddingTop: 2,
  },
  successBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1c6a5b",
    backgroundColor: "#0d302b",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  successText: {
    fontFamily,
    color: "#8bf0d4",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    flex: 1,
  },
  detailsGrid: { gap: 14 },
  detailsGridWide: { flexDirection: "row", alignItems: "flex-start" },
  detailsColumn: { flex: 1, minWidth: 0, gap: 14 },
  infoPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#202f45",
    backgroundColor: "#0e1623",
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1b293d",
    backgroundColor: "#111d2d",
  },
  panelIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#2b211c",
    alignItems: "center",
    justifyContent: "center",
  },
  panelHeading: { flex: 1, gap: 2 },
  panelTitle: { fontFamily, color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  panelSubtitle: { fontFamily, color: "#8391a8", fontSize: 11, lineHeight: 15 },
  infoRows: { paddingHorizontal: 15 },
  infoRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#192638",
    paddingVertical: 11,
  },
  infoRowCopy: { flex: 1, minWidth: 0, gap: 4 },
  infoLabel: {
    fontFamily,
    color: "#7f8da4",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  infoValue: {
    fontFamily,
    color: "#eef3fb",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  fieldError: {
    fontFamily,
    color: "#ff8585",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
});

function ActionButton({
  label,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        secondary ? ui.secondaryButton : ui.primaryButton,
        pressed && ui.pressed,
        disabled && { opacity: 0.5 },
      ]}
    >
      <SymbolView
        name={{
          ios: "circle",
          android: label === "Reject" ? "close" : "check",
          web: label === "Reject" ? "close" : "check",
        }}
        size={16}
        tintColor={secondary ? "#f8fafc" : "#101214"}
      />
      <Text style={secondary ? ui.secondaryButtonText : ui.primaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function getJobFromResponse(response: unknown): JobDetail {
  const job = readJobResponse(response);
  if (job) return job;

  throw { message: "Job API did not return job JSON data.", errors: {} };
}

function readJobResponse(response: unknown): JobDetail | null {
  if (!response || typeof response !== "object") return null;

  if ("id" in response) {
    return response as JobDetail;
  }

  const record = response as Record<string, unknown>;
  for (const key of [
    "appointment",
    "job",
    "booking",
    "service_booking",
    "appointment_detail",
    "data",
  ]) {
    const nested = readJobResponse(record[key]);
    if (nested) return nested;
  }

  return null;
}
