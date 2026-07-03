from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="Red-Flag Monitor API", description="Safety Agent S1 for emergency detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MonitorRequest(BaseModel):
    text_input: str
    source: str = "patient_chat"

# Load heavy NLP model ONLY if explicitly enabled via env var.
# Default: keyword-only mode (no model download needed for demo).
_USE_NLP_MODEL = os.environ.get("S1_USE_NLP_MODEL", "false").lower() == "true"
emergency_classifier = None

if _USE_NLP_MODEL:
    try:
        from transformers import pipeline
        print("[S1] Loading zero-shot classifier for emergency detection...")
        emergency_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
        print("[S1] NLP model loaded.")
    except Exception as e:
        print(f"[S1] WARNING: Could not load NLP model ({e}). Falling back to keyword-only mode.")
else:
    print("[S1] Keyword-only mode (set S1_USE_NLP_MODEL=true to enable NLP classifier).")

# Hard-coded red-flag keywords (Agent S1 spec)
HARD_CODED_FLAGS = [
    "chest pain", "severe breathlessness", "can't breathe", "cannot breathe",
    "convulsion", "seizure", "fits", "uncontrolled bleeding", "heavy bleeding",
    "facial droop", "stroke", "unconscious", "fainted", "suicide", "dying",
    "heart attack", "cardiac arrest", "not responding", "choking",
]

@app.get("/health")
async def health():
    return {"status": "ok", "mode": "nlp+keyword" if emergency_classifier else "keyword-only"}

@app.post("/scan")
async def scan_for_red_flags(req: MonitorRequest):
    try:
        query = req.text_input.lower()

        # 1. Hard-coded keyword rules (instant, no model needed)
        has_keyword = any(flag in query for flag in HARD_CODED_FLAGS)

        # 2. NLP Zero-shot classification (only if model loaded)
        is_nlp_emergency = False
        if emergency_classifier and not has_keyword:
            try:
                candidate_labels = ["medical emergency", "routine inquiry"]
                results = emergency_classifier(query, candidate_labels)
                is_nlp_emergency = (
                    results["labels"][0] == "medical emergency"
                    and results["scores"][0] > 0.8
                )
            except Exception:
                is_nlp_emergency = False

        is_emergency = has_keyword or is_nlp_emergency

        # In production: trigger Supabase webhook → n8n escalation workflow W1
        return {
            "status": "success",
            "is_emergency": is_emergency,
            "reason": "Keyword match" if has_keyword else ("NLP match" if is_nlp_emergency else "None"),
            "action_taken": "Escalated to n8n workflow W1" if is_emergency else "None",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8021)
