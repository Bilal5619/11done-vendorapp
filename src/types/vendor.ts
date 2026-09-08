export type VendorProfile = {
  name?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  postcode?: string | null;
  address?: string | null;
  details?: string | null;
};
export type VendorRegistrationNumber = {
  id?: number | string;
  category?: string | null;
  title?: string | null;
  number?: string | null;
  registration_number?: string | null;
  registration_authority?: string | null;
  expiry_date?: string | null;
};

/** Accreditation bodies a certificate can require before it may be created. */
export type AccreditationBody = "gas_safe" | "niceic";

export const accreditationLabels: Record<AccreditationBody, string> = {
  gas_safe: "Gas Safe",
  niceic: "NICEIC",
};

const accreditationMatchers: Record<AccreditationBody, RegExp> = {
  gas_safe: /gas\s*safe/i,
  niceic: /niceic|neicic/i,
};

/**
 * Gas certificates must carry the vendor's Gas Safe number and electrical ones
 * their NICEIC number, so read it back out of the accreditations the vendor
 * saved during account setup.
 */
export function findAccreditationNumber(
  registrations: VendorRegistrationNumber[] | undefined,
  body: AccreditationBody
) {
  const matcher = accreditationMatchers[body];
  const match = registrations?.find((registration) =>
    [registration.registration_authority, registration.title, registration.category].some(
      (value) => typeof value === 'string' && matcher.test(value)
    )
  );

  return firstString(match?.registration_number, match?.number);
}
export type Vendor = {
  id: number;
  username?: string;
  email?: string;
  phone?: string;
  status?: number;
  /** Company logo stored on the vendor record; printed on generated certificates. */
  photo?: string | null;
  photo_url?: string | null;
  business_type?: string | null;
  right_to_work_is_british?: boolean;
  service_category?: string | null;
  service_categories?: { id?: number | string; name?: string }[];
  email_verified_at?: string | null;
  profile?: VendorProfile | null;
};

export type JobTabKey =
  | "all"
  | "available"
  | "accepted"
  | "pending"
  | "completed"
  | "rejected";

export type JobSummary = {
  id: number | string;
  booking_id?: string | number | null;
  order_number?: string | number | null;
  booking_number?: string | number | null;
  reference?: string | number | null;
  appointment_number?: string | number | null;
  booking_date?: string | null;
  service_name?: string | null;
  service_title?: string | null;
  title?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_zip_code?: string | null;
  customer_postcode?: string | null;
  customer_post_code?: string | null;
  customer_country?: string | null;
  address?: string | null;
  site_name?: string | null;
  site_phone?: string | null;
  site_number?: string | null;
  site_email?: string | null;
  site_address?: string | null;
  site_zip_code?: string | null;
  site_postcode?: string | null;
  site_post_code?: string | null;
  site_country?: string | null;
  street_address?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  postcode?: string | null;
  post_code?: string | null;
  zip_code?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  date?: string | null;
  time?: string | null;
  time_slot?: string | null;
  slot?: string | null;
  scheduled_at?: string | null;
  appointment_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  payment_status?: string | null;
  paid_via?: string | null;
  payment_method?: string | null;
  payment_type?: string | null;
  price?: string | number | null;
  amount?: string | number | null;
  total?: string | number | null;
  total_amount?: string | number | null;
  grand_total?: string | number | null;
  customer_paid?: string | number | null;
  currency_symbol?: string | null;
  person?: string | number | null;
  persons?: string | number | null;
  people?: string | number | null;
  person_count?: string | number | null;
  no_of_person?: string | number | null;
  number_of_people?: string | number | null;
  order_status?: string | null;
  appointment_status?: string | null;
  status?: string | null;
  certificate_required?: boolean;
  certificate_id?: string | number | null;
  certificate?:
    | CertificateSummary
    | { id?: string | number; url?: string; pdf_url?: string }
    | null;
  invoice_id?: string | number | null;
  invoice_no?: string | number | null;
  invoice_number?: string | number | null;
  invoice_status?: string | null;
  invoice_payment_status?: string | null;
  invoice_paid_status?: string | null;
  paid_date?: string | null;
  invoice_url?: string | null;
  invoice?: InvoiceSummary | null;
  invoices?: InvoiceSummary[];
  map_url?: string | null;
  service?: { name?: string | null; title?: string | null } | null;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  vendor?: Vendor | null;
  site?: SiteDetails | null;
  site_details?: SiteDetails | null;
  booking?: Record<string, unknown> | null;
  appointment?: Record<string, unknown> | null;
  order?: Record<string, unknown> | null;
  service_booking?: Record<string, unknown> | null;
  serviceBooking?: Record<string, unknown> | null;
  serviceBookingDetails?: Record<string, unknown> | null;
  serviceBookingData?: Record<string, unknown> | null;
  payment?: Record<string, unknown> | null;
};

