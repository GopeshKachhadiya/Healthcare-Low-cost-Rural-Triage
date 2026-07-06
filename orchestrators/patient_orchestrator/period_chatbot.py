from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import json
import base64
import io
from PIL import Image
from dotenv import load_dotenv

# ── Load environment ──────────────────────────────────────────────────────────
for env_path in [
    os.path.join(os.path.dirname(__file__), '../../.env'),
    os.path.join(os.getcwd(), '.env'),
    '.env'
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

# ── YOLO PCOS Model ───────────────────────────────────────────────────────────
pcos_model = None
try:
    from ultralytics import YOLO
    model_path = os.path.join(os.path.dirname(__file__), "PCOS_model_epcoh%3D100.pt")
    if os.path.exists(model_path):
        pcos_model = YOLO(model_path)
        print("[Info] YOLO PCOS Model loaded successfully.")
    else:
        print("[Warning] PCOS YOLO Model not found at", model_path)
except Exception as e:
    print(f"[Warning] Could not load YOLO model: {e}")

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="Period Health Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request models ─────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    patient_id: str
    session_id: Optional[str] = None
    action: str
    payload: dict
    language: Optional[str] = "hi"

class ScanRequest(BaseModel):
    image_base64: str

# ── Supabase helper ───────────────────────────────────────────────────────────
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

# ── YOLO inference helper ─────────────────────────────────────────────────────
def run_yolo(image_base64: str) -> dict:
    if not pcos_model:
        return {
            "status": "error",
            "label": "Model not loaded",
            "confidence": 0.0,
            "infected": False,
            "summary": "The PCOS detection model is not loaded on the server. Please ensure ultralytics is installed and the model file exists.",
            "flag": "unclear"
        }
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        img_data = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(img_data)).convert("RGB")

        results = pcos_model(img, verbose=False)
        if not results or len(results) == 0:
            return {
                "status": "success",
                "label": "No result",
                "confidence": 0.0,
                "infected": False,
                "summary": "The model did not return any results. Please try a clearer ultrasound image.",
                "flag": "unclear"
            }

        result = results[0]

        # ── Classification model (.probs) ──────────────────────────────────
        if hasattr(result, "probs") and result.probs is not None:
            probs = result.probs
            cls_id = int(probs.top1)
            confidence = float(probs.top1conf.item())
            label = result.names[cls_id]
            infected = "infected" in label.lower() or "pcos" in label.lower()

            if infected:
                flag = "abnormal"
                summary = (
                    f"The AI classified this ultrasound as **{label}** with "
                    f"{confidence*100:.1f}% confidence. This may suggest PCOS-related "
                    f"findings. Please consult a gynecologist for formal clinical evaluation."
                )
            else:
                flag = "normal"
                summary = (
                    f"The AI classified this ultrasound as **{label}** with "
                    f"{confidence*100:.1f}% confidence. No PCOS indicators were detected. "
                    f"A doctor should always review these findings clinically."
                )

            return {
                "status": "success",
                "label": label,
                "confidence": round(confidence * 100, 1),
                "infected": infected,
                "summary": summary,
                "flag": flag
            }

        # ── Detection model (.boxes) ───────────────────────────────────────
        if hasattr(result, "boxes") and result.boxes is not None and len(result.boxes) > 0:
            boxes = result.boxes
            best_idx = int(boxes.conf.argmax().item())
            cls_id = int(boxes.cls[best_idx].item())
            confidence = float(boxes.conf[best_idx].item())
            label = result.names[cls_id]
            infected = "infected" in label.lower() or "pcos" in label.lower()

            if infected:
                flag = "abnormal"
                summary = (
                    f"The YOLO model detected **{label}** with {confidence*100:.1f}% confidence. "
                    f"This may suggest PCOS-related findings in the ovarian ultrasound. "
                    f"Please consult a gynecologist for formal clinical evaluation."
                )
            else:
                flag = "normal"
                summary = (
                    f"The YOLO model detected **{label}** with {confidence*100:.1f}% confidence. "
                    f"No PCOS indicators were detected. "
                    f"A doctor should always review ultrasound findings clinically."
                )

            return {
                "status": "success",
                "label": label,
                "confidence": round(confidence * 100, 1),
                "infected": infected,
                "summary": summary,
                "flag": flag
            }

        # ── No detection found ─────────────────────────────────────────────
        return {
            "status": "success",
            "label": "No finding",
            "confidence": 0.0,
            "infected": False,
            "summary": "The AI model did not detect any clear PCOS indicators in this ultrasound image. The image may be normal, or the scan quality may not be sufficient for analysis.",
            "flag": "unclear"
        }

    except Exception as e:
        print(f"[Error] YOLO inference failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "label": "Error",
            "confidence": 0.0,
            "infected": False,
            "summary": f"Failed to analyze the image: {str(e)}",
            "flag": "unclear"
        }

