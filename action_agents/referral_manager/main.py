from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Referral Manager API", description="Action Agent A6 for managing patient referrals")

class ReferralRequest(BaseModel):
    patient_id: str
    referring_hospital_id: str
    target_hospital_id: str
    reason: str
    clinical_summary: str

@app.post("/refer")
async def create_referral(req: ReferralRequest):
    try:
        # MOCK LOGIC: Save referral to Supabase, which triggers n8n webhook
        # n8n then notifies the target hospital's queue and sends SMS to patient.
        
        return {
            "status": "success",
            "referral_id": "ref_987654321",
            "message": f"Referral created successfully to {req.target_hospital_id}. n8n notification sent."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8016)
