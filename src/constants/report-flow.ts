export type JobScope = {
  jobId: string;
  serviceId: string;
  bookingId: string;
  customerName: string;
  address: string;
  scheduledFor: string;
};

export type ReportOptionGroup = {
  title: string;
  accent: string;
  options: string[];
};

export type SavedReportRecord = {
  id: string;
  jobId: string;
  serviceId: string;
  bookingId: string;
  title: string;
  category: string;
  status: 'Draft' | 'Completed' | 'Uploaded';
  updatedAt: string;
};

export const selectedJobScope: JobScope = {
  jobId: 'JOB-2048',
  serviceId: 'SERVICE-781',
  bookingId: 'BOOKING-339',
  customerName: 'Sarah Devaney',
  address: '24 King Street, London SW1A 1AA',
  scheduledFor: 'Today, 15:30',
};

export const reportGroups: ReportOptionGroup[] = [
  {
    title: 'Domestic Gas Certificates',
    accent: '#ff6a00',
    options: [
      'Domestic Gas Safety Certificate / CP12',
      'Boiler Service Certificate',
      'Gas Cooker Safety Certificate',
      'Gas Fire Safety Certificate',
      'Gas Hob Safety Certificate',
      'Landlord Gas Safety Certificate',
      'LPG Gas Safety Certificate',
      'Gas Leak Detection Report',
      'Gas Installation Certificate',
      'Gas Warning Notice / Unsafe Situation Report',
    ],
  },
  {
    title: 'Commercial Gas Reports',
    accent: '#17c7a3',
    options: [
      'Commercial Gas Safety Certificate',
      'Commercial Boiler Service Report',
      'Commercial Catering Gas Safety Certificate',
      'Commercial Kitchen Gas Safety Report',
      'Gas Interlock System Report',
      'Commercial Gas Installation Certificate',
      'Commercial Gas Tightness Test Report',
      'Commercial LPG Safety Report',
      'Commercial Plant Room Gas Report',
      'Gas Warning Notice / Unsafe Situation Report',
    ],
  },
  {
    title: 'Electrical Reports',
    accent: '#58a6ff',
    options: [
      'Electrical Installation Certificate (EIC)',
      'Electrical Installation Condition Report (EICR)',
      'Emergency Lighting Inspection and Test',
      'Minor Electrical Installation Works (MEIWC)',
      'Portable Appliance Testing (PAT)',
      'Smoke Alarm Design/Commissioning',
    ],
  },
];

export const savedReportRecords: SavedReportRecord[] = [
  {
    id: 'REC-1001',
    jobId: 'JOB-2048',
    serviceId: 'SERVICE-781',
    bookingId: 'BOOKING-339',
    title: 'Domestic Gas Safety Certificate / CP12',
    category: 'Domestic Gas Certificates',
    status: 'Draft',
    updatedAt: 'Today, 14:10',
  },
  {
    id: 'REC-1002',
    jobId: 'JOB-2048',
    serviceId: 'SERVICE-781',
    bookingId: 'BOOKING-339',
    title: 'Boiler Service Certificate',
    category: 'Domestic Gas Certificates',
    status: 'Uploaded',
    updatedAt: 'Today, 14:28',
  },
  {
    id: 'REC-9001',
    jobId: 'JOB-1998',
    serviceId: 'SERVICE-730',
    bookingId: 'BOOKING-302',
    title: 'Commercial Boiler Service Report',
    category: 'Commercial Gas Reports',
    status: 'Completed',
    updatedAt: 'Yesterday, 10:05',
  },
];

export function getJobScopeFromParams(params: Partial<Record<keyof JobScope, string | string[]>>) {
  return {
    jobId: getParamValue(params.jobId) ?? selectedJobScope.jobId,
    serviceId: getParamValue(params.serviceId) ?? selectedJobScope.serviceId,
    bookingId: getParamValue(params.bookingId) ?? selectedJobScope.bookingId,
    customerName: getParamValue(params.customerName) ?? selectedJobScope.customerName,
    address: getParamValue(params.address) ?? selectedJobScope.address,
    scheduledFor: getParamValue(params.scheduledFor) ?? selectedJobScope.scheduledFor,
  };
}

export function getSavedRecordsForScope(scope: JobScope) {
  return savedReportRecords.filter(
    (record) =>
      record.jobId === scope.jobId &&
      record.serviceId === scope.serviceId &&
      record.bookingId === scope.bookingId
  );
}

export function getJobScopeRouteParams(scope: JobScope) {
  return {
    jobId: scope.jobId,
    serviceId: scope.serviceId,
    bookingId: scope.bookingId,
    customerName: scope.customerName,
    address: scope.address,
    scheduledFor: scope.scheduledFor,
  };
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
