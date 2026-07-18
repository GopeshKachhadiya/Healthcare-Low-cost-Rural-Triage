from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import json
import traceback
from dotenv import load_dotenv

# Try multiple .env paths for resilience
for env_path in [
    os.path.join(os.path.dirname(__file__), '../../.env'),
    os.path.join(os.getcwd(), '.env'),
    '.env'
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

print(f"--- STARTUP DEBUG ---")
print(f"GROQ_API_KEY     loaded: {bool(GROQ_API_KEY)} | key[:8]: {(GROQ_API_KEY or '')[:8]}")
print(f"OPENROUTER_KEY   loaded: {bool(OPENROUTER_API_KEY)} | key[:8]: {(OPENROUTER_API_KEY or '')[:8]}")
print(f"GEMINI_API_KEY   loaded: {bool(GEMINI_API_KEY)} | key[:8]: {(GEMINI_API_KEY or '')[:8]}")
print(f"Agent roles: A1=Groq(triage) | A2=OpenRouter(intake) | A3=Groq(SBAR) | A4=OpenRouter/Gemma(care)")
print(f"---------------------")

app = FastAPI(title="Patient Orchestrator API", description="Master Agent P0 — routes all patient-side interactions")

# In-memory local sessions database fallback (used when Supabase is offline/unconfigured)
local_sessions_db = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agent endpoint URLs (update when deployed)
A1_URL = os.getenv("A1_URL", "http://localhost:8011")
S2_URL = os.getenv("S2_URL", "http://localhost:8022")

class PatientRequest(BaseModel):
    patient_id: str
    session_id: Optional[str] = None
    action: str   # "chat", "screen_skin", "book_appointment"
    payload: dict
    language: str = "hi"

async def _log_to_supabase(client: httpx.AsyncClient, table: str, data: dict):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            json=data
        )
        if resp.status_code in (200, 201):
            return resp.json()[0] if isinstance(resp.json(), list) else resp.json()
        print(f"DB log to {table} failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"DB log to {table} error: {e}")
    return None


def extract_triage_tier(care_advice_text: str) -> str:
    """ Extract the triage color flag based on the AI's urgency level emojis or text."""
    if not care_advice_text:
        return "green"

    if "🔴" in care_advice_text or "Go to hospital NOW" in care_advice_text:
        return "red"
    elif "🟠" in care_advice_text:
        return "orange"
    elif "🟡" in care_advice_text or "attention within 24 hours" in care_advice_text:
        return "yellow"
    else:
        return "green"

class ScanRequest(BaseModel):
    image_base64: str

@app.post("/scan-ultrasound")
async def scan_ultrasound(req: ScanRequest):
    """
    Forward ultrasound scan request to Period Chatbot on port 8001.
    """
    period_bot_url = os.getenv("PERIOD_BOT_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{period_bot_url}/scan-ultrasound",
                json={"image_base64": req.image_base64}
            )
            if resp.status_code == 200:
                return resp.json()
            else:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
    except Exception as e:
        print(f"Failed to route scan to Period Chatbot: {e}")
        raise HTTPException(status_code=502, detail=f"Period Chatbot scan unavailable: {str(e)}")


def extract_details_from_history(history, current_text):
    name = "Patient"
    complaint = "Intake completed via chatbot"
    
    import re
    # Match name: start with common intros, capture letters only, stopping at common stop-words
    name_patterns = [
        r"(?:my name is|i am|this is|call me)\s+([A-Za-z]{2,15}(?:\s+[A-Za-z]{2,15})?)",
        r"(?:name\s*:\s*)\s*([A-Za-z]{2,15}(?:\s+[A-Za-z]{2,15})?)"
    ]
    
    all_turns = [msg.get("content", "") for msg in history] + [current_text]
    for turn in all_turns:
        # Strip common punctuation
        turn_clean = re.sub(r'[,.!?]', ' ', turn)
        for pattern in name_patterns:
            match = re.search(pattern, turn_clean, re.IGNORECASE)
            if match:
                extracted = match.group(1).strip()
                words = extracted.split()
                filtered_words = []
                for w in words:
                    if w.lower() in ["and", "age", "is", "years", "old", "the", "a", "an"]:
                        break
                    filtered_words.append(w.capitalize())
                if filtered_words:
                    name = " ".join(filtered_words)
                    break
        
        # Extract complaint (the first turn where user states pain or symptoms)
        turn_lower = turn.lower()
        if complaint == "Intake completed via chatbot":
            if any(k in turn_lower for k in ["pain", "ache", "fever", "cough", "vomit", "sick", "bleed", "hurt", "swollen"]):
                words = turn.split()
                complaint = " ".join(words[:12])
                
    return name, complaint


@app.post("/route")
async def route_patient_request(req: PatientRequest):
    """
    Master router: receives all patient-side actions and dispatches
    them to the correct downstream agents in sequence.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:

            # --- Safety Gate: Consent Check (inline — no external agent needed) ---
            # Auto-approve all requests (consent was collected on login screen)
            # In production, replace with Supabase consent check.
            consent_approved = True
            if not consent_approved:
                return {"status": "denied", "message": "Patient consent required."}

            # --- Route by action ---
            if req.action == "chat":
                text = req.payload.get("text", "")
                history = req.payload.get("history", [])
                
                # --- Translate incoming user query using Sarvam AI ---
                user_lang = req.language or "hi"
                from orchestrators.patient_orchestrator.sarvam_helper import translate_text, text_to_speech
                english_text = await translate_text(text, user_lang, "en")
                print(f"  -> Translated input from {user_lang} to en: '{english_text}'")

                # Translate history to English for RAG consistency
                translated_history = []
                for msg in history[-12:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    content_en = await translate_text(content, user_lang, "en") if user_lang != "en" else content
                    translated_history.append({"role": role, "content": content_en})
                
                # --- Create or Retrieve Chat Session ---
                session_id = req.session_id
                if not session_id:
                    if SUPABASE_URL and SUPABASE_KEY and "your-project" not in SUPABASE_URL:
                        session_record = await _log_to_supabase(client, "chat_sessions", {
                            "patient_id": req.patient_id,
                            "status": "active"
                        })
                        if session_record:
                            session_id = session_record.get("id")
                    
                    if not session_id:
                        import uuid
                        session_id = f"local-session-{uuid.uuid4().hex[:8]}"

                # Initialize local session fallback record if not present
                if session_id and session_id not in local_sessions_db:
                    import datetime
                    profile = req.payload.get("patient_profile") or {}
                    if not profile and req.patient_id:
                        profile = {"phone": req.patient_id, "patient_id": req.patient_id}
                    local_sessions_db[session_id] = {
                        "profile": profile,
                        "triage_tier": "Green",
                        "sbar_report": "Waiting for triage report...",
                        "created_at": datetime.datetime.now().isoformat()
                    }

                # Log user message
                if session_id:
                    await _log_to_supabase(client, "chat_messages", {
                        "session_id": session_id,
                        "sender_type": "user",
                        "content": text
                    })
                
                # Check if it's just a greeting to bypass risk scan
                is_greeting = english_text.strip().lower() in ["hi", "hello", "hey", "start"]
                print(f"\n[Multi-Agent Chat Flow Started for {req.patient_id}]")

                # Always initialize — set inside the block only if triggered
                is_emergency = False
                triage_reason = "Routine"
                care_advice = ""

                if not is_greeting:
                    print("  -> Agent 1 (Risk) analyzing...")
                    risk_reply = "ROUTINE"

                    # Try Groq first (fast, low-latency)
                    if GROQ_API_KEY:
                        try:
                            resp_risk = await client.post(
                                "https://api.groq.com/openai/v1/chat/completions",
                                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                                json={
                                    "model": "llama-3.1-8b-instant",
                                    "messages": [
                                        {"role": "system", "content": "You are a medical triage agent. If the text indicates an emergency (e.g., severe chest pain, extreme breathlessness, uncontrolled bleeding, loss of consciousness), reply with exactly 'EMERGENCY'. Otherwise, reply exactly 'ROUTINE'."},
                                        {"role": "user", "content": english_text}
                                    ],
                                    "temperature": 0.0
                                }
                            )
                            if resp_risk.status_code == 200:
                                risk_reply = resp_risk.json()['choices'][0]['message']['content'].strip().upper()
                                print(f"  -> Agent 1 (Groq) result: {risk_reply[:20]}")
                            else:
                                print(f"  -> Agent 1 (Groq) Error {resp_risk.status_code} — switching to OpenRouter")
                                raise Exception("Groq failed")
                        except Exception:
                            # Fallback: OpenRouter
                            if OPENROUTER_API_KEY:
                                try:
                                    resp_risk_or = await client.post(
                                        "https://openrouter.ai/api/v1/chat/completions",
                                        headers={
                                            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                                            "HTTP-Referer": "https://anvaya.health",
                                            "X-Title": "Anvaya Triage"
                                        },
                                        json={
                                            "model": "meta-llama/llama-3.1-8b-instruct",
                                            "messages": [
                                                {"role": "system", "content": "You are a medical triage agent. If the text indicates an emergency (e.g., severe chest pain, extreme breathlessness, uncontrolled bleeding, loss of consciousness), reply with exactly 'EMERGENCY'. Otherwise, reply exactly 'ROUTINE'."},
                                                {"role": "user", "content": english_text}
                                            ],
                                            "temperature": 0.0,
                                            "max_tokens": 10
                                        },
                                        timeout=10.0
                                    )
                                    if resp_risk_or.status_code == 200:
                                        risk_reply = resp_risk_or.json()['choices'][0]['message']['content'].strip().upper()
                                        print(f"  -> Agent 1 (OpenRouter fallback) result: {risk_reply[:20]}")
                                except Exception as ore:
                                    print(f"  -> Agent 1 (OpenRouter fallback) Exception: {ore}")

                    if "EMERGENCY" in risk_reply:
                        is_emergency = True
                        triage_reason = "Agent 1 flagged high risk symptoms"

                if is_emergency:
                    print("  -> [!] Agent 1 escalated to Emergency!")
                    return {
                        "status": "emergency",
                        "message": "⚠️ This sounds like a medical emergency. Please seek immediate help.",
                        "action_taken": "Escalated to local emergency services"
                    }

                # ==========================================
                # AGENT 2: Conversational Intake — OpenRouter (meta-llama/llama-3.3-70b)
                # More capable model for nuanced multi-turn medical dialogue
                # Falls back to Groq if OpenRouter is unavailable
                # ==========================================
                print("  -> Agent 2 (OpenRouter/Intake) generating response...")
                rag_answer = "I'm a medical assistant. Please consult a doctor."
                citations = []

                condition = req.payload.get("condition")
                
                if condition:
                    system_prompt = f"""You are SATRIA, an empathetic health assistant for Anvaya.
The patient has just completed an AI scan which indicated a possible condition: '{condition}'.
Your job is to discuss this condition with the patient. Answer their questions, provide standard care precautions, explain symptoms to watch out for, and advise them whether they need to see a doctor.
Rules:
- Be empathetic, warm, and conversational in English.
- DO NOT diagnose further or prescribe specific medications.
- Ask only ONE question at a time or provide simple answers.
- Encourage them to visit the local Primary Health Centre (PHC) for a formal clinical evaluation to confirm the AI screening result."""
                else:
                    system_prompt = """You are SATRIA, a health assistant for Anvaya.
Your job is to systematically gather the following information by asking EXACTLY ONE QUESTION at a time:
1. Basic identity (ask for patient's full name and age)
2. Main complaint (what is bothering them most)
3. Pain characteristics (location, duration, severity on scale 0-10)
4. Other symptoms (nausea, fever, dizziness, etc.)
5. Medical history (past conditions, family history, current medications)

RULES:
- Be empathetic, warm and conversational in English.
- During the initial interview, DO NOT diagnose or prescribe anything.
- Ask ONLY ONE QUESTION per response. Wait for the user to answer.
- If the patient mentions stomach issues, diarrhea, or loose motion, you MUST ask what they ate yesterday night or recently before moving to other questions.
- Keep your responses short and clear.
- Once you have collected ALL information from items 1-5 above, output the tag [INTERVIEW_COMPLETE] at the very start of your reply, followed by a JSON summary block like: {"name":"...","age":"...","chief_complaint":"...","severity":"X/10","associated_symptoms":["..."],"medical_history":"...","language":"en"} — then close with: 'A medical AI is now reviewing your case...'
- IMPORTANT: If the conversation history shows that the triage report (with 'What You Can Do Right Now', 'Urgency Level', etc.) has ALREADY been generated in a previous turn, DO NOT output [INTERVIEW_COMPLETE] again. Instead, act as a helpful health assistant and just answer the patient's follow-up questions concisely and directly based on the generated report.
- If the user replies with a hospital choice AFTER the triage report was shown, output [BOOK_APPOINTMENT] at the start, then confirm the appointment with slot details."""

                messages = [{"role": "system", "content": system_prompt}]
                for msg in translated_history:
                    messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
                messages.append({"role": "user", "content": english_text})


                # ── Agent 2: OpenRouter only (no Groq fallback to preserve quota) ──
                if OPENROUTER_API_KEY:
                    try:
                        resp_rag = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                                "HTTP-Referer": "https://anvaya.health",
                                "X-Title": "Anvaya Rural Health Assistant",
                                "Content-Type": "application/json"
                            },
                            json={
                                "model": "meta-llama/llama-3.1-70b-instruct",
                                "messages": messages,
                                "temperature": 0.5,
                                "max_tokens": 500
                            },
                            timeout=20.0
                        )
                        if resp_rag.status_code == 200:
                            rag_answer = resp_rag.json()['choices'][0]['message']['content']
                            print(f"  -> Agent 2 (OpenRouter/LLaMA-70B) OK. Reply: {len(rag_answer)} chars")
                        else:
                            print(f"  -> Agent 2 (OpenRouter) Error {resp_rag.status_code}: {resp_rag.text[:200]}")
                            rag_answer = "I'm having trouble connecting right now. Please try again in a moment."
                    except Exception as ore:
                        print(f"  -> Agent 2 (OpenRouter) Exception: {ore}")
                        rag_answer = "Connection issue. Please try again shortly."
                else:
                    print("  -> Agent 2 Warning: OPENROUTER_API_KEY not loaded!")
                    rag_answer = "Service configuration error. Please contact support."
                    
                        
                is_booking_request = "[BOOK_APPOINTMENT]" in rag_answer or "BOOK_APPOINTMENT" in rag_answer
                user_msg_lower = english_text.lower()
                has_hospital_choice = any(h in user_msg_lower for h in ["rural care clinic", "chandpur primary", "district general", "saraswati women", "asha maternity"])
                has_booking_intent = any(k in user_msg_lower for k in ["book appointment", "book an appointment", "confirm booking", "schedule appointment"])
                
                already_booked = False
                if session_id and session_id in local_sessions_db:
                    already_booked = local_sessions_db[session_id].get("appointment_booked", False)

                if (is_booking_request or has_hospital_choice or has_booking_intent) and not already_booked:
                    if session_id and session_id in local_sessions_db:
                        local_sessions_db[session_id]["appointment_booked"] = True
                    for tag in ["[BOOK_APPOINTMENT]", "BOOK_APPOINTMENT"]:
                        rag_answer = rag_answer.replace(tag, "").strip()
                    # Auto escalate to appointment agent with real details
                    try:
                        patient_name = "Patient"
                        reason = "Intake completed via chatbot"
                        urgency_tier = "Green"
                        
                        if session_id and session_id in local_sessions_db:
                            profile = local_sessions_db[session_id].get("profile", {})
                            patient_name = profile.get("name", patient_name)
                            reason = profile.get("chief_complaint", reason)
                            urgency_tier = local_sessions_db[session_id].get("triage_tier", urgency_tier).capitalize()

                        if patient_name == "Patient" or reason == "Intake completed via chatbot":
                            h_name, h_reason = extract_details_from_history(translated_history, english_text)
                            if patient_name == "Patient":
                                patient_name = h_name
                            if reason == "Intake completed via chatbot":
                                reason = h_reason

                        if patient_name == "Patient" and session_id and SUPABASE_URL and SUPABASE_KEY and "your-project" not in SUPABASE_URL:
                            try:
                                resp_profile = await client.get(
                                    f"{SUPABASE_URL}/rest/v1/agent_insights?session_id=eq.{session_id}&insight_type=eq.patient_profile",
                                    headers={
                                        "apikey": SUPABASE_KEY,
                                        "Authorization": f"Bearer {SUPABASE_KEY}"
                                    }
                                )
                                if resp_profile.status_code == 200 and resp_profile.json():
                                    profile = resp_profile.json()[0].get("payload", {})
                                    patient_name = profile.get("name", patient_name)
                                    reason = profile.get("chief_complaint", reason)
                            except Exception as pe:
                                print("Failed to fetch profile from Supabase:", pe)

                        hospital_id = "Rural Care Clinic"
                        user_input_lower = english_text.lower()
                        if "chandpur" in user_input_lower or "1" in user_input_lower:
                            hospital_id = "Chandpur Primary Health Centre"
                        elif "district" in user_input_lower or "2" in user_input_lower:
                            hospital_id = "District General Hospital"
                        elif "saraswati" in user_input_lower:
                            hospital_id = "Saraswati Women's Clinic"
                        elif "asha" in user_input_lower:
                            hospital_id = "Asha Maternity & Women's Care Centre"
                        elif "rural" in user_input_lower or "3" in user_input_lower:
                            hospital_id = "Rural Care Clinic"

                        if urgency_tier == "Green" and session_id and SUPABASE_URL and SUPABASE_KEY and "your-project" not in SUPABASE_URL:
                            try:
                                session_resp = await client.get(
                                    f"{SUPABASE_URL}/rest/v1/chat_sessions?id=eq.{session_id}",
                                    headers={
                                        "apikey": SUPABASE_KEY,
                                        "Authorization": f"Bearer {SUPABASE_KEY}"
                                    }
                                )
                                if session_resp.status_code == 200 and session_resp.json():
                                    urgency_tier = session_resp.json()[0].get("triage_tier", "Green").capitalize()
                            except Exception as te:
                                print("Failed to fetch session tier:", te)

                        print(f"Booking appointment: Patient={patient_name}, Hospital={hospital_id}, Tier={urgency_tier}, Reason={reason}")
                        await client.post(f"{A1_URL}/create", json={
                            "patient_id": req.patient_id,
                            "patient_name": patient_name,
                            "hospital_id": hospital_id,
                            "reason": reason,
                            "urgency_tier": urgency_tier
                        })
                    except Exception as e:
                        print("Failed to book:", e)
                        
                elif "[INTERVIEW_COMPLETE]" in rag_answer:
                    raw_summary = rag_answer.replace("[INTERVIEW_COMPLETE]", "").strip()

                    # ── Shared Patient Profile (built from full conversation history) ──
                    # All agents read from the same source: the conversation history array.
                    # This is the "shared database" — no agent has private context.
                    import re
                    patient_summary_json = {}
                    try:
                        json_match = re.search(r'\{.*?\}', raw_summary, re.DOTALL)
                        if json_match:
                            patient_summary_json = json.loads(json_match.group())
                            if session_id:
                                if session_id not in local_sessions_db:
                                    local_sessions_db[session_id] = {"profile": {}, "triage_tier": "Green", "sbar_report": ""}
                                local_sessions_db[session_id]["profile"] = patient_summary_json
                                
                                await _log_to_supabase(client, "agent_insights", {
                                    "session_id": session_id,
                                    "insight_type": "patient_profile",
                                    "payload": patient_summary_json
                                })
                    except Exception:
                        pass

                    # Build full transcript from shared history (used by A3 + A4)
                    full_transcript = ""
                    for msg in translated_history:  # ALL history, not just last N
                        role = msg.get("role", "user").capitalize()
                        content = msg.get("content", "")
                        full_transcript += f"{role}: {content}\n"
                    full_transcript += f"User: {english_text}\n"

                    # Extract key clinical facts from the transcript for grounding
                    chief_complaint = patient_summary_json.get("chief_complaint", "")
                    severity = patient_summary_json.get("severity", "")
                    assoc_symptoms = patient_summary_json.get("associated_symptoms", [])
                    medical_history = patient_summary_json.get("medical_history", "")
                    patient_name = patient_summary_json.get("name", "the patient")
                    patient_age = patient_summary_json.get("age", "unknown")

                    # ==========================================
                    # AGENT 4: Gemini 2.0 Flash — Immediate Care Advisor
                    # Uses the SAME full conversation history as all other agents
                    # ==========================================
                    care_advice = ""
                    print("  -> Agent 4 (Gemini 2.5 Flash) generating specific care advice...")

                    lang = req.language or "en"
                    if lang in ("gu", "gujarati"):
                        lang_instruction = "CRITICAL: You MUST respond ONLY in Gujarati language (Gujarati script). Do not use English."
                    elif lang in ("hi", "hindi"):
                        lang_instruction = "CRITICAL: You MUST respond ONLY in Hindi language (Devanagari script). Do not use English."
                    else:
                        lang_instruction = "CRITICAL: You MUST respond ONLY in English. Do not use Hindi, Gujarati, or any other language."

                    care_system = f"""You are VAIDYA, a compassionate clinical triage assistant for Anvaya, a rural healthcare platform in India. {lang_instruction}

You have just received the FULL conversation between a health intake assistant and a patient.
Your job is to provide SPECIFIC, GROUNDED medical first-aid advice based ONLY on what the patient has actually said.

DO NOT give generic advice. Every point must be directly relevant to the patient's stated symptoms.

Structure your response with these exact sections:

🩺 **What You Have Told Us**
Summarize the patient's exact symptoms in 2-3 lines using their own words. Mention name, age, severity rating.

💊 **What You Can Do Right Now (Home Care)**
Give 5-7 specific, actionable steps for THIS patient's exact condition. Be very concrete and detailed:
- Include exact quantities where relevant (e.g. "drink 2-3 glasses of water now")
- Mention position/posture tips if relevant (e.g. "keep hand elevated above heart level")
- Mention safe OTC options with timing (e.g. "Paracetamol 500mg every 6 hours, not more than 4 times a day")
- Include what to AVOID doing

🚨 **Go to Hospital IMMEDIATELY if you notice:**
List 4-5 specific red-flag symptoms directly tied to THIS patient's condition. Be very precise.

📋 **What This Could Be (Possible Causes)**
Explain 2-3 possible causes in very simple language (no medical jargon). What is the most likely reason based on their info? Do NOT diagnose.

⏱️ **When to Follow Up**
Tell them when to come back for re-assessment if symptoms don't improve (e.g. "If pain is still 5+ after 24 hours...").

🎯 **Urgency Level**
State one of: 🟢 Non-urgent (within 3 days) / 🟡 Needs attention within 24 hours / 🔴 Go to hospital NOW
Briefly explain WHY this urgency level applies to their specific case.

📝 **Provisional Prescription (Pending Doctor Approval)**
List 1-2 standard legal prescription medicines appropriate for their specific condition. You MUST clearly state that this is a provisional prescription and can ONLY be taken after a doctor formally approves it through the hospital portal.

🏥 A hospital appointment is being arranged for you. You will be seen by a doctor soon.

CRITICAL RULES:
- Base EVERYTHING on the actual transcript below. Never invent symptoms.
- Paracetamol, ice, rest, elevation, hydration are safe to suggest for immediate home care.
- Keep sentences very short and simple."""

                    care_user_msg = f"""FULL PATIENT CONVERSATION TRANSCRIPT (shared context — same as all other agents):
{full_transcript}

Patient Profile Extracted:
- Name: {patient_name}, Age: {patient_age}
- Chief Complaint: {chief_complaint or 'see transcript'}
- Severity: {severity or 'see transcript'}
- Associated Symptoms: {', '.join(assoc_symptoms) if assoc_symptoms else 'see transcript'}
- Medical History: {medical_history or 'see transcript'}

Now provide specific, grounded care advice for THIS patient based ONLY on what they have told us."""

                    # ==========================================
                    # AGENT 4: OpenRouter — Immediate Care Advisor
                    # Model: google/gemma-3-27b-it  |  No fallback
                    # ==========================================
                    print("  -> Agent 4 (OpenRouter/Care) generating specific care advice...")
                    resp_care = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                            "HTTP-Referer": "https://anvaya.health",
                            "X-Title": "Anvaya Care Advisor",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "google/gemma-3-27b-it",
                            "messages": [
                                {"role": "system", "content": care_system},
                                {"role": "user",   "content": care_user_msg}
                            ],
                            "temperature": 0.3,
                            "max_tokens": 1200
                        },
                        timeout=30.0
                    )
                    if resp_care.status_code == 200:
                        care_advice = resp_care.json()['choices'][0]['message']['content']
                        print(f"  -> Agent 4 (OpenRouter/Gemma-27B) OK. Advice: {len(care_advice)} chars")
                    else:
                        print(f"  -> Agent 4 (OpenRouter) Error {resp_care.status_code}: {resp_care.text[:200]}")
                        care_advice = ""

                    # Build final combined answer
                    rag_answer = care_advice + "\n\n---\n\n🏥 **Nearest Available Hospitals:**\n1. Chandpur Primary Health Centre (2.1 km)\n2. District General Hospital (14 km)\n3. Rural Care Clinic (5 km)\n\n*Please type the name or number of the hospital you want to visit.*"

                # ==========================================
                # AGENT 3: Clinical Summary / SBAR
                # Groq primary → OpenRouter fallback
                # ==========================================
                sbar_note = "SBAR unavailable"
                if "Nearest Available Hospitals" in rag_answer:
                    print("  -> Agent 3 (Summary) creating SBAR handoff note...")

                    transcript_sbar = ""
                    for msg in translated_history[-10:]:
                        transcript_sbar += f"{msg.get('role').capitalize()}: {msg.get('content')}\n"
                    transcript_sbar += f"User: {english_text}\n"

                    sbar_messages = [
                        {"role": "system", "content": "You are a clinical scribe. Generate a concise SBAR (Situation, Background, Assessment, Recommendation) note based on this patient interview transcript. End the note with: '@clinical-expert please provide medical assessment for this patient.'"},
                        {"role": "user", "content": f"Transcript:\n{transcript_sbar}"}
                    ]

                    sbar_generated = False
                    # Try Groq first
                    if GROQ_API_KEY:
                        try:
                            resp_sbar = await client.post(
                                "https://api.groq.com/openai/v1/chat/completions",
                                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                                json={"model": "llama-3.1-8b-instant", "messages": sbar_messages, "temperature": 0.0}
                            )
                            if resp_sbar.status_code == 200:
                                sbar_note = resp_sbar.json()['choices'][0]['message']['content']
                                sbar_generated = True
                                print("\n================ SBAR NOTE (Groq) ================")
                            else:
                                print(f"  -> Agent 3 (Groq) Error {resp_sbar.status_code} — switching to OpenRouter")
                        except Exception as se:
                            print(f"  -> Agent 3 (Groq) Exception: {se} — switching to OpenRouter")

                    # OpenRouter fallback for A3
                    if not sbar_generated and OPENROUTER_API_KEY:
                        try:
                            resp_sbar_or = await client.post(
                                "https://openrouter.ai/api/v1/chat/completions",
                                headers={
                                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                                    "HTTP-Referer": "https://anvaya.health",
                                    "X-Title": "Anvaya SBAR Scribe"
                                },
                                json={
                                    "model": "meta-llama/llama-3.3-70b-instruct",
                                    "messages": sbar_messages,
                                    "temperature": 0.0,
                                    "max_tokens": 500
                                },
                                timeout=20.0
                            )
                            if resp_sbar_or.status_code == 200:
                                sbar_note = resp_sbar_or.json()['choices'][0]['message']['content']
                                sbar_generated = True
                                print("\n================ SBAR NOTE (OpenRouter fallback) ================")
                            else:
                                print(f"  -> Agent 3 (OpenRouter fallback) Error {resp_sbar_or.status_code}")
                        except Exception as soe:
                            print(f"  -> Agent 3 (OpenRouter fallback) Exception: {soe}")

                    if sbar_generated:
                        print(sbar_note)
                        print("===========================================\n")
                        if session_id:
                            await _log_to_supabase(client, "agent_insights", {
                                "session_id": session_id,
                                "insight_type": "sbar_note",
                                "payload": {"note": sbar_note}
                            })

                # Translate response back to user's native language using Sarvam AI
                translated_answer = await translate_text(rag_answer, "en", user_lang)
                translated_care = await translate_text(care_advice, "en", user_lang) if care_advice else ""

                if session_id:
                    await _log_to_supabase(client, "chat_messages", {
                        "session_id": session_id,
                        "sender_type": "agent",
                        "agent_role": "A4_Care" if care_advice else "A2_Intake",
                        "content": translated_answer
                    })
                    if care_advice:
                        await _log_to_supabase(client, "agent_insights", {
                            "session_id": session_id,
                            "insight_type": "care_advice",
                            "payload": {"advice": translated_care}
                        })
                        
                        # ======================================================
                        # NEW BLOCK: Extract Flag and Save with SBAR Report
                        # ======================================================
                        triage_tier = extract_triage_tier(care_advice)
                        final_sbar_report = sbar_note if 'sbar_note' in locals() else "Report not available."
                        
                        if session_id:
                            if session_id not in local_sessions_db:
                                local_sessions_db[session_id] = {"profile": {}, "triage_tier": "Green", "sbar_report": ""}
                            local_sessions_db[session_id]["triage_tier"] = triage_tier
                            local_sessions_db[session_id]["sbar_report"] = final_sbar_report
                        
                        if SUPABASE_URL and SUPABASE_KEY and "your-project" not in SUPABASE_URL:
                            try:
                                await client.patch(
                                    f"{SUPABASE_URL}/rest/v1/chat_sessions?id=eq.{session_id}",
                                    headers={
                                        "apikey": SUPABASE_KEY,
                                        "Authorization": f"Bearer {SUPABASE_KEY}",
                                        "Content-Type": "application/json"
                                    },
                                    json={
                                        "triage_tier": triage_tier,
                                        "sbar_report": final_sbar_report
                                    }
                                )
                                print(f"  -> Session {session_id} updated | Flag: {triage_tier} | Report Sent")
                            except Exception as e:
                                print(f"  -> Failed to update session tier and report: {e}")
                
                # Generate TTS base64 audio stream.
                audio_b64 = await text_to_speech(translated_answer, user_lang)

                return {
                    "status": "success",
                    "route": "rag_chat",
                    "data": {
                        "status": "success",
                        "data": {
                            "answer_text": translated_answer,
                            "audio_base64": audio_b64,
                            "citations": citations,
                            "urgency_banner": False,
                            "suggested_followups": []
                        }
                    }
                }


            elif req.action == "screen_skin":
                # Image has been uploaded — response from CV agent is passed in payload
                cv_result = req.payload.get("cv_result", {})
                cv_screening_id = cv_result.get("id")
                
                if req.session_id and cv_screening_id:
                    try:
                        await client.patch(
                            f"{SUPABASE_URL}/rest/v1/chat_sessions?id=eq.{req.session_id}",
                            headers={
                                "apikey": SUPABASE_KEY,
                                "Authorization": f"Bearer {SUPABASE_KEY}",
                                "Content-Type": "application/json"
                            },
                            json={"cv_screening_id": cv_screening_id}
                        )
                    except Exception as e:
                        print(f"Failed to link CV screening to session: {e}")

                tier = cv_result.get("tier", "green")

                if tier in ("red", "orange"):
                    appt_resp = await client.post(
                        f"{A1_URL}/create",
                        json={
                            "patient_id": req.patient_id,
                            "hospital_id": req.payload.get("nearest_hospital_id", "default"),
                            "reason": f"CV screening: {req.action}",
                            "urgency_tier": tier.capitalize()
                        }
                    )
                    return {
                        "status": "escalated",
                        "message": "Screening flagged. Appointment being arranged.",
                        "appointment": appt_resp.json()
                    }

                return {"status": "success", "result": cv_result}

            elif req.action == "period_chat":
                period_bot_url = os.getenv("PERIOD_BOT_URL", "http://localhost:8001")
                try:
                    resp_period = await client.post(
                        f"{period_bot_url}/route",
                        json={
                            "patient_id": req.patient_id,
                            "session_id": req.session_id,
                            "action": req.action,
                            "payload": req.payload
                        },
                        timeout=60.0
                    )
                    if resp_period.status_code == 200:
                        return resp_period.json()
                    else:
                        raise HTTPException(status_code=resp_period.status_code, detail=resp_period.text)
                except Exception as e:
                    print(f"Failed to route to Period Chatbot: {e}")
                    raise HTTPException(status_code=502, detail=f"Period Chatbot unavailable: {str(e)}")

            elif req.action == "book_appointment":
                appt_resp = await client.post(f"{A1_URL}/create", json={
                    "patient_id": req.patient_id,
                    "hospital_id": req.payload.get("hospital_id"),
                    "reason": req.payload.get("reason", "General consultation"),
                    "urgency_tier": req.payload.get("urgency_tier", "Green")
                })
                if appt_resp.status_code not in (200, 201):
                    print(f"[ERROR] Appointment Manager returned {appt_resp.status_code}: {appt_resp.text[:300]}")
                    raise HTTPException(
                        status_code=appt_resp.status_code,
                        detail=f"Appointment service error: {appt_resp.text[:200]}"
                    )
                try:
                    appt_data = appt_resp.json()
                except Exception as json_err:
                    print(f"[ERROR] Failed to parse appointment response JSON: {json_err}")
                    raise HTTPException(status_code=502, detail="Appointment service returned an invalid response.")
                return {"status": "success", "route": "appointment", "data": appt_data}

            else:
                raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")

    except httpx.RequestError as e:
        print(f"[ERROR] httpx.RequestError: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=503, detail=f"Agent unavailable: {str(e)}")
    except Exception as e:
        print(f"[ERROR] Unhandled exception in /route handler: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), language: str = "hi"):
    try:
        audio_bytes = await file.read()
        from orchestrators.patient_orchestrator.sarvam_helper import speech_to_text
        transcript = await speech_to_text(audio_bytes, language)
        return {"status": "success", "transcript": transcript}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/sessions")
async def get_sessions():
    import datetime
    sessions_list = []
    for sid, data in local_sessions_db.items():
        profile = data.get("profile", {})
        sessions_list.append({
            "id": sid,
            "patient_id": profile.get("phone") or profile.get("patient_id") or "pat-live",
            "triage_tier": data.get("triage_tier", "Green"),
            "sbar_report": data.get("sbar_report", "No report available."),
            "patient_profile": profile,
            "created_at": data.get("created_at") or datetime.datetime.now().isoformat()
        })
    return sessions_list

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
