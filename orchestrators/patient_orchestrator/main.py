from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import json
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

print(f"--- STARTUP DEBUG ---")
print(f"GROQ_API_KEY loaded: {bool(GROQ_API_KEY)} | key[:8]: {(GROQ_API_KEY or '')[:8]}")
print(f"OPENROUTER_API_KEY loaded: {bool(OPENROUTER_API_KEY)} | key[:8]: {(OPENROUTER_API_KEY or '')[:8]}")
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

                # ==========================================
                # AGENT 1: Clinical Risk & Triage (Groq)
                # ==========================================
                print("  -> Agent 1 (Risk) analyzing...")
                is_emergency = False
                triage_reason = "Routine"
                
                if GROQ_API_KEY and not is_greeting:
                    resp_risk = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [
                                {"role": "system", "content": "You are a medical triage agent. If the text indicates an emergency (e.g., severe chest pain, extreme breathlessness, uncontrolled bleeding), reply with 'EMERGENCY'. Otherwise, reply 'ROUTINE'."},
                                {"role": "user", "content": text}
                            ],
                            "temperature": 0.0
                        }
                    )
                    if resp_risk.status_code == 200:
                        risk_reply = resp_risk.json()['choices'][0]['message']['content'].strip().upper()
                        if "EMERGENCY" in risk_reply:
                            is_emergency = True
                            triage_reason = "Agent 1 flagged high risk symptoms"
                    else:
                        print(f"  -> Agent 1 (Groq) Error: {resp_risk.status_code} - {resp_risk.text}")

                if is_emergency:
                    print("  -> [!] Agent 1 escalated to Emergency!")
                    return {
                        "status": "emergency",
                        "message": "⚠️ This sounds like a medical emergency. Please seek immediate help.",
                        "action_taken": "Escalated to local emergency services"
                    }

                # ==========================================
                # AGENT 2: Conversational Intake - using Groq for reliability
                # ==========================================
                print("  -> Agent 2 (Interaction) generating response...")
                rag_answer = "I'm a medical assistant. Please consult a doctor."
                citations = []

                system_prompt = """You are SATRIA, a health assistant for ArogyaMitra.
Your job is to systematically gather the following information by asking EXACTLY ONE QUESTION at a time:
1. Basic identity (ask for patient's full name and age)
2. Main complaint (what is bothering them most)
3. Pain characteristics (location, duration, severity on scale 0-10)
4. Other symptoms (nausea, fever, dizziness, etc.)
5. Medical history (past conditions, family history, current medications)

RULES:
- Be empathetic, warm and conversational in English.
- DO NOT DIAGNOSE or prescribe anything.
- Ask ONLY ONE QUESTION per response. Wait for the user to answer.
- Keep your responses short and clear.
- Once you have collected ALL information from items 1-5 above, output the tag [INTERVIEW_COMPLETE] at the very start of your reply, then write a brief summary and say "Please choose a nearby hospital from the list below to book your appointment."
- If the user replies with a hospital choice AFTER [INTERVIEW_COMPLETE] was already shown, output [BOOK_APPOINTMENT] at the start, then confirm the appointment."""

                messages = [{"role": "system", "content": system_prompt}]
                for msg in history[-12:]:
                    messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
                messages.append({"role": "user", "content": text})

                if GROQ_API_KEY:
                    resp_rag = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": messages,
                            "temperature": 0.7,
                            "max_tokens": 500
                        }
                    )
                    if resp_rag.status_code == 200:
                        rag_answer = resp_rag.json()['choices'][0]['message']['content']
                        print(f"  -> Agent 2 OK. Reply length: {len(rag_answer)} chars")
                    else:
                        print(f"  -> Agent 2 (Groq) Error: {resp_rag.status_code} - {resp_rag.text}")
                else:
                    print("  -> Agent 2 Warning: GROQ_API_KEY is not loaded!")
                        
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
                    rag_answer = rag_answer.replace("[INTERVIEW_COMPLETE]", "").strip()
                    # Append nearest hospitals mock
                    rag_answer += "\n\n🏥 **Nearest Available Hospitals:**\n1. Chandpur Primary Health Centre (2.1 km)\n2. District General Hospital (14 km)\n3. Rural Care Clinic (5 km)\n\n*Please type the name or number of the hospital you want to visit.*"

                # ==========================================
                # AGENT 3: Clinical Summary / SBAR (Groq)
                # ==========================================
                # Only generate SBAR if the interview just completed
                sbar_note = "SBAR unavailable"
                if "Nearest Available Hospitals" in rag_answer and GROQ_API_KEY:
                    print("  -> Agent 3 (Summary) creating SBAR handoff note...")
                    
                    # Compress history into a transcript string
                    transcript = ""
                    for msg in history[-10:]:
                        transcript += f"{msg.get('role').capitalize()}: {msg.get('content')}\n"
                    transcript += f"User: {text}\n"

                    resp_sbar = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [
                                {"role": "system", "content": "You are a clinical scribe. Generate a concise SBAR (Situation, Background, Assessment, Recommendation) note based on this patient interview transcript. End the note with: '@clinical-expert please provide medical assessment for this patient.'"},
                                {"role": "user", "content": f"Transcript:\n{transcript}"}
                            ],
                            "temperature": 0.0
                        }
                    )
                    if resp_sbar.status_code == 200:
                        sbar_note = resp_sbar.json()['choices'][0]['message']['content']
                        print("\n================ SBAR NOTE ================")
                        print(sbar_note)
                        print("===========================================\n")
                    else:
                        print(f"  -> Agent 3 (Groq) Error: {resp_sbar.status_code} - {resp_sbar.text}")
                
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
        raise HTTPException(status_code=503, detail=f"Agent unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
