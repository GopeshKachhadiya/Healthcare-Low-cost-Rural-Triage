from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI(title="Red-Flag Monitor API", description="Safety Agent S1 for emergency detection")

class MonitorRequest(BaseModel):
    text_input: str
    source: str = "patient_chat"

print("Using Groq API for emergency detection...")

@app.post("/scan")
async def scan_for_red_flags(req: MonitorRequest):
    try:
        query = req.text_input.lower()
        
        # Hard-coded keyword rules (as per spec)
        hard_coded_flags = ["chest pain", "severe breathlessness", "convulsion", "uncontrolled bleeding", "facial droop", "suicide", "dying"]
        has_keyword = any(flag in query for flag in hard_coded_flags)
        
        # NLP classification via Groq API
        is_nlp_emergency = False
        if not has_keyword and GROQ_API_KEY:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    json={
                        "model": "llama3-8b-8192",
                        "messages": [
                            {"role": "system", "content": "You are a medical triage system. Reply only with 'True' if the following text indicates a medical emergency, and 'False' otherwise."},
                            {"role": "user", "content": query}
                        ],
                        "temperature": 0.0
                    }
                )
                if resp.status_code == 200:
                    reply = resp.json()['choices'][0]['message']['content'].strip().lower()
                    is_nlp_emergency = 'true' in reply
        
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
