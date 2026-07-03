from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random

app = FastAPI(title="Hospital Locator API", description="Action Agent A2 for finding nearest facilities")

class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    required_tier: str # e.g. "PHC", "CHC", "District Hospital"

@app.post("/locate")
async def locate_hospital(req: LocationRequest):
    try:
        # MOCK LOGIC: In reality, this would run a PostGIS query against Supabase
        # e.g., SELECT * FROM facilities ORDER BY location <-> st_setsrid(st_makepoint(long, lat), 4326)
        
        mock_facilities = [
            {"id": "hosp_1", "name": "Rural PHC Alpha", "tier": "PHC", "distance_km": round(random.uniform(1.0, 5.0), 1)},
            {"id": "hosp_2", "name": "District Hospital Beta", "tier": "District Hospital", "distance_km": round(random.uniform(10.0, 30.0), 1)}
        ]
        
        # Filter by requested tier (mocked)
        suitable = [f for f in mock_facilities if req.required_tier in f["tier"]]
        if not suitable:
            suitable = mock_facilities # Fallback
            
        # Sort by distance
        suitable.sort(key=lambda x: x["distance_km"])
        
        return {
            "status": "success",
            "nearest_facility": suitable[0],
            "alternatives": suitable[1:]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8012)