export type SiteDetails = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  site_address?: string | null;
  street_address?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  country?: string | null;
  postcode?: string | null;
  post_code?: string | null;
  zip_code?: string | null;
};

export type JobDetail = JobSummary & {
  notes?: string | null;
  answers?: { question?: string | null; answer?: string | null }[];
  completion_images?: { id?: string | number; url?: string }[];
};

export type CertificateSummary = {
  id: string | number;
  certificate_type?: string | null;
  certificate_number?: string | null;
  status?: string | null;
  template?: {
    template_name?: string | null;
    template_key?: string | null;
  } | null;
  type?: string | null;
  customer_name?: string | null;
  booking_id?: string | number | null;
  booking_number?: string | number | null;
  service?: { name?: string | null; title?: string | null } | null;
  service_name?: string | null;
  service_title?: string | null;
  certificate_date?: string | null;
  inspection_date?: string | null;
  date?: string | null;
  notes?: string | null;
  pdf_url?: string | null;
  url?: string | null;
  job_id?: string | number | null;
  service_booking_id?: string | number | null;
  created_at?: string | null;
};

export type InvoiceSummary = {
  id?: string | number | null;
  invoice_no?: string | number | null;
  invoice_number?: string | number | null;
  status?: string | null;
  invoice_status?: string | null;
  payment_status?: string | null;
  paid_status?: string | null;
  paid_date?: string | null;
  url?: string | null;
  invoice_url?: string | null;
  pdf_url?: string | null;
  total?: string | number | null;
  amount?: string | number | null;
  total_amount?: string | number | null;
  customer_paid_amount?: string | number | null;
};

export type VendorDocument = {
  id?: number | string;
  type: string;
  label?: string;
  status?:
    | "missing"
    | "uploaded"
    | "approved"
    | "rejected"
    | "under_review"
    | "pending"
    | string;
  rejection_reason?: string | null;
  url?: string | null;
  expiry_date?: string | null;
  date_of_birth?: string | null;
  id_type?: "driving_licence" | "passport" | null;
  policy_number?: string | null;
  uploaded_at?: string | null;
};

export type VendorNotificationType =
  | "new_job_available"
  | "new_job"
  | "job_assigned"
  | "assigned_job"
  | "job_accepted"
  | "job_reassigned"
  | "appointment_date_selected"
  | "appointment_date_changed"
  | "appointment_reminder"
  | "document_approved"
  | "document_rejected"
  | "profile_approved"
  | "profile_incomplete"
  | "certificate_required"
  | "invoice_submitted"
  | "invoice_approved"
  | "invoice_paid"
  | "admin_message";