# ── Prompts ───────────────────────────────────────────────────────────────────
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
8. Ask: "Do you have any recent lab reports you'd like to share, like hormone levels
   (TSH, LH, FSH)? You can also use the Ultrasound Analysis panel on the right side
   to scan your ultrasound image for PCOS." Present as a numbered choice:
   1. Yes, I want to paste my lab report values
   2. No, continue without it
   - If the user picks 1, respond ONLY with the exact token: [[HANDOFF:REPORT_MODEL]]
   - If the user picks 2, skip to step 9.
   - CRITICAL: If you see "REPORT_MODEL_OUTPUT" in a system message, generate Step 9 immediately.
9. Generate the final structured report:

🩺 What You Have Told Us
[summary of name, age, issue, duration, pain, flow, symptoms, history]

📄 Lab Report Analysis
[If provided: summarize findings. Otherwise: "Not provided."]

💊 What You Can Do Right Now (Home Care)
[3-6 safe, specific bullet points]

🚨 Go to Hospital IMMEDIATELY if:
[4-5 specific red flag bullets]

📋 What This Could Be (Possible Causes)
[2-3 possibilities with "could be" language]

⏱️ When to Follow Up
[timing guidance]

🎯 Urgency Level
[🟢 Routine / 🟡 Within 24-48 hrs / 🔴 Immediate]

📝 Suggested Next Steps (Pending Doctor Approval)
[test/referral suggestions]
IMPORTANT: No medication without doctor's evaluation.

🏥 Nearest Available Hospitals / Clinics:
1. Chandpur Primary Health Centre (2.1 km)
2. District General Hospital (14 km)
3. Rural Care Clinic (5 km)
Please type the name or number of the hospital you want to visit.

10. When the user selects a clinic:
Congratulations, [Name]! Your appointment has been successfully booked at [Clinic].
Appointment Details:
• Date: Today
• Time: 10:00 AM
• Doctor: Dr. [Name] (Gynecologist)
• Clinic: [Clinic]
Please arrive 15 minutes early. Bring ID, medical records, and medication list.

