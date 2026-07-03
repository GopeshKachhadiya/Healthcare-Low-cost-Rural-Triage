from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

app = FastAPI(title="Imaging Result Interpreter API", description="Agent H6 for translating raw imaging model outputs into clinical reports")

class InterpreterRequest(BaseModel):
    modality: str
    raw_results: Dict[str, Any]

@app.post("/interpret")
async def interpret_results(req: InterpreterRequest):
    try:
        # Rule-based logic to determine severity and format report
        # MOCK LOGIC
        
        is_critical = False
        findings = []
        
        if req.modality.lower() == "xray":
            tb_prob = req.raw_results.get("Tuberculosis", 0)
            pneumonia_prob = req.raw_results.get("Pneumonia", 0)
            
            if tb_prob > 0.8:
                findings.append("High probability of Tuberculosis.")
                is_critical = True
            if pneumonia_prob > 0.8:
                findings.append("High probability of Pneumonia.")
                
        elif req.modality.lower() == "mri":
            tumor_type = req.raw_results.get("top_class", "")
            if tumor_type in ["Glioma", "Meningioma"]:
                findings.append(f"Suspicious mass detected: likely {tumor_type}.")
                is_critical = True
                
        # This endpoint normally logs to 'cv_screenings' table in Supabase
        # and triggers the case queue update.
                
        return {
            "status": "success",
            "tier": "Red" if is_critical else "Yellow",
            "report_summary": " ".join(findings) if findings else "No critical abnormalities found.",
            "requires_immediate_attention": is_critical
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
