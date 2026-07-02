-- ============================================================
-- ANVAYA SUPABASE BACKEND SCHEMA
-- Run this first in Supabase SQL Editor.
-- Source: Database & Backend — Anvaya canonical backend spec.
-- ============================================================

-- ----------------------------
-- 1) Extensions
-- ----------------------------
create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists vector;

-- ----------------------------
-- 2) Core Tables
-- ----------------------------

create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('sub_center','phc','chc','district_hospital')),
  capabilities text[],
  location geography(point, 4326),
  contact_phone text,
  created_at timestamptz default now()
);

create table if not exists health_workers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('asha','anm','nurse','doctor','admin')),
  facility_id uuid references facilities(id),
  preferred_language text default 'hi'
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  abha_id text unique,
  auth_user_id uuid references auth.users(id),
  full_name text,
  dob date,
  gender text,
  phone text,
  village text,
  facility_id uuid references facilities(id),
  created_by uuid references health_workers(id),
  created_at timestamptz default now()
);

create table if not exists vitals_readings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  recorded_by uuid references health_workers(id),
  heart_rate int,
  resp_rate int,
  spo2 int,
  temp_c numeric(4,1),
  systolic_bp int,
  diastolic_bp int,
  consciousness text check (consciousness in ('alert','voice','pain','unresponsive')),
  can_walk_unassisted boolean,
  recorded_at timestamptz default now(),
  synced_at timestamptz
);

create table if not exists symptom_queries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  raw_audio_path text,
  raw_text text,
  language_code text,
  translated_text text,
  extracted_symptoms jsonb,
  red_flag_hit boolean default false,
  created_at timestamptz default now(),
  synced_at timestamptz
);

create table if not exists risk_flags (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  vitals_id uuid references vitals_readings(id),
  score numeric,
  tier text check (tier in ('green','yellow','orange','red')),
  rationale jsonb,
  overridden_by uuid references health_workers(id),
  override_reason text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists cv_screenings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  modality text check (modality in ('skin_photo','eye_photo','oral_photo','xray','mri','ct','histopath')),
  image_path text,
  model_version text,
  prediction jsonb,
  heatmap_path text,
  flagged_for_review boolean default true,
  reviewed_by uuid references health_workers(id),
  created_at timestamptz default now(),
  synced_at timestamptz
);

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  doctor_id uuid references health_workers(id),
  medicines jsonb,
  ayush_recommendation jsonb,
  notes text,
  follow_up_days int,
  issued_at timestamptz default now()
);

create table if not exists patient_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  event_type text,
  event_data jsonb,
  event_date date,
  created_at timestamptz default now()
);

create table if not exists area_disease_stats (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references facilities(id),
  disease_category text,
  case_count int,
  period_start date,
  period_end date,
  suppressed boolean default false
);

create table if not exists rag_documents (
  id uuid primary key default gen_random_uuid(),
  source text,
  content text,
  embedding vector(768),
  language_code text default 'en'
);

create table if not exists consent_log (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  granted_by uuid references health_workers(id),
  consent_type text,
  granted boolean,
  granted_at timestamptz default now()
);

-- ----------------------------
-- 3) Hospital-Side Tables
-- ----------------------------

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  facility_id uuid references facilities(id),
  assigned_doctor uuid references health_workers(id),
  priority_tier text check (priority_tier in ('green','yellow','orange','red')),
  source text check (source in ('cv_screening','chatbot_flag','manual_request','follow_up_escalation')),
  cv_screening_id uuid references cv_screenings(id),
  symptom_summary text,
  vitals_snapshot jsonb,
  status text check (status in ('pending','accepted','in_consultation','completed','referred','cancelled'))
    default 'pending',
  notes text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  from_facility uuid references facilities(id),
  to_facility uuid references facilities(id),
  from_doctor uuid references health_workers(id),
  department text,
  urgency text check (urgency in ('emergency','urgent','routine')),
  reason text,
  attached_data jsonb,
  status text check (status in ('sent','acknowledged','patient_arrived','completed','cancelled'))
    default 'sent',
  created_at timestamptz default now()
);

