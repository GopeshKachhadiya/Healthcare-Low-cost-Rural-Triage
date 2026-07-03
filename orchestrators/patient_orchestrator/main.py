from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import os

app = FastAPI(title="Patient Orchestrator API", description="Master Agent P0 — routes all patient-side interactions")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agent endpoint URLs (update when deployed)
R1_URL = os.getenv("R1_URL", "http://localhost:8001")
R2_URL = os.getenv("R2_URL", "http://localhost:8006")
RAG_URL = os.getenv("RAG_URL", "http://localhost:8031")
S1_URL = os.getenv("S1_URL", "http://localhost:8021")
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

            # --- Safety Gate: Consent Check (S2) ---
            consent_resp = await client.post(
                f"{S2_URL}/verify",
                json={"patient_id": req.patient_id, "action": req.action}
            )
            if consent_resp.json().get("status") != "approved":
                return {"status": "denied", "message": "Patient consent required."}

            # --- Route by action ---
            if req.action == "chat":
                text = req.payload.get("text", "")

                # S1 Red-flag scan first
                s1_resp = await client.post(
                    f"{S1_URL}/scan",
                    json={"text_input": text, "source": "patient_chat"}
                )
                s1_data = s1_resp.json()

                if s1_data.get("is_emergency"):
                    return {
                        "status": "emergency",
                        "message": "⚠️ This sounds like a medical emergency. Please seek immediate help.",
                        "action_taken": s1_data.get("action_taken")
                    }

                # Proceed to RAG
                rag_resp = await client.post(
                    f"{RAG_URL}/ask",
                    json={"query": text, "mode": "patient"}
                )
                return {"status": "success", "route": "rag_chat", "data": rag_resp.json()}

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
    uvicorn.run(app, host="0.0.0.0", port=8000)
