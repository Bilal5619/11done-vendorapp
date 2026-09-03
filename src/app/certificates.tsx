import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { normalizeApiError } from "@/api";
import {
  createCertificateDraft,
  createStandaloneCertificateDraft,
  getBookingCertificates,
  getCertificate,
  getCertificateTemplates,
  submitCertificate,
  updateCertificate,
  uploadCertificatePhoto,
  uploadCertificateSignature,
  type CertificateFieldValue,
  type CertificateItem,
  type CertificateRecord,
  type CertificateTemplate,
  type UpdateCertificatePayload,
} from "@/api/certificatesApi";
import type { FieldErrors } from "@/api/client";
import { getJob } from "@/api/jobsApi";
import {
  Card,
  ErrorState,
  ProtectedScreen,
  StatusPill,
  ui,
} from "@/components/vendor-ui";
import {
  electricalCertificates,
  getElectricalDefinition,
  matchesElectricalTemplate,
  type ElectricalCertificateDefinition,
  type ElectricalField,
  type ElectricalStep,
} from "@/constants/electrical-certificates";
import { useAuth } from "@/context/AuthContext";
import type { JobDetail, Vendor } from "@/types/vendor";
import {
  getJobAppointmentDate,
  getJobBookingId,
  getJobCustomerName,
  getJobEmail,
  getJobNotes,
  getJobPhone,
  getJobServiceAddressLine,
  getJobServiceName,
  getJobServicePostcode,
  getJobSiteEmail,
  getJobSiteName,
  getJobSitePhone,
} from "@/types/vendor";

type AnswerMap = Record<string, string>;
type TableMap = Record<string, AnswerMap[]>;
type SignatureUpload = { uri: string; name: string; type: string; file?: Blob };
const MISSING_SITE_ADDRESS_MESSAGE =
  "This job is missing the site address. Please enter the site address before generating the certificate.";

