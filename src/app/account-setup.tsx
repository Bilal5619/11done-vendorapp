import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { normalizeApiError } from "@/api";
import {
  addRegistrationNumber,
  getAccountSetup,
  submitVerification,
  uploadAccountSetupDocument,
} from "@/api/accountSetupApi";
import {
  Card,
  EmptyState,
  ErrorState,
  ProtectedScreen,
  SectionIntro,
  StatusPill,
  ui,
} from "@/components/vendor-ui";
import { useAccountStatus } from "@/context/AccountStatusContext";
import type { AccountSetupTask } from "@/types/vendor";

type UploadFile = {
  taskType: string;
  uri: string;
  name: string;
  mimeType: string;
  file?: Blob;
};
type SetupFormState = Record<string, string>;
type IdType = "driving_licence" | "passport";
type DocumentUploadType = "insurance" | "id_document" | "right_to_work";
type UploadingType = DocumentUploadType | "accreditation" | null;
type DocumentUiState = {
  status: string;
  canUpload: boolean;
  message?: string;
  expired?: boolean;
};

const taskLabels: Record<string, string> = {
  profile: "Complete profile details",
  category: "Select your service category",
  postcode: "Add service area postcode",
  insurance: "Public Liability Insurance",
  id_document: "Driving Licence or Passport",
  right_to_work: "Right to Work",
  accreditation: "Accreditation Certification",
  submit: "Submit verification",
  approval: "Waiting for admin approval",
};

