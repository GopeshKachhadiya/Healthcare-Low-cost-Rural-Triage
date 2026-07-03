from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import datetime

app = FastAPI(title="Appointment Manager API", description="Action Agent A1 for managing patient appointments")

class AppointmentRequest(BaseModel):
    patient_id: str
    hospital_id: str
    reason: str
    urgency_tier: str  # Green, Yellow, Orange, Red

@app.post("/create")
async def create_appointment(req: AppointmentRequest):
    try:
        # MOCK LOGIC: In reality, this would insert a row into Supabase 'appointments' table
        # which would trigger a webhook to n8n for hospital notification.
        
        mock_appointment_id = f"apt_{datetime.datetime.now().strftime('%Y%md%H%M%S')}"
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011)