RULES:
- Ask only ONE question per turn.
- Never diagnose. Use "could be," "commonly associated with."
- For emergencies, skip remaining questions and advise urgent care immediately.
"""

MODEL_B_SYSTEM_PROMPT = """You are a medical report interpretation assistant for menstrual/hormonal health.
Respond ONLY with valid JSON:
{
  "report_summary": "<1-3 sentence plain-language summary>",
  "flag": "normal" | "borderline" | "abnormal" | "unclear",
  "notes": "<short note; never a diagnosis>"
}
"""

MODEL_A_ID = "meta-llama/llama-3.3-70b-instruct"
MODEL_B_ID = "meta-llama/llama-3.3-70b-instruct"

# ── YOLO Scan Endpoint (standalone — no chatbot involved) ─────────────────────
@app.post("/scan-ultrasound")
async def scan_ultrasound(req: ScanRequest):
    """
    Standalone YOLO endpoint. Takes a base64 image, runs PCOS detection,
    returns the result. Completely independent of the chatbot.
    """
    result = run_yolo(req.image_base64)
    return result

# ── Chat Endpoint ─────────────────────────────────────────────────────────────
@app.post("/route")
async def period_route(req: ChatRequest):
    if req.action != "period_chat":
        return {"status": "error", "message": "Only period_chat action supported."}

    text = req.payload.get("text", "") or ""
    history = req.payload.get("history", [])

    # Detect if bot just asked for a lab report (text handoff only)
    is_report_turn = any(
        "Please type in the details from your report" in msg.get("content", "") or
        "REPORT_MODEL_OUTPUT" in msg.get("content", "")
        for msg in history[-3:]
        if msg.get("role") == "assistant"
    )

    # Translate inputs
    user_lang = req.language or "hi"
    from orchestrators.patient_orchestrator.sarvam_helper import translate_text, text_to_speech
    english_text = await translate_text(text, user_lang, "en")
    print(f"  -> Translated PeriodBot input from {user_lang} to en: '{english_text}'")

    translated_history = []
    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        content_en = await translate_text(content, user_lang, "en") if user_lang != "en" else content
        translated_history.append({"role": role, "content": content_en})

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Supabase logging
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

        reply = ""

        if is_report_turn and text.strip():
            # Run text through Model B (lab report interpreter)
            b_messages = [
                {"role": "system", "content": MODEL_B_SYSTEM_PROMPT},
                {"role": "user", "content": english_text},
            ]
            try:
                resp_b = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                    json={"model": MODEL_B_ID, "messages": b_messages, "response_format": {"type": "json_object"}},
                    timeout=20.0
                )
                raw = resp_b.json()["choices"][0]["message"]["content"]
                try:
                    report_result = json.loads(raw)
                except json.JSONDecodeError:
                    s, e = raw.find("{"), raw.rfind("}")
                    report_result = json.loads(raw[s:e+1]) if s != -1 else {"report_summary": raw, "flag": "unclear", "notes": ""}
            except Exception as e:
                print("Model B error:", e)
                report_result = {"report_summary": "Error reading report.", "flag": "unclear", "notes": ""}

            a_messages = [{"role": "system", "content": MODEL_A_SYSTEM_PROMPT}] + translated_history
            a_messages.append({
                "role": "system",
                "content": f"REPORT_MODEL_OUTPUT: {json.dumps(report_result)}\nCRITICAL: Generate the Step 9 triage report now."
            })
            a_messages.append({"role": "user", "content": "Here is my report."})

            try:
                resp_a = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                    json={"model": MODEL_A_ID, "messages": a_messages},
                    timeout=45.0
                )
                reply = resp_a.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print("Model A (report) error:", e)
                reply = "I received your report but had trouble generating the summary. Please try again."
        else:
            # Normal conversation
            a_messages = [{"role": "system", "content": MODEL_A_SYSTEM_PROMPT}] + translated_history
            a_messages.append({"role": "user", "content": english_text})

            try:
                resp_a = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                    json={"model": MODEL_A_ID, "messages": a_messages},
                    timeout=30.0
                )
                reply = resp_a.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print("Model A error:", e)
                reply = "I'm having trouble connecting right now. Please try again."

        # Post-process
        is_emergency = False
        if "[[HANDOFF:REPORT_MODEL]]" in reply:
            reply = "Please paste your lab report values (e.g. TSH, LH, FSH) directly in the chat below."
        else:
            if "🚨" in reply or "IMMEDIATELY" in reply or ("Urgency Level" in reply and "🔴" in reply):
                is_emergency = True

        # Translate response back to user's native language using Sarvam AI
        translated_reply = await translate_text(reply, "en", user_lang)

        if session_id:
            await _log_to_supabase(client, "chat_messages", {
                "session_id": session_id,
                "sender_type": "agent",
                "agent_role": "PeriodBot",
                "content": translated_reply
            })

        # Generate TTS base64 audio stream
        audio_b64 = await text_to_speech(translated_reply, user_lang)

        return {
            "status": "success",
            "route": "period_chat",
            "data": {
                "status": "success",
                "data": {
                    "answer_text": translated_reply,
                    "audio_base64": audio_b64,
                    "citations": [],
                    "urgency_banner": is_emergency,
                    "suggested_followups": []
                }
            }
        }

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), language: str = "hi"):
    try:
        audio_bytes = await file.read()
        from orchestrators.patient_orchestrator.sarvam_helper import speech_to_text
        transcript = await speech_to_text(audio_bytes, language)
        return {"status": "success", "transcript": transcript}
    except Exception as e:
        return {"status": "error", "message": str(e)}
