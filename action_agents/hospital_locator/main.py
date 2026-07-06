from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI(title="Hospital Locator API", description="Action Agent A2 for finding nearest facilities")

# Add CORS middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    required_tier: str # e.g. "PHC", "CHC", "District Hospital"

@app.post("/locate")
async def locate_hospital(req: LocationRequest):
    try:
        import requests
        
        # Use Overpass API to find hospitals within 20km radius of the provided location
        overpass_url = "http://overpass-api.de/api/interpreter"
        # Radius in meters (20km)
        radius = 20000 
        
        overpass_query = f"""
        [out:json];
        (
          node["amenity"="hospital"](around:{radius},{req.latitude},{req.longitude});
          way["amenity"="hospital"](around:{radius},{req.latitude},{req.longitude});
        );
        out center;
        """
        
        headers = {
            "User-Agent": "Anvaya-HospitalLocator/1.0"
        }
        response = requests.post(overpass_url, data={'data': overpass_query}, headers=headers, timeout=10)
        
        if response.status_code == 200:
            try:
                data = response.json()
            except ValueError:
                print("Overpass API returned non-JSON:", response.text[:200])
                data = {'elements': []}
        else:
            print(f"Overpass API failed with status {response.status_code}: {response.text[:200]}")
            data = {'elements': []}

        import math
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c
            
        real_facilities = []
        for i, element in enumerate(data.get('elements', [])):
            if i >= 10:  # limit to top 10 to avoid too much data
                break
                
            # Ways have center lat/lon, nodes have lat/lon directly
            h_lat = element.get('lat') or element.get('center', {}).get('lat')
            h_lon = element.get('lon') or element.get('center', {}).get('lon')
            
            if not h_lat or not h_lon:
                continue
                
            tags = element.get('tags', {})
            name = tags.get('name', 'Unknown Hospital')
            
            dist = round(haversine(req.latitude, req.longitude, h_lat, h_lon), 1)
            
            real_facilities.append({
                "id": str(element.get('id')),
                "name": name,
                "tier": "District Hospital" if "District" in name else "PHC",
                "distance_km": dist,
                "lat": h_lat,
                "lng": h_lon,
                "capabilities": ["General Consultation", "Basic Vitals Check"],
                "phone": tags.get('phone', 'N/A'),
                "address": f"{name} area"
            })
            
        # Sort by distance
        real_facilities.sort(key=lambda x: x["distance_km"])
        
        if not real_facilities:
            # Fallback if overpass fails or returns 0
            real_facilities = [{"id": "hosp_fallback", "name": "No hospitals found via OSM", "tier": "PHC", "distance_km": 0, "lat": req.latitude, "lng": req.longitude}]
            
        return {
            "status": "success",
            "nearest_facility": real_facilities[0],
            "alternatives": real_facilities[1:]
        }
    except Exception as e:
        print(f"Error fetching from overpass: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8012)
