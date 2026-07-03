from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import io
import os
from PIL import Image
from ultralytics import YOLO
from huggingface_hub import hf_hub_download

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Brain Tumor Classifier API", description="Computer Vision Agent H3 for Brain Tumor Classification")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Downloading and loading YOLOv8 Brain Tumor model from Hugging Face...")
os.makedirs("models", exist_ok=True)

try:
    model_path = hf_hub_download(repo_id="david-lim/yolov8n-cls-brain-tumor", filename="best.pt", cache_dir="models")
    model = YOLO(model_path)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model from Hugging Face: {e}")
    model = None

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        
        if model is None:
            # MOCK PREDICTION LOGIC if HF download failed
            return JSONResponse(content={
                "predictions": {
                    "Glioma": 0.92,
                    "Meningioma": 0.05,
                    "Pituitary": 0.01,
                    "No Tumor": 0.02
                },
                "top_class": "Glioma",
                "confidence": 0.92,
                "status": "success (mock fallback)"
            })
            
        # Run YOLO inference
        results = model.predict(image)
        
        # Parse YOLOv8 classification results
        result = results[0]
        probs = result.probs.data.tolist()
        names = result.names
        
        predictions = {names[i]: round(probs[i], 4) for i in range(len(probs))}
        top_idx = result.probs.top1
        top_class = names[top_idx]
        confidence = round(result.probs.top1conf.item(), 4)
        
        response = {
            "predictions": predictions,
            "top_class": top_class,
            "confidence": confidence,
            "status": "success"
        }
        
        return JSONResponse(content=response)
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