export default function CertificatesScreen() {
  const params = useLocalSearchParams<{
    job_id?: string;
    certificate_id?: string;
    type?: string;
  }>();
  const { vendor } = useAuth();
  const certificateGroups = useMemo(
    () => groupCertificatesByCategory(electricalCertificates),
    [],
  );
  const bookingId = singleParam(params.job_id);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [certificate, setCertificate] = useState<CertificateRecord | null>(
    null,
  );

  const [definition, setDefinition] =
    useState<ElectricalCertificateDefinition | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [tables, setTables] = useState<TableMap>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const [nextTemplates, nextCertificates, jobResponse] = await Promise.all([
        getCertificateTemplates(),
        bookingId ? getBookingCertificates(bookingId) : Promise.resolve([]),
        bookingId ? getJob(bookingId) : Promise.resolve(null),
      ]);
      const nextJob = getJobFromResponse(jobResponse);
      setTemplates(nextTemplates);
      setCertificates(nextCertificates.filter((item) => inferDefinition(item)));
      setJob(nextJob);
      if (params.certificate_id) {
        const response = await getCertificate(params.certificate_id);
        openEditor(response.certificate, nextJob);
      }
    } catch (loadError) {
      setError(
        normalizeApiError(
          loadError,
          "Certificates could not be loaded. Please try again shortly.",
        ).message,
      );
    } finally {
      setIsLoading(false);
    }
    // openEditor deliberately reads the current vendor only when a certificate is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, params.certificate_id, vendor]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  function openEditor(next: CertificateRecord, selectedJob = job) {
    const nextDefinition = inferDefinition(next);
    if (!nextDefinition) {
      setError(
        "This certificate is not one of the supported certificate types.",
      );
      return;
    }
    const nextAnswers: AnswerMap = {};
    next.field_values?.forEach((item) => {
      if (item.field_key.includes(".")) {
        nextAnswers[item.field_key] = item.field_value ?? "";
        return;
      }
      nextDefinition.steps.forEach((step) =>
        step.fields?.forEach((field) => {
          if (field.key === item.field_key)
            nextAnswers[answerKey(step, field)] = item.field_value ?? "";
        }),
      );
    });
    const certificateNumber =
      next.certificate_number ||
      nextAnswers["client_engineer.certificate_number"] ||
      (next.status === "draft" ? `Draft #${next.id}` : "");
    nextAnswers["client_engineer.certificate_number"] = certificateNumber;
    nextAnswers["client_engineer.job_reference"] =
      nextAnswers["client_engineer.job_reference"] || certificateNumber;
    nextAnswers["client_engineer.client_name"] =
      next.customer_name ?? nextAnswers["client_engineer.client_name"] ?? "";
    nextAnswers["client_engineer.client_email"] =
      next.customer_email ?? nextAnswers["client_engineer.client_email"] ?? "";
    nextAnswers["client_engineer.client_contact_number"] =
      next.customer_phone ??
      nextAnswers["client_engineer.client_contact_number"] ??
      "";
    nextAnswers["client_engineer.engineer_name"] =
      next.engineer_name ??
      nextAnswers["client_engineer.engineer_name"] ??
      vendor?.profile?.name ??
      vendor?.username ??
      "";
    const savedSiteAddress = [
      next.site_address_line_1,
      next.site_address_line_2,
      next.site_city,
      next.site_county,
    ]
      .filter(Boolean)
      .join(", ");
    nextAnswers["client_engineer.installation_address"] =
      nextAnswers["client_engineer.installation_address"] || savedSiteAddress;
    nextAnswers["client_engineer.postcode"] =
      nextAnswers["client_engineer.postcode"] || next.site_postcode || "";
    mergeJobPrefill(nextAnswers, nextDefinition, selectedJob, vendor);
    nextDefinition.steps.forEach((step) =>
      step.fields?.forEach((field) => {
        if (!field.signatureType) return;
        const saved = next.signatures?.find(
          (signature) => signature.signature_type === field.signatureType,
        );
        if (saved && !nextAnswers[answerKey(step, field)])
          nextAnswers[answerKey(step, field)] =
            `stored:${saved.signature_path ?? saved.id}`;
      }),
    );
    applyDefaults(nextDefinition, nextAnswers);
    const nextTables: TableMap = {};
    next.items?.forEach((item) => {
      const target =
        nextDefinition.steps.find(
          (step) => step.table?.itemType === item.item_type,
        ) ??
        nextDefinition.steps.find(
          (step) => (step.table?.storageKey ?? step.key) === item.section_key,
        );
      if (target)
        (nextTables[target.key] ??= []).push(stringifyValues(item.item_data));
    });
    updatePatSummary(nextDefinition, nextAnswers, nextTables);
    setCertificate(next);
    setDefinition(nextDefinition);
    setAnswers(nextAnswers);
    setTables(nextTables);
    setStepIndex(0);
    setError("");
    setFieldErrors({});
    setNotice("");
  }
  async function uploadAppliancePhoto(
    uri: string,
    caption: string,
  ): Promise<string> {
    if (!certificate?.id) {
      throw new Error(
        "Please save the certificate draft before adding photos.",
      );
    }

    if (String(certificate.id).startsWith("local-")) {
      throw new Error(
        "This certificate must be linked to a job before photos can be uploaded.",
      );
    }

    const extension =
      uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";

    const type =
      extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : "image/jpeg";

    let webFile: Blob | undefined;

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      webFile = await response.blob();
    }

    const result = await uploadCertificatePhoto(
      certificate.id,
      {
        uri,
        name: `appliance-${Date.now()}.${extension}`,
        type,
        file: webFile,
      },
      caption,
    );

    const uploadedPhoto = result.photos?.[0];

    if (!uploadedPhoto?.file_url) {
      throw new Error(
        "The appliance photo was uploaded but no photo URL was returned.",
      );
    }

    const latest = await getCertificate(certificate.id);
    setCertificate(latest.certificate);

    return uploadedPhoto.file_url;
  }
  function createLocalDraft(
    nextDefinition: ElectricalCertificateDefinition,
    templateId: string | number,
  ) {
    const localId = `local-${Date.now()}`;
    const localCertificate: CertificateRecord = {
      id: localId,
      status: "draft",
      template_id: templateId,
      certificate_category: nextDefinition.type,
      certificate_type: nextDefinition.type,
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      field_values: [],
      items: [],
      signatures: [],
      photos: [],
      template: {
        id: templateId,
        template_key: nextDefinition.type,
        template_name: nextDefinition.title,
        category: nextDefinition.type,
      },
    };
    return localCertificate;
  }

  async function createDraft(nextDefinition: ElectricalCertificateDefinition) {
    const template = templates.find((item) =>
      matchesElectricalTemplate(item, nextDefinition),
    );
    if (!template) {
      setError(
        `${nextDefinition.title} is not configured in the existing certificate templates.`,
      );
      return;
    }
    await runSaving(async () => {
      if (bookingId) {
        const response = await createCertificateDraft(bookingId, template.id);
        openEditor(response.certificate, job);
        setCertificates((current) => [
          response.certificate,
          ...current.filter((item) => item.id !== response.certificate.id),
        ]);
        setNotice("Draft created. Your progress will be saved at every step.");
        return;
      }

      const response = await createStandaloneCertificateDraft(template.id);

openEditor(response.certificate, null);

setCertificates((current) => [
  response.certificate,
  ...current.filter((item) => item.id !== response.certificate.id),
]);

setNotice("Standalone certificate draft created.");
    });
  }

  function buildPayload(
    baseCertificate = certificate,
  ): UpdateCertificatePayload {
    if (!definition) return {};
    const fieldValues: CertificateFieldValue[] = definition.steps.flatMap(
      (step) =>
        (step.fields ?? [])
          .map((field, index) => ({
            field_key: field.key,
            field_label: field.label,
            field_type: field.type,
            field_value: answers[answerKey(step, field)] ?? "",
            sort_order: index,
          }))
          .filter((field) => {
            const value = String(field.field_value ?? "").trim();

            // Do not send completely empty optional fields to the PDF renderer.
            return value !== "";
          }),
    );
    const enteredSiteAddress = getEnteredSiteAddress(answers);
    const addressAliases = new Set([
      getAddressAlias(definition.type),
      "site_address_line_1",
      "site_address_line1",
    ]);
    for (const addressAlias of addressAliases) {
      if (
        !addressAlias ||
        fieldValues.some((field) => field.field_key === addressAlias)
      )
        continue;
      fieldValues.push({
        field_key: addressAlias,
        field_label: addressAlias.replaceAll("_", " "),
        field_type: "textarea",
        field_value: enteredSiteAddress,
        sort_order: fieldValues.length,
      });
    }
    const commonValues: Record<string, string | number | null | undefined> = {
      certificate_number:
        answers["client_engineer.certificate_number"] ||
        baseCertificate?.certificate_number ||
        (baseCertificate?.status === "draft" && baseCertificate.id
          ? `Draft #${baseCertificate.id}`
          : undefined),
      certificate_category: baseCertificate?.certificate_category,
      template_id: baseCertificate?.template_id,
    customer_name:
  answers["client_installation_details.client_name"] ||
  answers["client_engineer.client_name"] ||
  baseCertificate?.customer_name,
     customer_email:
  answers["client_installation_details.client_email"] ||
  answers["client_engineer.client_email"] ||
  baseCertificate?.customer_email,
      customer_phone:
  answers["client_installation_details.client_telephone"] ||
  answers["client_engineer.client_contact_number"] ||
  baseCertificate?.customer_phone,
      job_reference:
        answers["client_engineer.job_reference"] ||
        answers["client_engineer.certificate_number"] ||
        undefined,
      landlord_name: baseCertificate?.landlord_name,
      landlord_email: baseCertificate?.landlord_email,
      landlord_phone: baseCertificate?.landlord_phone,
      landlord_address: baseCertificate?.landlord_address,
      site_name: baseCertificate?.site_name,
      site_address_line_1:
        enteredSiteAddress || baseCertificate?.site_address_line_1,
      site_address_line1:
        enteredSiteAddress || baseCertificate?.site_address_line_1,
      site_address_line_2: baseCertificate?.site_address_line_2,
      site_address_line2: baseCertificate?.site_address_line_2,
      site_city: baseCertificate?.site_city,
      site_county: baseCertificate?.site_county,
      site_postcode:
        answers["client_engineer.postcode"] || baseCertificate?.site_postcode,
  inspection_date:
  definition.type === "pat"
    ? answers["test_equipment_details.test_date"] ||
      baseCertificate?.inspection_date
    : definition.type === "cp12"
      ? baseCertificate?.inspection_date || toDateValue(new Date())
      : answers["client_engineer.issue_date"] ||
        baseCertificate?.inspection_date,
      inspection_time: baseCertificate?.inspection_time,
      next_due_date:
        getNextDueDate(definition, answers, tables) ||
        baseCertificate?.next_due_date,
      overall_result:
        getOverallResult(definition, answers, tables) ||
        baseCertificate?.overall_result,
      engineer_name:
        answers["client_engineer.engineer_name"] ||
        baseCertificate?.engineer_name,
      engineer_email: baseCertificate?.engineer_email,
      engineer_phone: baseCertificate?.engineer_phone,
      engineer_company:
        answers["client_engineer.company_name"] ||
        baseCertificate?.engineer_company,
      engineer_registration_number:
        answers["client_engineer.registration_number"] ||
        baseCertificate?.engineer_registration_number,
      engineer_gas_safe_number: baseCertificate?.engineer_gas_safe_number,
      engineer_niceic_number: baseCertificate?.engineer_niceic_number,
      engineer_napit_number: baseCertificate?.engineer_napit_number,
    };
    baseCertificate?.template?.field_schema?.forEach((field) => {
      if (fieldValues.some((value) => value.field_key === field.key)) return;
      const value =
        commonValues[field.key] ??
        commonValues[normalizeTemplateFieldKey(field.key)];
      if (value === undefined) return;
      fieldValues.push({
        field_key: field.key,
        field_label: field.label,
        field_type: field.type,
        field_value: value === null ? "" : String(value),
        sort_order: fieldValues.length,
      });
    });
    const items = definition.steps.flatMap((step) =>
      (tables[step.key] ?? []).map(
        (item, index): CertificateItem => ({
          section_key: step.table?.storageKey ?? step.key,
          item_type: step.table?.itemType ?? "row",
          item_order: index,
          item_data: item,
        }),
      ),
    );
    return {
      ...commonValues,
      defects_found: baseCertificate?.defects_found,
      remedial_action_required: baseCertificate?.remedial_action_required,
      engineer_notes: baseCertificate?.engineer_notes,
      job_id: bookingId ?? baseCertificate?.job_id ?? null,
      booking_id: bookingId ?? baseCertificate?.booking_id ?? null,
      service_booking_id:
        bookingId ?? baseCertificate?.service_booking_id ?? null,
      certificate_type: baseCertificate?.certificate_type ?? definition.type,
      signatures: baseCertificate?.signatures,
      field_values: fieldValues,
      items,
    };
  }

  async function saveDraft(message = "Draft saved.") {
    if (!certificate) return null;

    if (
     
      !certificate.id ||
      String(certificate.id).startsWith("local-")
    ) {
      const nextCertificate = {
        ...certificate,
        ...buildPayload(certificate),
        status: "draft" as const,
      };
      setCertificate(nextCertificate);
      setCertificates((current) =>
        current.map((item) =>
          item.id === certificate.id ? nextCertificate : item,
        ),
      );
      setNotice(message);
      return nextCertificate;
    }

    const response = await updateCertificate(certificate.id, buildPayload());
    setCertificate(response.certificate);
    setCertificates((current) =>
      current.map((item) =>
        item.id === response.certificate.id ? response.certificate : item,
      ),
    );
    setNotice(message);
    return response.certificate;
  }

  async function nextStep() {
    if (!definition || !currentStepValid) return;
    await runSaving(async () => {
      await saveDraft("Step saved.");
      if (stepIndex < definition.steps.length - 1)
        setStepIndex((current) => current + 1);
    });
  }

  async function generatePdf() {
    if (
  !certificate ||
  !allStepsValid ||
  (bookingId && !hasSiteAddress)
) {
  if (bookingId && !hasSiteAddress) {
    setError(MISSING_SITE_ADDRESS_MESSAGE);
  }
  return;
}
    await runSaving(async () => {
      const savedCertificate = await saveDraft("");
      if (
       
        !savedCertificate?.id ||
        String(savedCertificate.id).startsWith("local-")
      ) {
        const nextCertificate: CertificateRecord = {
          ...(savedCertificate ?? certificate),
          id: savedCertificate?.id ?? certificate.id ?? `local-${Date.now()}`,
          status: "generated",
          pdf_url: null,
          url: null,
        };
        setCertificate(nextCertificate);
        setCertificates((current) =>
          current.map((item) =>
            item.id === savedCertificate?.id ? nextCertificate : item,
          ),
        );
        setNotice(
          "Certificate prepared locally. Link it to a job later to sync it to the server.",
        );
        return;
      }

      await syncRequiredSignatures();
      const latest = await getCertificate(savedCertificate.id);
      setCertificate(latest.certificate);
      const response = await submitCertificate(
        certificate.id,
        buildPayload(latest.certificate),
      );
      setCertificate(response.certificate);
      setNotice("Certificate completed and PDF generated.");
      const url = response.certificate.pdf_url ?? response.certificate.url;
      if (url) await Linking.openURL(String(url));
    });
  }

  async function saveSignature(field: ElectricalField, file: SignatureUpload) {
    if (!certificate || !field.signatureType) return;
    try {
      await uploadCertificateSignature(
        certificate.id,
        file,
        field.signatureType,
        field.signatureType === "customer"
          ? answers["client_engineer.client_name"]
          : answers["client_engineer.engineer_name"],
      );
      const response = await getCertificate(certificate.id);
      setCertificate(response.certificate);
      setNotice(
        `${field.signatureType === "customer" ? "Client" : "Engineer"} signature saved.`,
      );
    } catch (signatureError) {
      setError(
        formatApiError(
          signatureError,
          "The signature image could not be saved.",
        ),
      );
    }
  }

  async function syncRequiredSignatures() {
    if (!certificate || !definition) return;
    const savedTypes = new Set(
      certificate.signatures?.map((signature) => signature.signature_type) ??
        [],
    );
    for (const step of definition.steps) {
      for (const field of step.fields ?? []) {
        if (!field.signatureType || savedTypes.has(field.signatureType))
          continue;
        const value = answers[answerKey(step, field)] ?? "";
        const file = await signatureValueToUpload(
          value,
          `${field.signatureType}-signature.png`,
        );
        if (!file)
          throw new Error(
            `Please sign the ${field.signatureType} signature field again before generating the PDF.`,
          );
        await uploadCertificateSignature(
          certificate.id,
          file,
          field.signatureType,
          field.signatureType === "customer"
            ? answers["client_engineer.client_name"]
            : answers["client_engineer.engineer_name"],
        );
        savedTypes.add(field.signatureType);
      }
    }
  }

  async function runSaving(action: () => Promise<unknown>) {
    setIsSaving(true);
    setError("");
    setFieldErrors({});
    setNotice("");
    try {
      await action();
    } catch (actionError) {
      const normalized = normalizeApiError(
        actionError,
        "The certificate could not be saved.",
      );
      setFieldErrors(normalized.errors);
      setError(formatNormalizedApiError(normalized));
      const invalidStep = definition
        ? findFirstErrorStep(definition, normalized.errors)
        : -1;
      if (invalidStep >= 0) setStepIndex(invalidStep);
    } finally {
      setIsSaving(false);
    }
  }

  function closeEditor() {
    setCertificate(null);
    setDefinition(null);
    setAnswers({});
    setTables({});
    setStepIndex(0);
    setError("");
    setFieldErrors({});
    setNotice("");
  }

  const step = definition?.steps[stepIndex];
  const stepWarnings = useMemo(() => {
    if (!step) return [] as string[];
    const warnings: string[] = [];
    if (
      step.key === "faults_remedial_actions" &&
      answers["faults_remedial_actions.no_faults_identified"] === "Yes" &&
      (tables[step.key]?.length ?? 0) > 0
    ) {
      warnings.push(
        "No faults identified is selected, but fault records still exist. Remove the records or change the selection.",
      );
    }
    if (step.key === "final_checks") {
      const checkWarnings: [string, string][] = [
        ["final_checks.gas_tightness_test", "Gas tightness test"],
        [
          "final_checks.gas_pipework_visual_inspection",
          "Gas pipework visual inspection",
        ],
        ["final_checks.emergency_control_accessible", "Emergency control"],
        [
          "final_checks.equipotential_bonding_satisfactory",
          "Equipotential bonding",
        ],
        ["final_checks.installation_satisfactory", "Installation satisfactory"],
      ];
      for (const [key, label] of checkWarnings) {
        const value = answers[key];
        if (value === "Fail" || value === "No")
          warnings.push(
            `${label} is ${value}. Please review safety actions before final submission.`,
          );
      }
    }
    return warnings;
  }, [step, answers, tables]);
  const currentStepValid = useMemo(
    () => (step ? validateStep(step, answers, tables) : false),
    [step, answers, tables],
  );
  const allStepsValid = useMemo(
    () =>
      definition
        ? definition.steps.every((item) => validateStep(item, answers, tables))
        : false,
    [definition, answers, tables],
  );
  const hasSiteAddress = Boolean(getEnteredSiteAddress(answers).trim());
  const isDraft = certificate?.status === "draft";

  const certificateServiceTitle =
    certificate?.service_title ||
    certificate?.service?.title ||
    certificate?.service_name ||
    certificate?.service?.name ||
    "";

  return (
    <ProtectedScreen title="Certificate" activeRoute="/certificates">
      <StatusBar style="light" />
      {error && !certificate ? (
        <ErrorState message={error} onRetry={load} />
      ) : null}
      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
      {isLoading ? (
        <View style={ui.stateCard}>
          <ActivityIndicator color="#ff6a00" />
        </View>
      ) : certificate && definition && step ? (
        <>
          <WizardProgress
            definition={definition}
            stepIndex={stepIndex}
            onSelect={(index) => index < stepIndex && setStepIndex(index)}
          />
          <Card>
            <Text style={styles.stepEyebrow}>
              Step {stepIndex + 1} of {definition.steps.length}
            </Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            {certificate?.certificate_number ||
            answers["client_engineer.certificate_number"] ? (
              <Text style={styles.stepMeta}>
                Certificate number:{" "}
                {certificate?.certificate_number ||
                  answers["client_engineer.certificate_number"]}
              </Text>
            ) : null}
            {certificateServiceTitle ? (
              <Text style={styles.stepMeta}>
                Service: {certificateServiceTitle}
              </Text>
            ) : null}
            <Text style={ui.muted}>
              Answer the questions below. Required answers are marked with *.
            </Text>
           {bookingId && !hasSiteAddress ? (
  <Text style={styles.validation}>
    {MISSING_SITE_ADDRESS_MESSAGE}
  </Text>
) : null}
          </Card>

          {step.fields ? (
            <Card>
              {step.fields.map((field) => (
                <QuestionField
                  key={field.key}
                  field={field}
                  value={answers[answerKey(step, field)] ?? ""}
                  errors={getFieldErrors(step, field, fieldErrors)}
                  onChange={(value) => {
                    setError("");
                    setFieldErrors({});
                    setAnswers((current) => {
                      const next = {
                        ...current,
                        [answerKey(step, field)]: value,
                      };
                      if (step.key === "final_checks") {
                        if (field.key === "co_alarm_fitted" && value !== "Yes")
                          next["final_checks.co_alarm_working"] = "";
                        if (
                          field.key === "smoke_alarm_fitted" &&
                          value !== "Yes"
                        )
                          next["final_checks.smoke_alarm_working"] = "";
                      }
                      if (step.key === "declaration") {
                        if (
                          field.key === "customer_unavailable_to_sign" &&
                          value === "Yes"
                        ) {
                          next["declaration.customer_signature"] = "";
                        }
                        if (
                          field.key === "customer_unavailable_to_sign" &&
                          value === "No"
                        ) {
                          next["declaration.customer_unavailable_reason"] = "";
                        }
                      }
                      if (step.key === "client_installation_details") {
                        const sameAddress =
                          next[
                            "client_installation_details.installation_same_as_client_address"
                          ] === "1";
                        if (
                          field.key === "installation_same_as_client_address"
                        ) {
                          if (value === "1") {
                            next[
                              "client_installation_details.installation_address_line_1"
                            ] =
                              next[
                                "client_installation_details.client_address_line_1"
                              ] || "";
                            next[
                              "client_installation_details.installation_address_line_2"
                            ] =
                              next[
                                "client_installation_details.client_address_line_2"
                              ] || "";
                            next[
                              "client_installation_details.installation_town_city"
                            ] =
                              next[
                                "client_installation_details.client_town_city"
                              ] || "";
                            next[
                              "client_installation_details.installation_county_region"
                            ] =
                              next[
                                "client_installation_details.client_county_region"
                              ] || "";
                            next[
                              "client_installation_details.installation_postcode"
                            ] =
                              next[
                                "client_installation_details.client_postcode"
                              ] || "";
                            next[
                              "client_installation_details.installation_telephone"
                            ] =
                              next[
                                "client_installation_details.client_telephone"
                              ] || "";
                            next[
                              "client_installation_details.installation_email"
                            ] =
                              next[
                                "client_installation_details.client_email"
                              ] || "";
                          }
                        } else if (sameAddress) {
                          const clientToInstallationMap: Record<
                            string,
                            string
                          > = {
                            client_address_line_1:
                              "installation_address_line_1",
                            client_address_line_2:
                              "installation_address_line_2",
                            client_town_city: "installation_town_city",
                            client_county_region: "installation_county_region",
                            client_postcode: "installation_postcode",
                            client_telephone: "installation_telephone",
                            client_email: "installation_email",
                          };
                          const targetKey = clientToInstallationMap[field.key];
                          if (targetKey)
                            next[`client_installation_details.${targetKey}`] =
                              value;
                        }
                      }
                      return next;
                    });
                  }}
                  onSignatureFile={(file) => saveSignature(field, file)}
                />
              ))}
              {stepWarnings.length ? (
                <View style={styles.warningBox}>
                  {stepWarnings.map((warning) => (
                    <Text key={warning} style={styles.warningText}>
                      {warning}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}
          {step.table ? (
            <ScheduleTable
              step={step}
              rows={tables[step.key] ?? []}
              errors={fieldErrors.items}
              dynamicSelectOptions={
                step.key === "faults_remedial_actions"
                  ? {
                      related_appliance: [
                        "General installation",
                        ...(tables["appliance_details"] ?? [])
                          .map((row, index) => {
                            const label = [
                              row["location"],
                              row["appliance_type"],
                              row["make"],
                              row["model"],
                            ]
                              .filter(Boolean)
                              .join(" · ");
                            return label || `Appliance ${index + 1}`;
                          })
                          .filter(Boolean),
                      ],
                    }
                  : undefined
              }
              onChange={(rows) => {
                const nextTables = { ...tables, [step.key]: rows };
                const nextAnswers = { ...answers };
                updatePatSummary(definition, nextAnswers, nextTables);
                setError("");
                setFieldErrors({});
                setTables(nextTables);
                setAnswers(nextAnswers);
              }}
              onUploadAppliancePhoto={uploadAppliancePhoto}
            />
          ) : null}

          <Card>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!currentStepValid ? (
              <Text style={styles.validation}>
                Complete the required answers before continuing.
              </Text>
            ) : stepIndex === definition.steps.length - 1 && !allStepsValid ? (
              <Text style={styles.validation}>
                Return to the earlier steps and complete every required answer
                and signature.
              </Text>
            ) : null}
            <View style={styles.actions}>
              <ActionButton
                label="Previous"
                secondary
                disabled={stepIndex === 0 || isSaving}
                onPress={() => {
                  setError("");
                  setStepIndex((current) => Math.max(0, current - 1));
                }}
              />
              <ActionButton
                label={isSaving ? "Savingâ€¦" : "Save Draft"}
                secondary
                disabled={isSaving || !isDraft}
                onPress={() => runSaving(() => saveDraft())}
              />
              {stepIndex < definition.steps.length - 1 ? (
                <ActionButton
                  label="Next"
                  disabled={!currentStepValid || isSaving}
                  onPress={nextStep}
                />
              ) : (
                <ActionButton
                  label="Generate Certificate (PDF)"
                  disabled={
  !allStepsValid ||
  (bookingId && !hasSiteAddress) ||
  isSaving ||
  !isDraft
}
                  onPress={generatePdf}
                />
              )}
            </View>
          </Card>
          {!isDraft ? (
            <Card>
              <Text style={ui.cardTitle}>Certificate PDF ready</Text>
              <Text style={ui.muted}>
                The PDF is locked and ready to attach when completing this job.
              </Text>
              <View style={styles.actions}>
                {certificate.pdf_url || certificate.url ? (
                  <ActionButton
                    label="View PDF"
                    secondary
                    onPress={() =>
                      Linking.openURL(
                        String(certificate.pdf_url ?? certificate.url),
                      )
                    }
                  />
                ) : null}
                {bookingId ? (
                  <ActionButton
                    label="Continue to job completion"
                    onPress={() =>
                      router.replace({
                        pathname: "/job-detail",
                        params: {
                          id: bookingId,
                          certificate_id: String(certificate.id),
                          certificate_title: definition.title,
                        },
                      })
                    }
                  />
                ) : null}
              </View>
            </Card>
          ) : null}
          <ActionButton
            label="Back to certificates"
            secondary
            onPress={closeEditor}
          />
        </>
      ) : (
        <>
          {bookingId && certificates.length ? (
            <Card>
              <Text style={ui.cardTitle}>Reports for this job</Text>
              {certificates.map((item) => {
                const itemServiceTitle =
                  item.service_title ||
                  item.service?.title ||
                  item.service_name ||
                  item.service?.name ||
                  "";
                return (
                  <Pressable
                    key={String(item.id)}
                    onPress={() =>
                      getCertificate(item.id)
                        .then((response) => openEditor(response.certificate))
                        .catch((loadError) =>
                          setError(normalizeApiError(loadError).message),
                        )
                    }
                    style={styles.reportRow}
                  >
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text style={ui.value}>
                        {inferDefinition(item)?.title ?? item.certificate_type}
                      </Text>
                      <Text style={ui.muted}>
                        {item.certificate_number ?? `Draft #${item.id}`}
                      </Text>
                      {itemServiceTitle ? (
                        <Text style={ui.muted}>
                          Service: {itemServiceTitle}
                        </Text>
                      ) : null}
                    </View>
                    <StatusPill status={item.status} />
                  </Pressable>
                );
              })}
            </Card>
          ) : null}
          {!bookingId ? (
            <Card>
              <Text style={ui.cardTitle}>No job selected</Text>
              <Text style={ui.muted}>
                You can still start a certificate draft here and link it to a
                job later.
              </Text>
            </Card>
          ) : null}
          <View style={styles.certificateGrid}>
            {certificateGroups.map((group, groupIndex) => (
              <View key={group.title} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{group.title}</Text>
                <View style={styles.categoryItems}>
                  {group.definitions.map((item, itemIndex) => {
                    const available = templates.some((template) =>
                      matchesElectricalTemplate(template, item),
                    );
                    const cardNumber = `${groupIndex + 1}.${itemIndex + 1}`;
                    return (
                      <Pressable
                        key={item.type}
                        disabled={isSaving}
                        onPress={() => createDraft(item)}
                        style={({ pressed }) => [
                          styles.certificateCard,
                          pressed && ui.pressed,
                          isSaving && styles.disabled,
                        ]}
                      >
                        <View style={styles.certificateIcon}>
                          <Text style={styles.certificateNumber}>
                            {cardNumber}
                          </Text>
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={styles.certificateTitle}>
                            {item.title}
                          </Text>
                          <Text style={ui.muted}>
                            {item.steps.length} steps ·{" "}
                            {available
                              ? "Ready to generate"
                              : "Template setup required"}
                          </Text>
                        </View>
                        <SymbolView
                          name={{
                            ios: "chevron.right",
                            android: "chevron_right",
                            web: "chevron_right",
                          }}
                          size={20}
                          tintColor="#8f99aa"
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ProtectedScreen>
  );
}

function WizardProgress({
  definition,
  stepIndex,
  onSelect,
}: {
  definition: ElectricalCertificateDefinition;
  stepIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <Card>
      <View style={styles.progressHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.progressTitle}>{definition.shortTitle}</Text>
          <Text style={ui.muted}>{definition.title}</Text>
        </View>
        <Text style={styles.progressCount}>
          {Math.round(((stepIndex + 1) / definition.steps.length) * 100)}%
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((stepIndex + 1) / definition.steps.length) * 100}%` },
          ]}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepRail}
      >
        {definition.steps.map((step, index) => (
          <Pressable
            key={step.key}
            onPress={() => onSelect(index)}
            style={[
              styles.stepDot,
              index === stepIndex && styles.stepDotActive,
              index < stepIndex && styles.stepDotDone,
            ]}
          >
            <Text
              style={[
                styles.stepDotText,
                index === stepIndex && styles.stepDotTextActive,
              ]}
            >
              {index + 1}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Card>
  );
}
function QuestionField({
  field,
  value,
  photoCaption = "",
  errors = [],
  onChange,
  onPhotoCaptionChange,
  onSignatureFile,
}: {
  field: ElectricalField;
  value: string;
  photoCaption?: string;
  errors?: string[];
  onChange: (value: string) => void;
  onPhotoCaptionChange?: (value: string) => void;
  onSignatureFile?: (file: SignatureUpload) => void | Promise<void>;
}) {
  const [showDate, setShowDate] = useState(false);
  const label = `${field.label}${field.required ? " *" : ""}`;
  if (field.type === "boolean")
    return (
      <ChoiceQuestion
        label={label}
        value={value}
        options={["Yes", "No"]}
        errors={errors}
        onChange={onChange}
      />
    );
  if (field.type === "photo") {
    return (
      <PhotoField
        label={field.label}
        value={value}
        caption={photoCaption}
        onChange={onChange}
        onCaptionChange={onPhotoCaptionChange ?? (() => {})}
        errors={errors}
      />
    );
  }
  if (field.type === "checkbox")
    return (
      <View style={styles.question}>
        <Pressable
          onPress={() => onChange(value === "1" ? "0" : "1")}
          style={styles.checkboxRow}
        >
          <View
            style={[styles.checkbox, value === "1" && styles.checkboxChecked]}
          >
            {value === "1" ? <Text style={styles.checkmark}>âœ“</Text> : null}
          </View>
          <Text style={styles.questionLabel}>{label}</Text>
        </Pressable>
        <FieldErrorText errors={errors} />
      </View>
    );
  if (field.type === "select") {
    return (
      <DropdownQuestion
        label={label}
        value={value}
        options={field.options ?? []}
        errors={errors}
        onChange={onChange}
      />
    );
  }
  if (field.type === "signature")
    return (
      <SignaturePad
        label={label}
        value={value}
        errors={errors}
        onChange={onChange}
        onSaveImage={field.signatureType ? onSignatureFile : undefined}
        modalTitle={
          field.signatureType === "customer"
            ? "Customer Signature"
            : field.signatureType === "engineer"
              ? "Engineer Signature"
              : undefined
        }
      />
    );
  if (field.type === "date") {
    const date = parseDate(value);
    return (
      <View style={styles.question}>
        <Text style={styles.questionLabel}>{label}</Text>
        {Platform.OS === "web" ? (
  <TextInput
    value={value}
    onChangeText={onChange}
    placeholder="YYYY-MM-DD"
    placeholderTextColor="#737e8e"
    style={ui.input}
    {...({ type: "date" } as any)}
  />
) : (
          <>
            <Pressable
              onPress={() => !field.readOnly && setShowDate(true)}
              style={[ui.input, styles.dateButton]}
            >
              <Text style={value ? ui.value : ui.muted}>
                {value || "Select date"}
              </Text>
              <SymbolView
                name={{
                  ios: "calendar",
                  android: "calendar_month",
                  web: "calendar_month",
                }}
                size={18}
                tintColor="#ff6a00"
              />
            </Pressable>
            {showDate ? (
              <DateTimePicker
                value={date}
                mode="date"
                onChange={(event: DateTimePickerEvent, selected) => {
                  setShowDate(Platform.OS === "ios");
                  if (event.type !== "dismissed" && selected)
                    onChange(toDateValue(selected));
                }}
              />
            ) : null}
          </>
        )}
        <FieldErrorText errors={errors} />
      </View>
    );
  }
  return (
    <View style={styles.question}>
      <View style={styles.labelRow}>
        <Text style={styles.questionLabel}>{label}</Text>
        {field.unit ? <Text style={styles.unit}>{field.unit}</Text> : null}
      </View>
      <TextInput
        value={value}
        editable={!field.readOnly}
        onChangeText={onChange}
        placeholder={
          field.readOnly
            ? "Assigned when draft is created"
            : `Enter ${field.label.toLowerCase()}`
        }
        placeholderTextColor="#737e8e"
        multiline={field.type === "textarea"}
        keyboardType={
          field.type === "number" || field.type === "decimal"
            ? "decimal-pad"
            : field.type === "text" && field.key.includes("email")
              ? "email-address"
              : "default"
        }
        style={[
          ui.input,
          field.type === "textarea" && ui.textArea,
          field.readOnly && styles.readOnly,
        ]}
      />
      <FieldErrorText errors={errors} />
    </View>
  );
}
function DropdownQuestion({
  label,
  value,
  options,
  errors = [],
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  errors?: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.question}>
      <Text style={styles.questionLabel}>{label}</Text>

      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={[
          ui.input,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <Text style={value ? ui.value : ui.muted}>
          {value || "Select an option"}
        </Text>

        <SymbolView
          name={{
            ios: open ? "chevron.up" : "chevron.down",
            android: open ? "keyboard_arrow_up" : "keyboard_arrow_down",
            web: open ? "keyboard_arrow_up" : "keyboard_arrow_down",
          }}
          size={20}
          tintColor="#ff6a00"
        />
      </Pressable>

      {open ? (
        <View
          style={{
            marginTop: 6,
            borderWidth: 1,
            borderColor: "#2a303b",
            borderRadius: 12,
            backgroundColor: "#11151b",
            overflow: "hidden",
          }}
        >
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderBottomColor: "#222831",
              }}
            >
              <Text
                style={{
                  color: value === option ? "#ff6a00" : "#f5f7fb",
                  fontSize: 14,
                  fontWeight: value === option ? "700" : "500",
                }}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <FieldErrorText errors={errors} />
    </View>
  );
}
function ChoiceQuestion({
  label,
  value,
  options,
  multiple = false,
  errors = [],
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  multiple?: boolean;
  errors?: string[];
  onChange: (value: string) => void;
}) {
  const selected = value ? value.split("|") : [];
  return (
    <View style={styles.question}>
      <Text style={styles.questionLabel}>{label}</Text>
      <View style={ui.wrapRow}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() =>
                onChange(
                  multiple
                    ? active
                      ? selected.filter((item) => item !== option).join("|")
                      : [...selected, option].join("|")
                    : option,
                )
              }
              style={[styles.choice, active && styles.choiceActive]}
            >
              <Text
                style={[styles.choiceText, active && styles.choiceTextActive]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FieldErrorText errors={errors} />
    </View>
  );
}
function PhotoField({
  label,
  value,
  caption,
  onChange,
  onCaptionChange,
  errors = [],
}: {
  label: string;
  value: string;
  caption: string;
  onChange: (value: string) => void;
  onCaptionChange: (value: string) => void;
  errors?: string[];
}) {
  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Camera permission required",
        "Please allow camera access to take appliance photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Photo permission required",
        "Please allow photo access to select an appliance photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  }

  return (
    <View style={styles.question}>
      <Text style={styles.questionLabel}>{label}</Text>

      {value ? (
        <Image
          source={{ uri: value }}
          style={{
            width: "100%",
            height: 180,
            borderRadius: 12,
            marginBottom: 10,
          }}
          resizeMode="cover"
        />
      ) : null}

      {value ? (
        <TextInput
          value={caption}
          onChangeText={onCaptionChange}
          placeholder="Photo description e.g. Boiler overall view"
          placeholderTextColor="#737e8e"
          style={[ui.input, { marginBottom: 10 }]}
        />
      ) : null}

      <View style={ui.wrapRow}>
        <ActionButton
          label={value ? "Retake Photo" : "Take Photo"}
          onPress={takePhoto}
        />

        <ActionButton
          label={value ? "Choose Another" : "Choose Photo"}
          secondary
          onPress={choosePhoto}
        />

        {value ? (
          <ActionButton
            label="Remove"
            secondary
            onPress={() => {
              onChange("");
              onCaptionChange("");
            }}
          />
        ) : null}
      </View>

      <FieldErrorText errors={errors} />
    </View>
  );
}

function ScheduleTable({
  step,
  rows,
  errors = [],
  onChange,
  onUploadAppliancePhoto,
  dynamicSelectOptions = {},
}: {
  step: ElectricalStep;
  rows: AnswerMap[];
  errors?: string[];
  onChange: (rows: AnswerMap[]) => void;
  onUploadAppliancePhoto?: (uri: string, caption: string) => Promise<string>;
  dynamicSelectOptions?: Record<string, string[]>;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isRowSaving, setIsRowSaving] = useState(false);
  const [draft, setDraft] = useState<AnswerMap>({});
  const fields = step.table?.fields ?? [];
  function open(index: number | null) {
    setEditingIndex(index);
    setDraft(index === null ? {} : { ...rows[index] });
  }
  async function save() {
    if (isRowSaving) return;
    if (!rowValid(fields, draft)) return;

    setIsRowSaving(true);

    try {
      const nextDraft = { ...draft };

      if (step.key === "appliance_details" && onUploadAppliancePhoto) {
        const photoFields = fields.filter((field) => field.type === "photo");

        for (const field of photoFields) {
          const uri = nextDraft[field.key] ?? "";

          if (!uri) continue;

          const isLocalPhoto =
            uri.startsWith("file://") ||
            uri.startsWith("content://") ||
            uri.startsWith("blob:") ||
            uri.startsWith("data:");

          if (!isLocalPhoto) {
            continue;
          }

          const caption =
            nextDraft[`${field.key}_caption`] ??
            field.label ??
            "Appliance photo";

          const uploadedUrl = await onUploadAppliancePhoto(uri, caption);

          nextDraft[field.key] = uploadedUrl;
        }
      }

      delete nextDraft._new;

      const next =
        editingIndex === null
          ? [...rows, nextDraft]
          : rows.map((row, index) =>
              index === editingIndex ? nextDraft : row,
            );

      onChange(next);
      setEditingIndex(null);
      setDraft({});
    } finally {
      setIsRowSaving(false);
    }
  }
  const modalOpen = editingIndex !== null || Object.keys(draft).length > 0;
  return (
    <Card>
      <View style={styles.tableHeading}>
        <View style={{ flex: 1 }}>
          <Text style={ui.cardTitle}>{step.title}</Text>
          <Text style={ui.muted}>
            {rows.length} {rows.length === 1 ? "appliance" : "appliances"}
          </Text>
        </View>
        <ActionButton
          label={
            step.key === "appliance_details"
              ? "Add Appliance"
              : step.key === "faults_remedial_actions"
                ? "Add Fault"
                : "Add Row"
          }
          onPress={() => {
            setDraft({ _new: "1" });
            setEditingIndex(null);
          }}
        />
      </View>
      {!rows.length ? (
        <View style={styles.emptyTable}>
          <Text style={ui.muted}>No rows added yet.</Text>
        </View>
      ) : (
        rows.map((row, index) => {
          const label = `Appliance ${index + 1}`;
          const subtitle = [
            row["location"],
            row["appliance_type"],
            row["make"],
            row["model"],
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <View key={`${step.key}-${index}`} style={styles.tableRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={ui.value}>{label}</Text>
                <Text style={ui.muted} numberOfLines={1}>
                  {subtitle || "Tap Edit to complete details"}
                </Text>
              </View>
              <Pressable onPress={() => open(index)} style={styles.iconButton}>
                <SymbolView
                  name={{ ios: "pencil", android: "edit", web: "edit" }}
                  size={18}
                  tintColor="#58a6ff"
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  onChange(rows.filter((_, rowIndex) => rowIndex !== index))
                }
                style={styles.iconButton}
              >
                <SymbolView
                  name={{ ios: "trash", android: "delete", web: "delete" }}
                  size={18}
                  tintColor="#ff8585"
                />
              </Pressable>
            </View>
          );
        })
      )}
      <FieldErrorText errors={errors} />
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setEditingIndex(null);
          setDraft({});
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingIndex === null
                    ? step.key === "appliance_details"
                      ? "Add Appliance"
                      : step.key === "faults_remedial_actions"
                        ? "Add Fault"
                        : "Add Row"
                    : step.key === "appliance_details"
                      ? "Edit Appliance"
                      : step.key === "faults_remedial_actions"
                        ? "Edit Fault"
                        : "Edit Row"}
                </Text>
                <Text style={ui.muted}>{step.title}</Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditingIndex(null);
                  setDraft({});
                }}
                style={styles.iconButton}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  size={21}
                  tintColor="#f8fafc"
                />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {fields.map((field) => {
                const fieldWithOptions =
                  field.key === "related_appliance"
                    ? {
                        ...field,
                        options:
                          dynamicSelectOptions[field.key] ?? field.options,
                      }
                    : field;

                const isApplianceLocation =
                  step.key === "appliance_details" &&
                  field.key === "location" &&
                  field.type === "select";

                if (isApplianceLocation) {
                  const locationOptions = field.options ?? [];

                  const selectedLocation =
                    draft["_location_option"] ||
                    (draft["location"] &&
                    locationOptions.includes(draft["location"])
                      ? draft["location"]
                      : draft["location"]
                        ? "Other"
                        : "");

                  return (
                    <View key={field.key}>
                      <QuestionField
                        field={fieldWithOptions}
                        value={selectedLocation}
                        onChange={(value) => {
                          setDraft((current) => {
                            if (value === "Other") {
                              return {
                                ...current,
                                _location_option: "Other",
                                location: "",
                              };
                            }

                            return {
                              ...current,
                              _location_option: value,
                              location: value,
                            };
                          });
                        }}
                      />

                      {selectedLocation === "Other" ? (
                        <View style={styles.question}>
                          <Text style={styles.questionLabel}>
                            Enter location *
                          </Text>

                          <TextInput
                            value={draft["location"] ?? ""}
                            onChangeText={(value) =>
                              setDraft((current) => ({
                                ...current,
                                location: value,
                              }))
                            }
                            placeholder="Enter other location"
                            placeholderTextColor="#737e8e"
                            style={ui.input}
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                }

                return (
                  <QuestionField
                    key={field.key}
                    field={fieldWithOptions}
                    value={draft[field.key] ?? ""}
                    photoCaption={draft[`${field.key}_caption`] ?? ""}
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: value,
                      }))
                    }
                    onPhotoCaptionChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        [`${field.key}_caption`]: value,
                      }))
                    }
                  />
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <ActionButton
                label="Cancel"
                secondary
                disabled={isRowSaving}
                onPress={() => {
                  setEditingIndex(null);
                  setDraft({});
                }}
              />
              <ActionButton
                label={isRowSaving ? "Saving..." : "Save Row"}
                disabled={isRowSaving || !rowValid(fields, draft)}
                onPress={save}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

function SignaturePad({
  label,
  value,
  errors = [],
  onChange,
  onSaveImage,
  modalTitle,
}: {
  label: string;
  value: string;
  errors?: string[];
  onChange: (value: string) => void;
  onSaveImage?: (file: SignatureUpload) => void | Promise<void>;
  modalTitle?: string;
}) {
  const [draftPaths, setDraftPaths] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasStartedDrawing, setHasStartedDrawing] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const insets = useSafeAreaInsets();
  const padRef = useRef<View>(null);
  const previewPaths = useMemo(() => decodeSignature(value), [value]);
  const hasSavedSignature = Boolean(value.trim());

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!isModalVisible) {
      void ScreenOrientation.unlockAsync();
      return;
    }
    void ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    );
  }, [isModalVisible]);

  function openSignatureModal() {
    setDraftPaths([]);
    setHasStartedDrawing(false);
    setSignatureError("");
    setIsModalVisible(true);
  }

  function closeSignatureModal() {
    setIsModalVisible(false);
    setDraftPaths([]);
    setHasStartedDrawing(false);
    setSignatureError("");
  }

  function clearDraftSignature() {
    setDraftPaths([]);
    setHasStartedDrawing(false);
    setSignatureError("");
  }

  function requestCloseSignatureModal() {
    if (isSavingSignature) return;
    if (!hasStartedDrawing) {
      closeSignatureModal();
      return;
    }
    Alert.alert(
      "Discard signature?",
      "You have started drawing a signature. Do you want to discard it?",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: closeSignatureModal },
      ],
    );
  }

  function startStroke(locationX: number, locationY: number) {
    if (!canvasSize.width || !canvasSize.height) return;

    const paddingX = 20;
const paddingY = 20;

const normalizedX = Math.max(
  paddingX,
  Math.min(
    500 - paddingX,
    (locationX / canvasSize.width) * 500,
  ),
);

const normalizedY = Math.max(
  paddingY,
  Math.min(
    300 - paddingY,
    (locationY / canvasSize.height) * 300,
  ),
);

    setHasStartedDrawing(true);

    setDraftPaths((current) => [
      ...current,
      `M${normalizedX.toFixed(1)} ${normalizedY.toFixed(1)}`,
    ]);
  }

  function continueStroke(locationX: number, locationY: number) {
    if (!canvasSize.width || !canvasSize.height) return;

    const paddingX = 20;
const paddingY = 20;

const normalizedX = Math.max(
  paddingX,
  Math.min(
    500 - paddingX,
    (locationX / canvasSize.width) * 500,
  ),
);

const normalizedY = Math.max(
  paddingY,
  Math.min(
    300 - paddingY,
    (locationY / canvasSize.height) * 300,
  ),
);
    setDraftPaths((current) => {
      if (!current.length) {
        return [`M${normalizedX.toFixed(1)} ${normalizedY.toFixed(1)}`];
      }

      const activePath = current[current.length - 1];

      return [
        ...current.slice(0, -1),
        `${activePath} L${normalizedX.toFixed(1)} ${normalizedY.toFixed(1)}`,
      ];
    });
  }

  async function finishSignature() {
    if (!draftPaths.length) {
      setSignatureError("Please sign inside the box before saving.");
      return;
    }
    setIsSavingSignature(true);
    setSignatureError("");
    try {
      const file =
        Platform.OS === "web"
          ? await pathsToPngUpload(draftPaths, "signature.png")
          : padRef.current
            ? await capturedSignatureUpload(padRef.current, "signature.png")
            : null;
      if (!file) {
        throw new Error("The signature image could not be prepared.");
      }
      if (onSaveImage) await onSaveImage(file);
      onChange(encodeSignature(draftPaths));
      closeSignatureModal();
    } catch (error) {
      setSignatureError(
        error instanceof Error
          ? error.message
          : "The signature could not be saved. Please try again.",
      );
    } finally {
      setIsSavingSignature(false);
    }
  }

  return (
    <View style={styles.question}>
      <View style={styles.labelRow}>
        <Text style={styles.questionLabel}>{label}</Text>
        {hasSavedSignature ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Replace the saved signature"
            onPress={(event) => {
              event.stopPropagation();
              openSignatureModal();
            }}
            style={styles.inlineAction}
          >
            <Text style={styles.clearText}>Replace</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Open the full-screen signature pad"
        onPress={openSignatureModal}
        style={styles.signaturePreviewButton}
      >
        {previewPaths.length ? (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 500 300"
            preserveAspectRatio="none"
          >
            {previewPaths.map((path, index) => (
              <Path
                key={`${index}-${path.length}`}
                d={path}
                stroke="#111827"
                strokeWidth={3.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
        ) : (
          <View style={styles.signaturePreviewPlaceholder}>
            <Text style={styles.signaturePreviewText}>Tap to sign</Text>
            <Text style={styles.signaturePreviewHint}>
              Sign inside the box using your finger
            </Text>
          </View>
        )}
      </Pressable>
      {hasSavedSignature ? (
        <View style={styles.previewActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Replace the saved signature"
            onPress={openSignatureModal}
            style={styles.previewActionButton}
          >
            <Text style={styles.previewActionText}>Replace</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Clear the saved signature"
            onPress={() => {
              if (!value) return;
              onChange("");
            }}
            style={styles.previewActionButton}
          >
            <Text style={styles.previewActionText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}
      <Modal
        visible={isModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={requestCloseSignatureModal}
      >
        <View
          style={[styles.signatureModalContainer, { paddingTop: insets.top }]}
        >
          <View style={styles.signatureModalHeader}>
            <Text style={styles.signatureModalTitle}>
              {modalTitle ?? "Signature"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Cancel signing"
              onPress={requestCloseSignatureModal}
              style={styles.signatureModalCloseButton}
            >
              <Text style={styles.signatureModalCloseText}>Cancel</Text>
            </Pressable>
          </View>
          <View style={styles.signatureCanvasWrap}>
            <View
              ref={padRef}
              collapsable={false}
              style={styles.signatureModalCanvas}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setCanvasSize({ width, height });
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) =>
                startStroke(
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                )
              }
              onResponderMove={(event) =>
                continueStroke(
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                )
              }
            >
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 500 300"
                preserveAspectRatio="none"
              >
                {draftPaths.map((path, index) => (
                  <Path
                    key={`${index}-${path.length}`}
                    d={path}
                    stroke="#111827"
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>
              {!draftPaths.length ? (
                <View style={styles.signatureModalPlaceholder}>
                  <Text style={styles.signatureModalPlaceholderText}>
                    Sign inside the box using your finger
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          {signatureError ? (
            <Text style={styles.signatureModalError}>{signatureError}</Text>
          ) : null}
          <View style={styles.signatureModalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Clear the current signature"
              onPress={clearDraftSignature}
              style={styles.signatureModalSecondaryButton}
            >
              <Text style={styles.signatureModalSecondaryText}>Clear</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Save the current signature"
              onPress={() => {
                void finishSignature();
              }}
              disabled={isSavingSignature}
              style={[
                styles.signatureModalPrimaryButton,
                isSavingSignature && styles.signatureModalPrimaryButtonDisabled,
              ]}
            >
              {isSavingSignature ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.signatureModalPrimaryText}>
                  Save Signature
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
      <FieldErrorText errors={errors} />
    </View>
  );
}

function FieldErrorText({ errors }: { errors: string[] }) {
  return errors.length ? (
    <Text style={styles.errorText}>{errors.join(" ")}</Text>
  ) : null;
}

function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        secondary ? ui.secondaryButton : ui.primaryButton,
        disabled && styles.disabled,
        pressed && ui.pressed,
      ]}
    >
      <Text style={secondary ? ui.secondaryButtonText : ui.primaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function groupCertificatesByCategory(
  definitions: ElectricalCertificateDefinition[],
) {
  const groups = new Map<string, ElectricalCertificateDefinition[]>();
  const orderedTitles = [
    "Domestic Gas Certificates",
    "Commercial Gas Reports",
    "Electrical Reports",
    "Other Reports",
  ] as const;

  definitions.forEach((definition) => {
    const title = getCertificateCategory(definition);
    const current = groups.get(title);
    if (current) {
      current.push(definition);
    } else {
      groups.set(title, [definition]);
    }
  });

  return orderedTitles
    .filter((title) => groups.has(title))
    .map((title) => ({ title, definitions: groups.get(title) ?? [] }));
}

function getCertificateCategory(definition: ElectricalCertificateDefinition) {
  if (
    [
      "cp12",
      "gas_breakdown",
      "gas_warning_notice",
      "gas_service_maintenance",
      "cooling_off_exemption",
      "leisure_industry_gas_safety",
      "lpg_safety_record",
    ].includes(definition.type)
  ) {
    return "Domestic Gas Certificates";
  }
  if (
    [
      "commercial_gas_safety",
      "gas_installation_safety",
      "commercial_catering_inspection",
      "gas_testing_purging",
    ].includes(definition.type)
  ) {
    return "Commercial Gas Reports";
  }
  if (
    [
      "eic",
      "eicr",
      "emergency_lighting",
      "meiwc",
      "pat",
      "smoke_alarm",
    ].includes(definition.type)
  ) {
    return "Electrical Reports";
  }
  return "Other Reports";
}

function inferDefinition(certificate: CertificateRecord) {
  const explicit = getElectricalDefinition(certificate.certificate_type);
  if (explicit) return explicit;
  const template = certificate.template;
  return template
    ? (electricalCertificates.find((item) =>
        matchesElectricalTemplate(
          {
            template_key: template.template_key,
            template_name: template.template_name ?? undefined,
          },
          item,
        ),
      ) ?? null)
    : null;
}

function getJobFromResponse(
  response: Awaited<ReturnType<typeof getJob>> | null,
): JobDetail | null {
  if (!response) return null;
  if ("id" in response && response.id !== undefined)
    return response as JobDetail;
  if ("appointment" in response && response.appointment)
    return response.appointment as JobDetail;
  if ("job" in response && response.job) return response.job;
  return response as JobDetail;
}
function splitInstallationAddress(fullAddress: string, postcode: string) {
  const cleanedPostcode = (postcode || "").trim();

  let addressWithoutPostcode = (fullAddress || "").trim();

  if (cleanedPostcode) {
    const escapedPostcode = cleanedPostcode.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    addressWithoutPostcode = addressWithoutPostcode
      .replace(new RegExp(escapedPostcode, "gi"), "")
      .replace(/,\s*$/, "")
      .trim();
  }

  const parts = addressWithoutPostcode
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  let addressLine1 = "";
  let addressLine2 = "";
  let city = "";

  if (parts.length > 0) {
    const firstPart = parts[0];

    // Example:
    // 44 Pinewood Park
    const numberMatch = firstPart.match(
      /^([0-9]+[A-Za-z]?(?:[-/][0-9A-Za-z]+)?)\s+(.+)$/,
    );

    if (numberMatch) {
      addressLine1 = numberMatch[1].trim();
      addressLine2 = numberMatch[2].trim();
    } else {
      addressLine2 = firstPart;
    }
  }

  if (parts.length >= 2) {
    city = parts[parts.length - 1];

    if (parts.length > 2) {
      const middleParts = parts.slice(1, -1);

      addressLine2 = [addressLine2, ...middleParts].filter(Boolean).join(", ");
    }
  }

  return {
    addressLine1,
    addressLine2,
    city,
    postcode: cleanedPostcode,
  };
}
function mergeJobPrefill(
  answers: AnswerMap,
  definition: ElectricalCertificateDefinition,
  job: JobDetail | null,
  vendor: Vendor | null,
) {
  const engineerValues: Record<string, string> = {
    "declaration.engineer_name":
      vendor?.profile?.name ?? vendor?.username ?? "",

    "declaration.engineer_address": vendor?.profile?.address ?? "",

    "declaration.engineer_postcode":
      vendor?.profile?.postcode ?? vendor?.profile?.zip_code ?? "",

    "declaration.engineer_phone": vendor?.phone ?? "",
  };

  Object.entries(engineerValues).forEach(([key, value]) => {
    if (!answers[key] && value) {
      answers[key] = value;
    }
  });

  if (!job) return;

  const address = getJobServiceAddressLine(job);
  const postcode = getJobServicePostcode(job);

  const installationAddress = splitInstallationAddress(address, postcode);

  const customerName = getJobCustomerName(job);
  const customerPhone = getJobPhone(job);
  const customerEmail = getJobEmail(job);

  const serviceTitle = getJobServiceName(job);
  const notes = getJobNotes(job);

  const description = [serviceTitle, notes].filter(Boolean).join(" â€” ");

  const values: Record<string, string> = {
    // ------------------------------------------------
    // COMMON ELECTRICAL CERTIFICATE FIELDS
    // ------------------------------------------------

    "client_engineer.issue_date":
      getJobAppointmentDate(job) || toDateValue(new Date()),

    "client_engineer.client_name": customerName,
    "client_engineer.client_contact_number": customerPhone,
    "client_engineer.client_email": customerEmail,

    // IMPORTANT:
    // Never use site/property address as client address.
    "client_engineer.client_address": "",

    // Installation/site property
    "client_engineer.installation_address": address,
    "client_engineer.postcode": postcode,

    "client_engineer.site_contact_name": getJobSiteName(job) || customerName,

    "client_engineer.site_contact_phone": getJobSitePhone(job) || customerPhone,

    "client_engineer.site_contact_email": getJobSiteEmail(job) || customerEmail,

    "client_engineer.service_title": serviceTitle,

    "client_engineer.job_reference": getJobBookingId(job) || String(job.id),

    // ------------------------------------------------
    // GAS CERTIFICATES USING property_parties
    // ------------------------------------------------

    "property_parties.issue_date":
      getJobAppointmentDate(job) || toDateValue(new Date()),

    "property_parties.landlord_client_name": customerName,

    // Do NOT automatically put the site address here.
    "property_parties.landlord_client_address": "",

    // Do NOT use site postcode as landlord/client postcode.
    "property_parties.postcode": "",

    // Property where engineer is actually attending
    "property_parties.site_inspection_address": address,

    "property_parties.tenant_contact_number":
      getJobSitePhone(job) || customerPhone,
  };

  // ------------------------------------------------
  // CP12
  // ------------------------------------------------
  if (
  definition.type === "cp12" ||
  definition.type === "pat"
) {
    values["client_installation_details.client_name"] = customerName;

    values["client_installation_details.client_telephone"] = customerPhone;

    values["client_installation_details.client_email"] = customerEmail;

    // CLIENT ADDRESS STAYS EMPTY
    values["client_installation_details.client_address_line_1"] = "";
    values["client_installation_details.client_address_line_2"] = "";
    values["client_installation_details.client_town_city"] = "";
    values["client_installation_details.client_county_region"] = "";
    values["client_installation_details.client_postcode"] = "";

    // INSTALLATION ADDRESS COMES FROM JOB
    values["client_installation_details.installation_address_line_1"] =
      installationAddress.addressLine1;

    values["client_installation_details.installation_address_line_2"] =
      installationAddress.addressLine2;

    values["client_installation_details.installation_town_city"] =
      installationAddress.city;

    values["client_installation_details.installation_postcode"] =
      installationAddress.postcode;
  }

  if (definition.type === "gas_breakdown") {
    // CLIENT / INSTALLATION DETAILS

    values["client_installation_details.client_name"] = customerName;

    values["client_installation_details.client_telephone"] = customerPhone;

    // Keep client address empty
    values["client_installation_details.client_address"] = "";
    values["client_installation_details.client_postcode"] = "";

    values["client_installation_details.installation_name"] =
      job?.site_name ?? customerName ?? "";

    values["client_installation_details.installation_address_line_1"] =
      installationAddress.addressLine1;

    values["client_installation_details.installation_address_line_2"] =
      installationAddress.addressLine2;

    values["client_installation_details.installation_town_city"] =
      installationAddress.city;

    values["client_installation_details.installation_postcode"] =
      installationAddress.postcode;

    // ENGINEER DETAILS

    values["engineer_details.engineer_company"] = vendor?.username ?? "";

    values["engineer_details.engineer_name"] =
      vendor?.profile?.name ?? vendor?.username ?? "";

    values["engineer_details.engineer_address"] =
      vendor?.profile?.address ?? "";

    values["engineer_details.engineer_postcode"] =
      vendor?.profile?.postcode ?? vendor?.profile?.zip_code ?? "";

    values["engineer_details.engineer_phone"] = vendor?.phone ?? "";
  }

  // ------------------------------------------------
  // CERTIFICATE-SPECIFIC DESCRIPTION PREFILL
  // ------------------------------------------------

  if (definition.type === "eic") {
    values["description_extent.description_of_works"] = description;
  }

  if (definition.type === "eicr") {
    values["purpose_installation.purpose_of_report"] = description;
  }

  if (definition.type === "meiwc") {
    values["description_of_works.description"] = description;
  }

  Object.entries(values).forEach(([key, value]) => {
    if (!answers[key] && value) {
      answers[key] = value;
    }
  });
}
function getEnteredSiteAddress(answers: AnswerMap) {
  return (
    answers["client_installation_details.installation_address_line_1"] ||
    answers["client_engineer.installation_address"] ||
    answers["client_engineer.client_address"] ||
    ""
  );
}

function getAddressAlias(type: ElectricalCertificateDefinition["type"]) {
  if (type === "emergency_lighting") return "premises_address";
  if (type === "pat") return "address";
  if (type === "smoke_alarm") return "property_address";
  return "installation_address";
}

function normalizeTemplateFieldKey(key: string) {
  return key.replace(/line([12])$/, "line_$1");
}

function getFieldErrors(
  step: ElectricalStep,
  field: ElectricalField,
  errors: FieldErrors,
) {
  const keys = [field.key, answerKey(step, field)];
  if (step.key === "client_engineer") {
    const aliases: Record<string, string[]> = {
      client_name: ["customer_name"],
      client_address: ["site_address_line_1", "site_address_line1"],
      installation_address: ["site_address_line_1", "site_address_line1"],
      postcode: ["site_postcode"],
      issue_date: ["inspection_date"],
      client_signature: ["customer_signature"],
    };
    keys.push(...(aliases[field.key] ?? []));
  }
  if (field.signatureType === "engineer") keys.push("engineer_signature");
  if (
    ["next_inspection_date", "next_test_due", "next_service_due"].includes(
      field.key,
    )
  )
    keys.push("next_due_date");
  return [...new Set(keys.flatMap((key) => errors[key] ?? []))];
}

function findFirstErrorStep(
  definition: ElectricalCertificateDefinition,
  errors: FieldErrors,
) {
  return definition.steps.findIndex((step) => {
    if (step.table && errors.items?.length) return true;
    return (
      step.fields?.some(
        (field) => getFieldErrors(step, field, errors).length,
      ) ?? false
    );
  });
}

function answerKey(step: ElectricalStep, field: ElectricalField) {
  return `${step.key}.${field.key}`;
}
function validateStep(
  step: ElectricalStep,
  answers: AnswerMap,
  tables: TableMap,
) {
  if (step.table) {
    if (
      step.key === "faults_remedial_actions" &&
      answers["faults_remedial_actions.no_faults_identified"] === "Yes" &&
      (tables[step.key]?.length ?? 0) > 0
    )
      return false;
    return (
      (!step.table.required || (tables[step.key]?.length ?? 0) > 0) &&
      (tables[step.key] ?? []).every((row) => rowValid(step.table!.fields, row))
    );
  }
  return (step.fields ?? []).every((field) => {
    const answer = answers[answerKey(step, field)]?.trim() ?? "";
    if (step.key === "final_checks") {
      if (field.key === "co_alarm_working") {
        if (answers["final_checks.co_alarm_fitted"] !== "Yes") return true;
        return Boolean(answer);
      }
      if (field.key === "smoke_alarm_working") {
        if (answers["final_checks.smoke_alarm_fitted"] !== "Yes") return true;
        return Boolean(answer);
      }
    }
    if (step.key === "declaration") {
      if (field.key === "customer_signature") {
        if (answers["declaration.customer_unavailable_to_sign"] === "Yes")
          return true;
        return Boolean(answer);
      }
      if (field.key === "customer_unavailable_reason") {
        if (answers["declaration.customer_unavailable_to_sign"] === "Yes")
          return Boolean(answer);
        return true;
      }
      if (field.key === "customer_landlord_name") {
        if (
          answers["declaration.customer_unavailable_to_sign"] === "Yes" ||
          answers["declaration.customer_signature"]
        )
          return Boolean(answer);
        return true;
      }
    }
    return !field.required || Boolean(answer);
  });
}
function rowValid(fields: ElectricalField[], row: AnswerMap) {
  return fields.every(
    (field) => !field.required || Boolean(row[field.key]?.trim()),
  );
}
function applyDefaults(
  definition: ElectricalCertificateDefinition,
  answers: AnswerMap,
) {
  definition.steps.forEach((step) =>
    step.fields?.forEach((field) => {
      if (!answers[answerKey(step, field)] && field.defaultValue)
        answers[answerKey(step, field)] = field.defaultValue;
    }),
  );
  if (
    definition.type === "cp12" &&
    !answers["final_checks.next_inspection_due"]
  ) {
    const issueDate =
      answers["certificate_information.inspection_date"] ||
      answers["property_parties.issue_date"] ||
      answers["client_engineer.issue_date"];
    if (issueDate) {
      const date = parseDate(issueDate);
      date.setFullYear(date.getFullYear() + 1);
      answers["final_checks.next_inspection_due"] = toDateValue(date);
    }
  }
}
function updatePatSummary(
  definition: ElectricalCertificateDefinition,
  answers: AnswerMap,
  tables: TableMap,
) {
  if (definition.type !== "pat") return;
  const rows = tables.appliance_register ?? [];
  answers["summary.total_appliances_tested"] = String(rows.length);
  answers["summary.total_passed"] = String(
    rows.filter((row) => row.overall_result === "Pass").length,
  );
  answers["summary.total_failed"] = String(
    rows.filter((row) => row.overall_result === "Fail").length,
  );
}
function getOverallResult(
  definition: ElectricalCertificateDefinition,
  answers: AnswerMap,
  tables: TableMap,
) {
  if (definition.type === "eicr")
    return answers["summary.overall_assessment"] || "Satisfactory";
  if (definition.type === "emergency_lighting")
    return (tables.luminaire_schedule ?? []).some(
      (row) =>
        row.function_test_result === "Fail" ||
        row.duration_test_result === "Fail",
    )
      ? "Fail"
      : "Pass";
  if (definition.type === "pat")
    return (tables.appliance_register ?? []).some(
      (row) => row.overall_result === "Fail",
    )
      ? "Fail"
      : "Pass";
  if (definition.type === "smoke_alarm")
    return answers["commissioning_checks.interconnection_test"] === "Pass" &&
      answers["commissioning_checks.sound_level_adequate"] === "Yes"
      ? "Pass"
      : "Fail";
  return "Satisfactory";
}
function getNextDueDate(
  definition: ElectricalCertificateDefinition,
  answers: AnswerMap,
  tables: TableMap,
) {
  if (definition.type === "eic" || definition.type === "eicr")
    return (
      answers["declaration.next_inspection_date"] ||
      answers["summary.next_inspection_date"] ||
      null
    );
  if (definition.type === "emergency_lighting")
    return answers["declaration.next_test_due"] || null;
  if (definition.type === "smoke_alarm")
    return answers["declaration.next_service_due"] || null;
 if (definition.type === "pat")
  return answers["test_equipment_details.retest_date"] || null;
  if (definition.type === "cp12")
    return answers["final_checks.next_inspection_due"] || null;
  return null;
}
function stringifyValues(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item === null || item === undefined ? "" : String(item),
    ]),
  );
}
function singleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
function formatApiError(error: unknown, fallback: string) {
  const normalized = normalizeApiError(error, fallback);
  return formatNormalizedApiError(normalized);
}
function formatNormalizedApiError(
  normalized: ReturnType<typeof normalizeApiError>,
) {
  const details = Object.values(normalized.errors).flat().filter(Boolean);
  if (normalized.status === 422) {
    return details.length
      ? `Please complete the required certificate information. ${details.join(" ")}`
      : "Please complete all required certificate information before continuing.";
  }
  return details.length
    ? `${normalized.message} ${details.join(" ")}`
    : normalized.message;
}
function parseDate(value: string) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function encodeSignature(paths: string[]) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300"><g fill="none" stroke="#111" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${paths.map((path) => `<path d="${path}"/>`).join("")}</g></svg>`)}`;
}
function decodeSignature(value: string) {
  if (!value.startsWith("data:image/svg+xml")) return [];
  try {
    return [
      ...decodeURIComponent(value.split(",").slice(1).join(",")).matchAll(
        /<path d="([^"]+)"/g,
      ),
    ].map((match) => match[1]);
  } catch {
    return [];
  }
}

async function capturedSignatureUpload(
  view: View,
  name: string,
): Promise<SignatureUpload> {
  const uri = await captureRef(view, {
    format: "png",
    quality: 1,
    result: "tmpfile",
  });
  return { uri, name, type: "image/png" };
}

async function signatureValueToUpload(value: string, name: string) {
  if (!value.startsWith("data:image/svg+xml")) return null;
  return Platform.OS === "web"
    ? pathsToPngUpload(decodeSignature(value), name)
    : null;
}

async function pathsToPngUpload(
  paths: string[],
  name: string,
): Promise<SignatureUpload | null> {
  if (typeof document === "undefined" || !paths.length) return null;
  const canvas = document.createElement("canvas");
 canvas.width = 1000;
canvas.height = 600;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#111111";
  context.lineWidth = 4.6;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.scale(2, 2);
  paths.forEach((path) => {
    const points = [...path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((match) => [
      Number(match[1]),
      Number(match[2]),
    ]);
    if (!points.length) return;
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
    context.stroke();
  });
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 1),
  );
  if (!blob) return null;
  const file =
    typeof File !== "undefined"
      ? new File([blob], name, { type: "image/png" })
      : blob;
  return { uri: "", name, type: "image/png", file };
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#176f60",
    backgroundColor: "#0c2d28",
    padding: 12,
  },
  noticeText: { color: "#7debd3", fontSize: 13, fontWeight: "700" },
  certificateGrid: { gap: 14 },
  categorySection: { gap: 8 },
  categoryTitle: {
    color: "#79b9ff",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  categoryItems: { gap: 10 },
  certificateCard: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222a36",
    backgroundColor: "#10141a",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  certificateIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#132b46",
    alignItems: "center",
    justifyContent: "center",
  },
  certificateNumber: { color: "#79b9ff", fontSize: 17, fontWeight: "900" },
  certificateTitle: {
    color: "#f8fafc",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#222a36",
    paddingVertical: 12,
  },
  progressHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressTitle: { color: "#58a6ff", fontSize: 13, fontWeight: "900" },
  progressCount: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "#252c37",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: "#58a6ff",
  },
  stepRail: { gap: 8, paddingTop: 2 },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#374252",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#58a6ff", borderColor: "#58a6ff" },
  stepDotDone: { borderColor: "#17c7a3", backgroundColor: "#123a33" },
  stepDotText: { color: "#a3adbc", fontSize: 12, fontWeight: "900" },
  stepDotTextActive: { color: "#08111d" },
  stepEyebrow: {
    color: "#58a6ff",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  stepTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "900" },
  question: { gap: 7, marginBottom: 8 },
  questionLabel: {
    color: "#dce2ec",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  unit: { color: "#58a6ff", fontSize: 12, fontWeight: "800" },
  choice: {
    minHeight: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#384252",
    backgroundColor: "#1b2028",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceActive: { borderColor: "#58a6ff", backgroundColor: "#173352" },
  choiceText: { color: "#d9dee8", fontSize: 13, fontWeight: "700" },
  choiceTextActive: { color: "#8bc3ff" },
  checkboxRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4a5566",
    backgroundColor: "#181821",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#58a6ff", borderColor: "#58a6ff" },
  checkmark: { color: "#07111d", fontSize: 17, fontWeight: "900" },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readOnly: { opacity: 0.65, backgroundColor: "#11151b" },
  signatureBox: {
    height: 152,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#384252",
    backgroundColor: "#181821",
    overflow: "hidden",
  },
  signatureHint: {
    position: "absolute",
    alignSelf: "center",
    top: 64,
    color: "#737e8e",
    fontSize: 14,
    pointerEvents: "none",
  },
  inlineAction: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  signaturePreviewButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d0d7de",
    backgroundColor: "#ffffff",
    padding: 14,
    minHeight: 120,
    maxHeight: 180,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  signaturePreviewPlaceholder: {
    flex: 1,
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  signaturePreviewText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  signaturePreviewHint: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
  },
  previewActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  previewActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d0d7de",
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  previewActionText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  signatureModalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  signatureModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  signatureModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  signatureModalCloseButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  signatureModalCloseText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "700",
  },
  signatureCanvasWrap: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#111827",
    backgroundColor: "#ffffff",
    padding: 10,
    marginBottom: 10,
  },
  signatureModalCanvas: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  signatureModalPlaceholder: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  signatureModalPlaceholderText: {
    color: "#64748b",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  signatureModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  signatureModalSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d0d7de",
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  signatureModalSecondaryText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  signatureModalPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#ff6a00",
    justifyContent: "center",
    alignItems: "center",
  },
  signatureModalPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  signatureModalPrimaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  signatureModalError: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  clearText: { color: "#ff8585", fontSize: 12, fontWeight: "800" },
  stepMeta: { color: "#d9dee8", fontSize: 13, marginBottom: 6 },
  warningBox: {
    backgroundColor: "#3a1d1d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ff8a65",
    padding: 10,
    marginTop: 10,
  },
  warningText: { color: "#ffb28c", fontSize: 12, lineHeight: 18 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  validation: { color: "#ffb36e", fontSize: 12, lineHeight: 17 },
  errorText: { color: "#ff8585", fontSize: 12, lineHeight: 17 },
  disabled: { opacity: 0.42 },
  tableHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  emptyTable: {
    minHeight: 84,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#384252",
    alignItems: "center",
    justifyContent: "center",
  },
  tableRow: {
    minHeight: 66,
    borderTopWidth: 1,
    borderTopColor: "#28303c",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#384252",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "92%",
    minHeight: "65%",
    backgroundColor: "#10141a",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#2a3442",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222a36",
  },
  modalTitle: { color: "#f8fafc", fontSize: 20, fontWeight: "900" },
  modalContent: { padding: 16, paddingBottom: 28 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#222a36",
    backgroundColor: "#11151b",
  },
});
