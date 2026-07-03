from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="Red-Flag Monitor API", description="Safety Agent S1 for emergency detection")

class MonitorRequest(BaseModel):
    text_input: str
    source: str = "patient_chat"

print("Loading pre-trained zero-shot classifier for emergency detection...")
emergency_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
print("Model loaded.")

@app.post("/scan")
async def scan_for_red_flags(req: MonitorRequest):
    try:
        query = req.text_input.lower()
        
        # Hard-coded keyword rules (as per spec)
        hard_coded_flags = ["chest pain", "severe breathlessness", "convulsion", "uncontrolled bleeding", "facial droop", "suicide", "dying"]
        has_keyword = any(flag in query for flag in hard_coded_flags)
        
        # NLP Zero-shot classification backup
        candidate_labels = ["medical emergency", "routine inquiry"]
        results = emergency_classifier(query, candidate_labels)
        is_nlp_emergency = results['labels'][0] == "medical emergency" and results['scores'][0] > 0.8
        
        is_emergency = has_keyword or is_nlp_emergency
        
        # If is_emergency is True, this endpoint would normally trigger a Supabase webhook to n8n
        # to immediately page/escalate to the on-call doctor.
        
        return {
            "status": "success",
            "is_emergency": is_emergency,
            "reason": "Keyword match" if has_keyword else ("NLP match" if is_nlp_emergency else "None"),
            "action_taken": "Escalated to n8n workflow W1" if is_emergency else "None"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8021)
