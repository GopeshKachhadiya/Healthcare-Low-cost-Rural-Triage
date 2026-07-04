from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import os
import json
import httpx
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Try loading .env
for env_path in [
    os.path.join(os.path.dirname(__file__), '../../.env'),
    os.path.join(os.getcwd(), '.env'),
    '.env'
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI(title="Imaging Result Interpreter API", description="Agent H6 for translating raw imaging model outputs into clinical reports")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InterpreterRequest(BaseModel):
    modality: str
    raw_results: Dict[str, Any]

@app.post("/interpret")
async def interpret_results(req: InterpreterRequest):
    try:
        # Default mock fallback
        is_critical = False
        findings = []
        mod = req.modality.lower()
        if mod == "xray":
            tb_prob = req.raw_results.get("Tuberculosis", 0)
            pneumonia_prob = req.raw_results.get("Pneumonia", 0)
            if tb_prob > 0.8:
                findings.append("High probability of Tuberculosis.")
                is_critical = True
            if pneumonia_prob > 0.8:
                findings.append("High probability of Pneumonia.")
        elif mod == "mri":
            tumor_type = req.raw_results.get("top_class", "")
            if tumor_type in ["Glioma", "Meningioma"]:
                findings.append(f"Suspicious mass detected: likely {tumor_type}.")
                is_critical = True
                
        fallback_tier = "Red" if is_critical else "Yellow"
        fallback_summary = " ".join(findings) if findings else "No critical abnormalities found."
        fallback_attention = is_critical

        if GROQ_API_KEY:
            try:
                system_prompt = (
                    "You are an AI Clinical Imaging Interpreter (Agent H6). Your task is to interpret raw computer vision model outputs "
                    "for medical imaging modalities (such as Chest X-ray, Brain MRI, and Cancer Screening) and generate "
                    "a professional clinical report and recommend a triage tier (Green, Yellow, Orange, Red).\n\n"
                    "Please output ONLY a valid JSON object with the following keys, without markdown backticks:\n"
                    "{\n"
                    '  "tier": "Green" | "Yellow" | "Orange" | "Red",\n'
                    '  "report_summary": "A professional paragraph summarizing the findings, potential differentials, and recommendations.",\n'
                    '  "requires_immediate_attention": true | false\n'
                    "}"
                )
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {
                                    "role": "user",
                                    "content": f"Modality: {req.modality}\nRaw results: {json.dumps(req.raw_results)}"
                                }
                            ],
                            "temperature": 0.1,
                            "response_format": {"type": "json_object"}
                        }
                    )
                    if resp.status_code == 200:
                        data = json.loads(resp.json()['choices'][0]['message']['content'].strip())
                        return {
                            "status": "success",
                            "tier": data.get("tier", fallback_tier),
                            "report_summary": data.get("report_summary", fallback_summary),
                            "requires_immediate_attention": data.get("requires_immediate_attention", fallback_attention)
                        }
            except Exception as e:
                print(f"Groq interpretation failed, using mock fallback: {e}")
                
        return {
            "status": "success",
            "tier": fallback_tier,
            "report_summary": fallback_summary,
            "requires_immediate_attention": fallback_attention
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
