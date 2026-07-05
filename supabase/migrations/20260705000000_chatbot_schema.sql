-- ════════════════════════════════════════════════════════════════
-- Chatbot Multi-Agent State Tables
-- ════════════════════════════════════════════════════════════════

-- 1. chat_sessions
-- Links a continuous chatbot session to a patient, and optionally to a CV screening.
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  cv_screening_id uuid references cv_screenings(id), -- If a scan was uploaded during chat
  status text check (status in ('active', 'completed', 'escalated')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. chat_messages
-- Stores the message transcript and indicates which agent generated the response.
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) not null,
  sender_type text check (sender_type in ('user', 'agent', 'system')) not null,
  agent_role text check (agent_role in ('A1_Triage', 'A2_Intake', 'A3_SBAR', 'A4_Care')),
  model_used text, -- e.g., 'llama-3.1-8b', 'gemma-27b'
  content text not null,
  created_at timestamptz default now()
);

-- 3. agent_insights
-- Stores structured JSON data from agents (like patient profiles, SBAR notes).
create table agent_insights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) not null,
  insight_type text check (insight_type in ('patient_profile', 'triage_flag', 'sbar_note', 'care_advice')) not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

-- Row Level Security
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table agent_insights enable row level security;

-- Policies
create policy "patients see own sessions"
on chat_sessions for select
using (patient_id in (select id from patients where auth_user_id = auth.uid()));

create policy "patients see own messages"
on chat_messages for select
using (session_id in (
  select id from chat_sessions where patient_id in (
    select id from patients where auth_user_id = auth.uid()
  )
));

create policy "patients see own insights"
on agent_insights for select
using (session_id in (
  select id from chat_sessions where patient_id in (
    select id from patients where auth_user_id = auth.uid()
  )
));
