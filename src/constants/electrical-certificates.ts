export type ElectricalCertificateType =
  | "eic"
  | "eicr"
  | "emergency_lighting"
  | "meiwc"
  | "pat"
  | "smoke_alarm"
  | "cp12"
  | "gas_breakdown"
  | "gas_warning_notice"
  | "gas_service_maintenance"
  | "commercial_gas_safety"
  | "gas_installation_safety"
  | "commercial_catering_inspection"
  | "gas_testing_purging";

export type ElectricalFieldType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "date"
  | "boolean"
  | "select"
  | "signature"
  | "checkbox"
  | "photo";

export type ElectricalField = {
  key: string;
  label: string;
  type: ElectricalFieldType;
  required?: boolean;
  readOnly?: boolean;
  unit?: string;
  options?: string[];
  multiple?: boolean;
  defaultValue?: string;
  signatureType?: "engineer" | "customer";
};

export type ElectricalStep = {
  key: string;
  title: string;
  fields?: ElectricalField[];
  table?: {
    itemType: string;
    fields: ElectricalField[];
    required?: boolean;
    storageKey?: string;
  };
};

export type ElectricalCertificateDefinition = {
  type: ElectricalCertificateType;
  title: string;
  shortTitle: string;
  templateMatchers: string[];
  steps: ElectricalStep[];
};

const f = (
  key: string,
  label: string,
  type: ElectricalFieldType = "text",
  extra: Omit<ElectricalField, "key" | "label" | "type"> = {},
): ElectricalField => ({ key, label, type, ...extra });

const clientEngineer: ElectricalStep = {
  key: "client_engineer",
  title: "Client & Engineer",
  fields: [
    f("certificate_number", "Certificate number", "text", { readOnly: true }),
    f("issue_date", "Issue date", "date", { required: true }),
    f("client_name", "Client name", "text", { required: true }),
    f("client_address", "Client address", "textarea", { required: true }),
    f("postcode", "Postcode", "text", { required: true }),
    f(
      "installation_address",
      "Installation address (if different)",
      "textarea",
    ),
    f("occupier_name", "Occupier name"),
    f("client_contact_number", "Client contact number"),
    f("client_email", "Client email"),
    f("site_contact_name", "Site contact name"),
    f("site_contact_phone", "Site contact phone"),
    f("site_contact_email", "Site contact email"),
    f("service_title", "Service title"),
    f("job_reference", "Job reference / booking ID"),
    // Optional. The customer is often not on site when the engineer finishes,
    // and making this compulsory left the engineer unable to submit completed
    // work. The engineer's own signature is still required — that is the one
    // carrying the professional declaration.
    f("client_signature", "Client / occupier signature", "signature", {
      signatureType: "customer",
    }),
    f("engineer_name", "Engineer name", "text", { required: true }),
    f("company_name", "Company name"),
    f("registration_number", "Registration number"),
    f("test_instrument_serials", "Test instrument serial(s)"),
  ],
};
const patHeaderStep: ElectricalStep = {
  key: "cp12_header",
  title: "Certificate Details",
  fields: [
    f("certificate_type_name", "Certificate type/name", "text", {
      readOnly: true,
      defaultValue: "PAT / Portable Appliance Testing",
    }),

   f("booking_id", "Job / Booking ID", "text"),

    f("certificate_reference_number", "Certificate reference number", "text"),
  ],
};
const gasPropertyAndParties: ElectricalStep = {
  key: "property_parties",
  title: "Property & Parties",
  fields: [
    f("certificate_number", "Certificate number", "text", { readOnly: true }),
    f("issue_date", "Issue date", "date", { required: true }),
    f("landlord_client_name", "Landlord/Client name", "text", {
      required: true,
    }),
    f("landlord_client_address", "Landlord/Client address", "textarea", {
      required: true,
    }),
    f("postcode", "Postcode", "text", { required: true }),
    f(
      "site_inspection_address",
      "Site/Inspection address (if different)",
      "textarea",
    ),
    f("tenant_occupier_name", "Tenant/Occupier name"),
    f("tenant_contact_number", "Tenant contact number"),
    f("engineer_name", "Engineer name", "text", { required: true }),
    f("gas_safe_licence_number", "Gas Safe licence number", "text"),
    f("gas_safe_id_card_number", "Gas Safe ID card number", "text"),
    f("company_name", "Company name", "text"),
  ],
};

const cp12HeaderStep: ElectricalStep = {
  key: "cp12_header",
  title: "Certificate Details",
  fields: [
    f("certificate_type_name", "Certificate type/name", "text", {
      readOnly: true,
      defaultValue: "CP12 / Landlord Gas Safety Record",
    }),
    f("booking_id", "Job / Booking ID", "text"),
   f(
  "certificate_reference_number",
  "Certificate Reference Number",
  "text",
  {
    required: true,
  }
),

f(
  "auto_certificate_reference",
  "Select to fill automatically",
  "checkbox"
),
  ],
};

const cp12ClientInstallationDetails: ElectricalStep = {
  key: "client_installation_details",
  title: "Client & Installation Details",
  fields: [
    f("client_name", "Client/Landlord name", "text", { required: true }),
    f("company_name", "Company name", "text"),
    f("client_address_line_1", "Address line 1", "text", {
      required: true,
    }),
    f("client_address_line_2", "Address line 2", "text"),
    f("client_town_city", "Town/City", "text", { required: true }),
    f("client_county_region", "County/Region", "text"),
    f("client_postcode", "Postcode", "text", { required: true }),
    f("client_telephone", "Telephone", "text"),
    f("client_email", "Email", "text"),
    f(
      "installation_same_as_client_address",
      "Installation address is the same as client address",
      "checkbox",
    ),
    f("occupier_name", "Occupier/Tenant name", "text"),
    f("installation_address_line_1", "Installation address line 1", "text", {
      required: true,
    }),
    f("installation_address_line_2", "Installation address line 2", "text"),
    f("installation_town_city", "Installation town/city", "text", {
      required: true,
    }),
    f("installation_county_region", "Installation county/region", "text"),
    f("installation_postcode", "Installation postcode", "text", {
      required: true,
    }),
    f("installation_telephone", "Installation telephone", "text"),
    f("installation_email", "Installation email", "text"),
  ],
};