export type VendorNotification = {
  id?: number | string;
  vendor_id?: number | string | null;
  title?: string | null;
  message?: string | null;
  type?: VendorNotificationType | string | null;
  related_id?: number | string | null;
  related_type?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

export type AccountSetupTask = {
  key?: string;
  type?: string;
  label?: string;
  status?:
    | "missing"
    | "uploaded"
    | "approved"
    | "rejected"
    | "under_review"
    | "pending"
    | string;
  document?: VendorDocument | null;
};

export function getJobBookingId(job: JobSummary) {
  return firstString(
    job.booking_number,
    job.booking_id,
    job.order_number,
    job.appointment_number,
    job.reference,
    readJobPath(job, "booking_number"),
    readJobPath(job, "booking_id"),
    readJobPath(job, "order_number"),
    readJobPath(job, "appointment_number"),
    readJobPath(job, "reference"),
    job.id,
  );
}

export function getJobServiceName(job: JobSummary) {
  return (
    firstString(
      job.service?.title,
      job.service?.name,
      job.service_title,
      job.service_name,
      job.title,
      readJobPath(job, "service.title"),
      readJobPath(job, "service.name"),
      readJobPath(job, "service_title"),
      readJobPath(job, "service_name"),
      readJobPath(job, "title"),
    ) || "Service appointment"
  );
}

export function getJobCustomerName(job: JobSummary) {
  return firstString(
    job.customer?.name,
    job.user?.name,
    readJobPath(job, "customer.name"),
    readJobPath(job, "customer.full_name"),
    readJobPath(job, "user.name"),
    readJobPath(job, "customer_name"),
    readJobPath(job, "customerName"),
    job.customer_name,
  );
}

export function getJobAddress(job: JobSummary) {
  const address = firstString(
    job.customer_address,
    readJobPath(job, "customer.address"),
    readJobPath(job, "customer_address"),
    readJobPath(job, "customerAddress"),
    readJobPath(job, "customer.addr"),
    readJobPath(job, "billing_address"),
    readJobPath(job, "billingAddress"),
    job.address,
    getJobSiteAddress(job),
    getJobServiceAddressLine(job),
  );
  const postcode = firstString(
    job.customer_zip_code,
    job.customer_postcode,
    job.customer_post_code,
    readJobPath(job, "customer.zip_code"),
    readJobPath(job, "customer.postcode"),
    readJobPath(job, "customer.post_code"),
    readJobPath(job, "customer_zip_code"),
    readJobPath(job, "customer_postcode"),
    readJobPath(job, "customer_post_code"),
    readJobPath(job, "customerZipCode"),
    readJobPath(job, "customerPostcode"),
    readJobPath(job, "customerPostCode"),
    readJobPath(job, "billing_zip_code"),
    readJobPath(job, "billingZipCode"),
    job.zip_code,
    job.post_code,
    job.postcode,
    getJobServicePostcode(job),
  );

  return [address, postcode].filter(Boolean).join(", ");
}

export function getJobSiteName(job: JobSummary) {
  return firstString(
    job.site_name,
    job.site_details?.name,
    job.site?.name,
    readJobPath(job, "site.name"),
    readJobPath(job, "site_details.name"),
    readJobPath(job, "site_name"),
    readJobPath(job, "siteName"),
  );
}

export function getJobSiteAddress(job: JobSummary) {
  const address = firstString(
    job.site_address,
    job.site_details?.address,
    job.site_details?.site_address,
    job.site_details?.street_address,
    joinParts(
      job.site_details?.address_line_1,
      job.site_details?.address_line_2,
    ),
    job.site?.address,
    job.site?.site_address,
    job.site?.street_address,
    joinParts(job.site?.address_line_1, job.site?.address_line_2),
    job.street_address,
    joinParts(job.address_line_1, job.address_line_2),
    readJobPath(job, "site.address"),
    readJobPath(job, "site.site_address"),
    readJobPath(job, "site.street_address"),
    joinParts(
      readJobPath(job, "site.address_line_1"),
      readJobPath(job, "site.address_line_2"),
    ),
    readJobPath(job, "site_details.address"),
    readJobPath(job, "site_details.site_address"),
    readJobPath(job, "site_details.street_address"),
    joinParts(
      readJobPath(job, "site_details.address_line_1"),
      readJobPath(job, "site_details.address_line_2"),
    ),
    readJobPath(job, "site_address"),
    readJobPath(job, "siteAddress"),
    readJobPath(job, "street_address"),
    readJobPath(job, "streetAddress"),
    readJobPath(job, "site_name.address"),
    joinParts(
      readJobPath(job, "site_address_line_1"),
      readJobPath(job, "site_address_line_2"),
    ),
  );
  const postcode = firstString(
    job.site_zip_code,
    job.site_postcode,
    job.site_post_code,
    job.site_details?.zip_code,
    job.site_details?.postcode,
    job.site_details?.post_code,
    job.site?.zip_code,
    job.site?.postcode,
    job.site?.post_code,
    readJobPath(job, "site.zip_code"),
    readJobPath(job, "site.postcode"),
    readJobPath(job, "site.post_code"),
    readJobPath(job, "site_details.zip_code"),
    readJobPath(job, "site_details.postcode"),
    readJobPath(job, "site_details.post_code"),
    readJobPath(job, "site_zip_code"),
    readJobPath(job, "site_postcode"),
    readJobPath(job, "site_post_code"),
    readJobPath(job, "siteZipCode"),
    readJobPath(job, "sitePostcode"),
    readJobPath(job, "sitePostCode"),
  );

  return [address, postcode].filter(Boolean).join(", ");
}

export function getJobServiceAddressLine(job: JobSummary) {
  return firstString(
    job.site_address,
    job.site_details?.address,
    job.site_details?.site_address,
    job.site_details?.street_address,
    joinParts(
      job.site_details?.address_line_1,
      job.site_details?.address_line_2,
    ),
    job.site?.address,
    job.site?.site_address,
    job.site?.street_address,
    joinParts(job.site?.address_line_1, job.site?.address_line_2),
    job.street_address,
    joinParts(job.address_line_1, job.address_line_2),
    readJobPath(job, "property_address"),
    readJobPath(job, "service_address"),
    readJobPath(job, "site.address"),
    readJobPath(job, "site_details.address"),
    readJobPath(job, "site_address"),
    job.customer_address,
    readJobPath(job, "customer.address"),
    job.address,
  );
}

export function getJobServicePostcode(job: JobSummary) {
  return firstString(
    job.site_zip_code,
    job.site_postcode,
    job.site_post_code,
    job.site_details?.zip_code,
    job.site_details?.postcode,
    job.site_details?.post_code,
    job.site?.zip_code,
    job.site?.postcode,
    job.site?.post_code,
    readJobPath(job, "property_postcode"),
    readJobPath(job, "service_postcode"),
    readJobPath(job, "site.postcode"),
    readJobPath(job, "site_details.postcode"),
    job.customer_zip_code,
    job.customer_postcode,
    job.customer_post_code,
    job.zip_code,
    job.post_code,
    job.postcode,
  );
}

export function getJobAppointmentDate(job: JobSummary) {
  const value = firstString(
    job.appointment_date,
    job.date,
    readJobPath(job, "appointment_date"),
    readJobPath(job, "service_date"),
    readJobPath(job, "scheduled_date"),
    job.appointment_at,
    job.scheduled_at,
  );
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

export function getJobNotes(job: JobSummary) {
  return firstString(
    (job as JobDetail).notes,
    readJobPath(job, "details"),
    readJobPath(job, "description"),
    readJobPath(job, "service_details"),
    readJobPath(job, "customer_notes"),
  );
}

export function getJobSiteEmail(job: JobSummary) {
  return firstString(
    job.site_email,
    job.site_details?.email,
    job.site?.email,
    readJobPath(job, "site_details.email"),
    readJobPath(job, "site.email"),
    readJobPath(job, "site_email"),
    readJobPath(job, "siteEmail"),
  );
}

export function getJobSitePhone(job: JobSummary) {
  return firstString(
    job.site_phone,
    job.site_number,
    job.site_details?.phone,
    job.site?.phone,
    readJobPath(job, "site_details.phone"),
    readJobPath(job, "site.phone"),
    readJobPath(job, "site_phone"),
    readJobPath(job, "site_number"),
    readJobPath(job, "sitePhone"),
    readJobPath(job, "siteNumber"),
  );
}

export function getJobDateTime(job: JobSummary) {
  const date = firstString(
    job.appointment_date,
    job.date,
    readJobPath(job, "appointment_date"),
    readJobPath(job, "service_date"),
    readJobPath(job, "schedule_date"),
    readJobPath(job, "scheduled_date"),
    readJobPath(job, "date"),
    readJobPath(job, "booking_date"),
    job.booking_date,
    readJobPath(job, "created_at"),
    readJobPath(job, "event_date"),
  );
  const time = firstString(
    job.appointment_time,
    job.time_slot,
    job.time,
    job.slot,
    readJobPath(job, "appointment_time"),
    readJobPath(job, "time_slot"),
    readJobPath(job, "time"),
    readJobPath(job, "slot"),
    job.start_time,
    job.end_time,
    readJobPath(job, "start_time"),
    readJobPath(job, "end_time"),
    readJobPath(job, "service_time"),
  );
  const dateTime = firstString(
    job.appointment_at,
    job.scheduled_at,
    readJobPath(job, "appointment_at"),
    readJobPath(job, "scheduled_at"),
    readJobPath(job, "start_at"),
    readJobPath(job, "scheduled_at"),
    readJobPath(job, "start_datetime"),
    readJobPath(job, "date_time"),
  );
  const range = !time
    ? joinParts(
        job.start_time ?? readJobPath(job, "start_time"),
        job.end_time ?? readJobPath(job, "end_time"),
        " - ",
      )
    : "";

  return [date, time || range].filter(Boolean).join(" ") || dateTime;
}

export function getJobBookingDate(job: JobSummary) {
  return firstString(
    job.booking_date,
    readJobPath(job, "booking_date"),
    readJobPath(job, "created_at"),
    readJobPath(job, "created_date"),
    readJobPath(job, "booked_at"),
  );
}

export function getJobPersonCount(job: JobSummary) {
  return firstString(
    job.person,
    job.persons,
    job.people,
    job.person_count,
    job.no_of_person,
    job.number_of_people,
    readJobPath(job, "person"),
    readJobPath(job, "persons"),
    readJobPath(job, "people"),
    readJobPath(job, "person_count"),
    readJobPath(job, "no_of_person"),
    readJobPath(job, "number_of_people"),
    readJobPath(job, "quantity"),
  );
}

export function getJobPaymentStatus(job: JobSummary) {
  return firstString(
    job.payment_status,
    readJobPath(job, "payment_status"),
    readJobPath(job, "payment.status"),
    readJobPath(job, "transaction.status"),
  );
}

export function getJobPaidVia(job: JobSummary) {
  return firstString(
    job.paid_via,
    job.payment_method,
    job.payment_type,
    readJobPath(job, "paid_via"),
    readJobPath(job, "payment_method"),
    readJobPath(job, "payment_type"),
    readJobPath(job, "payment.method"),
    readJobPath(job, "payment.gateway"),
    readJobPath(job, "transaction.payment_method"),
  );
}

export function getJobPrice(job: JobSummary) {
  const invoice = getJobInvoice(job);
  return firstString(
    job.price,
    job.amount,
    job.total,
    job.total_amount,
    job.grand_total,
    job.customer_paid,
    readJobPath(job, "price"),
    readJobPath(job, "amount"),
    readJobPath(job, "total"),
    readJobPath(job, "total_amount"),
    readJobPath(job, "grand_total"),
    readJobPath(job, "customer_paid"),
    readJobPath(job, "customerPaid"),
    readJobPath(job, "payable_amount"),
    readJobPath(job, "payment.amount"),
    invoice?.amount,
    invoice?.total_amount,
    invoice?.total,
    invoice?.customer_paid_amount,
  );
}

export function getJobFormattedPrice(job: JobSummary) {
  const price = getJobPrice(job);
  if (!price) return "";

  const symbol = firstString(
    job.currency_symbol,
    readJobPath(job, "currency_symbol"),
    readJobPath(job, "currencySymbol"),
  );
  return symbol ? `${symbol}${price}` : price;
}

export function getJobStatus(job: JobSummary) {
  return firstString(
    job.order_status,
    job.appointment_status,
    job.status,
    readJobPath(job, "order_status"),
    readJobPath(job, "appointment_status"),
    readJobPath(job, "status"),
  );
}

export function getJobInvoice(job: JobSummary): InvoiceSummary | null {
  if (job.invoice) return job.invoice;
  if (job.invoices?.length) return job.invoices[0] ?? null;
  return null;
}

export function getJobInvoiceNumber(job: JobSummary) {
  const invoice = getJobInvoice(job);
  return firstString(
    job.invoice_no,
    job.invoice_number,
    invoice?.invoice_no,
    invoice?.invoice_number,
    readJobPath(job, "invoice.invoice_no"),
    readJobPath(job, "invoice.invoice_number"),
  );
}

export function getJobInvoiceStatus(job: JobSummary) {
  const invoice = getJobInvoice(job);
  return firstString(
    job.invoice_status,
    invoice?.invoice_status,
    invoice?.status,
    readJobPath(job, "invoice.invoice_status"),
    readJobPath(job, "invoice.status"),
  );
}

export function getJobInvoicePaymentStatus(job: JobSummary) {
  const invoice = getJobInvoice(job);
  return firstString(
    job.invoice_payment_status,
    job.invoice_paid_status,
    invoice?.payment_status,
    invoice?.paid_status,
    readJobPath(job, "invoice.payment_status"),
    readJobPath(job, "invoice.paid_status"),
    readJobPath(job, "invoice_payment_status"),
    readJobPath(job, "invoice_paid_status"),
    hasJobInvoice(job) ? "unpaid" : "",
  );
}

export function getJobInvoicePaidDate(job: JobSummary) {
  const invoice = getJobInvoice(job);
  const value = firstString(
    job.paid_date,
    invoice?.paid_date,
    readJobPath(job, "invoice.paid_date"),
    readJobPath(job, "paid_date"),
  );

  return formatUkDate(value);
}

function formatUkDate(value: string) {
  if (!value) return "";

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function getJobInvoiceUrl(job: JobSummary) {
  const invoice = getJobInvoice(job);
  return firstString(
    job.invoice_url,
    invoice?.invoice_url,
    invoice?.pdf_url,
    invoice?.url,
    readJobPath(job, "invoice.invoice_url"),
    readJobPath(job, "invoice.pdf_url"),
    readJobPath(job, "invoice.url"),
  );
}

export function hasJobInvoice(job: JobSummary) {
  return Boolean(
    job.invoice_id || getJobInvoiceNumber(job) || getJobInvoice(job),
  );
}

export function getJobEmail(job: JobSummary) {
  return firstString(
    job.site_details?.email,
    job.site?.email,
    job.customer?.email,
    job.user?.email,
    job.customer_email,
    readJobPath(job, "site_details.email"),
    readJobPath(job, "site.email"),
    readJobPath(job, "customer.email"),
    readJobPath(job, "user.email"),
    readJobPath(job, "email"),
    readJobPath(job, "customer_email"),
  );
}

export function getJobPhone(job: JobSummary) {
  return firstString(
    job.site_details?.phone,
    job.site?.phone,
    job.customer?.phone,
    job.user?.phone,
    job.customer_phone,
    readJobPath(job, "site_details.phone"),
    readJobPath(job, "site.phone"),
    readJobPath(job, "customer.phone"),
    readJobPath(job, "user.phone"),
    readJobPath(job, "phone"),
    readJobPath(job, "customer_phone"),
  );
}

export function getCertificateTitle(certificate: CertificateSummary) {
  return (
    certificate.template?.template_name ??
    certificate.certificate_type ??
    certificate.type ??
    "Certificate"
  );
}

export function getCertificateDate(certificate: CertificateSummary) {
  return formatUkDate(
    firstString(
      certificate.inspection_date,
      certificate.certificate_date,
      certificate.date,
      certificate.created_at,
    ),
  );
}

export function getCertificateService(certificate: CertificateSummary) {
  return firstString(
    certificate.service?.name,
    certificate.service?.title,
    certificate.service_name,
    certificate.service_title,
  );
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    return String(value);
  }

  return "";
}

function joinParts(first: unknown, second: unknown, separator = ", ") {
  return [first, second]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(separator);
}

function readJobPath(job: JobSummary, path: string) {
  return firstValue(
    readPath(job, path),
    readPath(job.booking, path),
    readPath(job.appointment, path),
    readPath(job.order, path),
    readPath(job.service_booking, path),
    readPath(job.serviceBooking, path),
    readPath(job.serviceBookingDetails, path),
    readPath(job.serviceBookingData, path),
  );
}

function firstValue(...values: unknown[]) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

function readPath(source: unknown, path: string) {
  if (!source || typeof source !== "object") return undefined;

  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}
