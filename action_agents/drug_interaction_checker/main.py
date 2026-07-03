from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Drug Interaction Checker API", description="Action Agent A5 for checking drug-drug interactions")

class InteractionRequest(BaseModel):
    new_drugs: List[str]
    current_drugs: List[str]

@app.post("/check")
async def check_interaction(req: InteractionRequest):
    try:
        # MOCK LOGIC
        # In reality, this would query a vector database (pgvector) using RAG
        # to find known interactions between the provided drugs.
        
        interactions = []
        severity = "None"
        
        # Simple mock interaction rule
        all_drugs = [d.lower() for d in req.new_drugs + req.current_drugs]
        if "warfarin" in all_drugs and "aspirin" in all_drugs:
            severity = "Major"
            interactions.append({
                "drugs": ["warfarin", "aspirin"],
                "description": "Increased risk of bleeding.",
                "severity": "Major"
            })
        
        response = {
            "status": "success",
            "interactions_found": len(interactions) > 0,
            "overall_severity": severity,
            "details": interactions
        }
        
        return response
    
    except Exception as e:
        return {"error": str(e), "status": "failed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
