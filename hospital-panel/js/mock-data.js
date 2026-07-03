// ============================================================
// ArogyaMitra Hospital Panel — Mock Data
// mock-data.js — All simulated patients, cases, AI results
// ============================================================

const MOCK_DB = {

  // ── Current Doctor ─────────────────────────────────────
  currentDoctor: {
    id: 'doc-001',
    name: 'Dr. Priya Sharma',
    role: 'doctor',
    specialty: 'General Medicine',
    facility_id: 'fac-001',
    facility_name: 'PHC Rampur, Uttar Pradesh',
    email: 'priya.sharma@arogyamitra.in',
    phone: '+91 98765 43210',
    reg_no: 'MCI-2018-UP-48321',
  },

  // ── Facilities ──────────────────────────────────────────
  facilities: [
    { id: 'fac-001', name: 'PHC Rampur', district: 'Rampur', level: 'PHC',   lat: 28.81, lng: 79.03, specialties: ['general'] },
    { id: 'fac-002', name: 'CHC Moradabad', district: 'Moradabad', level: 'CHC', lat: 28.83, lng: 78.77, specialties: ['general','radiology','surgery'] },
    { id: 'fac-003', name: 'District Hospital Bareilly', district: 'Bareilly', level: 'District', lat: 28.35, lng: 79.41, specialties: ['oncology','neurosurgery','cardiology','radiology'] },
    { id: 'fac-004', name: 'AIIMS Rishikesh', district: 'Dehradun', level: 'Tertiary', lat: 30.08, lng: 78.26, specialties: ['neurosurgery','oncology','cardiology','pulmonology'] },
  ],

  // ── Patients ─────────────────────────────────────────────
  patients: [
    {
      id: 'pat-001',
      name: 'Ramesh Kumar', age: 45, gender: 'M',
      village: 'Kashipur, UP', phone: '+91 94521 33210',
      abha_id: 'ABHA-2024-KA-48321',
      blood_group: 'B+',
      facility_id: 'fac-001',
      known_conditions: ['type_2_diabetes', 'hypertension'],
      allergies: ['penicillin'],
      current_tier: 'red',
      registered_at: '2024-03-10',
      language: 'Hindi',
    },
    {
      id: 'pat-002',
      name: 'Priya Devi', age: 32, gender: 'F',
      village: 'Bilaspur, UP', phone: '+91 98712 44100',
      abha_id: 'ABHA-2024-PR-12984',
      blood_group: 'O+',
      facility_id: 'fac-001',
      known_conditions: ['anaemia'],
      allergies: [],
      current_tier: 'red',
      registered_at: '2024-06-01',
      language: 'Hindi',
    },
    {
      id: 'pat-003',
      name: 'Anil Singh', age: 56, gender: 'M',
      village: 'Milak, UP', phone: '+91 91234 56789',
      abha_id: 'ABHA-2024-AN-77231',
      blood_group: 'A+',
      facility_id: 'fac-001',
      known_conditions: ['hypertension'],
      allergies: ['sulfa'],
      current_tier: 'orange',
      registered_at: '2023-11-15',
      language: 'Hindi',
    },
    {
      id: 'pat-004',
      name: 'Sunita Yadav', age: 29, gender: 'F',
      village: 'Chandausi, UP', phone: '+91 88991 23456',
      abha_id: 'ABHA-2024-SU-88456',
      blood_group: 'AB+',
      facility_id: 'fac-001',
      known_conditions: [],
      allergies: [],
      current_tier: 'orange',
      registered_at: '2024-01-20',
      language: 'Hindi',
    },
    {
      id: 'pat-005',
      name: 'Manoj Tiwari', age: 61, gender: 'M',
      village: 'Shahabad, UP', phone: '+91 99887 12345',
      abha_id: 'ABHA-2024-MA-54321',
      blood_group: 'B-',
      facility_id: 'fac-001',
      known_conditions: ['COPD', 'type_2_diabetes'],
      allergies: ['aspirin'],
      current_tier: 'orange',
      registered_at: '2023-07-05',
      language: 'Hindi',
    },
    {
      id: 'pat-006',
      name: 'Kavita Gupta', age: 38, gender: 'F',
      village: 'Amroha, UP', phone: '+91 97654 32109',
      abha_id: 'ABHA-2024-KA-66321',
      blood_group: 'O-',
      facility_id: 'fac-001',
      known_conditions: ['hypothyroidism'],
      allergies: [],
      current_tier: 'yellow',
      registered_at: '2024-02-14',
      language: 'Hindi',
    },
    {
      id: 'pat-007',
      name: 'Vijay Mishra', age: 52, gender: 'M',
      village: 'Suar, UP', phone: '+91 91111 22233',
      abha_id: 'ABHA-2024-VI-44521',
      blood_group: 'A-',
      facility_id: 'fac-001',
      known_conditions: ['hypertension'],
      allergies: [],
      current_tier: 'yellow',
      registered_at: '2023-09-22',
      language: 'Hindi',
    },
    {
      id: 'pat-008',
      name: 'Anita Maurya', age: 26, gender: 'F',
      village: 'Tanda, UP', phone: '+91 86543 21098',
      abha_id: 'ABHA-2024-AN-99871',
      blood_group: 'B+',
      facility_id: 'fac-001',
      known_conditions: [],
      allergies: [],
      current_tier: 'yellow',
      registered_at: '2024-05-10',
      language: 'Hindi',
    },
    {
      id: 'pat-009',
      name: 'Rajan Verma', age: 43, gender: 'M',
      village: 'Rampur Sadar', phone: '+91 77665 54321',
      abha_id: 'ABHA-2024-RA-11123',
      blood_group: 'AB-',
      facility_id: 'fac-001',
      known_conditions: ['type_2_diabetes'],
      allergies: [],
      current_tier: 'green',
      registered_at: '2024-04-01',
      language: 'Hindi',
    },
    {
      id: 'pat-010',
      name: 'Meera Sharma', age: 35, gender: 'F',
      village: 'Bilari, UP', phone: '+91 98234 56781',
      abha_id: 'ABHA-2024-ME-32100',
      blood_group: 'O+',
      facility_id: 'fac-001',
      known_conditions: [],
      allergies: [],
      current_tier: 'green',
      registered_at: '2024-03-25',
      language: 'Hindi',
    },
  ],

  // ── Vitals ─────────────────────────────────────────────
  vitals: {
    'pat-001': {
      spo2: 84, temp: 38.4, bp_sys: 145, bp_dia: 92, hr: 102, rr: 22,
      history: [
        { date: '2024-06-25', spo2: 97, temp: 37.1, bp_sys: 138, bp_dia: 88, hr: 78 },
        { date: '2024-06-28', spo2: 94, temp: 37.8, bp_sys: 140, bp_dia: 90, hr: 82 },
        { date: '2024-07-01', spo2: 90, temp: 38.1, bp_sys: 142, bp_dia: 91, hr: 88 },
        { date: '2024-07-02', spo2: 84, temp: 38.4, bp_sys: 145, bp_dia: 92, hr: 102 },
      ]
    },
    'pat-002': {
      spo2: 96, temp: 39.1, bp_sys: 118, bp_dia: 76, hr: 108, rr: 20,
      history: [
        { date: '2024-07-01', spo2: 97, temp: 37.5, bp_sys: 116, bp_dia: 74, hr: 88 },
        { date: '2024-07-02', spo2: 96, temp: 39.1, bp_sys: 118, bp_dia: 76, hr: 108 },
      ]
    },
    'pat-003': {
      spo2: 97, temp: 37.2, bp_sys: 152, bp_dia: 98, hr: 76, rr: 16,
      history: [
        { date: '2024-06-20', spo2: 98, temp: 36.9, bp_sys: 148, bp_dia: 95, hr: 74 },
        { date: '2024-06-28', spo2: 97, temp: 37.1, bp_sys: 150, bp_dia: 96, hr: 75 },
        { date: '2024-07-02', spo2: 97, temp: 37.2, bp_sys: 152, bp_dia: 98, hr: 76 },
      ]
    },
    'pat-004': { spo2: 98, temp: 38.8, bp_sys: 122, bp_dia: 78, hr: 96, rr: 18, history: [] },
    'pat-005': { spo2: 92, temp: 37.6, bp_sys: 140, bp_dia: 88, hr: 84, rr: 19, history: [] },
    'pat-006': { spo2: 99, temp: 37.0, bp_sys: 118, bp_dia: 74, hr: 70, rr: 14, history: [] },
    'pat-007': { spo2: 98, temp: 37.3, bp_sys: 135, bp_dia: 85, hr: 72, rr: 15, history: [] },
    'pat-008': { spo2: 99, temp: 37.8, bp_sys: 110, bp_dia: 70, hr: 80, rr: 16, history: [] },
    'pat-009': { spo2: 99, temp: 37.1, bp_sys: 126, bp_dia: 80, hr: 68, rr: 14, history: [] },
    'pat-010': { spo2: 99, temp: 36.9, bp_sys: 114, bp_dia: 72, hr: 65, rr: 14, history: [] },
  },

  // ── Risk Flags / Cases ──────────────────────────────────
  cases: [
    {
      id: 'case-001',
      patient_id: 'pat-001',
      tier: 'red',
      source: 'cv_screening',
      symptom_summary: 'Suspected melanoma on right forearm. Skin CV scan result: 91% confidence. Low SpO2 at 84%.',
      cv_screening_id: 'cv-001',
      created_at: new Date(Date.now() - 3 * 60000).toISOString(),
      status: 'pending',
      aging_alert: false,
    },
    {
      id: 'case-002',
      patient_id: 'pat-002',
      tier: 'red',
      source: 'chatbot_flag',
      symptom_summary: 'Red-flag symptoms: severe chest pain with breathlessness, sweating for last 2 hours.',
      cv_screening_id: null,
      created_at: new Date(Date.now() - 7 * 60000).toISOString(),
      status: 'pending',
      aging_alert: false,
    },
    {
      id: 'case-003',
      patient_id: 'pat-003',
      tier: 'orange',
      source: 'cv_screening',
      symptom_summary: 'MRI uploaded — suspected mass. Brain MRI scan: 78% tumor probability (glioma).',
      cv_screening_id: 'cv-002',
      created_at: new Date(Date.now() - 22 * 60000).toISOString(),
      status: 'pending',
      aging_alert: false,
    },
    {
      id: 'case-004',
      patient_id: 'pat-004',
      tier: 'orange',
      source: 'chatbot_flag',
      symptom_summary: 'High fever (38.8°C) with chills, body ache, rash on trunk. Possible dengue.',
      cv_screening_id: null,
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      status: 'pending',
      aging_alert: false,
    },
    {
      id: 'case-005',
      patient_id: 'pat-005',
      tier: 'orange',
      source: 'cv_screening',
      symptom_summary: 'Chest X-ray uploaded — pneumonia 89%, possible TB 42%. COPD patient.',
      cv_screening_id: 'cv-003',
      created_at: new Date(Date.now() - 90 * 60000).toISOString(),
      status: 'pending',
      aging_alert: false,
    },
    {
      id: 'case-006',
      patient_id: 'pat-006',
      tier: 'yellow',
      source: 'manual_request',
      symptom_summary: 'Persistent fatigue, weight gain, cold intolerance. Thyroid follow-up.',
      cv_screening_id: null,
      created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
      status: 'pending',
      aging_alert: false,
    },
    {
      id: 'case-007',
      patient_id: 'pat-007',
      tier: 'yellow',
      source: 'follow_up_escalation',
      symptom_summary: 'BP not well controlled. Follow-up after medication adjustment.',
      cv_screening_id: null,
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
      status: 'pending',
      aging_alert: true,
    },
    {
      id: 'case-008',
      patient_id: 'pat-008',
      tier: 'yellow',
      source: 'cv_screening',
      symptom_summary: 'Skin lesion, low-grade concern. CV result: 62% eczema probability.',
      cv_screening_id: 'cv-004',
      created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
      status: 'pending',
      aging_alert: true,
    },
    {
      id: 'case-009',
      patient_id: 'pat-009',
      tier: 'green',
      source: 'manual_request',
      symptom_summary: 'Routine diabetes follow-up. HbA1c check. Patient doing well.',
      cv_screening_id: null,
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      status: 'pending',
      aging_alert: false,
    },
    {
      id: 'case-010',
      patient_id: 'pat-010',
      tier: 'green',
      source: 'manual_request',
      symptom_summary: 'General wellness check. No complaints.',
      cv_screening_id: null,
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      status: 'pending',
      aging_alert: false,
    },
  ],

  // ── CV Screenings / AI Results ──────────────────────────
  cvScreenings: {
    'cv-001': {
      id: 'cv-001',
      patient_id: 'pat-001',
      modality: 'skin',
      uploaded_by: 'patient',
      ai_findings: {
        top_class: 'melanoma',
        confidence: 0.91,
        probabilities: [
          { label: 'Melanoma', confidence: 0.91 },
          { label: 'Basal Cell Carcinoma', confidence: 0.05 },
          { label: 'Nevus (benign mole)', confidence: 0.03 },
          { label: 'Seborrheic Keratosis', confidence: 0.01 },
        ],
        tier: 'red',
        heatmap_note: 'Grad-CAM focused on irregular border and asymmetric pigmentation at lesion center.',
      },
      reviewed: false,
      doctor_assessment: null,
      created_at: new Date(Date.now() - 3 * 60000).toISOString(),
    },
    'cv-002': {
      id: 'cv-002',
      patient_id: 'pat-003',
      modality: 'brain_mri',
      uploaded_by: 'doctor',
      ai_findings: {
        segmentation: {
          tumor_detected: true,
          volume_cm3: 18.4,
          sub_regions: { enhancing_tumor: true, edema: true, necrotic_core: true },
          location: 'Left temporal lobe',
        },
        classification: {
          top_class: 'Glioma',
          confidence: 0.78,
          probabilities: [
            { label: 'Glioma', confidence: 0.78 },
            { label: 'Meningioma', confidence: 0.14 },
            { label: 'Pituitary Tumor', confidence: 0.05 },
            { label: 'No Tumor', confidence: 0.03 },
          ],
          grade_assessment: 'Features suggest high-grade (GBM-like) characteristics: ring enhancement, necrotic core.',
        },
        tier: 'orange',
        heatmap_note: 'Grad-CAM attention on ring-enhancing mass with surrounding T2-FLAIR hyperintensity.',
      },
      reviewed: false,
      doctor_assessment: null,
      created_at: new Date(Date.now() - 22 * 60000).toISOString(),
    },
    'cv-003': {
      id: 'cv-003',
      patient_id: 'pat-005',
      modality: 'chest_xray',
      uploaded_by: 'doctor',
      ai_findings: {
        findings: [
          { condition: 'Pneumonia', probability: 0.89, region: 'Right lower lobe', severity: 'moderate' },
          { condition: 'Tuberculosis', probability: 0.42, region: 'Bilateral apical', severity: 'possible' },
          { condition: 'Cardiomegaly', probability: 0.12, region: 'Cardiac silhouette', severity: 'borderline' },
          { condition: 'Pleural Effusion', probability: 0.08, region: 'Costophrenic angle', severity: 'minimal' },
          { condition: 'Normal', probability: 0.11 },
        ],
        overall_tier: 'orange',
        tb_flag: true,
        tb_recommendation: 'TB probability > 40%. Recommend: Sputum AFB smear + GeneXpert test.',
      },
      reviewed: false,
      doctor_assessment: null,
      created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    },
    'cv-004': {
      id: 'cv-004',
      patient_id: 'pat-008',
      modality: 'skin',
      uploaded_by: 'patient',
      ai_findings: {
        top_class: 'Eczema',
        confidence: 0.62,
        probabilities: [
          { label: 'Eczema', confidence: 0.62 },
          { label: 'Psoriasis', confidence: 0.22 },
          { label: 'Fungal Infection', confidence: 0.10 },
          { label: 'Normal', confidence: 0.06 },
        ],
        tier: 'yellow',
        heatmap_note: 'Model focused on erythematous patches with scaling on flexural surfaces.',
      },
      reviewed: false,
      doctor_assessment: null,
      created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
  },

  // ── Prescriptions ─────────────────────────────────────────
  prescriptions: {
    'pat-001': [
      {
        id: 'rx-001',
        patient_id: 'pat-001',
        doctor_id: 'doc-001',
        medicines: [
          { name: 'Metformin', dosage: '500mg', frequency: 'twice_daily', duration_days: 30, route: 'oral', instructions: 'Take after meals' },
          { name: 'Amlodipine', dosage: '5mg', frequency: 'once_daily', duration_days: 30, route: 'oral', instructions: 'Take in the morning' },
        ],
        notes: 'Monitor blood glucose weekly. Avoid high-sugar foods.',
        follow_up_days: 30,
        issued_at: '2024-06-25T10:00:00Z',
      }
    ],
    'pat-005': [
      {
        id: 'rx-002',
        patient_id: 'pat-005',
        doctor_id: 'doc-001',
        medicines: [
          { name: 'Salbutamol inhaler', dosage: '100mcg', frequency: 'as_needed', duration_days: 60, route: 'inhaled', instructions: '2 puffs when breathless, max 8 puffs/day' },
          { name: 'Budesonide inhaler', dosage: '200mcg', frequency: 'twice_daily', duration_days: 60, route: 'inhaled', instructions: 'Rinse mouth after each use' },
        ],
        notes: 'COPD management. Avoid smoke and dust. Flu vaccine recommended.',
        follow_up_days: 60,
        issued_at: '2024-06-20T11:30:00Z',
      }
    ],
  },

  // ── Patient History ────────────────────────────────────────
  history: {
    'pat-001': [
      { type: 'registration', date: '2024-03-10', summary: 'Patient registered at PHC Rampur. Known diabetic, hypertensive.' },
      { type: 'vitals', date: '2024-03-10', summary: 'BP: 148/90 mmHg, Fasting glucose: 186 mg/dL.' },
      { type: 'prescription', date: '2024-03-10', summary: 'Metformin 500mg BD, Amlodipine 5mg OD prescribed.' },
      { type: 'followup', date: '2024-04-10', summary: 'BP improved: 138/86. Glucose: 142 mg/dL. Continue medications.' },
      { type: 'cv_screening', date: '2024-06-25', summary: 'Skin screening: Suspicious lesion on right forearm. AI: 78% melanoma. Orange tier.' },
      { type: 'vitals', date: '2024-06-25', summary: 'SpO2 declining: 97% → 90%. Escalated to Red.' },
      { type: 'cv_screening', date: '2024-07-02', summary: 'Repeat skin scan: 91% melanoma confidence. Urgent referral recommended.' },
    ],
    'pat-003': [
      { type: 'registration', date: '2023-11-15', summary: 'Patient registered. Hypertensive. c/o headaches for 3 months.' },
      { type: 'vitals', date: '2023-11-15', summary: 'BP: 152/96. Started antihypertensives.' },
      { type: 'prescription', date: '2023-11-15', summary: 'Telmisartan 40mg OD prescribed.' },
      { type: 'followup', date: '2023-12-15', summary: 'Headaches worsening. Vision changes reported. BP: 150/94.' },
      { type: 'cv_screening', date: '2024-07-02', summary: 'MRI uploaded by doctor. AI: 78% glioma probability, 18.4 cm³ mass left temporal lobe.' },
    ],
    'pat-005': [
      { type: 'registration', date: '2023-07-05', summary: 'Known COPD, T2DM. Referred from CHC Moradabad.' },
      { type: 'prescription', date: '2023-07-05', summary: 'Salbutamol + Budesonide inhalers. Metformin 500mg BD.' },
      { type: 'followup', date: '2023-09-05', summary: 'COPD exacerbation. SpO2: 91%. Short course prednisolone added.' },
      { type: 'cv_screening', date: '2024-07-02', summary: 'Chest X-ray: Pneumonia 89%, TB 42%. Sputum test ordered.' },
    ],
  },

  // ── Area Disease Stats ─────────────────────────────────────
  areaStats: {
    weekly: [
      { week: 'Jun 3', fever: 24, respiratory: 18, skin: 9, diabetes: 12, tb: 3 },
      { week: 'Jun 10', fever: 31, respiratory: 22, skin: 11, diabetes: 14, tb: 4 },
      { week: 'Jun 17', fever: 28, respiratory: 25, skin: 8, diabetes: 11, tb: 6 },
      { week: 'Jun 24', fever: 35, respiratory: 28, skin: 14, diabetes: 15, tb: 7 },
      { week: 'Jul 1', fever: 42, respiratory: 31, skin: 12, diabetes: 13, tb: 8 },
    ],
    facilities: [
      { name: 'PHC Rampur', cases: 89, red: 4, orange: 12, yellow: 28, green: 45 },
      { name: 'CHC Moradabad', cases: 143, red: 8, orange: 22, yellow: 51, green: 62 },
      { name: 'PHC Bilaspur', cases: 56, red: 2, orange: 9, yellow: 19, green: 26 },
      { name: 'PHC Chandausi', cases: 71, red: 3, orange: 14, yellow: 25, green: 29 },
    ],
    mapClusters: [
      { lat: 28.81, lng: 79.03, disease: 'fever', count: 42, severity: 'high', block: 'Rampur Sadar' },
      { lat: 28.85, lng: 79.10, disease: 'tb', count: 8, severity: 'critical', block: 'Milak' },
      { lat: 28.78, lng: 79.15, disease: 'skin', count: 12, severity: 'medium', block: 'Kashipur' },
      { lat: 28.75, lng: 78.90, disease: 'respiratory', count: 31, severity: 'high', block: 'Tanda' },
      { lat: 28.88, lng: 79.05, disease: 'diabetes', count: 15, severity: 'medium', block: 'Shahabad' },
      { lat: 28.70, lng: 79.20, disease: 'fever', count: 18, severity: 'medium', block: 'Bilaspur' },
    ],
    topConditions: [
      { condition: 'Seasonal Fever', count: 42, change: +12, icon: '<i data-lucide="thermometer" style="width:24px;height:24px;"></i>' },
      { condition: 'Respiratory Illness', count: 31, change: +8, icon: '<i data-lucide="wind" style="width:24px;height:24px;"></i>' },
      { condition: 'Type 2 Diabetes', count: 15, change: +2, icon: '<i data-lucide="activity" style="width:24px;height:24px;"></i>' },
      { condition: 'Skin Conditions', count: 12, change: -3, icon: '<i data-lucide="microscope" style="width:24px;height:24px;"></i>' },
      { condition: 'Tuberculosis (Sus.)', count: 8, change: +5, icon: '<i data-lucide="alert-triangle" style="width:24px;height:24px;"></i>' },
    ],
  },

  // ── Drug Database (for interaction checks) ──────────────────
  drugInteractions: {
    'metformin+ibuprofen': {
      severity: 'moderate',
      message: 'NSAIDs (ibuprofen) may reduce renal function, affecting metformin clearance and increasing risk of lactic acidosis.',
      recommendation: 'Use paracetamol for pain relief instead. If NSAID necessary, monitor renal function closely.',
    },
    'metformin+alcohol': {
      severity: 'major',
      message: 'Alcohol combined with metformin significantly increases risk of lactic acidosis.',
      recommendation: 'Advise patient to avoid alcohol.',
    },
    'amlodipine+clarithromycin': {
      severity: 'moderate',
      message: 'Clarithromycin inhibits CYP3A4, increasing amlodipine plasma levels. Risk of hypotension.',
      recommendation: 'Monitor blood pressure closely. Consider dose reduction of amlodipine.',
    },
    'aspirin+warfarin': {
      severity: 'major',
      message: 'Combined antiplatelet + anticoagulant therapy significantly increases bleeding risk.',
      recommendation: 'Contraindicated unless under specialist supervision with close INR monitoring.',
    },
  },

  // ── Drug Autocomplete List ──────────────────────────────────
  drugs: [
    { name: 'Azithromycin', strengths: ['250mg', '500mg'], routes: ['oral'], frequencies: ['once_daily'] },
    { name: 'Amoxicillin', strengths: ['250mg', '500mg'], routes: ['oral'], frequencies: ['thrice_daily', 'twice_daily'] },
    { name: 'Paracetamol', strengths: ['500mg', '650mg', '1000mg'], routes: ['oral', 'rectal', 'IV'], frequencies: ['thrice_daily', 'four_times_daily', 'as_needed'] },
    { name: 'Ibuprofen', strengths: ['200mg', '400mg', '600mg'], routes: ['oral'], frequencies: ['twice_daily', 'thrice_daily', 'as_needed'] },
    { name: 'Metformin', strengths: ['500mg', '850mg', '1000mg'], routes: ['oral'], frequencies: ['once_daily', 'twice_daily', 'thrice_daily'] },
    { name: 'Amlodipine', strengths: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequencies: ['once_daily'] },
    { name: 'Telmisartan', strengths: ['20mg', '40mg', '80mg'], routes: ['oral'], frequencies: ['once_daily'] },
    { name: 'Omeprazole', strengths: ['10mg', '20mg', '40mg'], routes: ['oral', 'IV'], frequencies: ['once_daily', 'twice_daily'] },
    { name: 'Cetirizine', strengths: ['5mg', '10mg'], routes: ['oral'], frequencies: ['once_daily'] },
    { name: 'Doxycycline', strengths: ['100mg'], routes: ['oral'], frequencies: ['once_daily', 'twice_daily'] },
    { name: 'Salbutamol', strengths: ['2mg', '4mg', '100mcg (inhaler)'], routes: ['oral', 'inhaled'], frequencies: ['twice_daily', 'thrice_daily', 'as_needed'] },
    { name: 'Prednisolone', strengths: ['5mg', '10mg', '20mg', '40mg'], routes: ['oral'], frequencies: ['once_daily', 'twice_daily'] },
    { name: 'Atorvastatin', strengths: ['10mg', '20mg', '40mg', '80mg'], routes: ['oral'], frequencies: ['once_daily'] },
    { name: 'Aspirin', strengths: ['75mg', '150mg', '300mg', '500mg'], routes: ['oral'], frequencies: ['once_daily', 'as_needed'] },
    { name: 'ORS (Oral Rehydration Salts)', strengths: ['1 sachet'], routes: ['oral'], frequencies: ['as_needed'] },
    { name: 'Vitamin D3', strengths: ['60,000 IU'], routes: ['oral'], frequencies: ['weekly', 'once_daily'] },
    { name: 'Iron + Folic Acid', strengths: ['100mg + 0.5mg'], routes: ['oral'], frequencies: ['once_daily'] },
  ],

  // ── RAG Mock Responses ──────────────────────────────────────
  ragResponses: {
    'pneumonia treatment': {
      answer: `**Community-Acquired Pneumonia (CAP) — Clinical Management**

**First-line treatment (non-severe, outpatient):**
- Amoxicillin 500mg TDS × 5–7 days (drug of choice for typical CAP)
- Alternative for penicillin allergy: Doxycycline 100mg BD × 5 days or Azithromycin 500mg OD × 3–5 days

**Severity assessment (CURB-65 score):**
- C: Confusion, U: Urea >7 mmol/L, R: RR ≥30, B: BP <90/60, 65: Age ≥65
- Score 0–1: Outpatient. Score 2: Consider hospital. Score 3+: Hospital admission.

**When to refer:**
- SpO2 < 92%, bilateral involvement, CURB-65 ≥ 3, failure to improve in 48h

**Special considerations — Diabetic patients:**
- Higher risk of gram-negative coverage needed. Consider adding a fluoroquinolone (Levofloxacin 750mg OD) in diabetic patients with severe CAP.`,
      sources: ['WHO IMCI 2024, Chapter 4', 'ICMR CAP Guidelines 2023', 'British Thoracic Society CAP Guidelines'],
    },
    'glioma management': {
      answer: `**Glioma — Clinical Management & Referral Guidance**

**Immediate actions (suspected glioma on MRI):**
1. Urgent neurosurgical referral (within 24–48h for high-grade suspicion)
2. Dexamethasone 4mg QDS to reduce cerebral edema (if symptomatic)
3. Anti-seizure prophylaxis: Levetiracetam 500mg BD (if seizures present or at risk)
4. MRI with contrast (if not already done) — T1-Gd, T2-FLAIR, DWI

**Histopathological confirmation required:**
- Stereotactic biopsy or surgical resection for definitive diagnosis
- WHO Grade I-IV classification determines treatment

**Standard treatment (Grade III/IV — Glioblastoma):**
- Maximal safe surgical resection + RT (60 Gy in 30 fractions) + Temozolomide chemotherapy (Stupp protocol)

**Referral urgency:** EMERGENCY for new-onset seizures, herniation signs, or rapidly worsening deficits.`,
      sources: ['ESMO Clinical Practice Guidelines 2023', 'WHO Brain Tumor Classification 2021', 'AIIMS Neuro-Oncology Protocols'],
    },
    'tb diagnosis': {
      answer: `**Tuberculosis (TB) — Diagnostic Protocol**

**When X-ray shows TB probability >40%:**
1. **Sputum AFB smear** × 2 (spot + morning specimen)
2. **GeneXpert MTB/RIF** — preferred test in India (RNTCP protocol); gives result in 2 hours, detects rifampicin resistance
3. **Chest X-ray findings** suggestive of TB: apical infiltrates, cavitation, fibrosis, hilar lymphadenopathy

**NIKSHAY registration:** Mandatory on TB confirmation — notify district TB officer within 24h.

**First-line treatment (Drug-sensitive TB):**
- DOTS (2HRZE / 4HR): 2 months Isoniazid + Rifampicin + Pyrazinamide + Ethambutol, then 4 months Isoniazid + Rifampicin
- Total: 6 months. Free through government RNTCP program.

**Follow-up:** Sputum smear at 2, 5, and 6 months.`,
      sources: ['RNTCP National TB Elimination Programme 2024', 'WHO TB Treatment Guidelines 2022', 'ICMR TB Diagnostic Protocol'],
    },
    'drug interaction metformin ibuprofen': {
      answer: `**Drug Interaction: Metformin + Ibuprofen (NSAIDs)**

**Severity: ⚠️ Moderate**

**Mechanism:** NSAIDs reduce renal prostaglandin synthesis → decreased renal blood flow → reduced GFR → decreased metformin excretion → risk of metformin accumulation → lactic acidosis.

**Clinical significance:** Particularly important in elderly patients and those with pre-existing renal impairment.

**Recommendation:**
- Prefer Paracetamol 500–1000mg for pain/fever in diabetic patients on metformin
- If NSAID essential: Use lowest effective dose for shortest duration, monitor renal function (serum creatinine) after 3–5 days
- Hold metformin during acute illness if GFR falls below 45 mL/min/1.73m²

**Patient counselling:** Advise patient to avoid OTC ibuprofen.`,
      sources: ['British National Formulary (BNF) 2024', 'DrugBank Interaction Database', 'FDA Drug Safety Communication'],
    },
  },

  // ── AYUSH Formulations ──────────────────────────────────────
  ayushFormulations: [
    { code: 'NAMASTE-001', name: 'Sitopaladi Churna', indication: 'Mild upper respiratory symptoms, cough, cold', dose: '3g twice daily with honey', safety: 'Generally safe. Monitor in diabetics (contains sugar).' },
    { code: 'NAMASTE-002', name: 'Triphala Churna', indication: 'Constipation, digestive complaints', dose: '5g at bedtime with warm water', safety: 'Generally safe for long-term use.' },
    { code: 'NAMASTE-003', name: 'Ashwagandha (Withania somnifera)', indication: 'General weakness, fatigue, stress', dose: '300mg extract once daily with milk', safety: 'Avoid in pregnancy. May interact with thyroid medications.' },
    { code: 'NAMASTE-004', name: 'Tulsi (Ocimum sanctum) extract', indication: 'Mild fever, immune support', dose: '500mg twice daily', safety: 'Generally safe. Mild anticoagulant properties.' },
    { code: 'NAMASTE-005', name: 'Haritaki (Terminalia chebula)', indication: 'Digestive health, mild constipation', dose: '3g at night with warm water', safety: 'Generally safe.' },
  ],
};

// Helper functions
function getPatient(id) { return MOCK_DB.patients.find(p => p.id === id); }
function getCasesByTier(tier) { return MOCK_DB.cases.filter(c => c.tier === tier && c.status === 'pending'); }
function getAllPendingCases() { return MOCK_DB.cases.filter(c => c.status === 'pending'); }
function getCVScreening(id) { return MOCK_DB.cvScreenings[id]; }
function getVitals(patientId) { return MOCK_DB.vitals[patientId]; }
function getPrescriptions(patientId) { return MOCK_DB.prescriptions[patientId] || []; }
function getHistory(patientId) { return MOCK_DB.history[patientId] || []; }

function formatTimeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getTierLabel(tier) {
  const labels = { red: '🔴 RED', orange: '🟠 ORANGE', yellow: '🟡 YELLOW', green: '🟢 GREEN' };
  return labels[tier] || tier;
}

function getTierColor(tier) {
  return { red: 'var(--tier-red)', orange: 'var(--tier-orange)', yellow: 'var(--tier-yellow)', green: 'var(--tier-green)' }[tier] || '#fff';
}

function getVitalsStatus(vitals) {
  if (vitals.spo2 < 90) return 'critical';
  if (vitals.spo2 < 94 || vitals.temp > 39 || vitals.bp_sys > 160) return 'warning';
  return 'normal';
}
