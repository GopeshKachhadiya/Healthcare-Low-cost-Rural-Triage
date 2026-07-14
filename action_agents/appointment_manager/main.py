from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import datetime

app = FastAPI(title="Appointment Manager API", description="Action Agent A1 for managing patient appointments")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AppointmentRequest(BaseModel):
    patient_id: str
    hospital_id: str
    reason: str
    urgency_tier: str  # Green, Yellow, Orange, Red
    patient_name: Optional[str] = None

# In-memory database with pre-populated appointments
appointments_db = [
    {
        "appointment_id": "apt-001",
        "patient_id": "rahul-sharma",
        "patient_name": "Rahul Sharma",
        "reason": "Booked automatically by AI triage for high fever.",
        "urgency_tier": "Red",
        "status": "scheduled",
        "created_at": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat()
    },
    {
        "appointment_id": "apt-002",
        "patient_id": "priya-patel",
        "patient_name": "Priya Patel",
        "reason": "Patient requested appointment during symptom check.",
        "urgency_tier": "Yellow",
        "status": "pending",
        "created_at": (datetime.datetime.now() - datetime.timedelta(minutes=45)).isoformat()
    }
]

@app.post("/create")
async def create_appointment(req: AppointmentRequest):
    try:
        mock_appointment_id = f"apt_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        patient_name = req.patient_name
        if not patient_name:
            patient_name = "Patient " + req.patient_id[:5] if len(req.patient_id) > 5 else "Patient " + req.patient_id
            if "test" in req.patient_id.lower():
                patient_name = "Test Patient"
            
        new_apt = {
            "appointment_id": mock_appointment_id,
            "patient_id": req.patient_id,
            "patient_name": patient_name,
            "hospital_id": req.hospital_id,
            "reason": req.reason,
            "urgency_tier": req.urgency_tier,
            "status": "scheduled" if req.urgency_tier.lower() in ("red", "orange") else "pending",
            "created_at": datetime.datetime.now().isoformat()
        }
        appointments_db.insert(0, new_apt)
        
        return {
            "status": "success",
            "appointment_id": mock_appointment_id,
            "patient_id": req.patient_id,
            "hospital_id": req.hospital_id,
            "scheduled_time": "TBD by hospital",
            "message": "Appointment created. Hospital has been notified via n8n webhook."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/appointments")
async def get_appointments(source_type: Optional[str] = None):
    return appointments_db

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011)