create table if not exists teleconsult_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  doctor_id uuid references health_workers(id),
  appointment_id uuid references appointments(id),
  channel text check (channel in ('video','audio','chat','whatsapp')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int,
  doctor_notes text,
  created_at timestamptz default now()
);

create table if not exists doctor_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  doctor_id uuid references health_workers(id),
  note_text text,
  is_internal boolean default true,
  created_at timestamptz default now()
);

create table if not exists imaging_reports (
  id uuid primary key default gen_random_uuid(),
  cv_screening_id uuid references cv_screenings(id),
  patient_id uuid references patients(id),
  doctor_id uuid references health_workers(id),
  modality text,
  ai_findings jsonb,
  doctor_assessment text,
  doctor_agrees_with_ai boolean,
  final_tier text check (final_tier in ('green','yellow','orange','red')),
  recommendations text,
  created_at timestamptz default now()
);

-- ----------------------------
-- 4) Extra Backend Tables
-- ----------------------------

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  source_type text check (source_type in ('prescription','appointment','risk_flag')),
  source_id uuid,
  scheduled_for date,
  interval_days int,
  channel text default 'whatsapp',
  status text check (status in ('scheduled','sent','responded','escalated','missed','completed'))
    default 'scheduled',
  response_text text,
  response_red_flag boolean default false,
  attempts int default 0,
  created_by uuid references health_workers(id),
  created_at timestamptz default now()
);

create table if not exists model_registry (
  id uuid primary key default gen_random_uuid(),
  model_key text unique,
  display_name text,
  architecture text,
  modality text check (modality in ('skin_photo','eye_photo','oral_photo','mri','xray','ct','histopath')),
  training_data text[],
  classes text[],
  size_mb numeric,
  target_metric text,
  deployment text check (deployment in ('on_device','edge_function','hf_spaces')),
  is_active boolean default true,
  deployed_at timestamptz default now()
);

create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  workflow_name text,
  trigger_table text,
  trigger_row_id uuid,
  patient_id uuid references patients(id),
  status text check (status in ('triggered','sent','failed','acknowledged')),
  channel text,
  latency_ms int,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text,
  row_id uuid,
  action text check (action in ('insert','update','delete','conflict_resolved','override')),
  actor_id uuid references health_workers(id),
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz default now()
);

-- ----------------------------
-- 5) Indexes
-- ----------------------------

create index if not exists facilities_location_idx
on facilities using gist (location);

create index if not exists patients_facility_id_idx
on patients (facility_id);

create index if not exists vitals_patient_id_idx
on vitals_readings (patient_id);

create index if not exists risk_flags_patient_id_idx
on risk_flags (patient_id);

create index if not exists appointments_facility_id_idx
on appointments (facility_id);

create index if not exists cv_screenings_patient_id_idx
on cv_screenings (patient_id);

-- Create this only after you insert real embeddings.
-- ivfflat index quality is better after data is loaded.
-- create index rag_documents_embedding_idx
-- on rag_documents using ivfflat (embedding vector_cosine_ops)
-- with (lists = 100);

-- ----------------------------
-- 6) Supabase Storage Buckets
-- ----------------------------
-- If this section fails because of permissions, create these buckets manually
-- from Supabase Dashboard → Storage.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('skin-photos', 'skin-photos', false, 10485760),
  ('mri-scans', 'mri-scans', false, 104857600),
  ('xray-images', 'xray-images', false, 20971520),
  ('heatmaps', 'heatmaps', false, 5242880),
  ('prescriptions-pdf', 'prescriptions-pdf', false, 2097152),
  ('referral-packets', 'referral-packets', false, 10485760)
on conflict (id) do nothing;