const gasApplianceDetailsFields: ElectricalField[] = [
  f("photo_1", "Photo 1", "photo"),
  f("photo_2", "Photo 2", "photo"),
  f("photo_3", "Photo 3", "photo"),
  f("location", "Location", "select", {
    required: true,
    options: [
      "Garage",
      "Living room",
      "Kitchen",
      "Utility room",
      "Hallway",
      "Airing cupboard",
      "Landing",
      "Bathroom",
      "Bedroom",
      "Loft",
      "Other",
    ],
  }),
  f("appliance_type", "Appliance type", "select", {
    options: [
      "Combi boiler",
      "System boiler",
      "Regular boiler",
      "Water heater",
      "Fire",
      "Cooker",
      "Hob",
      "Warm air unit",
      "Other",
    ],
  }),
  f("make", "Make", "text", { required: false }),
  f("model", "Model", "text", { required: false }),
  f("flue_type", "Flue type", "select", {
    options: ["Open flue", "Room sealed", "Flueless", "Balanced"],
    required: false,
  }),
  f("owned_by", "Landlord’s appliance", "select", {
    options: ["Yes", "No", "N/A"],
    required: false,
  }),
  f("appliance_inspected", "Appliance inspected", "select", {
    options: ["Yes", "No", "N/A", "Visual inspection only"],
    required: false,
  }),
  f("co2_reading", "CO2 reading (ppm)", "decimal", { required: false }),
  f("co_reading", "CO reading (ppm)", "decimal", { required: false }),
  f(
    "combustion_analyser_reading",
    "Combustion analyser CO/CO2 ratio",
    "decimal",
    {
      required: false,
    },
  ),
  f(
    "operating_pressure_or_heat_input",
    "Operating Pressure or Heat Input",
    "select",
    {
      options: ["Operating Pressure", "Heat Input"],
    },
  ),

  f("operating_pressure_or_heat_input_value", "Value", "decimal"),
  f("spillage_test", "Spillage test", "select", {
    options: ["Pass", "Fail", "N/A"],
    required: false,
  }),
  f("flue_flow", "Flue flow", "select", {
    options: ["Pass", "Fail", "N/A"],
    required: false,
  }),
  f("ventilation_provision", "Ventilation provision satisfactory", "select", {
    options: ["Yes", "No", "N/A"],
    required: false,
  }),
  f(
    "visual_condition_flue",
    "Flue visual condition and termination satisfactory",
    "select",
    { options: ["Yes", "No", "N/A"], required: false },
  ),
  f("flue_performance_tests", "Flue performance tests", "select", {
    options: ["Pass", "Fail", "N/A"],
    required: false,
  }),
  f("appliance_serviced", "Appliance serviced", "select", {
    options: ["Yes", "No", "N/A"],
    required: false,
  }),
  f("appliance_safe_to_use", "Appliance safe to use", "select", {
    options: ["Yes", "No", "N/A"],
    required: false,
  }),
  f(
    "safety_devices_operation",
    "Safety devices operating correctly",
    "select",
    {
      options: ["Yes", "No", "N/A"],
      required: false,
    },
  ),
  f("faults_identified", "Details of any faults", "textarea"),
  f("remedial_action_taken", "Remedial action taken", "textarea"),
];

const gasInspectionResultsFields: ElectricalField[] = [
  f("appliance", "Appliance (location ref)", "text", { required: true }),
  f("co2_reading", "CO2 reading (ppm)", "decimal"),
  f("co_reading", "CO reading (ppm)", "decimal"),
  f(
    "combustion_analyser_reading",
    "Combustion analyser reading (CO/CO2 ratio)",
    "text",
  ),
  f("operating_pressure", "Operating pressure (mbar)", "decimal"),
  f("heat_input", "Heat input (kW)", "decimal"),
  f("spillage_test", "Spillage test", "select", {
    options: ["Pass", "Fail", "N/A"],
  }),
  f("flue_flow", "Flue flow", "select", { options: ["Pass", "Fail", "N/A"] }),
  f(
    "visual_condition_flue",
    "Visual condition of flue/termination?",
    "select",
    { options: ["Yes", "No", "N/A"], required: true },
  ),
  f(
    "safety_devices_operation",
    "Safety device(s) operation correct?",
    "select",
    { options: ["Yes", "No", "N/A"], required: true },
  ),
  f("ventilation_provision", "Ventilation provision satisfactory?", "select", {
    options: ["Yes", "No", "N/A"],
    required: true,
  }),
  f("photo_3", "Photo 3", "text"),
  f("appliance_serviced_notes", "Serviced notes / remarks", "textarea"),
];

const gasFaultFields: ElectricalField[] = [
  f("related_appliance", "Related appliance", "select", {
    options: ["General installation"],
    required: true,
  }),
  f("fault_details", "Details of fault", "textarea", {
    required: true,
  }),
  f("remedial_action_taken", "Remedial action taken", "textarea", {
    required: true,
  }),
  f("classification", "Classification / category", "select", {
    options: [
      "Immediately Dangerous",
      "At Risk",
      "Not to Current Standards",
      "Other / advisory",
    ],
    required: true,
  }),
  f(
    "warning_label_or_notice_issued",
    "Warning label or notice issued",
    "select",
    {
      options: ["Yes", "No", "N/A"],
      required: true,
    },
  ),
  f("appliance_isolated", "Appliance isolated", "select", {
    options: ["Yes", "No", "N/A"],
    required: true,
  }),
  f("responsible_person_notified", "Responsible person notified", "select", {
    options: ["Yes", "No", "N/A"],
    required: true,
  }),
];

const supplyFields = [
  f("system_type", "System type", "select", {
    options: ["TN-S", "TN-C-S", "TT", "IT"],
    required: true,
  }),
  f("live_conductors", "Live conductors", "select", {
    options: ["1-phase 2-wire", "3-phase 3-wire", "3-phase 4-wire"],
    required: true,
  }),
  f("supply_type", "Supply type", "select", {
    options: ["AC", "DC"],
    required: true,
  }),
  f("nominal_voltage_uo", "Nominal voltage Uo", "decimal", { unit: "V" }),
  f("frequency", "Frequency", "decimal", { unit: "Hz" }),
  f("prospective_fault_current", "Prospective fault current Ipf", "decimal", {
    unit: "kA",
  }),
  f("external_loop_impedance", "External loop impedance Ze", "decimal", {
    unit: "Ω",
  }),
  f("supply_protective_device_type", "Supply protective device type"),
  f(
    "supply_protective_device_rating",
    "Supply protective device rating",
    "number",
    { unit: "A" },
  ),
];

const installationFields = [
  f("means_of_earthing", "Means of earthing", "select", {
    options: ["Supplier's facility", "Installation earth electrode"],
    required: true,
  }),
  f("earth_electrode_type", "Earth electrode type"),
  f("earth_electrode_resistance", "Earth electrode resistance RA", "decimal", {
    unit: "Ω",
  }),
  f(
    "main_protective_conductor_material",
    "Main protective conductor material",
    "select",
    { options: ["Copper", "Aluminium", "Other"] },
  ),
  f(
    "main_protective_conductor_csa",
    "Main protective conductor csa",
    "decimal",
    { unit: "mm²" },
  ),
  f("main_bonding_conductor_csa", "Main bonding conductor csa", "decimal", {
    unit: "mm²",
  }),
  f("bonding_to", "Bonding to", "select", {
    options: ["Water", "Structural steel", "Other"],
    multiple: true,
  }),
  f("main_switch_location", "Main switch location"),
  f("main_switch_bs_type", "Main switch BS type"),
  f("main_switch_rating", "Main switch rating", "number", { unit: "A" }),
  f("rcd_fitted_at_origin", "RCD fitted at origin?", "boolean"),
  f("rcd_type", "RCD type", "select", { options: ["AC", "A", "F", "B"] }),
  f("rcd_idn", "RCD IΔn", "number", { unit: "mA" }),
  f("rcd_operating_time", "RCD operating time", "decimal", { unit: "ms" }),
];

const circuitFields = [
  f("circuit_number", "Circuit number", "text", { required: true }),
  f("circuit_description", "Circuit description", "text", { required: true }),
  f("type_of_wiring", "Type of wiring", "select", {
    options: [
      "A: PVC cables in conduit",
      "B: PVC/PVC flat",
      "C: PVC in trunking",
      "D: Other",
    ],
  }),
  f("reference_method", "Reference method"),
  f("number_of_points", "Number of points", "number"),
  f("live_conductor_csa", "Live conductor csa", "decimal", { unit: "mm²" }),
  f("cpc_csa", "CPC csa", "decimal", { unit: "mm²" }),
  f("max_disconnection_time", "Max disconnection time", "decimal", {
    unit: "s",
  }),
  f("protective_device_bs_en", "Protective device BS(EN)"),
  f("protective_device_type", "Protective device type", "select", {
    options: ["B", "C", "D", "Fuse", "RCBO"],
  }),
  f("device_rating", "Device rating", "number", { unit: "A" }),
  f("breaking_capacity", "Breaking capacity", "decimal", { unit: "kA" }),
  f("rcd_idn", "RCD IΔn", "number", { unit: "mA" }),
];