export default function AccountSetupScreen() {
  const accountStatus = useAccountStatus();
  const [tasks, setTasks] = useState<AccountSetupTask[]>([]);
  const [documents, setDocuments] = useState<
    NonNullable<AccountSetupTask["document"]>[]
  >([]);
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null);
  const [forms, setForms] = useState<Record<string, SetupFormState>>({});
  const [rightToWorkIsBritish, setRightToWorkIsBritish] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<UploadingType>(null);
  const [isSubmittingVerification, setIsSubmittingVerification] =
    useState(false);
  const [isSavingRightToWork, setIsSavingRightToWork] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayTasks = useMemo(() => {
    const documentsByType = new Map(
      documents.map((document) => [document.type, document]),
    );

    const nextTasks: AccountSetupTask[] = [...tasks];

    // Accreditation is optional, but it should always be available
    // in the mobile app even if the account-setup API does not
    // explicitly return it as a task.
    const hasAccreditation = nextTasks.some(
      (task) => String(task.type ?? task.key ?? "") === "accreditation",
    );

    if (!hasAccreditation) {
      nextTasks.push({
        key: "accreditation",
        type: "accreditation",
        label: "Accreditation Certification",
        status: "optional",
      });
    }

    return nextTasks.map((task) => {
      const type = String(task.type ?? task.key ?? "");

      return {
        ...task,
        type,
        label:
          task.label?.trim() || taskLabels[type] || type.replaceAll("_", " "),

        document: task.document ?? documentsByType.get(type) ?? null,
      };
    });
  }, [documents, tasks]);

  const refreshAccountStatus = accountStatus.refresh;

  const loadSetup = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getAccountSetup();
      setTasks(response.tasks ?? []);
      setDocuments(response.documents ?? []);
      setRightToWorkIsBritish(
        response.vendor?.right_to_work_is_british === true,
      );
      // Keep the app-wide gate in step with what was just uploaded.
      void refreshAccountStatus();
    } catch (loadError) {
      setError(normalizeApiError(loadError).message);
      setTasks([]);
      setDocuments([]);
      setRightToWorkIsBritish(false);
    } finally {
      setIsLoading(false);
    }
  }, [refreshAccountStatus]);

  useEffect(() => {
    const timer = setTimeout(loadSetup, 0);
    return () => clearTimeout(timer);
  }, [loadSetup]);

  function navigateToProfile(type: string) {
    const focusMap: Record<string, string> = {
      profile: "profile",
      category: "serviceCategory",
      postcode: "postcode",
    };
    const focus = focusMap[type];
    if (focus) {
      router.push(`/profile?focus=${encodeURIComponent(focus)}`);
    }
  }

  function updateForm(type: string, field: string, value: string) {
    setForms((current) => ({
      ...current,
      [type]: {
        ...current[type],
        [field]: value,
      },
    }));
  }

  async function pickFile(type: string) {
    setError("");
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setSelectedFile({
      taskType: type,
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      file: "file" in asset ? (asset.file as Blob | undefined) : undefined,
    });
  }

  async function takePhoto(type: string) {
    setError("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to take a document photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setSelectedFile({
      taskType: type,
      uri: asset.uri,
      name: asset.fileName ?? `document-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      file: "file" in asset ? (asset.file as Blob | undefined) : undefined,
    });
  }

  async function handleUpload(type: DocumentUploadType) {
    setError("");
    setSuccess("");
    const selectedForTask =
      selectedFile?.taskType === type ? selectedFile : null;
    if (!selectedForTask) {
      setError("Please choose a file or take a photo before uploading.");
      return;
    }

    const form = forms[type] ?? {};
    const existingDocument = documents.find(
      (document) => document.type === type,
    );
    const idType =
      type === "id_document"
        ? (normalizeIdType(form.id_type ?? existingDocument?.id_type) ??
          "driving_licence")
        : undefined;

    setUploadingType(type);
    try {
      await uploadAccountSetupDocument({
        type,
        file: toUploadValue(selectedForTask),
        expiry_date:
          form.expiry_date?.trim() ||
          existingDocument?.expiry_date ||
          undefined,
        policy_number:
          type === "insurance"
            ? form.policy_number?.trim() || undefined
            : undefined,
        id_type: idType,
        date_of_birth:
          type === "right_to_work"
            ? form.date_of_birth?.trim() ||
              existingDocument?.date_of_birth ||
              undefined
            : undefined,
      });
      setSuccess("Document uploaded successfully and linked to your account.");
      setSelectedFile(null);
      await loadSetup();
    } catch (uploadError) {
      setError(
        normalizeApiError(uploadError, "Document upload failed.").message,
      );
    } finally {
      setUploadingType(null);
    }
  }

  async function handleAddAccreditation() {
    const form = forms.accreditation ?? {};
    if (!form.registration_authority?.trim()) {
      setError(
        "Please choose the registration authority (Gas Safe or NICEIC) before saving.",
      );
      return;
    }
    if (!form.registration_number?.trim()) {
      setError("Please enter a registration number before saving.");
      return;
    }

    setError("");
    setSuccess("");
    setUploadingType("accreditation");
    try {
      await addRegistrationNumber({
        category: "accreditation",

        title: form.registration_authority.trim(),

        registration_number: form.registration_number.trim(),

        number: form.registration_number.trim(),

        registration_authority: form.registration_authority?.trim() ?? "",

        expiry_date: form.expiry_date?.trim() ?? "",
      });
      setSuccess("Accreditation details saved successfully.");
      await loadSetup();
    } catch (uploadError) {
      setError(
        normalizeApiError(uploadError, "Registration could not be added.")
          .message,
      );
    } finally {
      setUploadingType(null);
    }
  }

  async function handleRightToWorkToggle(value: boolean) {
    setError("");
    setSuccess("");

    if (!value) {
      setRightToWorkIsBritish(false);
      setSuccess(
        "Right to Work evidence is now required. Upload it to update your account.",
      );
      return;
    }

    setIsSavingRightToWork(true);
    setRightToWorkIsBritish(true);
    try {
      await uploadAccountSetupDocument({
        type: "right_to_work",
        right_to_work_is_british: true,
      });
      setSelectedFile((current) =>
        current?.taskType === "right_to_work" ? null : current,
      );
      setSuccess(
        "British status saved. Right to Work is complete and no upload is required.",
      );
      await loadSetup();
    } catch (saveError) {
      setRightToWorkIsBritish(false);
      setError(
        normalizeApiError(saveError, "Could not save your British status.")
          .message,
      );
    } finally {
      setIsSavingRightToWork(false);
    }
  }

  async function handleSubmitVerification() {
    setError("");
    setSuccess("");

    // Enforce right-to-work requirement if the vendor is NOT marked British
    if (!rightToWorkIsBritish) {
      const existing = documents.find((d) => d.type === "right_to_work");
      const hasUploaded =
        !!existing ||
        (selectedFile && selectedFile.taskType === "right_to_work");
      if (!hasUploaded) {
        setError(
          "Please confirm you are British or upload a Right to Work document before submitting.",
        );
        return;
      }
    }

    setIsSubmittingVerification(true);
    try {
      await submitVerification();
      setSuccess("Verification submitted successfully for review.");
      await loadSetup();
    } catch (submitError) {
      setError(
        normalizeApiError(submitError, "Verification could not be submitted.")
          .message,
      );
    } finally {
      setIsSubmittingVerification(false);
    }
  }

  return (
    <ProtectedScreen title="Account Setup" activeRoute="/account-setup">
      <StatusBar style="light" />
      <SectionIntro
        kicker="Verification"
        title="Account Setup Tasks"
        text="Upload the documents required for verification so they can be reviewed by the admin team."
      />

      {!accountStatus.isComplete && accountStatus.outstandingLabels.length ? (
        <Card>
          <Text style={ui.cardTitle}>Finish your account details</Text>
          <Text style={ui.muted}>
            Jobs, certificates and invoices unlock once these are done:{" "}
            {accountStatus.outstandingLabels.join(", ")}.
          </Text>
        </Card>
      ) : null}

      {error ? <ErrorState message={error} onRetry={loadSetup} /> : null}
      {success ? (
        <Card>
          <Text style={[ui.value, { color: "#17c7a3" }]}>{success}</Text>
        </Card>
      ) : null}

      {isLoading ? (
        <View style={ui.stateCard}>
          <ActivityIndicator color="#ff6a00" />
        </View>
      ) : displayTasks.length ? (
        displayTasks.map((task) => {
          const taskType = String(task.type ?? task.key ?? "");
          const documentState = isDocumentUploadType(taskType)
            ? getDocumentUiState(
                task.document,
                task.status,
                taskType === "right_to_work" && rightToWorkIsBritish,
              )
            : null;
          const isProfileNavigationTask = [
            "profile",
            "category",
            "postcode",
          ].includes(taskType);
          const card = (
            <Card
              key={task.type ?? task.key ?? task.label}
              style={
                isProfileNavigationTask ? { borderColor: "#ff9a4b" } : undefined
              }
            >
              <View style={[ui.row, { justifyContent: "space-between" }]}>
                <Text style={ui.cardTitle}>{task.label}</Text>
                <StatusPill status={documentState?.status ?? task.status} />
              </View>
              {task.document?.rejection_reason &&
              !(taskType === "right_to_work" && rightToWorkIsBritish) ? (
                <Text style={[ui.muted, { color: "#ff8585" }]}>
                  {task.document.rejection_reason}
                </Text>
              ) : null}
              {documentState?.message ? (
                <Text
                  style={[
                    ui.muted,
                    documentState.expired && { color: "#ffb36e" },
                  ]}
                >
                  {documentState.message}
                </Text>
              ) : null}
              {task.document?.expiry_date &&
              !(taskType === "right_to_work" && rightToWorkIsBritish) ? (
                <Text style={ui.muted}>
                  Expiry date: {task.document.expiry_date}
                </Text>
              ) : null}
              <TaskFields
                task={task}
                form={forms[String(task.type ?? task.key ?? "")] ?? {}}
                selectedFile={
                  selectedFile?.taskType === task.type ? selectedFile : null
                }
                isUploading={uploadingType === taskType}
                showUploadControls={documentState?.canUpload ?? true}
                rightToWorkIsBritish={rightToWorkIsBritish}
                isSavingRightToWork={isSavingRightToWork}
                onToggleRightToWork={handleRightToWorkToggle}
                onChange={updateForm}
                onPickFile={() => pickFile(String(task.type))}
                onTakePhoto={() => takePhoto(String(task.type))}
                onUpload={() => {
                  if (isDocumentUploadType(taskType))
                    void handleUpload(taskType);
                }}
                onAddAccreditation={handleAddAccreditation}
              />
              {isProfileNavigationTask ? (
                <Text
                  style={[ui.muted, { marginTop: 12, fontStyle: "italic" }]}
                >
                  Tap anywhere on this card to complete this requirement in
                  Profile.
                </Text>
              ) : null}
            </Card>
          );

          return isProfileNavigationTask ? (
            <Pressable
              key={task.type ?? task.key ?? task.label}
              onPress={() => navigateToProfile(taskType)}
              style={({ pressed }) => (pressed ? ui.pressed : undefined)}
            >
              {card}
            </Pressable>
          ) : (
            <View key={task.type ?? task.key ?? task.label}>{card}</View>
          );
        })
      ) : (
        <EmptyState
          title="No setup tasks"
          text="The account setup API did not return tasks."
        />
      )}

      <Pressable
        onPress={handleSubmitVerification}
        disabled={isSubmittingVerification}
        style={[ui.primaryButton, isSubmittingVerification && { opacity: 0.5 }]}
      >
        <Text style={ui.primaryButtonText}>
          {isSubmittingVerification ? "Submitting..." : "Submit verification"}
        </Text>
      </Pressable>
    </ProtectedScreen>
  );
}

function toUploadValue(file: UploadFile) {
  return {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
    file: file.file,
  };
}

function TaskFields({
  task,
  form,
  selectedFile,
  isUploading,
  showUploadControls,
  rightToWorkIsBritish,
  isSavingRightToWork,
  onChange,
  onPickFile,
  onTakePhoto,
  onUpload,
  onAddAccreditation,
  onToggleRightToWork,
}: {
  task: AccountSetupTask;
  form: SetupFormState;
  selectedFile: UploadFile | null;
  isUploading: boolean;
  showUploadControls: boolean;
  rightToWorkIsBritish: boolean;
  isSavingRightToWork: boolean;
  onChange: (type: string, field: string, value: string) => void;
  onPickFile: () => void;
  onTakePhoto: () => void;
  onUpload: () => void;
  onAddAccreditation: () => void;
  onToggleRightToWork?: (value: boolean) => void;
}) {
  const type = String(task.type ?? task.key ?? "");
  const change = (field: string, value: string) => onChange(type, field, value);

  if (["profile", "category", "postcode"].includes(type)) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={ui.muted}>
          Manage this item from Profile or Service Management on the vendor
          dashboard.
        </Text>
        <Text style={[ui.muted, { color: "#b0bacd" }]}>
          Tap the card to open the right profile section.
        </Text>
      </View>
    );
  }

  if (type === "accreditation") {
    return (
      <View style={{ gap: 10 }}>
        <Text style={ui.muted}>
          Your Gas Safe number is printed on every gas certificate and your
          NICEIC number on every electrical certificate, so add the body you are
          registered with before creating certificates.
        </Text>
        <SetupOptions
          label="Registration authority"
          options={accreditationAuthorities}
          value={form.registration_authority}
          onChange={(value) => change("registration_authority", value)}
        />
        <SetupInput
          label="Registration number"
          value={form.registration_number}
          onChangeText={(value) => change("registration_number", value)}
        />
        <SetupInput
          label="Expiry date"
          value={form.expiry_date}
          onChangeText={(value) => change("expiry_date", value)}
          placeholder="DD-MM-YYYY"
        />
        <Pressable
          disabled={isUploading}
          onPress={onAddAccreditation}
          style={[ui.primaryButton, isUploading && { opacity: 0.5 }]}
        >
          <Text style={ui.primaryButtonText}>
            {isUploading ? "Adding..." : "Add"}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (type === "right_to_work") {
    return (
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            disabled={isSavingRightToWork}
            onPress={() => onToggleRightToWork?.(!rightToWorkIsBritish)}
            style={[
              rightToWorkIsBritish ? ui.primaryButton : ui.secondaryButton,
              isSavingRightToWork && { opacity: 0.5 },
            ]}
          >
            {isSavingRightToWork ? (
              <ActivityIndicator
                color={rightToWorkIsBritish ? "#ffffff" : "#ff6a00"}
              />
            ) : (
              <Text
                style={
                  rightToWorkIsBritish
                    ? ui.primaryButtonText
                    : ui.secondaryButtonText
                }
              >
                {rightToWorkIsBritish ? "✓" : "+"}
              </Text>
            )}
          </Pressable>
          <Text style={ui.label}>I am British</Text>
        </View>

        {rightToWorkIsBritish ? (
          <Text style={[ui.muted, { color: "#17c7a3" }]}>
            Right to Work upload is not required when you confirm you are
            British.
          </Text>
        ) : showUploadControls ? (
          <>
            <Text style={ui.muted}>
              Upload Right to Work evidence, such as a share-code document.
            </Text>
            <SetupInput
              label="Expiry date"
              value={
                form.expiry_date ?? task.document?.expiry_date ?? undefined
              }
              onChangeText={(value) => change("expiry_date", value)}
              placeholder="YYYY-MM-DD"
            />
            <SetupInput
              label="Date of birth"
              value={
                form.date_of_birth ?? task.document?.date_of_birth ?? undefined
              }
              onChangeText={(value) => change("date_of_birth", value)}
              placeholder="YYYY-MM-DD"
            />
            <FileControls
              selectedFile={selectedFile}
              isUploading={isUploading}
              onPickFile={onPickFile}
              onTakePhoto={onTakePhoto}
              onUpload={onUpload}
            />
          </>
        ) : null}
      </View>
    );
  }

  if (type === "id_document") {
    if (!showUploadControls) return null;
    const idType =
      normalizeIdType(form.id_type ?? task.document?.id_type) ??
      "driving_licence";
    return (
      <View style={{ gap: 10 }}>
        <Text style={ui.label}>Document type</Text>
        <View style={ui.wrapRow}>
          <DocumentTypeButton
            label="Driving Licence"
            selected={idType === "driving_licence"}
            onPress={() => change("id_type", "driving_licence")}
          />
          <DocumentTypeButton
            label="Passport"
            selected={idType === "passport"}
            onPress={() => change("id_type", "passport")}
          />
        </View>
        <SetupInput
          label="Expiry date"
          value={form.expiry_date ?? task.document?.expiry_date ?? undefined}
          onChangeText={(value) => change("expiry_date", value)}
          placeholder="YYYY-MM-DD"
        />
        <FileControls
          selectedFile={selectedFile}
          isUploading={isUploading}
          onPickFile={onPickFile}
          onTakePhoto={onTakePhoto}
          onUpload={onUpload}
        />
      </View>
    );
  }

  if (type === "insurance" && showUploadControls)
    return (
      <View style={{ gap: 10 }}>
        <SetupInput
          label="Expiry date"
          value={form.expiry_date ?? task.document?.expiry_date ?? undefined}
          onChangeText={(value) => change("expiry_date", value)}
          placeholder="YYYY-MM-DD"
        />
        <FileControls
          selectedFile={selectedFile}
          isUploading={isUploading}
          onPickFile={onPickFile}
          onTakePhoto={onTakePhoto}
          onUpload={onUpload}
        />
      </View>
    );

  if (type === "submit" || type === "approval") {
    return (
      <Text style={ui.muted}>Status is updated by the verification API.</Text>
    );
  }

  return null;
}

function DocumentTypeButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={selected ? ui.primaryButton : ui.secondaryButton}
    >
      <Text style={selected ? ui.primaryButtonText : ui.secondaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function normalizeIdType(value?: string | null): IdType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[ -]+/g, "_");
  if (normalized === "driving_licence" || normalized === "passport")
    return normalized;
  return null;
}

function isDocumentUploadType(value: string): value is DocumentUploadType {
  return (
    value === "insurance" ||
    value === "id_document" ||
    value === "right_to_work"
  );
}

function getDocumentUiState(
  document: AccountSetupTask["document"],
  taskStatus?: string,
  rightToWorkIsBritish = false,
): DocumentUiState {
  if (rightToWorkIsBritish) {
    return { status: taskStatus || "completed", canUpload: false };
  }

  if (!document) {
    return { status: "missing", canUpload: true };
  }

  const status = (document.status || taskStatus || "").toLowerCase();
  if (isDocumentExpired(document.expiry_date)) {
    return {
      status: status === "missing" ? "missing" : "expired",
      canUpload: true,
      expired: true,
      message: "This document has expired. Please upload a new one.",
    };
  }

  if (status === "rejected") {
    return {
      status: document.status || taskStatus || "rejected",
      canUpload: true,
    };
  }

  if (status === "approved") {
    return {
      status: document.status || taskStatus || "approved",
      canUpload: false,
      message: "Uploaded file is available in admin/vendor website.",
    };
  }

  if (
    status === "pending" ||
    status === "under_review" ||
    status === "uploaded"
  ) {
    return {
      status: "pending",
      canUpload: false,
      message: "Document uploaded and waiting for admin approval.",
    };
  }

  return {
    status: document.status || taskStatus || "missing",
    canUpload: status === "missing",
  };
}

function isDocumentExpired(expiryDate?: string | null) {
  if (!expiryDate) return false;
  const dateOnly = expiryDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!dateOnly) return false;

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return dateOnly < today;
}

const accreditationAuthorities = ["Gas Safe", "NICEIC", "Other"];

function SetupOptions({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <View style={ui.wrapRow}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[
                ui.secondaryButton,
                { flexGrow: 1, flexBasis: 100 },
                selected && {
                  borderColor: "#ff8d42",
                  backgroundColor: "#2b211c",
                },
              ]}
            >
              <Text
                style={[
                  ui.secondaryButtonText,
                  selected && { color: "#ffd5b8" },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SetupInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value?: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        value={value ?? ""}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor="#8f99aa"
        style={ui.input}
      />
    </View>
  );
}

function FileControls({
  selectedFile,
  isUploading,
  onPickFile,
  onTakePhoto,
  onUpload,
}: {
  selectedFile: UploadFile | null;
  isUploading: boolean;
  onPickFile: () => void;
  onTakePhoto: () => void;
  onUpload: () => void;
}) {
  return (
    <>
      <Text style={ui.muted}>
        {selectedFile
          ? `Selected: ${selectedFile.name}`
          : "No file selected yet."}
      </Text>
      <View style={ui.wrapRow}>
        <Pressable onPress={onPickFile} style={ui.secondaryButton}>
          <Text style={ui.secondaryButtonText}>Choose file/image</Text>
        </Pressable>
        <Pressable onPress={onTakePhoto} style={ui.secondaryButton}>
          <Text style={ui.secondaryButtonText}>Take photo</Text>
        </Pressable>
        <Pressable
          onPress={onUpload}
          disabled={isUploading}
          style={[ui.primaryButton, isUploading && { opacity: 0.5 }]}
        >
          <Text style={ui.primaryButtonText}>
            {isUploading ? "Uploading..." : "Upload"}
          </Text>
        </Pressable>
      </View>
    </>
  );
}
