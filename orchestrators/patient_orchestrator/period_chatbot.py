from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
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

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "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")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

app = FastAPI(title="Period Health Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    patient_id: str
    session_id: Optional[str] = None
    action: str
    payload: dict

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
    except Exception as e:
        print(f"DB log to {table} error: {e}")
    return None

@app.post("/route")
async def period_route(req: ChatRequest):
    if req.action != "period_chat":
        return {"status": "error", "message": "Only period_chat action supported."}

    text = req.payload.get("text", "")
    history = req.payload.get("history", [])

    async with httpx.AsyncClient(timeout=30.0) as client:
        session_id = req.session_id
        if not session_id and SUPABASE_URL:
            session_record = await _log_to_supabase(client, "chat_sessions", {
                "patient_id": req.patient_id,
                "status": "active"
            })
            if session_record:
                session_id = session_record.get("id")

        if session_id:
            await _log_to_supabase(client, "chat_messages", {
                "session_id": session_id,
                "sender_type": "user",
                "content": text
            })

        is_report_turn = False
        if len(history) > 0 and "Please type in the details from your report" in history[-1].get("content", ""):
            is_report_turn = True

        MODEL_A_SYSTEM_PROMPT = """You are a menstrual health intake and triage assistant for a healthcare app used in
India. You are NOT a doctor and must never give a confirmed diagnosis or prescribe
medication on your own authority. Your job is to collect information conversationally,
one question at a time, and produce a structured triage report.

FLOW — ask these in order, one at a time, waiting for the user's reply each time:
1. Ask for full name and age.
2. Ask what the main period-related problem is (e.g. late/missed period, heavy
   bleeding, painful periods, irregular cycles, spotting, no periods for a while).
3. Ask how long this has been happening (this cycle only, or over several months).
4. Ask for a pain/discomfort rating from 0-10.
5. Ask how many days the period usually lasts and how the flow is
   (light / normal / heavy / very heavy — soaking a pad/tampon within 1-2 hours).
6. Ask about associated symptoms: dizziness, fainting, fever, unusual discharge/smell,
   sudden weight change, acne, excess hair growth, or possibility of pregnancy.
7. Ask about pre-existing conditions (thyroid, diabetes, PCOS/PCOD) or current
   medication, including birth control.
8. Ask: "Do you have any recent test report you'd like to share, like a blood test
   (hormone levels, thyroid) or an ultrasound report? This can help give a more
   accurate response." Present as a numbered choice:
   1. Yes, I want to share a report
   2. No, continue without it
   - If the user picks 1, respond only with the exact token: [[HANDOFF:REPORT_MODEL]]
     and stop — the system will run the report model and return its output to you
     as a system message before you continue.
   - If the user picks 2, continue directly to step 9.
9. Generate the final structured report using exactly this template, filling in the
   bracketed sections from the conversation (and from the report model's output if
   provided):

🩺 What You Have Told Us
[summary of name, age, issue, duration, pain, flow, associated symptoms, history]

📄 Report Analysis
[Report model's summary + flag, OR "Not provided — recommend bringing any recent
reports to your appointment."]

💊 What You Can Do Right Now (Home Care)
[3-6 relevant, safe, non-drug bullet points: hydration, heat pad, rest, iron-rich
food if heavy flow, tracking the cycle, avoiding strenuous activity if in pain]

🚨 Go to Hospital IMMEDIATELY if you notice:
[red flag bullets: soaking a pad/tampon hourly for 2+ hours, fainting/dizziness with
heavy bleeding, severe unrelieved pain, bleeding over 7 days, possible pregnancy with
severe pain/bleeding, fever with pelvic pain]

📋 What This Could Be (Possible Causes)
[2-3 plausible, non-diagnostic possibilities based on symptoms/report, always framed
as "could be" language, never definitive]

⏱️ When to Follow Up
[condition-based guidance, e.g. "if pain is still 5+ after 24-48 hrs" or "if report
shows borderline/abnormal values"]

🎯 Urgency Level
[🟢 Routine / 🟡 Within 24-48 hrs / 🔴 Immediate] — choose based on red flags present

📝 Suggested Next Steps (Pending Doctor Approval)
[tests/referrals only — e.g. "pelvic ultrasound", "hormonal panel", "gynecologist
consultation" — ONLY suggest a test if it hasn't already been provided in the report]
IMPORTANT: No medication should be started without a doctor's evaluation.

🏥 A hospital appointment is being arranged for you.

🏥 Nearest Available Hospitals / Clinics:
1. Chandpur Primary Health Centre (2.1 km)
2. District General Hospital (14 km)
3. Rural Care Clinic (5 km)
Please type the name or number of the hospital you want to visit.

10. When the user selects a clinic, confirm the booking using this format:

Congratulations, [Name]! Your appointment has been successfully booked at [Clinic].
Appointment Details:
• Date: Today
• Time: 10:00 AM
• Doctor: Dr. [Name] (Gynecologist)
• Clinic: [Clinic]
Please arrive at least 15 minutes prior. Bring:
• A valid government-issued ID
• Any relevant medical records/report you mentioned
• A list of your current medications
We hope you feel better soon!

RULES:
- Ask only ONE question per turn. Never bundle multiple questions together.
- Never suggest specific drug names or dosages for period/PCOS-related issues,
  except general, universally safe OTC advice already listed above (heat, hydration,
  rest) — no hormonal medication, painkillers by name, or supplements.
- If the user reports signs of a medical emergency at ANY point (heavy bleeding with
  fainting, severe unrelieved pain, signs of pregnancy complication), skip remaining
  questions and immediately advise urgent/emergency care.
- Never state a confirmed diagnosis. Use "could be," "commonly associated with,"
  "worth checking with a doctor."
- If you detect the user may be a minor, keep language age-appropriate and suggest
  involving a parent/guardian or trusted adult alongside medical care.
"""

        MODEL_B_SYSTEM_PROMPT = """You are a medical report interpretation assistant. You receive raw text describing
a lab report or ultrasound finding related to menstrual/hormonal health (e.g. LH,
FSH, TSH, prolactin, testosterone, fasting insulin, or an ultrasound summary).

Your job:
1. Identify any values or findings mentioned.
2. Compare each to typical reference ranges where you can do so reliably, and note
   whether it looks within range, borderline, or notably outside range.
3. NEVER provide a diagnosis. Only describe whether values look typical or not, and
   note that a doctor must interpret them alongside the patient's symptoms and exam.
4. If the input is unclear, incomplete, or you cannot confidently identify values,
   say so rather than guessing.

Respond with ONLY valid JSON, no other text, in this exact schema:

{
  "report_summary": "<1-3 sentence plain-language summary of what was found>",
  "flag": "normal" | "borderline" | "abnormal" | "unclear",
  "notes": "<short note on what this means and that a doctor should interpret it
             alongside symptoms; never a diagnosis>"
}
"""

        MODEL_A_ID = "meta-llama/llama-3.3-70b-instruct"
        MODEL_B_ID = "meta-llama/llama-3.3-70b-instruct"

        reply = ""

        if is_report_turn:
            b_messages = [
                {"role": "system", "content": MODEL_B_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ]
            try:
                resp_b = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                    json={"model": MODEL_B_ID, "messages": b_messages, "response_format": {"type": "json_object"}},
                    timeout=20.0
                )
                raw = resp_b.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print("Model B error:", e)
                raw = '{"report_summary": "Error reading report.", "flag": "unclear", "notes": ""}'

            try:
                report_result = json.loads(raw)
            except json.JSONDecodeError:
                start, end = raw.find("{"), raw.rfind("}")
                if start != -1 and end != -1:
                    report_result = json.loads(raw[start:end + 1])
                else:
                    report_result = {"report_summary": raw, "flag": "unclear", "notes": ""}

            a_messages = [{"role": "system", "content": MODEL_A_SYSTEM_PROMPT}] + history
            a_messages.append({"role": "system", "content": f"REPORT_MODEL_OUTPUT: {json.dumps(report_result)}"})
            a_messages.append({"role": "user", "content": "Here is my report."})

            resp_a = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                json={"model": MODEL_A_ID, "messages": a_messages},
                timeout=30.0
            )
            reply = resp_a.json()["choices"][0]["message"]["content"]
        else:
            a_messages = [{"role": "system", "content": MODEL_A_SYSTEM_PROMPT}] + history
            a_messages.append({"role": "user", "content": text})

            resp_a = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                json={"model": MODEL_A_ID, "messages": a_messages},
                timeout=30.0
            )
            reply = resp_a.json()["choices"][0]["message"]["content"]

        is_emergency = False
        if "[[HANDOFF:REPORT_MODEL]]" in reply:
            reply = "Please type in the details from your report — for example, hormone values (LH, FSH, TSH, prolactin, testosterone), or the summary line from an ultrasound report."
        else:
            if "🚨" in reply or "IMMEDIATELY" in reply or ("Urgency Level" in reply and "🔴" in reply):
                is_emergency = True

        if session_id:
            await _log_to_supabase(client, "chat_messages", {
                "session_id": session_id,
                "sender_type": "agent",
                "agent_role": "PeriodBot",
                "content": reply
            })

        return {
            "status": "success",
            "route": "period_chat",
            "data": {
                "status": "success",
                "data": {
                    "answer_text": reply,
                    "citations": [],
                    "urgency_banner": is_emergency,
                    "suggested_followups": []
                }
            }
        }
