from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random

app = FastAPI(title="Consent & Privacy Gate API", description="Safety Agent S2 for enforcing consent policies")

class ConsentRequest(BaseModel):
    patient_id: str
    action: str  # e.g., "abdm_sync", "doctor_view", "ai_processing"

@app.post("/verify")
async def verify_consent(req: ConsentRequest):
    try:
        # MOCK LOGIC: In reality, checks the 'patients' table in Supabase 
        # to see if the user has given consent for this specific action.
        
        # Mocking a 90% consent rate
        has_consent = random.random() < 0.90
        
        if not has_consent:
            return {
                "status": "denied",
                "message": f"Patient has not provided consent for action: {req.action}"
            }
            
        return {
            "status": "approved",
            "message": "Consent verified."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8022)
