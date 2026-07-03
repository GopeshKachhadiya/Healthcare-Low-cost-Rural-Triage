from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Prescription Generator API", description="Action Agent A4 for managing prescriptions")

class PrescriptionRequest(BaseModel):
    patient_id: str
    doctor_id: str
    medications: List[str]
    notes: str = ""

@app.post("/generate")
async def generate_prescription(req: PrescriptionRequest):
    try:
        # MOCK LOGIC: In reality, this would save to the DB and trigger n8n
        # to send a WhatsApp message to the patient with the prescription details.
        
        # It would also ideally call A5 (Drug Interaction Checker) here before finalizing.
        
        return {
            "status": "success",
            "prescription_id": f"rx_{req.patient_id[:5]}_123",
            "medications_prescribed": req.medications,
            "message": "Prescription generated and saved. Notification triggered to patient via n8n."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8014)
