from fastapi import FastAPI, HTTPException
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

print(f"--- STARTUP DEBUG ---")
print(f"GROQ_API_KEY     loaded: {bool(GROQ_API_KEY)} | key[:8]: {(GROQ_API_KEY or '')[:8]}")
print(f"OPENROUTER_KEY   loaded: {bool(OPENROUTER_API_KEY)} | key[:8]: {(OPENROUTER_API_KEY or '')[:8]}")
print(f"GEMINI_API_KEY   loaded: {bool(GEMINI_API_KEY)} | key[:8]: {(GEMINI_API_KEY or '')[:8]}")
print(f"Agent roles: A1=Groq(triage) | A2=OpenRouter(intake) | A3=Groq(SBAR) | A4=OpenRouter/Gemma(care)")
print(f"---------------------")

app = FastAPI(title="Patient Orchestrator API", description="Master Agent P0 — routes all patient-side interactions")

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
    action: str   # "chat", "screen_skin", "screen_eye", "screen_oral", "book_appointment"
    payload: dict
    language: str = "hi"

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
                
                # Check if it's just a greeting to bypass risk scan
                is_greeting = text.strip().lower() in ["hi", "hello", "hey", "start"]
                print(f"\n[Multi-Agent Chat Flow Started for {req.patient_id}]")

                # Always initialize — set inside the block only if triggered
                is_emergency = False
                triage_reason = "Routine"

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
                                        {"role": "user", "content": text}
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
                                            "HTTP-Referer": "https://arogyamitra.health",
                                            "X-Title": "ArogyaMitra Triage"
                                        },
                                        json={
                                            "model": "meta-llama/llama-3.1-8b-instruct",
                                            "messages": [
                                                {"role": "system", "content": "You are a medical triage agent. If the text indicates an emergency (e.g., severe chest pain, extreme breathlessness, uncontrolled bleeding, loss of consciousness), reply with exactly 'EMERGENCY'. Otherwise, reply exactly 'ROUTINE'."},
                                                {"role": "user", "content": text}
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
                    system_prompt = f"""You are SATRIA, an empathetic health assistant for ArogyaMitra.
The patient has just completed an AI scan which indicated a possible condition: '{condition}'.
Your job is to discuss this condition with the patient. Answer their questions, provide standard care precautions, explain symptoms to watch out for, and advise them whether they need to see a doctor.
Rules:
- Be empathetic, warm, and conversational in English.
- DO NOT diagnose further or prescribe specific medications.
- Ask only ONE question at a time or provide simple answers.
- Encourage them to visit the local Primary Health Centre (PHC) for a formal clinical evaluation to confirm the AI screening result."""
                else:
                    system_prompt = """You are SATRIA, a health assistant for ArogyaMitra.
Your job is to systematically gather the following information by asking EXACTLY ONE QUESTION at a time:
1. Basic identity (ask for patient's full name and age)
2. Main complaint (what is bothering them most)
3. Pain characteristics (location, duration, severity on scale 0-10)
4. Other symptoms (nausea, fever, dizziness, etc.)
5. Medical history (past conditions, family history, current medications)

RULES:
- Be empathetic, warm and conversational in English.
- DO NOT diagnose or prescribe anything.
- Ask ONLY ONE QUESTION per response. Wait for the user to answer.
- If the patient mentions stomach issues, diarrhea, or loose motion, you MUST ask what they ate yesterday night or recently before moving to other questions.
- Keep your responses short and clear.
- Once you have collected ALL information from items 1-5 above, output the tag [INTERVIEW_COMPLETE] at the very start of your reply, followed by a JSON summary block like: {"name":"...","age":"...","chief_complaint":"...","severity":"X/10","associated_symptoms":["..."],"medical_history":"...","language":"en"} — then close with: 'A medical AI is now reviewing your case...'
- If the user replies with a hospital choice AFTER [INTERVIEW_COMPLETE] was already shown, output [BOOK_APPOINTMENT] at the start, then confirm the appointment with slot details."""

                messages = [{"role": "system", "content": system_prompt}]
                for msg in history[-12:]:
                    messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
                messages.append({"role": "user", "content": text})


                # ── Agent 2: OpenRouter only (no Groq fallback to preserve quota) ──
                if OPENROUTER_API_KEY:
                    try:
                        resp_rag = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                                "HTTP-Referer": "https://arogyamitra.health",
                                "X-Title": "ArogyaMitra Rural Health Assistant",
                                "Content-Type": "application/json"
                            },
                            json={
                                "model": "meta-llama/llama-3.3-70b-instruct",
                                "messages": messages,
                                "temperature": 0.7,
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
                    
                        
                # Handle special tags from Agent 2
                if "[BOOK_APPOINTMENT]" in rag_answer:
                    rag_answer = rag_answer.replace("[BOOK_APPOINTMENT]", "").strip()
                    # Auto escalate to appointment agent
                    try:
                        await client.post(f"{A1_URL}/create", json={
                            "patient_id": req.patient_id,
                            "hospital_id": "selected_hospital",
                            "reason": "Intake completed via chatbot",
                            "urgency_tier": "Green"
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
                    except Exception:
                        pass

                    # Build full transcript from shared history (used by A3 + A4)
                    full_transcript = ""
                    for msg in history:  # ALL history, not just last N
                        role = msg.get("role", "user").capitalize()
                        content = msg.get("content", "")
                        full_transcript += f"{role}: {content}\n"
                    full_transcript += f"User: {text}\n"

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

                    care_system = f"""You are VAIDYA, a compassionate clinical triage assistant for ArogyaMitra, a rural healthcare platform in India. {lang_instruction}

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
                            "HTTP-Referer": "https://arogyamitra.health",
                            "X-Title": "ArogyaMitra Care Advisor",
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
                    for msg in history[-10:]:
                        transcript_sbar += f"{msg.get('role').capitalize()}: {msg.get('content')}\n"
                    transcript_sbar += f"User: {text}\n"

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
                                    "HTTP-Referer": "https://arogyamitra.health",
                                    "X-Title": "ArogyaMitra SBAR Scribe"
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
                
                return {
                    "status": "success",
                    "route": "rag_chat",
                    "data": {
                        "status": "success",
                        "data": {
                            "answer_text": rag_answer,
                            "citations": citations,
                            "urgency_banner": False,
                            "suggested_followups": []
                        }
                    }
                }

            elif req.action in ("screen_skin", "screen_eye", "screen_oral"):
                # Image has been uploaded — response from CV agent is passed in payload
                cv_result = req.payload.get("cv_result", {})
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

            elif req.action == "book_appointment":
                appt_resp = await client.post(f"{A1_URL}/create", json={
                    "patient_id": req.patient_id,
                    "hospital_id": req.payload.get("hospital_id"),
                    "reason": req.payload.get("reason", "General consultation"),
                    "urgency_tier": req.payload.get("urgency_tier", "Green")
                })
                return {"status": "success", "route": "appointment", "data": appt_resp.json()}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
