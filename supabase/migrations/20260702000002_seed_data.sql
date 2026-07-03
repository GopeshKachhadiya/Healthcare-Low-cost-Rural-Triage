-- ============================================================
-- ANVAYA SUPABASE SEED / INSERT DATA
-- Run this after anvaya_001_schema.sql.
-- This inserts demo data for testing your FastAPI APIs.
-- ============================================================

-- ----------------------------
-- 1) Demo Facilities
-- ----------------------------

insert into facilities (id, name, type, capabilities, location, contact_phone)
values
(
  '11111111-1111-1111-1111-111111111111',
  'PHC Surat Rural',
  'phc',
  array['general','maternity','basic_checkup'],
  ST_SetSRID(ST_MakePoint(72.8311, 21.1702), 4326)::geography,
  '9876543210'
),
(
  '22222222-2222-2222-2222-222222222222',
  'District Hospital Surat',
  'district_hospital',
  array['icu','xray','emergency','mri'],
  ST_SetSRID(ST_MakePoint(72.8311, 21.1850), 4326)::geography,
  '9876500000'
),
(
  '33333333-3333-3333-3333-333333333333',
  'Sub Center Vesu',
  'sub_center',
  array['basic_checkup'],
  ST_SetSRID(ST_MakePoint(72.7700, 21.1410), 4326)::geography,
  '9876511111'
)
on conflict (id) do nothing;

-- ----------------------------
-- 2) Demo Patients
-- ----------------------------

insert into patients (
  id,
  full_name,
  dob,
  gender,
  phone,
  village,
  facility_id
)
values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Ramesh Patel',
  '1985-05-14',
  'male',
  '9876543210',
  'Vesu',
  '11111111-1111-1111-1111-111111111111'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Sita Ben',
  '1992-08-21',
  'female',
  '9876543211',
  'Surat Rural',
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

-- ----------------------------
-- 3) Demo Vitals
-- ----------------------------

insert into vitals_readings (
  id,
  patient_id,
  heart_rate,
  resp_rate,
  spo2,
  temp_c,
  systolic_bp,
  diastolic_bp,
  consciousness,
  can_walk_unassisted
)
values
(
  'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  125,
  28,
  88,
  39.5,
  90,
  60,
  'alert',
  true
),
(
  'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  82,
  18,
  97,
  37.0,
  118,
  78,
  'alert',
  true
)
on conflict (id) do nothing;

-- ----------------------------
-- 4) Demo Risk Flags
-- ----------------------------

insert into risk_flags (
  id,
  patient_id,
  vitals_id,
  score,
  tier,
  rationale
)
values
(
  'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
  80,
  'red',
  '{"reasons":["Low SpO2","High heart rate","High fever"],"source":"seed"}'::jsonb
),
(
  'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
  0,
  'green',
  '{"reasons":[],"source":"seed"}'::jsonb
)
on conflict (id) do nothing;

-- ----------------------------
-- 5) Demo Symptom Query
-- ----------------------------

insert into symptom_queries (
  id,
  patient_id,
  raw_text,
  language_code,
  translated_text,
  extracted_symptoms,
  red_flag_hit
)
values
(
  'aaaaaaaa-3333-3333-3333-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Mujhe tez bukhar aur saans lene me dikkat hai',
  'hi',
  'I have high fever and difficulty breathing',
  '{"symptoms":["fever","breathing difficulty"]}'::jsonb,
  true
)
on conflict (id) do nothing;

-- ----------------------------
-- 6) Demo CV Screening
-- ----------------------------

insert into cv_screenings (
  id,
  patient_id,
  modality,
  image_path,
  model_version,
  prediction,
  heatmap_path,
  flagged_for_review
)
values
(
  'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'skin_photo',
  'skin-photos/demo/ramesh_skin.jpg',
  'skin_screener_v1',
  '{"class":"needs_review","confidence":0.86}'::jsonb,
  'heatmaps/demo/ramesh_skin_heatmap.jpg',
  true
)
on conflict (id) do nothing;

-- ----------------------------
-- 7) Demo Appointment
-- ----------------------------