-- ----------------------------
-- 7) Enable Row Level Security
-- ----------------------------

alter table facilities enable row level security;
alter table health_workers enable row level security;
alter table patients enable row level security;
alter table vitals_readings enable row level security;
alter table symptom_queries enable row level security;
alter table risk_flags enable row level security;
alter table cv_screenings enable row level security;
alter table prescriptions enable row level security;
alter table patient_history enable row level security;
alter table area_disease_stats enable row level security;
alter table rag_documents enable row level security;
alter table consent_log enable row level security;
alter table appointments enable row level security;
alter table referrals enable row level security;
alter table teleconsult_sessions enable row level security;
alter table doctor_notes enable row level security;
alter table imaging_reports enable row level security;
alter table follow_ups enable row level security;
alter table model_registry enable row level security;
alter table automation_events enable row level security;
alter table audit_log enable row level security;

-- ----------------------------
-- 8) Basic RLS Policies
-- ----------------------------
-- These are safe starter policies for demo/testing.
-- Backend code using SERVICE_ROLE_KEY can still insert/read as needed.

drop policy if exists "patients see own record" on patients;
create policy "patients see own record"
on patients for select
using (auth_user_id = auth.uid());

drop policy if exists "health workers see own facility patients" on patients;
create policy "health workers see own facility patients"
on patients for select
using (
  facility_id in (
    select facility_id from health_workers where id = auth.uid()
  )
);

drop policy if exists "health workers see own facility risk flags" on risk_flags;
create policy "health workers see own facility risk flags"
on risk_flags for select
using (
  patient_id in (
    select p.id
    from patients p
    where p.facility_id in (
      select hw.facility_id
      from health_workers hw
      where hw.id = auth.uid()
    )
  )
);

drop policy if exists "doctors insert prescriptions" on prescriptions;
create policy "doctors insert prescriptions"
on prescriptions for insert
with check (
  exists (
    select 1
    from health_workers
    where id = auth.uid()
      and role = 'doctor'
  )
);

drop policy if exists "admins read area disease stats" on area_disease_stats;
create policy "admins read area disease stats"
on area_disease_stats for select
using (
  exists (
    select 1
    from health_workers
    where id = auth.uid()
      and role = 'admin'
  )
);

drop policy if exists "facility appointments read" on appointments;
create policy "facility appointments read"
on appointments for select
using (
  facility_id in (
    select facility_id from health_workers where id = auth.uid()
  )
);

drop policy if exists "doctor notes scoped read" on doctor_notes;
create policy "doctor notes scoped read"
on doctor_notes for select
using (
  doctor_id = auth.uid()
  or is_internal = false
);

drop policy if exists "doctors create imaging reports" on imaging_reports;
create policy "doctors create imaging reports"
on imaging_reports for insert
with check (
  exists (
    select 1
    from health_workers
    where id = auth.uid()
      and role = 'doctor'
  )
);

drop policy if exists "consent scoped to patient or facility" on consent_log;
create policy "consent scoped to patient or facility"
on consent_log for select
using (
  patient_id in (
    select id from patients where auth_user_id = auth.uid()
    union
    select id from patients where facility_id in (
      select facility_id from health_workers where id = auth.uid()
    )
  )
);

drop policy if exists "follow ups facility scoped read" on follow_ups;
create policy "follow ups facility scoped read"
on follow_ups for select
using (
  patient_id in (
    select p.id
    from patients p
    where p.facility_id in (
      select hw.facility_id
      from health_workers hw
      where hw.id = auth.uid()
    )
  )
);

drop policy if exists "audit log admin read" on audit_log;
create policy "audit log admin read"
on audit_log for select
using (
  exists (
    select 1
    from health_workers
    where id = auth.uid()
      and role = 'admin'
  )
);

-- NOTE:
-- model_registry and automation_events intentionally have no public policies.
-- They are service-role only by default because RLS is enabled and no policy is defined.
