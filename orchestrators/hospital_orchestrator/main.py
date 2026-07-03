from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os

app = FastAPI(title="Hospital Orchestrator API", description="Master Agent H0 — routes all hospital-side interactions")

# Agent endpoint URLs
R1_URL = os.getenv("R1_URL", "http://localhost:8001")
RAG_URL = os.getenv("RAG_URL", "http://localhost:8031")
S1_URL = os.getenv("S1_URL", "http://localhost:8021")
A1_URL = os.getenv("A1_URL", "http://localhost:8011")
A4_URL = os.getenv("A4_URL", "http://localhost:8014")
A5_URL = os.getenv("A5_URL", "http://localhost:8015")
A6_URL = os.getenv("A6_URL", "http://localhost:8016")
M1_URL = os.getenv("M1_URL", "http://localhost:8041")
H1_URL = os.getenv("H1_URL", "http://localhost:8008")
IMAGING_INTERP_URL = os.getenv("IMAGING_INTERP_URL", "http://localhost:8007")

class HospitalRequest(BaseModel):
    doctor_id: str
    action: str   # "chat", "mri_pipeline", "xray_pipeline", "cancer_pipeline",
                  # "write_prescription", "create_referral", "view_queue"
    payload: dict

@app.post("/route")
async def route_hospital_request(req: HospitalRequest):
    """
    Master router: receives all hospital-side actions and dispatches
    them to the correct downstream agents in sequence.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:

            if req.action == "chat":
                # Hospital-side RAG — doctor mode, full clinical depth
                rag_resp = await client.post(
                    f"{RAG_URL}/ask",
                    json={"query": req.payload.get("query", ""), "mode": "doctor"}
                )
                return {"status": "success", "route": "rag_chat_doctor", "data": rag_resp.json()}

            elif req.action in ("mri_pipeline", "xray_pipeline", "cancer_pipeline"):
                # CV result is already computed and passed in payload
                cv_result = req.payload.get("cv_result", {})
                modality = {"mri_pipeline": "mri", "xray_pipeline": "xray", "cancer_pipeline": "ct"}.get(req.action)

                # H6: Interpret imaging result
                h6_resp = await client.post(
                    f"{IMAGING_INTERP_URL}/interpret",
                    json={"modality": modality, "raw_results": cv_result}
                )
                return {"status": "success", "route": "imaging", "report": h6_resp.json()}

            elif req.action == "write_prescription":
                meds = req.payload.get("medications", [])
                patient_id = req.payload.get("patient_id")

                # A5: Drug interaction check first
                a5_resp = await client.post(
                    f"{A5_URL}/check",
                    json={"patient_id": patient_id, "new_medications": meds}
                )
                a5_data = a5_resp.json()

                if a5_data.get("has_major_interaction"):
                    return {
                        "status": "interaction_warning",
                        "alert": a5_data.get("interactions"),
                        "message": "Major drug interaction detected — prescription blocked pending doctor review."
                    }

                # A4: Generate prescription
                a4_resp = await client.post(f"{A4_URL}/generate", json={
                    "patient_id": patient_id,
                    "doctor_id": req.doctor_id,
                    "medications": meds,
                    "notes": req.payload.get("notes", "")
                })
                return {"status": "success", "route": "prescription", "data": a4_resp.json()}

            elif req.action == "create_referral":
                a6_resp = await client.post(f"{A6_URL}/refer", json={
                    "patient_id": req.payload.get("patient_id"),
                    "referring_hospital_id": req.payload.get("from_hospital"),
                    "target_hospital_id": req.payload.get("to_hospital"),
                    "reason": req.payload.get("reason"),
                    "clinical_summary": req.payload.get("clinical_summary", "")
                })
                return {"status": "success", "route": "referral", "data": a6_resp.json()}

            elif req.action == "view_queue":
                m1_resp = await client.get(f"{M1_URL}/queue")
                return {"status": "success", "route": "case_queue", "data": m1_resp.json()}

            else:
                raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Agent unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8050)