insert into appointments (
  id,
  patient_id,
  facility_id,
  priority_tier,
  source,
  cv_screening_id,
  symptom_summary,
  vitals_snapshot,
  status,
  scheduled_at
)
values
(
  'aaaaaaaa-5555-5555-5555-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'red',
  'chatbot_flag',
  null,
  'High fever, low SpO2, breathing difficulty',
  '{"spo2":88,"heart_rate":125,"temp_c":39.5}'::jsonb,
  'pending',
  now() + interval '2 hours'
)
on conflict (id) do nothing;

-- ----------------------------
-- 8) Demo Prescription
-- doctor_id is null here because health_workers require real Supabase Auth users.
-- ----------------------------

insert into prescriptions (
  id,
  patient_id,
  medicines,
  ayush_recommendation,
  notes,
  follow_up_days
)
values
(
  'aaaaaaaa-6666-6666-6666-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '[{"name":"Paracetamol","dose":"500mg","frequency":"twice daily","days":3}]'::jsonb,
  '{"recommendation":"Hydration and rest. Doctor review required if symptoms worsen."}'::jsonb,
  'Demo prescription. Replace with doctor-approved treatment.',
  7
)
on conflict (id) do nothing;

-- ----------------------------
-- 9) Demo Patient History
-- ----------------------------

insert into patient_history (
  id,
  patient_id,
  event_type,
  event_data,
  event_date
)
values
(
  'aaaaaaaa-7777-7777-7777-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'visit',
  '{"summary":"Initial triage visit created from seed data"}'::jsonb,
  current_date
)
on conflict (id) do nothing;

-- ----------------------------
-- 10) Demo Area Disease Stats
-- ----------------------------

insert into area_disease_stats (
  id,
  facility_id,
  disease_category,
  case_count,
  period_start,
  period_end,
  suppressed
)
values
(
  'aaaaaaaa-8888-8888-8888-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'fever_respiratory',
  12,
  current_date - interval '7 days',
  current_date,
  false
)
on conflict (id) do nothing;

-- ----------------------------
-- 11) Demo RAG Documents
-- embedding is null for now.
-- Add embeddings later from Python/n8n.
-- ----------------------------

insert into rag_documents (
  id,
  source,
  content,
  language_code
)
values
(
  'aaaaaaaa-9999-9999-9999-aaaaaaaaaaaa',
  'Demo Health Guide',
  'If SpO2 is below 90, the patient should receive urgent medical review.',
  'en'
),
(
  'bbbbbbbb-9999-9999-9999-bbbbbbbbbbbb',
  'Demo Triage Rule',
  'High fever with breathing difficulty is a red flag and should be escalated.',
  'en'
)
on conflict (id) do nothing;

-- ----------------------------
-- 12) Demo Consent Log
-- ----------------------------

insert into consent_log (
  id,
  patient_id,
  consent_type,
  granted
)
values
(
  'aaaaaaaa-aaaa-1111-1111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'data_storage',
  true
)
on conflict (id) do nothing;

-- ----------------------------
-- 13) Demo Referral
-- ----------------------------

insert into referrals (
  id,
  patient_id,
  from_facility,
  to_facility,
  department,
  urgency,
  reason,
  attached_data,
  status
)
values
(
  'aaaaaaaa-bbbb-1111-1111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Emergency',
  'emergency',
  'Low SpO2 and breathing difficulty',
  '{"risk_tier":"red","spo2":88}'::jsonb,
  'sent'
)
on conflict (id) do nothing;

-- ----------------------------
-- 14) Demo Teleconsult Session
-- ----------------------------

insert into teleconsult_sessions (
  id,
  patient_id,
  appointment_id,
  channel,
  started_at,
  ended_at,
  duration_minutes,
  doctor_notes
)
values
(
  'aaaaaaaa-cccc-1111-1111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-5555-5555-5555-aaaaaaaaaaaa',
  'video',
  now() - interval '30 minutes',
  now() - interval '10 minutes',
  20,
  'Demo teleconsult completed.'
)
on conflict (id) do nothing;

-- ----------------------------
-- 15) Demo Doctor Note
-- doctor_id is null for seed safety.
-- ----------------------------

insert into doctor_notes (
  id,
  patient_id,
  note_text,
  is_internal
)
values
(
  'aaaaaaaa-dddd-1111-1111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Internal demo note. Replace with real doctor notes.',
  true
)
on conflict (id) do nothing;

-- ----------------------------
-- 16) Demo Imaging Report
-- doctor_id is null for seed safety.
-- ----------------------------

