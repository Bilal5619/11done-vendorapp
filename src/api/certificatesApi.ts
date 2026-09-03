import type { CertificateSummary } from "@/types/vendor";
import api, { toFormDataAsync, unwrapData } from "./client";

export type CertificateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "time" | "boolean" | "number" | "select";
  required?: boolean;
  options?: string[];
};

export type CertificateSection = {
  key: string;
  label: string;
  item_type: string;
  required?: boolean;
  fields: CertificateField[];
};

export type CertificateTemplate = {
  id: string | number;
  template_key: string;
  template_name: string;
  category: string;
  description?: string | null;
  version?: string | null;
  field_schema?: CertificateField[];
  section_schema?: CertificateSection[];
  validation_schema?: {
    requires_engineer_signature?: boolean;
    requires_customer_signature?: boolean;
    requires_next_due_date?: boolean;
    required_sections?: string[];
  };
  pdf_layout?: string;
};

export type CertificateFieldValue = {
  id?: string | number;
  field_key: string;
  field_label: string;
  field_type?: string | null;
  field_value?: string | null;
  sort_order?: number;
};

export type CertificateItem = {
  id?: string | number;
  section_key: string;
  item_type: string;
  item_order?: number;
  item_data: Record<string, string>;
};

export type CertificateSignature = {
  id: string | number;
  signature_type: string;
  name?: string | null;
  signature_path?: string | null;
  signed_at?: string | null;
};

export type CertificatePhoto = {
  id: number | string;
  certificate_id: number | string;
  booking_id?: number | string | null;
  vendor_id?: number | string | null;
  photo_type?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  caption?: string | null;
};

export type CertificateRecord = CertificateSummary & {
  status?: "draft" | "submitted" | "generated" | "sent" | "cancelled" | string;
  certificate_number?: string | null;
  certificate_category?: string | null;
  template_id?: string | number;
  template?: CertificateTemplate;
  customer_email?: string | null;
  customer_phone?: string | null;
  landlord_name?: string | null;
  landlord_email?: string | null;
  landlord_phone?: string | null;
  landlord_address?: string | null;
  site_name?: string | null;
  site_address_line_1?: string | null;
  site_address_line_2?: string | null;
  site_city?: string | null;
  site_county?: string | null;
  site_postcode?: string | null;
  inspection_date?: string | null;
  inspection_time?: string | null;
  next_due_date?: string | null;
  overall_result?: string | null;
  defects_found?: boolean;
  remedial_action_required?: boolean;
  engineer_notes?: string | null;
  engineer_name?: string | null;
  engineer_email?: string | null;
  engineer_phone?: string | null;
  engineer_company?: string | null;
  engineer_registration_number?: string | null;
  engineer_gas_safe_number?: string | null;
  engineer_niceic_number?: string | null;
  engineer_napit_number?: string | null;
  field_values?: CertificateFieldValue[];
  items?: CertificateItem[];
  signatures?: CertificateSignature[];
  photos?: CertificatePhoto[];
};

export type UpdateCertificatePayload = Partial<CertificateRecord> & {
  field_values?: CertificateFieldValue[];
  items?: CertificateItem[];
};

export async function getCertificateTemplates() {
  const response = unwrapData<{
    templates?: Record<string, CertificateTemplate[]> | CertificateTemplate[];
  }>(await api.get("/certificate-templates"));
  const templates = response.templates ?? [];
  return Array.isArray(templates) ? templates : Object.values(templates).flat();
}

export async function getBookingCertificates(bookingId: string | number) {
  const response = unwrapData<{ certificates?: CertificateRecord[] }>(
    await api.get(`/bookings/${bookingId}/certificates`),
  );
  return response.certificates ?? [];
}

export async function createCertificateDraft(
  bookingId: string | number,
  templateId: string | number,
) {
  return unwrapData<{ certificate: CertificateRecord }>(
    await api.post(`/bookings/${bookingId}/certificates`, {
      template_id: templateId,
    }),
  );
}
export async function createStandaloneCertificateDraft(
  templateId: string | number,
) {
  return unwrapData<{ certificate: CertificateRecord }>(
    await api.post("/certificates", {
      template_id: templateId,
    }),
  );
}
export async function getCertificates(_params?: {
  search?: string;
  job_id?: string | number;
}) {
  const response = unwrapData<{ certificates?: CertificateRecord[] }>(
    await api.get("/certificates"),
  );
  return response.certificates ?? [];
}

export async function getCertificate(id: string | number) {
  return unwrapData<{ certificate: CertificateRecord }>(
    await api.get(`/certificates/${id}`),
  );
}

export async function updateCertificate(
  id: string | number,
  payload: UpdateCertificatePayload,
) {
  return unwrapData<{ certificate: CertificateRecord }>(
    await api.put(`/certificates/${id}`, payload),
  );
}

export async function previewCertificate(id: string | number) {
  return unwrapData<{ preview_url: string }>(
    await api.post(`/certificates/${id}/preview`),
  );
}

export async function submitCertificate(
  id: string | number,
  payload: UpdateCertificatePayload,
) {
  return unwrapData<{ certificate: CertificateRecord }>(
    await api.post(`/certificates/${id}/submit`, payload),
  );
}

export async function uploadCertificatePhoto(
  certificateId: string | number,
  file: {
    uri: string;
    name: string;
    type?: string;
    file?: Blob;
  },
  caption: string,
) {
  return unwrapData(
    await api.post(
      `/certificates/${certificateId}/photos`,
      await toFormDataAsync({
        photo: file,
        photo_type: "appliance",
        caption: caption.trim(),
      }),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    ),
  );
}
export async function uploadCertificateSignature(
  id: string | number,
  file: unknown,
  signatureType: string,
  name = "",
) {
  return unwrapData(
    await api.post(
      `/certificates/${id}/signature`,
      await toFormDataAsync({
        signature: file,
        signature_type: signatureType,
        name,
      }),
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    ),
  );
}

export function getCertificatePdfUrl(certificate: CertificateRecord) {
  return certificate.pdf_url ?? certificate.url ?? null;
}

export async function getFolders() {
  return getCertificates();
}
