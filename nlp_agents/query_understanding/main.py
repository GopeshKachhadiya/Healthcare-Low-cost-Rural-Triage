from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="Query Understanding API", description="NLP Agent R2 for Intent and Entity Extraction")

class QueryRequest(BaseModel):
    query: str
    session_id: str = None

print("Loading pre-trained models...")
intent_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
ner_extractor = pipeline("token-classification", model="d4data/biomedical-ner-all", aggregation_strategy="simple")
print("Models loaded successfully.")

@app.post("/analyze")
async def analyze_query(req: QueryRequest):
    try:
        query = req.query.lower()
        
        # 1. Intent Classification using Zero-Shot
        candidate_labels = ["symptom check", "emergency", "appointment request", "general health", "disease info", "medicine info"]
        intent_results = intent_classifier(query, candidate_labels)
        predicted_intent = intent_results['labels'][0]
        
        # 2. Medical NER Extraction
        entities_raw = ner_extractor(req.query)
        # Clean up output format
        entities = [{"entity": e["entity_group"], "word": e["word"], "score": float(e["score"])} for e in entities_raw]
        
        # 3. Emergency Red-Flag check
        is_emergency = (predicted_intent == "emergency") or any(word in query for word in ["pain", "blood", "severe", "dying"])
        
        response = {
            "query": req.query,
            "intent": predicted_intent,
            "entities": entities,
            "red_flag": is_emergency,
            "status": "success"
        }
        
        return response
    
    except Exception as e:
        return {"error": str(e), "status": "failed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
