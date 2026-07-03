from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import httpx
import os

app = FastAPI(title="Language Processor API", description="Agent R1 — ASR, MT, TTS via Bhashini")

BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "YOUR_KEY_HERE")
BHASHINI_BASE = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

SUPPORTED_LANGUAGES = {
    "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
    "kn": "Kannada", "bn": "Bengali", "mr": "Marathi", "en": "English"
}

class TranslateRequest(BaseModel):
    text: str
    source_language: str = "hi"
    target_language: str = "en"

class TTSRequest(BaseModel):
    text: str
    language: str = "hi"

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = "hi"):
    """Transcribe audio to text using Bhashini ASR."""
    try:
        audio_bytes = await file.read()
        import base64
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        payload = {
            "pipelineTasks": [{
                "taskType": "asr",
                "config": {"language": {"sourceLanguage": language}, "serviceId": ""}
            }],
            "inputData": {"audio": [{"audioContent": audio_b64}]}
        }

        # Real call: async with httpx.AsyncClient() as client:
        #     resp = await client.post(BHASHINI_BASE, json=payload,
        #                              headers={"Authorization": BHASHINI_API_KEY})
        #     transcript = resp.json()["pipelineResponse"][0]["output"][0]["source"]

        transcript = "[MOCK] Patient said: I have chest pain since yesterday."

        return {"status": "success", "transcript": transcript, "language": language}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate")
async def translate(req: TranslateRequest):
    """Translate text between languages using Bhashini MT."""
    try:
        payload = {
            "pipelineTasks": [{
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": req.source_language,
                        "targetLanguage": req.target_language
                    },
                    "serviceId": ""
                }
            }],
            "inputData": {"input": [{"source": req.text}]}
        }

        # Real call:
        # async with httpx.AsyncClient() as client:
        #     resp = await client.post(BHASHINI_BASE, json=payload,
        #                              headers={"Authorization": BHASHINI_API_KEY})
        #     translation = resp.json()["pipelineResponse"][0]["output"][0]["target"]

        translation = f"[MOCK TRANSLATION of: {req.text[:50]}...]"

        return {
            "status": "success",
            "original": req.text,
            "translation": translation,
            "source_language": req.source_language,
            "target_language": req.target_language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech audio using Bhashini TTS."""
    try:
        payload = {
            "pipelineTasks": [{
                "taskType": "tts",
                "config": {
                    "language": {"sourceLanguage": req.language},
                    "serviceId": "",
                    "gender": "female"
                }
            }],
            "inputData": {"input": [{"source": req.text}]}
        }

        # Real call would return base64 audio
        # async with httpx.AsyncClient() as client:
        #     resp = await client.post(BHASHINI_BASE, json=payload,
        #                              headers={"Authorization": BHASHINI_API_KEY})
        #     audio_b64 = resp.json()["pipelineResponse"][0]["audio"][0]["audioContent"]

        return {
            "status": "success",
            "audio_base64": "[MOCK_BASE64_AUDIO]",
            "format": "wav",
            "language": req.language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