const testResultFields = [
  f("circuit_number", "Circuit number", "text", { required: true }),
  f("continuity_r1_r2", "Continuity R1+R2", "decimal", { unit: "Ω" }),
  f("continuity_r2", "Continuity r2", "decimal", { unit: "Ω" }),
  f("insulation_live_live", "Insulation resistance Live/Live", "decimal", {
    unit: "MΩ",
  }),
  f("insulation_live_earth", "Insulation resistance Live/Earth", "decimal", {
    unit: "MΩ",
  }),
  f("test_voltage", "Test voltage", "number", { unit: "V" }),
  f("polarity", "Polarity", "checkbox"),
  f("max_zs", "Max Zs", "decimal", { unit: "Ω" }),
  f("rcd_operating_time", "RCD operating time", "decimal", { unit: "ms" }),
  f("rcd_test_button", "RCD test button", "checkbox"),
  f("afdd_test", "AFDD test", "checkbox"),
  f("remarks", "Remarks"),
];

const supplyStep = (key = "supply_characteristics"): ElectricalStep => ({
  key,
  title: "Supply Characteristics & Earthing",
  fields: supplyFields,
});
const installationStep = (
  key = "installation_particulars",
): ElectricalStep => ({
  key,
  title: "Installation Particulars",
  fields: installationFields,
});
const tableStep = (
  key: string,
  title: string,
  itemType: string,
  fields: ElectricalField[],
  required = true,
  storageKey?: string,
): ElectricalStep => ({
  key,
  title,
  table: { itemType, fields, required, storageKey },
});

