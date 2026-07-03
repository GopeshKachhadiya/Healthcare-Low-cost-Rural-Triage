from fastapi import FastAPI, HTTPException
from typing import List, Dict

app = FastAPI(title="Monitoring & Dashboard API", description="Agents M1 (Queue), M2 (Area Dashboard), M3 (Follow-ups)")

@app.get("/queue")
async def get_case_queue():
    """Agent M1: Case Queue Manager"""
    try:
        # MOCK LOGIC: Real app fetches from Supabase real-time queue
        return {
            "status": "success",
            "cases": [
                {"patient_id": "p_001", "tier": "Red", "waiting_time_mins": 45, "condition": "Severe Chest Pain"},
                {"patient_id": "p_002", "tier": "Orange", "waiting_time_mins": 120, "condition": "Suspicious Skin Lesion"}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard")
async def get_area_dashboard(region: str = "all"):
    """Agent M2: Area Dashboard Aggregator"""
    try:
        # MOCK LOGIC: Runs SQL aggregations on de-identified CV results
        return {
            "status": "success",
            "region": region,
            "disease_distribution": {
                "Tuberculosis": 120,
                "Pneumonia": 340,
                "Melanoma": 12,
                "Oral Cancer": 5
            },
            "recent_outbreaks_detected": ["Tuberculosis in Village A"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/followups")
async def get_pending_followups():
    """Agent M3: Follow-up Tracker"""
    try:
        # MOCK LOGIC: Checks Supabase for overdue follow-ups
        return {
            "status": "success",
            "pending_followups": [
                {"patient_id": "p_005", "days_overdue": 2, "action_required": "Call Patient"},
                {"patient_id": "p_010", "days_overdue": 5, "action_required": "Send Health Worker"}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8041)
