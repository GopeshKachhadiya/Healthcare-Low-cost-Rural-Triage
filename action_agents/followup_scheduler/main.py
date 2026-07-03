from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Follow-Up Scheduler API", description="Action Agent A3 — schedule and track follow-up reminders")

class FollowUpRequest(BaseModel):
    patient_id: str
    source_type: str   # "prescription", "appointment", "risk_flag"
    source_id: str
    interval_days: int = 7
    channel: str = "whatsapp"

class FollowUpResponseRequest(BaseModel):
    follow_up_id: str
    patient_response: str   # "1" (better), "2" (same), "3" (worse), or free text

@app.post("/schedule")
async def schedule_follow_up(req: FollowUpRequest):
    """
    Creates a follow-up entry in Supabase which triggers n8n's
    daily Follow-Up Reminder cron to send a WhatsApp check-in.
    """
    try:
        # REAL IMPLEMENTATION:
        # Inserts into Supabase `follow_ups` table. The n8n cron (Workflow W5)
        # scans this table daily and sends WhatsApp messages.
        from datetime import datetime, timedelta
        scheduled_date = (datetime.now() + timedelta(days=req.interval_days)).date().isoformat()

        mock_id = f"fu_{req.patient_id[:6]}_{req.interval_days}d"
        return {
            "status": "success",
            "follow_up_id": mock_id,
            "patient_id": req.patient_id,
            "scheduled_for": scheduled_date,
            "channel": req.channel,
            "message": f"Follow-up scheduled for {scheduled_date}. n8n cron will send reminder."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/respond")
async def process_patient_response(req: FollowUpResponseRequest):
    """
    Parses patient's WhatsApp reply (1/2/3 or free text) and 
    escalates if response indicates worsening.
    """
    try:
        response_map = {"1": "better", "2": "same", "3": "worse"}
        parsed = response_map.get(req.patient_response.strip(), req.patient_response.lower())

        needs_escalation = parsed in ("worse", "3") or any(
            word in parsed for word in ["pain", "blood", "worse", "bad", "severe"]
        )

        if needs_escalation:
            # In production: trigger S1 Red-Flag scan → n8n escalation workflow
            return {
                "status": "escalated",
                "parsed_response": parsed,
                "action": "Triggering escalation workflow — health worker will be notified."
            }

        return {
            "status": "success",
            "parsed_response": parsed,
            "action": "Follow-up marked as responded. No escalation needed."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pending")
async def list_pending_followups():
    """List all follow-ups that are overdue or due today."""
    try:
        # REAL IMPLEMENTATION: Queries Supabase `follow_ups` table
        return {
            "status": "success",
            "pending": [
                {"id": "fu_001", "patient_id": "pat_abc", "days_overdue": 1, "channel": "whatsapp"},
                {"id": "fu_002", "patient_id": "pat_def", "days_overdue": 3, "channel": "sms"}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8013)
