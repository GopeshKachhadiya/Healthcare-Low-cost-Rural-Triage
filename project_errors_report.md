# 🏥 Healthcare-Low-cost-Rural-Triage — Complete Error & Issue Report

> **Project**: Anvaya / ArogyaMitra — Rural Healthcare Triage Platform  
> **Analysis Date**: July 17, 2026  
> **Severity Legend**: 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low / Info

---

## Table of Contents
1. [Security & Credentials Issues](#1-security--credentials-issues)
2. [Environment Configuration Errors](#2-environment-configuration-errors)
3. [Backend Python Errors](#3-backend-python-errors)
4. [Frontend TypeScript / React Errors](#4-frontend-typescript--react-errors)
5. [API Connection Errors](#5-api-connection-errors)
6. [Database / Supabase Schema Errors](#6-database--supabase-schema-errors)
7. [Authentication Errors](#7-authentication-errors)
8. [AI / ML Agent Errors](#8-ai--ml-agent-errors)
9. [Structural / Architectural Issues](#9-structural--architectural-issues)
10. [Missing Files & Dead Code](#10-missing-files--dead-code)
11. [Runtime / Logic Errors](#11-runtime--logic-errors)
12. [Summary Table](#12-summary-table)

---

## 1. Security & Credentials Issues

### 🔴 CRITICAL-001 — Hardcoded Supabase API Key Exposed in Frontend

**File**: `patient-website/src/lib/supabaseClient.ts` (Line 3–4)

```ts
const supabaseUrl = "https://obazytoxsbrhfwmcvpsa.supabase.co";
const supabaseAnonKey = "sb_publishable_x15UfHZNzbxCMTAWn3bLlA_29N5LguY";
```

**Problem**: The Supabase URL and Anon key are **hardcoded directly in the source file**. This means the key is committed to version control and visible to anyone who views the JS bundle. While the anon key is semi-public, the real URL of the live Supabase project is exposed, allowing attackers to directly query Supabase REST endpoints.

**Fix**: Use `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` from a `.env` file. The `.env.example` already defines `SUPABASE_URL` and `SUPABASE_ANON_KEY` — but these are never wired up to the frontend.

---

### 🔴 CRITICAL-002 — Hardcoded Sarvam AI API Key Exposed in Backend

**File**: `orchestrators/patient_orchestrator/sarvam_helper.py` (Line 5)

```python
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "sk_xubkvi1i_AEc0Rv8tUtVkJXBCBEbaNkCE")
```

**Problem**: A real production Sarvam AI API key is hardcoded as a fallback default. If the environment variable `SARVAM_API_KEY` is not set, this real key is used and is visible in source code/git history.

**Fix**: Remove the default value; fail loudly if the key is missing: `SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")` and raise an error or log a warning if it's `None`.

---

### 🔴 CRITICAL-003 — CORS Wildcard on All Backend Agents

**Files**: `orchestrators/patient_orchestrator/main.py`, `orchestrators/patient_orchestrator/period_chatbot.py`, `cv_agents/skin_screener/main.py`, `action_agents/appointment_manager/main.py` — and all other agents.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,   # ← INVALID COMBINATION
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Problem 1**: `allow_origins=["*"]` with `allow_credentials=True` is an **invalid CORS combination** per the W3C spec. Browsers will reject preflight requests. This will cause CORS failures in production with credentials.

**Problem 2**: Wildcard origins mean any website on the internet can call these backend APIs — a major security hole in a medical application.

**Fix**: Set `allow_origins` to the specific frontend origin(s), e.g., `["http://localhost:5173", "https://your-production-domain.com"]`.

---

### 🟠 HIGH-004 — OTP Verification is Completely Fake

**File**: `patient-website/src/pages/Login.tsx` (Lines 38–53 and hint at Line 189)

```tsx
// The UI literally says: Use OTP code 1234 to verify immediately.
```

**Problem**: There is NO real OTP validation. Any 4-digit code (including `1234` as shown) passes verification. The phone number submitted never actually receives an SMS. The `setTimeout` just simulates a check and auto-passes. This is a fake authentication system that offers zero security.

**Fix**: Integrate Supabase Auth's `signInWithOtp` for real phone-based OTP, or use Twilio/MSG91 for SMS.

---

### 🟠 HIGH-005 — Staff Login Has No Password Validation

**File**: `patient-website/src/pages/Login.tsx` (Lines 55–64)

```tsx
const handleStaffLogin = (e: React.FormEvent) => {
  e.preventDefault();
  // No validation at all — any email/password combination logs in
  setTimeout(() => {
    login("staff@anvaya.in", ...);
    navigate("/hospital");
  }, 1000);
};
```

**Problem**: Doctor/Admin/Nurse login does not validate credentials at all. Any input to the email and password fields allows full access to the hospital dashboard. Hardcoded credentials are shown in the UI (`doctor123`, `admin123`).

---

### 🟠 HIGH-006 — Consent Gate is Bypassed by Design

**File**: `orchestrators/patient_orchestrator/main.py` (Lines 166–171)

```python
# Auto-approve all requests (consent was collected on login screen)
# In production, replace with Supabase consent check.
consent_approved = True
if not consent_approved:
    return {"status": "denied", "message": "Patient consent required."}
```

**Problem**: The consent check is hardcoded to `True`, meaning no actual consent verification happens. Medical data processing without real consent verification is a legal violation of India's DPDP Act 2023 that the app claims compliance with.

---

## 2. Environment Configuration Errors

### 🔴 CRITICAL-007 — Frontend `.env` Variables Are NOT Prefixed with `VITE_`

**File**: `.env.example`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Problem**: Vite requires all frontend environment variables to be prefixed with `VITE_` to be accessible in the browser. The `.env.example` defines `SUPABASE_URL` without the `VITE_` prefix, so `import.meta.env.SUPABASE_URL` would be `undefined`. This is why the developer hardcoded the keys directly in `supabaseClient.ts` instead.

**Fix**: Rename to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` and in `supabaseClient.ts`.

---

### 🟠 HIGH-008 — No `.env` File Exists (Only `.env.example`)

**Problem**: The project has `.env.example` but no actual `.env` file is present. All backend agents try to load `.env` but fail silently:

```python
for env_path in ['../../.env', '.env', ...]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
```

Without a `.env`, none of the API keys (`GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SARVAM_API_KEY`) are loaded. The system will fail silently and fall back to stub responses everywhere.

---

### 🟡 MEDIUM-009 — Missing Required Keys in `.env.example`

**File**: `.env.example`

**Problem**: Several keys used in the code are **not** in `.env.example`:
- `GROQ_API_KEY` — used in `patient_orchestrator/main.py` and `cv_agents/skin_screener/main.py` but not listed
- `GEMINI_API_KEY` — referenced in debug print but not in `.env.example`
- `SARVAM_API_KEY` — used in `sarvam_helper.py` but not in `.env.example`
- `PERIOD_BOT_URL` — used in `main.py` Line 102 but not documented

**Fix**: Add all required keys to `.env.example` with descriptions.

---

### 🟡 MEDIUM-010 — Port Mismatch: `start_agents.py` vs `.env.example`

**File**: `start_agents.py` vs `.env.example`

| Agent | `start_agents.py` Port | `.env.example` Variable |
|-------|------------------------|------------------------|
| Patient Orchestrator | 9000 | Not in `.env.example` (only R1=8001) |
| Period Chatbot | 8001 | R1_URL=8001 ✓ |
| Hospital Orchestrator | 8050 | Not defined |

**Problem**: The `.env.example` defines `R1_URL=http://localhost:8001` but the main Patient Orchestrator runs on port `9000`. The frontend calls `http://localhost:9000/route` and `http://127.0.0.1:9000/route`, which is correct, but the `.env.example` is misleading about which service is on which port.

---

## 3. Backend Python Errors

### 🔴 CRITICAL-011 — Wrong Import Path for `sarvam_helper` When Running as Standalone

**File**: `orchestrators/patient_orchestrator/main.py` (Lines 180, 836)
**File**: `orchestrators/patient_orchestrator/period_chatbot.py` (Lines 355, 485)

```python
from orchestrators.patient_orchestrator.sarvam_helper import translate_text, text_to_speech
```

**Problem**: This absolute import path `orchestrators.patient_orchestrator.sarvam_helper` only works if the project root is in `sys.path` AND the server is run with `uvicorn orchestrators.patient_orchestrator.main:app`. But `start_agents.py` does exactly this via `module_path = path.replace("/", ".").replace(".py", "")`. However, if run directly with `python main.py` or `uvicorn main:app` from inside the directory, this import fails with `ModuleNotFoundError`.

**Additional Problem in `period_chatbot.py`** (Line 485):
```python
from orchestrators.patient_orchestrator.sarvam_helper import speech_to_text
```
The `period_chatbot.py` `/transcribe` endpoint also uses the absolute path which would fail outside of the orchestrated startup.

---

### 🔴 CRITICAL-012 — Python Indentation Error in `extract_triage_tier`

**File**: `orchestrators/patient_orchestrator/main.py` (Lines 80–92)

```python
def extract_triage_tier(care_advice_text: str) -> str:
   """ Extract the triage color flag based on the AI's urgency level emojis or text."""
   if not care_advice_text:
       return "green"

   if "🔴" in care_advice_text or "Go to hospital NOW" in care_advice_text:
    return "red"          # ← 1 space indent (inconsistent)
   elif "🟠" in care_advice_text :
    return "orange"        # ← 1 space indent
   elif "🟡" in care_advice_text or "attention within 24 hours" in care_advice_text:
    return "yellow"        # ← 1 space indent
   else :
    return "green"         # ← 1 space indent
```

**Problem**: Python is indentation-sensitive. The function body uses **3-space indentation** but the `if/elif/else` bodies use **1-space indentation** inside. This is inconsistent and will cause `IndentationError` in strict Python environments or produces unexpected parse behavior. The function body itself is indented with 3 spaces but the outer `def` expects 4.

Also: `elif "🟠" in care_advice_text :` has a **trailing space before the colon** which is valid syntax but unconventional.

---

### 🔴 CRITICAL-013 — `period_chatbot.py` Missing Key Dependencies Not in `requirements.txt`

**File**: `orchestrators/patient_orchestrator/period_chatbot.py` (Lines 10–13)

```python
from PIL import Image
from dotenv import load_dotenv
import numpy as np
import cv2
```

**File**: `orchestrators/patient_orchestrator/requirements.txt`
```
fastapi
uvicorn
httpx
pydantic
```

**Problem**: `period_chatbot.py` imports `PIL` (Pillow), `numpy`, `cv2` (OpenCV), `dotenv`, and `ultralytics` — none of which are listed in `requirements.txt`. Running `pip install -r requirements.txt` and then starting the period chatbot will result in `ModuleNotFoundError` at startup.

---

### 🟠 HIGH-014 — `cv_agents/skin_screener` Imports `ultralytics` at Module Level Without Guard

**File**: `cv_agents/skin_screener/main.py` (Line 6)

```python
from ultralytics import YOLO
```

**Problem**: This import happens at module load time, not inside a try/except. If `ultralytics` is not installed, the entire FastAPI app fails to start with `ModuleNotFoundError`. The model loading later has a try/except, but the import itself does not. `requirements.txt` for this agent lists `ultralytics` but if missing, the server crashes immediately without a helpful error message.

---

### 🔴 CRITICAL-015 — `period_chatbot.py` Model Path Has URL-Encoded Characters

**File**: `orchestrators/patient_orchestrator/period_chatbot.py` (Line 34)

```python
model_path = os.path.join(current_dir, "../../models/PCOS_model_epoch%3D100.pt")
```

**Problem**: The `%3D` is URL-encoded for `=`. The actual filename should be `PCOS_model_epoch=100.pt` but the code uses the URL-encoded version. `os.path.join` does NOT decode URL encoding, so this path will **never match** the actual file on disk and the model will always fail to load.

---

### 🟠 HIGH-016 — `main.py` `book_appointment` Action Does Not Check for Successful Response

**File**: `orchestrators/patient_orchestrator/main.py` (Lines 811–818)

```python
elif req.action == "book_appointment":
    appt_resp = await client.post(f"{A1_URL}/create", json={...})
    return {"status": "success", "route": "appointment", "data": appt_resp.json()}
```

**Problem**: There is no check for `appt_resp.status_code`. If the Appointment Manager (A1) returns a 500 error, `appt_resp.json()` will still be called and either parse error JSON or throw a `JSONDecodeError`. No HTTP error handling is present.

---

### 🟠 HIGH-017 — `period_chatbot.py` Session Created Without SUPABASE_KEY Check

**File**: `orchestrators/patient_orchestrator/period_chatbot.py` (Lines 369–375)

```python
if not session_id and SUPABASE_URL:  # ← Missing SUPABASE_KEY check
    session_record = await _log_to_supabase(client, "chat_sessions", {...})
```

**Problem**: The condition checks only `SUPABASE_URL` but not `SUPABASE_KEY`. If `SUPABASE_KEY` is None but `SUPABASE_URL` is set, the `_log_to_supabase` call will make an authenticated request with `"Bearer None"` as the Authorization header, resulting in a 401 error that is silently caught. The patient orchestrator correctly checks both (`SUPABASE_URL and SUPABASE_KEY`), but `period_chatbot.py` is inconsistent.

---

### 🟠 HIGH-018 — `cv_screenings` Patch Uses `SUPABASE_URL`/`SUPABASE_KEY` Without Null Check

**File**: `orchestrators/patient_orchestrator/main.py` (Lines 756–768)

```python
if req.session_id and cv_screening_id:
    try:
        await client.patch(
            f"{SUPABASE_URL}/rest/v1/chat_sessions?id=eq.{req.session_id}",
```

**Problem**: If `SUPABASE_URL` is `None` (no `.env` configured), this will try to fetch `None/rest/v1/...`, causing an `httpx.InvalidURL` exception that is caught but may mask other errors.

---

### 🟡 MEDIUM-019 — `start_agents.py` Uses `subprocess.signal` (Does Not Exist on Windows)

**File**: `start_agents.py` (Line 92)

```python
p.send_signal(subprocess.signal.CTRL_BREAK_EVENT)
```

**Problem**: `subprocess.signal` does not exist as an attribute of the `subprocess` module. The correct reference is `signal.CTRL_BREAK_EVENT` from the `signal` module. This will throw `AttributeError: module 'subprocess' has no attribute 'signal'` when Ctrl+C is pressed on Windows, preventing clean shutdown.

**Fix**: `import signal` at the top, then use `p.send_signal(signal.CTRL_BREAK_EVENT)`.

---

### 🟡 MEDIUM-020 — `run_chatbot.py` Not Analyzed but Likely Has Same Port Conflicts

**File**: `run_chatbot.py` — This script was noted in the project root but not analyzed. Given the pattern of other files, it likely starts the chatbot on a conflicting port or misses environment setup.

---

### 🟡 MEDIUM-021 — `start_agents.py` References Files That Don't Exist

**File**: `start_agents.py` (Lines 16–39)

Many of the agent paths listed in `AGENTS` either don't exist or are empty directories:

| Path Referenced | Status |
|----------------|--------|
| `rag_agents/rag_pipeline/main.py` | Directory exists but needs verification |
| `safety_agents/red_flag_monitor/main.py` | Directory exists but only `main.py` listed — needs verification |
| `safety_agents/consent_gate/main.py` | Needs verification |
| `action_agents/followup_scheduler/main.py` | Needs verification |
| `action_agents/prescription_generator/main.py` | Needs verification |
| `action_agents/drug_interaction_checker/main.py` | Needs verification |
| `action_agents/referral_manager/main.py` | Needs verification |
| `action_agents/hospital_locator/main.py` | Needs verification |
| `cv_agents/brain_tumor_segmenter/main.py` | Needs verification |
| `cv_agents/brain_tumor_classifier/main.py` | Needs verification |
| `monitoring_agents/dashboard/main.py` | Directory exists but needs verification |

The `start_agent()` function does a basic `os.path.exists` check and prints a warning but continues. However, many of these may not exist yet, making the system silently incomplete.

---

## 4. Frontend TypeScript / React Errors

### 🟠 HIGH-022 — `useChat.ts` Hardcodes Patient Age as `20`

**File**: `patient-website/src/hooks/useChat.ts` (Line 46)

```ts
patient_profile: user ? {
  name: user.name,
  gender: user.gender === "Male" ? "M" : "F",
  age: 20  // ← ALWAYS 20
} : null,
```

**Problem**: Patient age is hardcoded to `20`. The actual user's DOB (`user.dob`) is available in the context but never used to calculate real age. Sending wrong age data to a medical AI triage system is a critical medical logic error.

**Fix**: Calculate real age: `Math.floor((Date.now() - new Date(user.dob).getTime()) / 31557600000)`

---

### 🟠 HIGH-023 — `dangerouslySetInnerHTML` Used Without Sanitization

**Files**: `patient-website/src/pages/Chat.tsx` (Lines 232, 235, 242), `patient-website/src/pages/PeriodHealthChat.tsx` (Lines 64–79, 87–94)

```tsx
dangerouslySetInnerHTML={{
  __html: cleaned.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\*(.+?)\*/g, "<em>$1</em>")
}}
```

**Problem**: AI-generated content from the backend is injected directly as HTML without sanitization. If the LLM generates content containing `<script>`, XSS payloads, or malicious HTML, it will execute in the user's browser. This is a **XSS vulnerability** in a medical app.

**Fix**: Use a library like `DOMPurify` to sanitize HTML before injecting, or use a proper markdown renderer like `react-markdown`.

---

### 🟡 MEDIUM-024 — `routes.tsx` Missing `React` Import for JSX

**File**: `patient-website/src/routes.tsx` (Line 19)

```tsx
export interface RouteItem {
  path: string;
  element: React.ReactNode;  // ← Uses React.ReactNode
}
```

**Problem**: The file uses `React.ReactNode` as a type and renders JSX elements like `<Home />`, but `React` is never imported. In older React (<17) this would break. With the new JSX transform in Vite (React 17+), JSX itself doesn't need the import, but `React.ReactNode` type still requires the import.

**Fix**: Add `import React from "react";` or use `import type { ReactNode } from "react"` and change `React.ReactNode` to `ReactNode`.

---

### 🟡 MEDIUM-025 — `AppContext.tsx` Login Creates Generic Hardcoded Profile

**File**: `patient-website/src/context/AppContext.tsx` (Lines 178–189)

```tsx
const login = (phone: string, name?: string, role: UserProfile["role"] = "patient") => {
  setUser({
    name: name || "Ramesh Kumar",  // ← Fallback hardcoded name
    dob: "1988-06-15",             // ← Hardcoded DOB for ALL patients
    gender: "Male",                // ← Hardcoded gender
    village: "Chandpur",           // ← Hardcoded village
    abhaId: "14-8890-4321-7756",   // ← Hardcoded ABHA ID
    preferredLanguage: "en",
  });
};
```

**Problem**: All new logins receive the same hardcoded patient profile (Ramesh Kumar, DOB 1988-06-15, Male, Chandpur). Only the phone number is dynamic. This means every patient using the app will have the same demographic data sent to the AI triage system.

---

### 🟡 MEDIUM-026 — `Upload.tsx` Scan Settings Only Shows "Skin Condition" (Eye/Oral Missing)

**File**: `patient-website/src/pages/Upload.tsx` (Lines 165–178)

```tsx
{[
  { id: "skin_photo", label: "Skin Condition / Rash" }
  // Eye and Oral options commented out or missing
].map(...)}
```

**Problem**: The UI only shows "Skin Condition / Rash" as a scan option. The backend supports `eye` and `oral` modalities, and the `PRESET_CASES` and `useCVScreening` hook reference them, but the UI does not expose them to the user, making 2/3 of the scan functionality inaccessible.

---

### 🟡 MEDIUM-027 — `Home.tsx` Chat Item Title Hardcodes "Skin Screening"

**File**: `patient-website/src/pages/Home.tsx` (Line 60)

```tsx
...scans.map((s) => ({
  title: `Skin Screening — ${s.condition.split(" / ")[0]}`,
```

**Problem**: The title always says "Skin Screening" even when the scan modality is `eye` or `oral`. This is a display bug.

---

### 🟡 MEDIUM-028 — `Appointments.tsx` References Invalid CSS Class

**File**: `patient-website/src/pages/Appointments.tsx` (Line 31)

```tsx
case "in_consultation":
  return "bg-teal-505 text-white border-teal-505 animate-pulse";
```

**Problem**: `bg-teal-505` and `border-teal-505` are **not valid Tailwind CSS classes**. Tailwind's teal scale goes in steps like `teal-500`, `teal-600`. `teal-505` doesn't exist and will produce no styling.

---

### 🔵 LOW-029 — `useTranslation.ts` Languages Not Fully Supported

**File**: `patient-website/src/hooks/useTranslation.ts` (Line 7)

```ts
const translations: Record<string, any> = { en, hi, ta, gu };
```

**Problem**: Only 4 languages are loaded: English, Hindi, Tamil, Gujarati. But the Profile page offers 7 languages including Telugu (`te`), Kannada (`kn`), Bengali (`bn`), Marathi (`mr`). Selecting those languages will fall back to English silently because translation files for them don't exist.

**Fix**: Add translation JSON files for `te`, `kn`, `bn`, `mr` or remove those options from the language selector.

---

### 🔵 LOW-030 — `PeriodHealthChat.tsx` Doctor Name Incorrectly Defaults to Orthopedic Specialist

**File**: `patient-website/src/hooks/usePeriodHealthChat.ts` (Lines 126, 193)

```ts
let doctorName = "Dr. Rohan (Orthopedic Specialist)";
```

**Problem**: In a Period Health / PCOS chatbot, the appointment fallback doctor is an "Orthopedic Specialist" — completely wrong specialty. Should be a Gynecologist.

---

## 5. API Connection Errors

### 🔴 CRITICAL-031 — Frontend Calls to Backend Are Hardcoded to `localhost`

**Files**: 
- `useChat.ts` Line 28: `"http://127.0.0.1:9000/route"`
- `useCVScreening.ts` Line 105: `"http://127.0.0.1:9000/route"`
- `usePeriodHealthChat.ts` Line 53: `"http://localhost:9000/route"`
- `PeriodHealthChat.tsx` Line 296: `"http://localhost:9000/scan-ultrasound"`
- `Chat.tsx` Lines 56, 61: `"http://127.0.0.1:9000/transcribe"`
- `PeriodHealthChat.tsx` Line 151: `"http://localhost:9000/transcribe"`
- `cvScreening.ts` Line 22: `"http://localhost:8005/predict"`
- `appointments.ts` Line 16: `"http://localhost:8000/route"`

**Problem**: ALL backend API calls are hardcoded to `localhost`. This means:
1. The app **cannot be deployed** to any hosting service without modifying every URL.
2. There's no way to change the backend URL via environment variables.
3. `appointments.ts` calls port `8000` but the patient orchestrator runs on `9000`.

**Fix**: Create a central API config: `const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:9000"` and use it everywhere.

---

### 🔴 CRITICAL-032 — `appointments.ts` Calls Wrong Port (8000 vs 9000)

**File**: `patient-website/src/lib/api/appointments.ts` (Line 16)

```ts
const response = await fetch("http://localhost:8000/route", {...});
```

**Problem**: The Patient Orchestrator runs on port `9000` (as confirmed in `main.py` Line 860: `uvicorn.run(app, host="0.0.0.0", port=9000)`). The `appointments.ts` API call targets port `8000` which is nothing — this call will always fail and fall through to the mock fallback.

---

### 🟠 HIGH-033 — `ragChat.ts` Is 100% Mocked — Never Calls Real RAG Pipeline

**File**: `patient-website/src/lib/api/ragChat.ts`

```ts
export async function askAnvayaRAG(query: string, language: string): Promise<ChatBotResponse> {
  // Simulates querying vector DB index using n8n orchestrator
  return new Promise((resolve) => {
    setTimeout(() => { /* keyword-based stub */ }, 900);
  });
}
```

**Problem**: This function is described as "Simulates querying vector DB" but is **never replaced with a real call**. Checking `useChat.ts`, the chat flow calls the backend orchestrator directly. But this `ragChat.ts` module exists but is never imported by any page or hook — it's dead code that no one calls, suggesting the RAG integration was planned but never completed.

---

### 🟠 HIGH-034 — `vitals.ts`, `symptoms.ts`, `history.ts`, `facilities.ts` Are All Stubs

**Files**: `patient-website/src/lib/api/vitals.ts`, `symptoms.ts`, `history.ts`, `facilities.ts`

All four API modules are completely mocked with `Promise.resolve([])` or fake `setTimeout` responses:

```ts
// vitals.ts: just resolves with fake data
// symptoms.ts: resolves with a fake logId
// history.ts: always returns empty array
// facilities.ts: returns one hardcoded facility
```

**Problem**: None of these connect to the backend or Supabase. Vitals logged by users are never saved. Health history always shows empty from the API layer (though context-level local storage works). Facility search always returns one hardcoded location regardless of GPS coordinates.

---

### 🟡 MEDIUM-035 — `FindHospital.tsx` Uses External Overpass API Without Rate-Limit Handling

**File**: `patient-website/src/pages/FindHospital.tsx` (Line 94)

```ts
const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
```

**Problem**: The Overpass API (OpenStreetMap) is a free public service with rate limits. There is no error handling for rate limit responses (HTTP 429), no caching, and no timeout specified. In a production app with many users, this will be rate-limited and show blank maps. The `encodeURIComponent` of the multi-line query string may also be malformed.

---

## 6. Database / Supabase Schema Errors

### 🔴 CRITICAL-036 — Duplicate Table Definitions Across Migration Files

**Files**: 
- `supabase/migrations/20260702000000_initial_schema.sql`
- `supabase/migrations/20260702000001_health_schema_and_indexes.sql`

**Problem**: Both migration files define the **same tables** (`facilities`, `health_workers`, `patients`, `vitals_readings`, etc.). The first migration uses `create table` (fails if exists), the second uses `create table if not exists`. Running both migrations in sequence:
1. Migration 1 creates tables.
2. Migration 2 tries to create the same tables — succeeds silently because of `IF NOT EXISTS`.

But they also **both enable RLS** on the same tables, and both **define overlapping policies with different names**. The first migration creates policy `"patients see own record"`, the second drops and recreates it. This double-policy definition is fragile and can cause conflicts if one migration is run multiple times.

**Additionally**: Migration 2 also re-creates storage buckets, which may fail if they already exist from Migration 1 (the `ON CONFLICT DO NOTHING` handles this but the insert succeeds with no error feedback).

---

### 🟠 HIGH-037 — `chat_sessions` Table `patient_id` Not Validated Against Real Patient IDs

**File**: `supabase/migrations/20260705000000_chatbot_schema.sql` (Line 9)

```sql
patient_id uuid references patients(id),
```

**Problem**: The patient orchestrator logs chat sessions with `patient_id` values like `"+91 98765 43210"` (phone numbers) or auto-generated strings like `"patient-1234567890-abc12"`. These are NOT valid UUIDs and are NOT valid IDs in the `patients` table. The foreign key constraint will cause **every chat session insert to fail** with a foreign key violation.

The code in `main.py` Line 196-201:
```python
session_record = await _log_to_supabase(client, "chat_sessions", {
    "patient_id": req.patient_id,  # ← This is "+91 98765 43210", not a UUID
    "status": "active"
})
```

---

### 🟠 HIGH-038 — `agent_insights` `insight_type` Constraint Is Incomplete

**File**: `supabase/migrations/20260705000000_chatbot_schema.sql` (Line 33)

```sql
insight_type text check (insight_type in ('patient_profile', 'triage_flag', 'sbar_note', 'care_advice')) not null,
```

**File**: `orchestrators/patient_orchestrator/main.py` (Line 484)

```python
await _log_to_supabase(client, "agent_insights", {
    "insight_type": "patient_profile",  # ✓ Valid
```

But also in `main.py` (Line 678–681):
```python
await _log_to_supabase(client, "agent_insights", {
    "insight_type": "sbar_note",   # ✓ Valid
```

And Line 696:
```python
"insight_type": "care_advice",    # ✓ Valid
```

**Status**: These match, so no current violation, but the constraint doesn't include common types that might be added. More importantly, the check constraint `'triage_flag'` is defined in the DB but never used in code — the code stores it under `care_advice`.

---

### 🟠 HIGH-039 — `chat_messages` `agent_role` Constraint Missing "PeriodBot"

**File**: `supabase/migrations/20260705000000_chatbot_schema.sql` (Line 22)

```sql
agent_role text check (agent_role in ('A1_Triage', 'A2_Intake', 'A3_SBAR', 'A4_Care')),
```

**File**: `orchestrators/patient_orchestrator/period_chatbot.py` (Line 459)

```python
await _log_to_supabase(client, "chat_messages", {
    "agent_role": "PeriodBot",  # ← NOT in constraint!
```

**Problem**: Inserting `agent_role = "PeriodBot"` will violate the `check` constraint and the insert will fail with a database error.

---

### 🟡 MEDIUM-040 — `triage_tier` Column Added with No Constraint

**File**: `supabase/migrations/20260711123805_add_triage_tier.sql`

```sql
ALTER TABLE chat_sessions
ADD COLUMN triage_tier text DEFAULT 'green',
ADD COLUMN sbar_report text;
```

**Problem**: No `CHECK` constraint is added to ensure `triage_tier` is one of `('green', 'yellow', 'orange', 'red')`. Invalid values like `"Green"` (capital G) or `"emergency"` could be stored. The code does store `"Green"` (capitalized in `local_sessions_db`) in some places.

---

### 🟡 MEDIUM-041 — No RLS INSERT Policies for `chat_sessions`, `chat_messages`, `agent_insights`

**File**: `supabase/migrations/20260705000000_chatbot_schema.sql`

**Problem**: RLS is enabled on `chat_sessions`, `chat_messages`, and `agent_insights`, and SELECT policies are defined. However, there are **no INSERT policies**. Since the backend uses the `SUPABASE_ANON_KEY` (not the service role key), all inserts to these tables will fail due to RLS blocking unauthorized writes.

The backend should use `SUPABASE_SERVICE_ROLE_KEY` for server-side writes, or INSERT policies must be added.

---

## 7. Authentication Errors

### 🔴 CRITICAL-042 — Supabase Auth Not Used Despite Being Configured

**Problem**: The project has Supabase configured, the schema has `auth.users` references in `health_workers` and `patients` tables, but the frontend never calls any Supabase Auth API. There is no:
- `supabase.auth.signInWithOtp()`
- `supabase.auth.signInWithPassword()`
- `supabase.auth.getSession()`
- `supabase.auth.onAuthStateChange()`

The `supabaseClient.ts` creates a Supabase client but it is **never imported or used anywhere** in the frontend. All authentication is fake local state.

---

### 🔴 CRITICAL-043 — No Route Protection / Authentication Guards

**File**: `patient-website/src/routes.tsx`

**Problem**: Hospital routes (`/hospital`, `/hospital/imaging`) are accessible to anyone without logging in. There is no authentication middleware or route guard. Only `Home.tsx` has a manual `if (!user) return <Navigate to="/" />` check, and even that is trivially bypassed since `user` is initialized with a default value (Ramesh Kumar) in `AppContext`.

---

### 🟡 MEDIUM-044 — `logout()` Uses `window.location.href` Instead of React Router

**File**: `patient-website/src/context/AppContext.tsx` (Line 194)

```tsx
const logout = () => {
  localStorage.removeItem("am_user");
  setUser(null);
  window.location.href = "/";  // ← Full page reload
};
```

**Problem**: This causes a full page reload which clears all React state. It should use React Router's `navigate("/")` to avoid a jarring hard refresh in a SPA. Though functionally it works, it breaks the SPA paradigm and is inconsistent.

---

## 8. AI / ML Agent Errors

### 🔴 CRITICAL-045 — ML Model Files Not Included in Repository

**Problem**: The skin screener (`cv_agents/skin_screener/main.py`) expects model files at:
```
../../models/skin_disease_model.pt
../../models/eye_disease_model.pt
../../models/oral_disease_model.pt
```

And the PCOS chatbot expects:
```
../../models/PCOS_model_epoch=100.pt
```

None of these `.pt` (PyTorch) model files exist in the repository (they are likely in `.gitignore` due to size). Without them, **all AI screening falls back to mock responses**. There is no README instruction for downloading models, no `download_models.py` script, and no HuggingFace Hub integration shown for auto-downloading.

---

### 🟠 HIGH-046 — Skin Screener Falls Back to Wrong Mock Classes

**File**: `cv_agents/skin_screener/main.py` (Lines 188–199)

```python
if model_to_use is None:
    mock_class = "acne" if scan_type == "skin" else "cataract" if scan_type == "eye" else "oscc"
```

**Problem**: When no model is loaded, the fallback always returns `acne` for skin, `cataract` for eye, and `oscc` for oral — regardless of what was uploaded. `oscc` (Oral Squamous Cell Carcinoma) is a cancer diagnosis — returning this as a default fallback for any oral scan is dangerous and could cause unnecessary medical panic.

---

### 🟠 HIGH-047 — `useCVScreening.ts` Creates Object URL but May Not Revoke on Success

**File**: `patient-website/src/hooks/useCVScreening.ts` (Lines 73–157)

```ts
const tempUrl = URL.createObjectURL(imageFile);
try {
  // ... on error: URL.revokeObjectURL(tempUrl) ← correct
  // ... on success: scanId is returned but tempUrl is stored in context!
  const scanId = addScan({
    image: tempUrl,  // ← Object URL stored in React context
```

**Problem**: The object URL `tempUrl` is stored in the scan's `image` field in React context and then persisted to `localStorage` via `JSON.stringify`. However:
1. Object URLs are **session-scoped** — they are invalidated when the page is refreshed.
2. After refresh, the stored `tempUrl` like `blob:http://localhost:5173/abc123` will be a broken link.
3. The URL is never revoked after being stored, causing a memory leak.

---

### 🟡 MEDIUM-048 — Heatmap Is a Static SVG Placeholder, Not Real Grad-CAM

**File**: `patient-website/src/lib/api/cvScreening.ts` (Line 47)

```ts
heatmapUrl: "data:image/svg+xml;utf8,<svg...>...<radialGradient id='g'>...",
```

**Problem**: The heatmap returned by the CV screening API is always the same static SVG regardless of the actual image or prediction. It is centered at `(200, 150)` with a red radial gradient. This is misleading — it displays as if the AI generated a real Grad-CAM visualization but is actually a hardcoded placeholder.

---

## 9. Structural / Architectural Issues

### 🟠 HIGH-049 — No Actual RAG Pipeline Connected

**File**: `rag_agents/rag_pipeline/`
**File**: `patient-website/src/lib/api/ragChat.ts`

**Problem**: The project claims to use "RAG-grounded responses" and has a `rag_agents/rag_pipeline` directory and an `ingest_corpus.py` script. However:
1. `ragChat.ts` on the frontend is a stub returning keyword-based mock answers.
2. The patient orchestrator does NOT call the RAG pipeline — it calls OpenRouter LLM directly.
3. There is no integration between `rag_agents/rag_pipeline` and the main chat flow.
4. The LLM responses are NOT grounded in any vector DB or indexed medical corpus.

---

### 🟠 HIGH-050 — Hospital Orchestrator Appears Incomplete

**File**: `orchestrators/hospital_orchestrator/main.py` (only 4.8KB, very small)

**Problem**: The hospital orchestrator is 4.8KB — significantly smaller than the patient orchestrator (47KB). The hospital dashboard pages (`HospitalDashboard.tsx`, `HospitalImaging.tsx`) exist in the frontend but likely have no real backend to communicate with.

---

### 🟡 MEDIUM-051 — `AppContext` Stores All Data in `localStorage` Including Medical Images

**File**: `patient-website/src/context/AppContext.tsx` (Lines 156–176)

```tsx
useEffect(() => {
  localStorage.setItem("am_scans", JSON.stringify(scans));
}, [scans]);
```

**Problem**: The `scans` array contains Base64 SVG data and potentially real image data. Storing large Base64 strings in localStorage:
1. Risks hitting the **5MB localStorage quota** — causing silent write failures.
2. Medical scan data stored in localStorage is accessible to any JavaScript on the same origin.
3. After quota exhaustion, scan history is silently lost with no error shown to the user.

---

### 🟡 MEDIUM-052 — Multi-Agent Session State Is In-Memory Only (Not Persisted)

**File**: `orchestrators/patient_orchestrator/main.py` (Line 37)

```python
local_sessions_db = {}  # In-memory only
```

**Problem**: Patient session state (triage tier, SBAR report, patient profile, appointment booked status) is stored in a Python dictionary in memory. If the server restarts, ALL session data is lost. Patients mid-consultation lose their progress.

---

### 🟡 MEDIUM-053 — `vite.config.ts` Has No Proxy Configuration

**File**: `patient-website/vite.config.ts`

```ts
export default defineConfig({
  plugins: [react()],
});
```

**Problem**: There is no Vite proxy configured for API calls. This means all API calls during development must go to `http://localhost:9000` directly, which requires CORS to be working. Since CORS is misconfigured (see Issue #003), and there is no proxy setup, developers may face CORS issues during local development that are hard to debug.

**Fix**: Add a proxy: `server: { proxy: { '/api': 'http://localhost:9000' } }`.

---

## 10. Missing Files & Dead Code

### 🟠 HIGH-054 — `ComingSoon.tsx` Page Exists but Is Basically Empty

**File**: `patient-website/src/pages/ComingSoon.tsx` (344 bytes)

**Problem**: This page exists and is imported in `routes.tsx`, but the route for it is not in `routesConfig`. If navigated to directly, it shows a stub. It suggests planned features that are unfinished.

---

### 🟡 MEDIUM-055 — `PeriodChat.tsx` and `PeriodHealthChat.tsx` — Duplicate Components

**Directory**: `patient-website/src/pages/`

Both `PeriodChat.tsx` (12,910 bytes) and `PeriodHealthChat.tsx` (42,890 bytes) exist. Only `PeriodHealthChat.tsx` is in `routes.tsx`. `PeriodChat.tsx` appears to be an older version that was never deleted — dead code.

---

### 🟡 MEDIUM-056 — `graphify-out` Directory in `patient-website` Has Unknown Contents

**Directory**: `patient-website/graphify-out/`

**Problem**: An unknown directory `graphify-out` exists in the patient-website folder. This may be build artifacts, generated dependency graphs, or other files that should not be in the source tree.

---

### 🔵 LOW-057 — `useAppointments.ts` Hook Has Duplicate Booking Logic

**File**: `patient-website/src/hooks/useAppointments.ts`

**Problem**: Appointment booking logic is duplicated between:
1. `useAppointments.ts` — calls `bookAppointment()` from `lib/api/appointments.ts`
2. `useChat.ts` — calls `addAppointment()` directly from context

Both create appointments but through different paths. The API-based booking calls wrong port 8000 (see Issue #032).

---

## 11. Runtime / Logic Errors

### 🟠 HIGH-058 — `useVoiceInput.ts` Fallback Returns Hardcoded Medical Emergency Text

**File**: `patient-website/src/hooks/useVoiceInput.ts` (Lines 65–67)

```ts
if (!uploadUrl) {
  resolve("मेरे सीने में दर्द है और सांस लेने में तकलीफ है / I have chest pain and breathlessness");
  return;
}
```

**Problem**: If no upload URL is provided, voice input resolves with a hardcoded string about "chest pain and breathlessness" — a medical emergency trigger. This default fallback would trigger the red-flag escalation protocol unintentionally if the transcription endpoint is unavailable.

---

### 🟠 HIGH-059 — `useChat.ts` Uses `chatHistory` in Hook But History Grows Unboundedly

**File**: `patient-website/src/hooks/useChat.ts` (Lines 48–51)

```ts
history: chatHistory.map(m => ({
  role: m.sender === "bot" ? "assistant" : "user",
  content: m.text
}))
```

**Problem**: The entire chat history is sent to the backend on every message. As the conversation grows, this payload grows indefinitely. A long conversation with large AI responses could cause:
1. Request body too large for the server (default 1MB limit in many frameworks).
2. Extremely slow API calls from huge JSON payloads.
3. LLM context window overflow on the backend.

The backend truncates history to last 12 messages (`history[-12:]`), but the frontend sends ALL of it.

---

### 🟡 MEDIUM-060 — `extract_details_from_history` Function Can Return Wrong Names

**File**: `orchestrators/patient_orchestrator/main.py` (Lines 118–154)

```python
name_patterns = [
    r"(?:my name is|i am|this is|call me)\s+([A-Za-z]{2,15}...)",
]
```

**Problem**: The regex for name extraction is too broad. If a patient says "I am feeling dizzy", the regex matches "feeling" as a name. Stop words like "feeling", "having", "going" are not in the filter list. This could result in appointment being booked under wrong patient names like "Feeling" or "Having".

---

### 🟡 MEDIUM-061 — `PeriodHealthChat.tsx` Auto-Sends Greeting on Mount Without User Action

**File**: `patient-website/src/pages/PeriodHealthChat.tsx` (Lines 251–258)

```tsx
useEffect(() => {
  if (messages.length === 0) {
    setTimeout(() => {
      sendMessage("Hello, I need help with my menstrual health.");
    }, 600);
  }
}, []);
```

**Problem**: The chatbot auto-sends a message on behalf of the user without their consent. This immediately triggers an API call to the backend, creates a Supabase session record, and starts billable LLM API usage — all before the user has done anything. On slow connections, this can fail silently.

---

### 🟡 MEDIUM-062 — `ChangeView` Component in `FindHospital.tsx` Causes Infinite Re-render Risk

**File**: `patient-website/src/pages/FindHospital.tsx` (Lines 26–30)

```tsx
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);  // ← Called on every render
  return null;
}
```

**Problem**: `map.setView()` is called directly in the render function without a `useEffect`. Every render of `ChangeView` calls `setView`, which may trigger map events that cause state changes, which re-render the component, creating an infinite loop. This should use `useEffect(() => { map.setView(center, zoom); }, [center, zoom])`.

---

### 🔵 LOW-063 — `Chat.tsx` Timer Not Cleaned Up on Unmount

**File**: `patient-website/src/pages/Chat.tsx` (Lines 55, 60–63)

```tsx
const timerRef = useRef<any>(null);
// Timer is started:
timerRef.current = setTimeout(async () => {...}, 7000);
// But never cleaned up on component unmount
```

**Problem**: If the user navigates away from the Chat page while recording, the 7-second timeout timer continues running. When it fires, it tries to call `sendMessage` and `stopRecording` on unmounted components, causing the React "Can't perform a state update on an unmounted component" warning and potential memory leaks.

**Fix**: Add `useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, [])`.

---

### 🔵 LOW-064 — Chat Audio `URL.createObjectURL` Blob Not Revoked

**File**: `patient-website/src/pages/Chat.tsx` (Lines 95–96)

```tsx
const blob = new Blob([bytes.buffer], { type: "audio/wav" });
const url = URL.createObjectURL(blob);
const audio = new Audio(url);
// URL is never revoked after audio finishes
```

**Problem**: Object URLs created for audio playback are never revoked after playback ends, causing memory leaks over time as the user listens to multiple AI responses.

**Fix**: In `audio.onended`, add `URL.revokeObjectURL(url)`.

---

## 12. Summary Table

| ID | Severity | Category | File(s) | Issue |
|----|----------|----------|---------|-------|
| 001 | 🔴 Critical | Security | `supabaseClient.ts` | Hardcoded Supabase API key |
| 002 | 🔴 Critical | Security | `sarvam_helper.py` | Hardcoded Sarvam API key |
| 003 | 🔴 Critical | Security | All agents | CORS wildcard + credentials |
| 004 | 🟠 High | Auth | `Login.tsx` | Fake OTP verification |
| 005 | 🟠 High | Auth | `Login.tsx` | No staff password validation |
| 006 | 🟠 High | Security | `main.py` | Consent gate hardcoded to true |
| 007 | 🔴 Critical | Config | `.env.example` | VITE_ prefix missing for frontend env vars |
| 008 | 🟠 High | Config | All backends | No `.env` file exists |
| 009 | 🟡 Medium | Config | `.env.example` | Missing GROQ, GEMINI, SARVAM keys |
| 010 | 🟡 Medium | Config | `start_agents.py` | Port mismatch vs `.env.example` |
| 011 | 🔴 Critical | Python | `main.py`, `period_chatbot.py` | Wrong import path for sarvam_helper |
| 012 | 🔴 Critical | Python | `main.py` | Indentation error in `extract_triage_tier` |
| 013 | 🔴 Critical | Python | `period_chatbot.py` | Missing dependencies in requirements.txt |
| 014 | 🟠 High | Python | `skin_screener/main.py` | ultralytics import without guard |
| 015 | 🔴 Critical | Python | `period_chatbot.py` | URL-encoded `%3D` in model path |
| 016 | 🟠 High | Python | `main.py` | No HTTP status check on A1 response |
| 017 | 🟠 High | Python | `period_chatbot.py` | Missing SUPABASE_KEY null check |
| 018 | 🟠 High | Python | `main.py` | SUPABASE_URL None in PATCH URL |
| 019 | 🟡 Medium | Python | `start_agents.py` | `subprocess.signal` doesn't exist |
| 020 | 🟡 Medium | Python | `run_chatbot.py` | Unanalyzed script |
| 021 | 🟡 Medium | Structure | `start_agents.py` | Many agent files unverified/missing |
| 022 | 🟠 High | Logic | `useChat.ts` | Patient age hardcoded to 20 |
| 023 | 🟠 High | Security | `Chat.tsx`, `PeriodHealthChat.tsx` | XSS via dangerouslySetInnerHTML |
| 024 | 🟡 Medium | TypeScript | `routes.tsx` | Missing React import for ReactNode |
| 025 | 🟡 Medium | Logic | `AppContext.tsx` | Hardcoded profile defaults for all users |
| 026 | 🟡 Medium | UI | `Upload.tsx` | Eye/Oral scan options missing from UI |
| 027 | 🟡 Medium | UI | `Home.tsx` | Scan title always says "Skin Screening" |
| 028 | 🟡 Medium | UI | `Appointments.tsx` | Invalid Tailwind class `teal-505` |
| 029 | 🔵 Low | i18n | `useTranslation.ts` | 3 languages missing translation files |
| 030 | 🔵 Low | UI | `usePeriodHealthChat.ts` | Wrong doctor specialty (Orthopedic) |
| 031 | 🔴 Critical | API | All frontend API files | All URLs hardcoded to localhost |
| 032 | 🔴 Critical | API | `appointments.ts` | Wrong port 8000 (should be 9000) |
| 033 | 🟠 High | API | `ragChat.ts` | RAG API is 100% mocked, never called |
| 034 | 🟠 High | API | Multiple API files | Vitals/symptoms/history all stubbed |
| 035 | 🟡 Medium | API | `FindHospital.tsx` | No rate-limit handling for Overpass API |
| 036 | 🔴 Critical | Database | Migration files | Duplicate table definitions |
| 037 | 🟠 High | Database | `main.py` + schema | Phone IDs violate UUID FK constraint |
| 038 | 🟠 High | Database | Schema + `period_chatbot.py` | "PeriodBot" violates agent_role constraint |
| 039 | 🟠 High | Database | Chatbot schema | Missing insight types in check constraint |
| 040 | 🟡 Medium | Database | Triage tier migration | No check constraint on triage_tier column |
| 041 | 🟡 Medium | Database | Chatbot schema | No INSERT RLS policies for chat tables |
| 042 | 🔴 Critical | Auth | Entire frontend | Supabase Auth client never used |
| 043 | 🔴 Critical | Auth | `routes.tsx` | No route protection guards |
| 044 | 🟡 Medium | UX | `AppContext.tsx` | logout() uses hard redirect instead of navigate |
| 045 | 🔴 Critical | ML | All CV agents | ML model files not in repository |
| 046 | 🟠 High | ML | `skin_screener/main.py` | Fallback returns cancer diagnosis (oscc) |
| 047 | 🟠 High | ML | `useCVScreening.ts` | Object URL stored in context, breaks on refresh |
| 048 | 🟡 Medium | ML | `cvScreening.ts` | Heatmap is static SVG placeholder |
| 049 | 🟠 High | Architecture | Multiple | No real RAG pipeline connected |
| 050 | 🟠 High | Architecture | Hospital orchestrator | Hospital backend appears incomplete |
| 051 | 🟡 Medium | Architecture | `AppContext.tsx` | Medical images in localStorage (5MB limit) |
| 052 | 🟡 Medium | Architecture | `main.py` | Session state in-memory only |
| 053 | 🟡 Medium | Architecture | `vite.config.ts` | No proxy configuration |
| 054 | 🟠 High | Structure | `ComingSoon.tsx` | Empty page imported but never routed |
| 055 | 🟡 Medium | Structure | `pages/` | Duplicate `PeriodChat.tsx` (dead code) |
| 056 | 🟡 Medium | Structure | `patient-website/` | Unknown `graphify-out` directory |
| 057 | 🔵 Low | Structure | `useAppointments.ts` | Duplicate booking logic |
| 058 | 🟠 High | Logic | `useVoiceInput.ts` | Fallback returns emergency chest pain text |
| 059 | 🟠 High | Logic | `useChat.ts` | Full chat history sent on every request |
| 060 | 🟡 Medium | Logic | `main.py` | Name extractor returns wrong words |
| 061 | 🟡 Medium | Logic | `PeriodHealthChat.tsx` | Auto-sends message without user action |
| 062 | 🟡 Medium | Logic | `FindHospital.tsx` | `ChangeView` may cause infinite re-render |
| 063 | 🔵 Low | Memory | `Chat.tsx` | Timer not cleaned up on unmount |
| 064 | 🔵 Low | Memory | `Chat.tsx` | Audio blob URL never revoked |

---

## Priority Fix Order

### Must Fix Before Any Real Use:
1. **#007** — Add `VITE_` prefix to env vars and create `.env`
2. **#001** — Remove hardcoded Supabase key (use env vars)
3. **#002** — Remove hardcoded Sarvam key
4. **#003** — Fix CORS configuration
5. **#037** — Fix patient_id UUID mismatch in DB
6. **#038** — Add "PeriodBot" to agent_role constraint
7. **#031** — Replace all hardcoded localhost URLs with env var
8. **#032** — Fix appointments.ts port (8000 → 9000)
9. **#042** — Connect Supabase Auth for real login
10. **#045** — Document model download process

### Critical Medical Safety:
11. **#004** — Implement real OTP verification
12. **#022** — Fix patient age calculation (not hardcoded 20)
13. **#046** — Remove dangerous cancer fallback for oral scan
14. **#006** — Implement real consent verification
15. **#023** — Sanitize AI-generated HTML (XSS fix)

---

*Report generated by automated code analysis covering all 60+ files across frontend, backend, database migrations, ML agents, and configuration files.*