insert into imaging_reports (
  id,
  cv_screening_id,
  patient_id,
  modality,
  ai_findings,
  doctor_assessment,
  doctor_agrees_with_ai,
  final_tier,
  recommendations
)
values
(
  'aaaaaaaa-eeee-1111-1111-aaaaaaaaaaaa',
  'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'skin_photo',
  '{"class":"needs_review","confidence":0.86}'::jsonb,
  'Pending doctor review',
  null,
  'yellow',
  'Schedule review with doctor.'
)
on conflict (id) do nothing;

-- ----------------------------
-- 17) Demo Follow Up
-- ----------------------------

insert into follow_ups (
  id,
  patient_id,
  source_type,
  source_id,
  scheduled_for,
  interval_days,
  channel,
  status,
  attempts
)
values
(
  'aaaaaaaa-ffff-1111-1111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'prescription',
  'aaaaaaaa-6666-6666-6666-aaaaaaaaaaaa',
  current_date + interval '7 days',
  7,
  'whatsapp',
  'scheduled',
  0
)
on conflict (id) do nothing;

-- ----------------------------
-- 18) Demo Model Registry
-- ----------------------------

insert into model_registry (
  id,
  model_key,
  display_name,
  architecture,
  modality,
  training_data,
  classes,
  size_mb,
  target_metric,
  deployment,
  is_active
)
values
(
  'aaaaaaaa-1212-1212-1212-aaaaaaaaaaaa',
  'skin_screener_v1',
  'Skin Screener',
  'MobileNetV2 transfer learning',
  'skin_photo',
  array['HAM10000','ISIC2019'],
  array['normal','needs_review','urgent'],
  18.5,
  'demo target accuracy 85%',
  'edge_function',
  true
),
(
  'bbbbbbbb-1212-1212-1212-bbbbbbbbbbbb',
  'xray_triage_v1',
  'X-Ray Triage',
  'CNN transfer learning',
  'xray',
  array['NIH ChestXray14'],
  array['normal','pneumonia_suspected','urgent'],
  35.0,
  'demo target accuracy 82%',
  'hf_spaces',
  true
)
on conflict (id) do nothing;

-- ----------------------------
-- 19) Demo Automation Event
-- ----------------------------

insert into automation_events (
  id,
  workflow_name,
  trigger_table,
  trigger_row_id,
  patient_id,
  status,
  channel,
  latency_ms,
  payload
)
values
(
  'aaaaaaaa-1313-1313-1313-aaaaaaaaaaaa',
  'red_flag_escalation',
  'risk_flags',
  'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'triggered',
  'whatsapp',
  1200,
  '{"message":"Red flag escalation demo event"}'::jsonb
)
on conflict (id) do nothing;

-- ----------------------------
-- 20) Demo Audit Log
-- actor_id is null for seed safety.
-- ----------------------------

insert into audit_log (
  id,
  table_name,
  row_id,
  action,
  before_data,
  after_data,
  reason
)
values
(
  'aaaaaaaa-1414-1414-1414-aaaaaaaaaaaa',
  'risk_flags',
  'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa',
  'insert',
  null,
  '{"tier":"red","score":80}'::jsonb,
  'Seed data inserted for demo'
)
on conflict (id) do nothing;

-- ----------------------------
-- 21) Optional: Create Health Worker
-- IMPORTANT:
-- health_workers.id must be a real Supabase Auth user id.
-- First create a user from Supabase Dashboard → Authentication → Users.
-- Then uncomment and replace AUTH_USER_ID_HERE.
-- ----------------------------

-- insert into health_workers (
--   id,
--   full_name,
--   role,
--   facility_id,
--   preferred_language
-- )
-- values (
--   'AUTH_USER_ID_HERE',
--   'Demo Doctor',
--   'doctor',
--   '11111111-1111-1111-1111-111111111111',
--   'hi'
-- )
-- on conflict (id) do nothing;

-- ----------------------------
-- 22) Test Queries
-- ----------------------------

select 'facilities' as table_name, count(*) as total from facilities
union all
select 'patients', count(*) from patients
union all
select 'vitals_readings', count(*) from vitals_readings
union all
select 'risk_flags', count(*) from risk_flags
union all
select 'appointments', count(*) from appointments
union all
select 'model_registry', count(*) from model_registry;