const allCertificateDefinitions: ElectricalCertificateDefinition[] = [
  {
    type: "eic",
    shortTitle: "EIC",
    title: "Electrical Installation Certificate",
    templateMatchers: ["eic", "electrical installation certificate"],
    steps: [
      clientEngineer,
      {
        key: "description_extent",
        title: "Description & Extent",
        fields: [
          f("description_of_works", "Description of works", "textarea", {
            required: true,
          }),
          f("extent_covered", "Extent of installation covered", "textarea", {
            required: true,
          }),
          f("type_of_work", "Type of work", "select", {
            options: ["New installation", "Addition", "Alteration"],
            required: true,
          }),
        ],
      },
      supplyStep(),
      installationStep(),
      tableStep(
        "circuit_details",
        "Circuit Details",
        "circuit",
        circuitFields,
        true,
        "circuits",
      ),
      tableStep(
        "test_results",
        "Test Results",
        "test_result",
        testResultFields,
        true,
        "circuits",
      ),
      {
        key: "declaration",
        title: "Declaration",
        fields: [
          f("designer_name", "Designer name", "text", { required: true }),
          f("designer_signature", "Designer signature", "signature", {
            required: true,
          }),
          f("constructor_name", "Constructor name", "text", { required: true }),
          f("constructor_signature", "Constructor signature", "signature", {
            required: true,
          }),
          f("inspector_name", "Inspector name", "text", { required: true }),
          f("inspector_signature", "Inspector signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
          f("next_inspection_date", "Next inspection date", "date", {
            required: true,
          }),
        ],
      },
    ],
  },
  {
    type: "eicr",
    shortTitle: "EICR",
    title: "Electrical Installation Condition Report",
    templateMatchers: ["eicr", "electrical installation condition report"],
    steps: [
      clientEngineer,
      {
        key: "purpose_installation",
        title: "Purpose & Installation Details",
        fields: [
          f("purpose_of_report", "Purpose of report", "textarea", {
            required: true,
          }),
          f("premises_type", "Premises type", "select", {
            options: ["Domestic", "Commercial", "Industrial", "Other"],
            required: true,
          }),
          f(
            "estimated_installation_age",
            "Estimated age of installation",
            "number",
            { unit: "years" },
          ),
          f("evidence_of_alterations", "Evidence of alterations?", "boolean"),
          f(
            "estimated_alterations_age",
            "Estimated age of alterations",
            "number",
            { unit: "years" },
          ),
          f("last_inspection_date", "Date of last inspection", "date"),
          f("records_available", "Records available?", "boolean"),
        ],
      },
      {
        key: "extent_limitations",
        title: "Extent & Limitations",
        fields: [
          f("extent_covered", "Extent of installation covered", "textarea", {
            required: true,
          }),
          f("agreed_limitations", "Agreed limitations", "textarea"),
          f("operational_limitations", "Operational limitations", "textarea"),
        ],
      },
      supplyStep(),
      installationStep(),
      tableStep(
        "schedule_of_inspections",
        "Schedule of Inspections",
        "inspection",
        [
          f("item_description", "Item description", "text", { required: true }),
          f("outcome", "Outcome", "select", {
            options: ["Acceptable", "C1", "C2", "C3", "FI", "N/A", "LIM"],
            required: true,
          }),
        ],
      ),
      tableStep(
        "observations",
        "Observations",
        "observation",
        [
          f("observation", "Observation", "textarea", { required: true }),
          f("classification_code", "Classification code", "select", {
            options: ["C1", "C2", "C3", "FI"],
            required: true,
          }),
        ],
        false,
      ),
      {
        key: "summary",
        title: "Summary",
        fields: [
          f("overall_assessment", "Overall assessment", "select", {
            options: ["Satisfactory", "Unsatisfactory"],
            required: true,
          }),
          f(
            "general_condition_summary",
            "General condition summary",
            "textarea",
            { required: true },
          ),
          f("next_inspection_date", "Next inspection date", "date", {
            required: true,
          }),
        ],
      },
      tableStep(
        "test_results",
        "Test Results",
        "test_result",
        testResultFields,
        true,
        "circuits",
      ),
      {
        key: "declaration",
        title: "Declaration",
        fields: [
          f("inspector_name", "Inspector name", "text", { required: true }),
          f("inspector_signature", "Inspector signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
          f("declaration_date", "Date", "date", { required: true }),
        ],
      },
    ],
  },
  {
    type: "emergency_lighting",
    shortTitle: "Emergency Lighting",
    title: "Emergency Lighting Inspection and Test",
    templateMatchers: ["emergency lighting"],
    steps: [
      clientEngineer,
      {
        key: "system_details",
        title: "System Details",
        fields: [
          f("system_type", "System type", "select", {
            options: ["Maintained", "Non-maintained", "Combined"],
            required: true,
          }),
          f("standby_duration", "Standby duration", "select", {
            options: ["1 hour", "3 hours"],
            required: true,
          }),
          f("battery_system", "Battery system", "select", {
            options: ["Self-contained", "Central battery"],
            required: true,
          }),
        ],
      },
      tableStep(
        "luminaire_schedule",
        "Luminaire Schedule",
        "luminaire",
        [
          f("reference_id", "Reference/ID", "text", { required: true }),
          f("location", "Location", "select", {
            required: true,
            options: [
              "Garage",
              "Living room",
              "Kitchen",
              "Utility room",
              "Hallway",
              "Airing cupboard",
              "Landing",
              "Bathroom",
              "Bedroom",
              "Loft",
              "Other",
            ],
          }),
          f("luminaire_type", "Luminaire type"),
          f("lamp_type", "Lamp type"),
          f("battery_type", "Battery type"),
          f("charge_indicator_working", "Charge indicator working?", "boolean"),
          f("function_test_result", "Function test result", "select", {
            options: ["Pass", "Fail"],
            required: true,
          }),
          f("duration_test_result", "Duration test result", "select", {
            options: ["Pass", "Fail"],
            required: true,
          }),
        ],
        true,
        "fittings",
      ),
      tableStep(
        "defects",
        "Defects",
        "defect",
        [
          f("item", "Item", "text", { required: true }),
          f("defect", "Defect", "textarea", { required: true }),
          f("action_required", "Action required", "textarea"),
          f("target_date", "Target date", "date"),
        ],
        false,
      ),
      {
        key: "declaration",
        title: "Declaration",
        fields: [
          f("tester_name", "Tester name", "text", { required: true }),
          f("tester_signature", "Signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
          f("next_test_due", "Next test due", "date", { required: true }),
        ],
      },
    ],
  },
  {
    type: "meiwc",
    shortTitle: "MEIWC",
    title: "Minor Electrical Installation Works",
    templateMatchers: ["meiwc", "minor electrical installation works"],
    steps: [
      clientEngineer,
      {
        key: "description_of_works",
        title: "Description of Works",
        fields: [
          f("description", "Description of minor works", "textarea", {
            required: true,
          }),
          f("location_circuit", "Location / circuit affected", "text", {
            required: true,
          }),
          f("works_completed_date", "Date works completed", "date", {
            required: true,
          }),
          f(
            "existing_installation_comments",
            "Comments on existing installation",
            "textarea",
          ),
        ],
      },
      {
        key: "supply_circuit",
        title: "Supply & Circuit Details",
        fields: [
          f("system_type", "System type", "select", {
            options: ["TN-S", "TN-C-S", "TT", "IT"],
            required: true,
          }),
          f("ze", "Ze", "decimal", { unit: "Ω" }),
          f("ipf", "Ipf", "decimal", { unit: "kA" }),
          f("protective_device_bs_en", "Protective device BS(EN)"),
          f("protective_device_type", "Protective device type", "select", {
            options: ["B", "C", "D", "Fuse", "RCBO"],
          }),
          f("device_rating", "Device rating", "number", { unit: "A" }),
          f("live_conductor_csa", "Live conductor csa", "decimal", {
            unit: "mm²",
          }),
          f("cpc_csa", "CPC csa", "decimal", { unit: "mm²" }),
        ],
      },
      {
        key: "test_results",
        title: "Test Results",
        fields: [
          f("earth_continuity_r1_r2", "Earth continuity R1+R2", "decimal", {
            unit: "Ω",
          }),
          f(
            "insulation_live_live",
            "Insulation resistance Live/Live",
            "decimal",
            { unit: "MΩ" },
          ),
          f(
            "insulation_live_earth",
            "Insulation resistance Live/Earth",
            "decimal",
            { unit: "MΩ" },
          ),
          f("polarity", "Polarity", "checkbox"),
          f("zs", "Zs", "decimal", { unit: "Ω" }),
          f("rcd_operating_time", "RCD operating time", "decimal", {
            unit: "ms",
          }),
          f("rcd_idn", "RCD IΔn", "number", { unit: "mA" }),
          f("afdd_test", "AFDD test", "checkbox"),
        ],
      },
      {
        key: "declaration",
        title: "Declaration",
        fields: [
          f("engineer_name_declaration", "Engineer name", "text", {
            required: true,
          }),
          f("engineer_signature", "Signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
          f("declaration_date", "Date", "date", { required: true }),
        ],
      },
    ],
  },
  {
    type: "pat",
    shortTitle: "PAT",
    title: "Portable Appliance Test (PAT)",
    templateMatchers: ["pat", "portable appliance test"],
    steps: [
  patHeaderStep,
  cp12ClientInstallationDetails,
      
    {
  key: "test_equipment_details",
  title: "Test Equipment Details",
  fields: [
    f("test_equipment_used", "Test Equipment Used", "text", {
      required: true,
    }),

    f("serial_number", "Serial No", "text", {
      required: true,
    }),

    f("tested_by", "Tested By", "text", {
      required: true,
    }),

    f("test_date", "Date", "date", {
      required: true,
    }),

    f("retest_date", "Retest Date", "date", {
      required: true,
    }),
  ],

},
{
  key: "appliance_register",
  title: "Appliance Tests",
  table: {
    itemType: "appliance",
    storageKey: "pat_appliances",
    required: true,

    fields: [
     f("location", "Location", "select", {
  required: true,
  options: [
    "Garage",
    "Living room",
    "Kitchen",
    "Utility room",
    "Hallway",
    "Airing cupboard",
    "Landing",
    "Bathroom",
    "Bedroom",
    "Loft",
    "Other",
  ],
}),

      f("make", "Make", "text"),

      f("appliance_type", "Type", "text", {
        required: true,
      }),

      f("fuse_rating", "Fuse Rating", "select", {
        options: [
           "3",
          "5",
          "7",
          "10",
          "13",
          "Limitation",
          "N/A",
        ],
      }),

      f("earth_continuity", "Earth Continuity", "select", {
        options: ["Pass", "Fail", "N/A"],
        required: true,
      }),

      f("insulation_resistance", "Insulation Resistance", "select", {
        options: ["Pass", "Fail", "N/A"],
        required: true,
      }),

      f("plug_flex_body", "Plug Fuse & Body Visual", "select", {
  options: ["Pass", "Fail", "Limitation", "N/A"],
  required: true,
}),

f("safe_to_use", "Safe to Use", "select", {
  options: ["Yes", "No"],
  required: true,
}),

f("notes", "Notes / Failure Details", "textarea"),
    ],
  },
},

{
  key: "declaration",
  title: "Company Details & Signature",
  fields: [
    // The engineer is already recorded as "Tested By" in the test equipment
    // step, so the block printed at the top of the certificate is the company.
    f("engineer_name", "Company name", "text", {
      readOnly: true,
    }),

    f("engineer_address", "Company address", "textarea", {
      readOnly: true,
    }),

    f("engineer_postcode", "Company postcode", "text", {
      readOnly: true,
    }),

    f(
      "engineer_niceic_number",
      "NICEIC registration number",
      "text",
      {
        readOnly: true,
      },
    ),

    f("engineer_phone", "Company phone number", "text", {
      readOnly: true,
    }),

    f(
      "customer_unavailable_to_sign",
      "Customer unavailable to sign",
      "select",
      {
        options: ["No", "Yes"],
        defaultValue: "No",
      },
    ),
f("additional_notes", "Additional Notes", "textarea"),
    f(
      "customer_unavailable_reason",
      "Reason customer unavailable to sign",
      "textarea",
    ),

    f("customer_signature", "Customer signature", "signature", {
      signatureType: "customer",
    }),

    f("engineer_signature", "Engineer signature", "signature", {
      required: true,
      signatureType: "engineer",
    }),
  ],
},
    ]
    },
  
  {
    type: "cp12",
    shortTitle: "CP12",
    title: "Domestic / Landlord Gas Safety (CP12)",
    templateMatchers: ["cp12", "landlord gas safety", "domestic gas safety"],
    steps: [
      cp12HeaderStep,
      cp12ClientInstallationDetails,
      {
        key: "appliance_details",
        title: "Gas Appliances",
        table: {
          itemType: "appliance",
          fields: gasApplianceDetailsFields,
          required: true,
          storageKey: "appliances",
        },
      },
      {
        key: "faults_remedial_actions",
        title: "Faults & Remedial Actions",
        fields: [
          f("no_faults_identified", "No faults identified", "select", {
            options: ["No", "Yes"],
            defaultValue: "No",
          }),
        ],
        table: {
          itemType: "fault",
          fields: gasFaultFields,
          required: false,
          storageKey: "faults",
        },
      },
      {
        key: "final_checks",
        title: "Final Checks",
        fields: [
          f("gas_tightness_test", "Gas tightness test", "select", {
            options: ["Pass", "Fail", "N/A"],
            required: true,
          }),
          f(
            "gas_pipework_visual_inspection",
            "Gas pipework visual inspection satisfactory",
            "select",
            { options: ["Yes", "No", "N/A"], required: true },
          ),
          f(
            "emergency_control_accessible",
            "Emergency control accessible",
            "select",
            { options: ["Yes", "No", "N/A"], required: true },
          ),
          f(
            "equipotential_bonding_satisfactory",
            "Equipotential bonding satisfactory",
            "select",
            { options: ["Yes", "No", "N/A"], required: true },
          ),
          f(
            "installation_satisfactory",
            "Installation satisfactory/pass",
            "select",
            {
              options: ["Yes", "No", "N/A"],
              required: true,
            },
          ),
          f("next_inspection_due", "Next inspection due on or before", "date", {
            required: true,
          }),
          f("co_alarm_fitted", "Carbon monoxide alarm fitted", "select", {
            options: ["Yes", "No", "N/A"],
            required: true,
          }),
          f("co_alarm_working", "Carbon monoxide alarm working", "select", {
            options: ["Yes", "No", "N/A"],
          }),
          f("smoke_alarm_fitted", "Smoke alarm fitted", "select", {
            options: ["Yes", "No", "N/A"],
            required: true,
          }),
          f("smoke_alarm_working", "Smoke alarm working", "select", {
            options: ["Yes", "No", "N/A"],
          }),
        ],
      },
      {
        key: "declaration",
        title: "Declaration & Signature",
        fields: [
          f("engineer_name", "Engineer name", "text", {
            readOnly: true,
          }),

          f("engineer_address", "Engineer address", "textarea", {
            readOnly: true,
          }),

          f("engineer_postcode", "Engineer postcode", "text", {
            readOnly: true,
          }),

          f(
            "engineer_gas_safe_number",
            "Gas Safe registration number",
            "text",
            {
              readOnly: true,
            },
          ),

          f("engineer_phone", "Engineer phone number", "text", {
            readOnly: true,
          }),
          f(
            "customer_unavailable_to_sign",
            "Customer unavailable to sign",
            "select",
            { options: ["No", "Yes"], defaultValue: "No" },
          ),
          f(
            "customer_unavailable_reason",
            "Reason customer unavailable to sign",
            "textarea",
          ),
          f("customer_signature", "Customer/Landlord signature", "signature", {
            signatureType: "customer",
          }),
          f("engineer_signature", "Engineer signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
        ],
      },
    ],
  },
  {
    type: "gas_breakdown",
    title: "Gas Breakdown / Servicing Record",
    shortTitle: "Gas Breakdown / Servicing Record",
    templateMatchers: ["gas breakdown", "gas servicing record"],

    steps: [
      // =====================================================
      // STEP 1
      // =====================================================

      cp12HeaderStep,
      cp12ClientInstallationDetails,
      // =====================================================
      // STEP 3
      // =====================================================
      {
        key: "appliance_details",
        title: "Appliance Details",
        fields: [
          {
            key: "type_of_work",
            label: "Type of Work",
            type: "select",
            options: ["Service", "Breakdown"],
            required: true,
          },
          {
            key: "boiler_make",
            label: "Boiler Make",
            type: "text",
            required: false,
          },
          {
            key: "boiler_model",
            label: "Boiler Model",
            type: "text",
            required: false,
          },
          {
            key: "boiler_serial_number",
            label: "Serial Number",
            type: "text",
            required: false,
          },
          {
            key: "appliance_make",
            label: "Appliance Make",
            type: "text",
            required: false,
          },
          {
            key: "appliance_model",
            label: "Appliance Model",
            type: "text",
            required: false,
          },
          {
            key: "appliance_serial_number",
            label: "Serial No",
            type: "text",
            required: false,
          },
          {
            key: "co_reading",
            label: "CO Reading",
            type: "decimal",
            unit: "ppm",
            required: false,
          },
          {
            key: "co2_reading",
            label: "CO2 Reading",
            type: "decimal",
            unit: "%",
            required: false,
          },
        ],
      },
      // =====================================================
      // STEP 4
      // =====================================================
      {
        key: "preliminary_checks_1",
        title: "Preliminary Checks",
        fields: [
          {
            key: "flue_atmospheric_fan_assisted",
            label: "Flue / Atmospheric / Fan Assisted / Fan Dilution",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "ventilation_size_hl",
            label: "Ventilation Size / HL",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "water_fuel_sound",
            label: "Water / Fuel Sound",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "electrically_fused",
            label: "Electrically Fused",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "correct_valving_arrangements",
            label: "Correct Valving Arrangements",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "isolation_available",
            label: "Isolation Available - Electrical / Fuel",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "boiler_plantroom_clean_clear",
            label: "Boiler Plantroom Clean and Clear",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
        ],
      },

      // =====================================================
      // STEP 5
      // =====================================================
      {
        key: "preliminary_checks_2",
        title: "Preliminary Checks",
        fields: [
          {
            key: "heat_exchanger",
            label: "Heat Exchanger",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "ignition",
            label: "Ignition",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "gas_valve",
            label: "Gas Valve",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "fan",
            label: "Fan",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "safety_device",
            label: "Safety Device",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "control_box",
            label: "Control Box",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "burners_and_pilot",
            label: "Burners and Pilot",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "fuel_pressure_and_type",
            label: "Fuel Pressure and Type",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
        ],
      },
      // =====================================================
      // STEP 6
      // =====================================================
      {
        key: "service_operations",
        title: "Service Operations",
        fields: [
          {
            key: "burner_washed_cleaned",
            label: "Burner Washed and Cleaned",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "pilot_assembly_cleaned_adjusted",
            label: "Pilot Assembly Cleaned and Adjusted",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "ignition_system_cleaned_adjusted",
            label: "Ignition System Cleaned and Adjusted",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "burner_fan_airways_cleaned",
            label: "Burner Fan and Airways Cleaned",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "heat_exchanger_flueways_clean_clear",
            label: "Heat Exchanger / Flueways Clean and Clear",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "fuel_electrical_supply_sound",
            label: "Fuel and Electrical Supply Connected and Sound",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "interlocks_in_place",
            label: "Interlocks in Place",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
        ],
      },
      {
        key: "notes_readings",
        title: "Notes & Readings",
        fields: [
          {
            key: "additional_notes",
            label: "Additional Notes",
            type: "textarea",
            required: false,
          },
          {
            key: "spares_required",
            label: "Spares Required",
            type: "textarea",
            required: false,
          },
          {
            key: "co_co2_ratio",
            label: "CO/CO2 Ratio",
            type: "decimal",
            required: false,
          },
        ],
      },
      {
        key: "declaration",
        title: "Declaration & Signature",
        fields: [
          f("engineer_name", "Engineer name", "text", {
            readOnly: true,
          }),

          f("engineer_address", "Engineer address", "textarea", {
            readOnly: true,
          }),

          f("engineer_postcode", "Engineer postcode", "text", {
            readOnly: true,
          }),

          f(
            "engineer_gas_safe_number",
            "Gas Safe registration number",
            "text",
            {
              readOnly: true,
            },
          ),

          f("engineer_phone", "Engineer phone number", "text", {
            readOnly: true,
          }),

          f(
            "customer_unavailable_to_sign",
            "Customer unavailable to sign",
            "select",
            {
              options: ["No", "Yes"],
              defaultValue: "No",
            },
          ),

          f(
            "customer_unavailable_reason",
            "Reason customer unavailable to sign",
            "textarea",
          ),

          f("customer_signature", "Customer/Landlord signature", "signature", {
            signatureType: "customer",
          }),

          f("engineer_signature", "Engineer signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
        ],
      },
    ],
  },
  {
    type: "gas_warning_notice",
    shortTitle: "Warning Notice",
    title: "Gas Warning Notice",
    templateMatchers: ["gas warning notice", "warning notice"],

    steps: [
      // =====================================================
      // STEP 1 - SAME AS CP12
      // =====================================================
      cp12HeaderStep,

      // =====================================================
      // STEP 2 - SAME AS CP12
      // =====================================================
      cp12ClientInstallationDetails,

      // =====================================================
      // STEP 3 - WARNING / APPLIANCE DETAILS
      // Screens 1-4 from your photos
      // =====================================================
      {
        key: "warning_appliance_details",
        title: "Gas Warning Details",
        fields: [
          {
            key: "gas_escape_detected",
            label:
              "An escape of gas has been detected on the installation, the supply has now been turned off, disconnected and made safe",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },

          // -------------------------------------------------
          // THE GAS APPLIANCE / GAS INSTALLATION
          // -------------------------------------------------
          {
            key: "location",
            label: "Location",
            type: "select",
            required: true,
            options: [
              "Garage",
              "Living room",
              "Kitchen",
              "Utility room",
              "Hallway",
              "Airing cupboard",
              "Landing",
              "Bathroom",
              "Bedroom",
              "Loft",
              "Other",
            ],
          },
          {
            key: "appliance_type",
            label: "Type",
            type: "text",
            required: false,
          },
          {
            key: "make",
            label: "Make",
            type: "text",
            required: false,
          },
          {
            key: "model",
            label: "Model",
            type: "text",
            required: false,
          },
          {
            key: "serial_number",
            label: "Serial No",
            type: "text",
            required: false,
          },
          {
            key: "installation_details",
            label: "Installation Details",
            type: "textarea",
            required: false,
          },

          // -------------------------------------------------
          // IMMEDIATELY DANGEROUS
          // -------------------------------------------------
          {
            key: "immediately_dangerous_reason",
            label:
              "Is Immediately Dangerous (ID) And Should Not Be Used Because",
            type: "textarea",
            required: false,
          },
          {
            key: "id_disconnected_warning_label",
            label:
              "A) With your permission it has been disconnected from the GAS SUPPLY and the WARNING LABEL attached",
            type: "select",
            options: ["Yes", "N/A"],
            required: false,
          },
          {
            key: "id_refused_warning_label",
            label:
              "B) As you have refused to allow it to be made safe, a WARNING LABEL has been attached",
            type: "select",
            options: ["Yes", "N/A"],
            required: false,
          },

          // -------------------------------------------------
          // AT RISK
          // -------------------------------------------------
          {
            key: "at_risk_reason",
            label: "Is At Risk (AR) Because",
            type: "textarea",
            required: false,
          },
          {
            key: "at_risk_turned_off_warning_label",
            label: "And has been turned off and a Warning Label attached",
            type: "select",
            options: ["Yes", "N/A"],
            required: false,
          },
          {
            key: "at_risk_refused_danger_label",
            label:
              "As you have refused it to be made safe, it has a DANGER DO NOT USE label attached",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "further_investigation_required",
            label:
              "Turning off will not reduce the risk. Please contact the following to undertake further investigation",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },

          {
            key: "contact_name",
            label: "Name",
            type: "text",
            required: false,
          },
          {
            key: "contact_telephone",
            label: "Telephone",
            type: "text",
            required: false,
          },
          {
            key: "gas_emergency_reference",
            label: "Gas Emergency Contact Centre Reference",
            type: "text",
            required: false,
          },

          {
            key: "riddor_reportable",
            label:
              "RIDDOR: The unsafe situation(s) identified is reportable to the Health and Safety Executive (HSE) under RIDDOR",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },

          {
            key: "remedial_action_taken",
            label: "Remedial Action Taken",
            type: "textarea",
            required: false,
          },
        ],
      },

      // =====================================================
      // STEP 4 - SIGNATURE
      // Screen 5 from your photo
      // =====================================================
      {
        key: "declaration",
        title: "Signature",
        fields: [
          {
            key: "data_protection",
            label: "Data Protection",
            type: "checkbox",
            required: false,
          },

          {
            key: "gas_user_name",
            label: "Name",
            type: "text",
            required: false,
          },

          {
            key: "gas_user_signature",
            label: "Sign",
            type: "signature",
            signatureType: "customer",
            required: false,
          },

          {
            key: "date_signed",
            label: "Date Signed",
            type: "date",
            required: true,
          },

          {
            key: "gas_user_not_present",
            label:
              "The Gas User Is Not Present At The Time Of This Visit And Where Appropriate, (IMMEDIATELY DANGEROUS or AT RISK Situation) The Installation Has Been Made Safe",
            type: "select",
            options: ["Yes", "N/A"],
            required: false,
          },
        ],
      },
    ],
  },
  {
    type: "gas_service_maintenance",
    shortTitle: "Service Checklist",
    title: "Gas Service / Maintenance Check List",
    templateMatchers: [
      "gas service maintenance",
      "gas service / maintenance",
      "service checklist",
    ],

    steps: [
      // =====================================================
      // STEP 1 - SAME AS CP12
      // =====================================================
      cp12HeaderStep,

      // =====================================================
      // STEP 2 - SAME AS CP12
      // =====================================================
      cp12ClientInstallationDetails,

      // =====================================================
      // STEP 3 - APPLIANCE DETAILS
      // YOUR IMAGE 1
      // =====================================================
      {
        key: "appliance_details",
        title: "Appliance Details",
        fields: [
          {
            key: "service",
            label: "Service",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "maintenance",
            label: "Maintenance",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },

          {
            key: "location",
            label: "Location",
            type: "select",
            required: true,
            options: [
              "Garage",
              "Living room",
              "Kitchen",
              "Utility room",
              "Hallway",
              "Airing cupboard",
              "Landing",
              "Bathroom",
              "Bedroom",
              "Loft",
              "Other",
            ],
          },
          {
            key: "appliance_type",
            label: "Type",
            type: "text",
            required: false,
          },
          {
            key: "make",
            label: "Make",
            type: "text",
            required: false,
          },
          {
            key: "model",
            label: "Model",
            type: "text",
            required: false,
          },

          {
            key: "co_reading",
            label: "CO Reading",
            type: "decimal",
            required: false,
          },
          {
            key: "co2_reading",
            label: "CO2 Reading",
            type: "decimal",
            required: false,
          },
          {
            key: "co_co2_ratio",
            label: "CO/CO2 Ratio",
            type: "decimal",
            required: false,
          },

          {
            key: "gas_tightness_test_carried_out",
            label: "Gas tightness test carried out",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "gas_tightness_test_pass",
            label: "Gas tightness test pass?",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
        ],
      },

      // =====================================================
      // STEP 4 - GAS SERVICE / MAINTENANCE CHECK LIST
      // YOUR IMAGES 2, 3 AND 4
      // =====================================================
      {
        key: "service_maintenance_checks",
        title: "Gas Service / Maintenance Check List",
        fields: [
          {
            key: "burner_injectors",
            label: "Burner/Injectors",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "burner_injectors_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "heat_exchanger",
            label: "Heat Exchanger",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "heat_exchanger_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "ignition",
            label: "Ignition",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "ignition_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "electrics",
            label: "Electrics",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "electrics_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "control",
            label: "Control",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "control_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "gas_water_leaks",
            label: "Gas/Water Leaks",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "gas_water_leaks_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "gas_connections",
            label: "Gas Connections",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "gas_connections_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "seals_appliance_case",
            label: "Seals (Appliance Case Etc.)",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "seals_appliance_case_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "gas_pipework",
            label: "Gas Pipework",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "gas_pipework_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "fans",
            label: "Fan(s)",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "fans_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "fireplace_opening_void",
            label: "Fireplace Opening/Void",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "fireplace_opening_void_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "closure_plate",
            label: "Closure Plate",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "closure_plate_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "flame_picture",
            label: "Flame Picture",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "flame_picture_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "appliance_location_check",
            label: "Location",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "appliance_location_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "stability",
            label: "Stability",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "stability_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "return_air_plenum",
            label: "Return Air/Plenum",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "return_air_plenum_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },
        ],
      },

      // =====================================================
      // STEP 5 - SAFETY CHECKS
      // YOUR IMAGES 5 AND 6
      // =====================================================
      {
        key: "safety_checks",
        title: "Safety Checks",
        fields: [
          {
            key: "ventilation",
            label: "Ventilation",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "ventilation_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "flue_termination",
            label: "Flue Termination",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "flue_termination_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "flue_flow_test",
            label: "Flue Flow Test",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "flue_flow_test_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "spillage_test",
            label: "Spillage Test",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "spillage_test_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "inlet_working_pressure",
            label: "Inlet Working Pressure",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "inlet_working_pressure_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "safety_devices",
            label: "Safety Device(s)",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "safety_devices_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },

          {
            key: "burner_pressure",
            label: "Burner Pressure",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },
          {
            key: "burner_pressure_defect",
            label: "Remedial Action/Nature Of Defect",
            type: "text",
            required: false,
          },
        ],
      },

      // =====================================================
      // STEP 6 - FINDINGS
      // YOUR IMAGE 7
      // =====================================================
      {
        key: "findings",
        title: "Findings",
        fields: [
          {
            key: "appliance_installation_safe_to_use",
            label: "Is Appliance/Installation Safe To Use?",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },

          {
            key: "warning_notice_completed",
            label:
              "If No, has a warning notice been completed and a warning label attached?",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },

          {
            key: "installation_conforms",
            label:
              "Does the installation conform to the requirements of manufacturers instructions/installations standards?",
            type: "select",
            options: ["Yes", "No", "N/A"],
            required: false,
          },

          {
            key: "remedial_work_required",
            label: "The following remedial work is required",
            type: "textarea",
            required: false,
          },
        ],
      },

      // =====================================================
      // STEP 7 - SIGNATURE
      // YOUR IMAGE 8
      // =====================================================
      {
        key: "declaration",
        title: "Signature",
        fields: [
          {
            key: "data_protection",
            label: "Data Protection",
            type: "checkbox",
            required: false,
          },

          {
            key: "customer_declaration",
            label: "Customer Declaration",
            type: "textarea",
            required: false,
          },

          {
            key: "customer_signature",
            label: "Signature",
            type: "signature",
            signatureType: "customer",
            required: false,
          },
        ],
      },
    ],
  },

  {
    type: "commercial_gas_safety",
    shortTitle: "Commercial Gas",
    title: "Gas Safety Record (Commercial)",
    templateMatchers: ["commercial gas safety", "gas safety record commercial"],
    steps: [
      gasPropertyAndParties,
      {
        key: "installation_details",
        title: "Installation Details",
        fields: [
          f("gas_type", "Gas type", "select", {
            options: ["Natural Gas", "LPG"],
            required: true,
          }),
          f("meter_make_serial", "Meter make/serial", "text"),
          f("meter_location", "Meter location", "text"),
          f(
            "emergency_control_valve_location",
            "Emergency control valve location",
            "text",
          ),
          f("pipework_material", "Pipework material", "select", {
            options: ["Steel", "Copper", "PE", "Other"],
          }),
          f("pipework_size", "Pipework size (mm)", "decimal"),
        ],
      },
      {
        key: "appliance_details",
        title: "Appliance Details",
        table: {
          itemType: "appliance",
          fields: gasApplianceDetailsFields,
          required: true,
          storageKey: "appliances",
        },
      },
      {
        key: "inspection_results",
        title: "Inspection Results",
        table: {
          itemType: "inspection",
          fields: gasInspectionResultsFields,
          required: true,
          storageKey: "inspection_results",
        },
      },
      {
        key: "tightness_test",
        title: "Tightness Test",
        fields: [
          f("mop", "MOP (mbar)", "decimal"),
          f("test_pressure", "Test pressure (mbar)", "decimal"),
          f("let_by_test_result", "Let-by test result", "select", {
            options: ["Pass", "Fail"],
          }),
          f("stabilisation_period", "Stabilisation period (min)", "number"),
          f("test_duration", "Test duration (min)", "number"),
          f(
            "permitted_pressure_drop",
            "Permitted pressure drop (mbar)",
            "decimal",
          ),
          f("actual_pressure_drop", "Actual pressure drop (mbar)", "decimal"),
          f("overall_result", "Overall result", "select", {
            options: ["Pass", "Fail"],
          }),
        ],
      },
      {
        key: "declaration",
        title: "Declaration",
        fields: [
          f("engineer_signature", "Engineer signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
          f("customer_name", "Customer name", "text"),
          f("customer_signature", "Customer signature", "signature", {
            signatureType: "customer",
          }),
          f("next_inspection_date", "Next inspection date", "date"),
        ],
      },
    ],
  },
  {
    type: "gas_installation_safety",
    shortTitle: "Install Safety",
    title: "Gas Installation Safety Record",
    templateMatchers: ["gas installation safety", "installation safety record"],
    steps: [
      gasPropertyAndParties,
      {
        key: "pipework_details",
        title: "Pipework Details",
        table: {
          itemType: "pipework",
          fields: [
            f("section_location", "Section/location", "text", {
              required: true,
            }),
            f("material", "Material", "select", {
              options: ["Steel", "Copper", "PE", "Other"],
              required: true,
            }),
            f("diameter", "Diameter (mm)", "decimal", { required: true }),
            f("length", "Length (m)", "decimal", { required: true }),
            f(
              "bonding_labelling_correct",
              "Bonding/labelling correct?",
              "boolean",
            ),
          ],
          required: true,
          storageKey: "pipework_details",
        },
      },
      {
        key: "meter_controls",
        title: "Meter & Controls",
        fields: [
          f("meter_make_serial", "Meter make/serial", "text"),
          f("meter_type", "Meter type", "select", {
            options: ["U6/Diaphragm", "Rotary", "Turbine", "Other"],
          }),
          f(
            "emergency_control_valve_accessible",
            "Emergency control valve accessible?",
            "boolean",
          ),
          f("regulator_make_pressure", "Regulator make/pressure", "text"),
        ],
      },
      {
        key: "tightness_test",
        title: "Tightness Test",
        fields: [
          f("mop", "MOP (mbar)", "decimal"),
          f("test_pressure", "Test pressure (mbar)", "decimal"),
          f("let_by_test_result", "Let-by test result", "select", {
            options: ["Pass", "Fail"],
          }),
          f("stabilisation_period", "Stabilisation period (min)", "number"),
          f("test_duration", "Test duration (min)", "number"),
          f(
            "permitted_pressure_drop",
            "Permitted pressure drop (mbar)",
            "decimal",
          ),
          f("actual_pressure_drop", "Actual pressure drop (mbar)", "decimal"),
          f("overall_result", "Overall result", "select", {
            options: ["Pass", "Fail"],
          }),
        ],
      },
      {
        key: "declaration",
        title: "Declaration",
        fields: [
          f("engineer_signature", "Engineer signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
          f("date", "Date", "date", { required: true }),
        ],
      },
    ],
  },
  {
    type: "commercial_catering_inspection",
    shortTitle: "Catering Inspection",
    title: "Commercial Catering Inspection Record",
    templateMatchers: ["commercial catering inspection", "catering inspection"],
    steps: [
      gasPropertyAndParties,
      {
        key: "kitchen_ventilation_details",
        title: "Kitchen/Ventilation Details",
        fields: [
          f("ventilation_system_type", "Ventilation system type", "select", {
            options: [
              "Natural",
              "Mechanical extract",
              "Mechanical supply & extract",
            ],
            required: true,
          }),
          f("gas_interlock_fitted", "Gas interlock fitted?", "boolean"),
          f("interlock_type", "Interlock type", "select", {
            options: ["Air pressure", "Air flow", "CO2/CO sensor", "None"],
          }),
          f("extraction_rate", "Extraction rate (m³/s)", "decimal"),
          f("air_flow_test_result", "Air flow test result", "select", {
            options: ["Pass", "Fail"],
          }),
          f("co_monitoring_in_place", "CO monitoring in place?", "boolean"),
        ],
      },
      {
        key: "catering_appliance_details",
        title: "Catering Appliance Details",
        table: {
          itemType: "appliance",
          fields: [
            f("location", "Location", "select", {
              required: true,
              options: [
                "Garage",
                "Living room",
                "Kitchen",
                "Utility room",
                "Hallway",
                "Airing cupboard",
                "Landing",
                "Bathroom",
                "Bedroom",
                "Loft",
                "Other",
              ],
            }),
            f("appliance_type", "Appliance type", "select", {
              options: [
                "Range",
                "Oven",
                "Fryer",
                "Griddle",
                "Boiling table",
                "Combi oven",
                "Other",
              ],
              required: true,
            }),
            f("make", "Make", "text"),
            f("model", "Model", "text"),
            f("flue_canopy_type", "Flue/canopy type", "select", {
              options: ["Direct", "Canopy", "Room sealed", "Flueless"],
            }),
          ],
          required: true,
          storageKey: "catering_appliances",
        },
      },
      {
        key: "inspection_results",
        title: "Inspection Results",
        table: {
          itemType: "inspection",
          fields: [
            ...gasInspectionResultsFields,
            f(
              "interlock_proves_before_gas_released",
              "Interlock proves before gas released?",
              "select",
              { options: ["Yes", "No", "N/A"] },
            ),
          ],
          required: true,
          storageKey: "inspection_results",
        },
      },
      {
        key: "declaration",
        title: "Declaration",
        fields: [
          f("engineer_signature", "Engineer signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
          f("customer_signature", "Customer signature", "signature", {
            signatureType: "customer",
          }),
          f("next_inspection_date", "Next inspection date", "date"),
        ],
      },
    ],
  },
  {
    type: "gas_testing_purging",
    shortTitle: "Testing & Purging",
    title: "Gas Testing and Purging",
    templateMatchers: ["gas testing", "purging"],
    steps: [
      gasPropertyAndParties,
      {
        key: "installation_data",
        title: "Installation Data",
        fields: [
          f("pipework_material", "Pipework material", "select", {
            options: ["Steel", "Copper", "PE", "Other"],
            required: true,
          }),
          f("pipe_diameter", "Pipe diameter (mm)", "decimal"),
          f("pipe_length", "Pipe length (m)", "decimal"),
          f("installation_volume", "Installation volume (m³)", "decimal"),
          f("gas_type", "Gas type", "select", {
            options: ["Natural Gas", "LPG"],
            required: true,
          }),
        ],
      },
      {
        key: "strength_tightness_test",
        title: "Strength/Tightness Test",
        fields: [
          f("test_medium", "Test medium", "select", {
            options: ["Air", "Nitrogen", "Gas"],
            required: true,
          }),
          f("test_pressure", "Test pressure (mbar)", "decimal"),
          f("stabilisation_period", "Stabilisation period (min)", "number"),
          f("test_duration", "Test duration (min)", "number"),
          f(
            "permitted_pressure_drop",
            "Permitted pressure drop (mbar)",
            "decimal",
          ),
          f("actual_pressure_drop", "Actual pressure drop (mbar)", "decimal"),
          f("let_by_test", "Let-by test", "select", {
            options: ["Pass", "Fail"],
          }),
          f("tightness_test_result", "Tightness test result", "select", {
            options: ["Pass", "Fail"],
          }),
        ],
      },
      {
        key: "purging",
        title: "Purging",
        fields: [
          f("purging_carried_out", "Purging carried out?", "boolean"),
          f("purge_method", "Purge method", "select", {
            options: [
              "Direct to atmosphere",
              "Purge to appliance",
              "Nitrogen purge",
            ],
          }),
          f("gas_detected_at_outlet", "Gas detected at outlet?", "boolean"),
        ],
      },
      {
        key: "declaration",
        title: "Declaration",
        fields: [
          f("engineer_signature", "Engineer signature", "signature", {
            required: true,
            signatureType: "engineer",
          }),
          f("date", "Date", "date", { required: true }),
        ],
      },
        ],
  },
];

const enabledCertificateTypes = new Set<ElectricalCertificateType>([
  "cp12",
  "gas_breakdown",
  "gas_warning_notice",
  "pat",
]);

export const electricalCertificates =
  allCertificateDefinitions.filter((definition) =>
    enabledCertificateTypes.has(definition.type),
  );

export function getElectricalDefinition(type?: string | null) {
  return (
    electricalCertificates.find((definition) => definition.type === type) ??
    null
  );
}

export function matchesElectricalTemplate(
  template: { template_key?: string; template_name?: string },
  definition: ElectricalCertificateDefinition,
) {
  const haystack =
    `${template.template_key ?? ""} ${template.template_name ?? ""}`
      .toLowerCase()
      .replace(/[_-]+/g, " ");
  return definition.templateMatchers.some((matcher) => {
    const normalized = matcher.toLowerCase().replace(/[_-]+/g, " ");
    return normalized.length <= 5
      ? new RegExp(
          `(^|[^a-z0-9])${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
        ).test(haystack)
      : haystack.includes(normalized);
  });
}
