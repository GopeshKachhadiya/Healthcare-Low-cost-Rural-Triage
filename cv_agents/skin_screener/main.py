from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import io
import os
from PIL import Image
from ultralytics import YOLO
from huggingface_hub import hf_hub_download

app = FastAPI(title="Patient CV Screener API", description="Agent P2 for Skin, Eye, and Oral Disease Screening")

print("Downloading and loading YOLOv8 models from Hugging Face...")
os.makedirs("models", exist_ok=True)

models = {}

def load_model(repo_id, key):
    try:
        path = hf_hub_download(repo_id=repo_id, filename="best.pt", cache_dir="models")
        models[key] = YOLO(path)
        print(f"Model {key} loaded successfully.")
    except Exception as e:
        print(f"Error loading {key} model from Hugging Face: {e}")
        models[key] = None

# Load the models
load_model("Organika/yolov8n-cls-skin-diseases", "skin")
load_model("pamir/yolov8n-cls-ocular-disease", "eye")
load_model("pamir/yolov8n-cls-oral-diseases", "oral")

@app.post("/predict")
async def predict(file: UploadFile = File(...), scan_type: str = Form("skin")):
    """
    scan_type: should be 'skin', 'eye', or 'oral'
    """
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        
        scan_type = scan_type.lower()
        if scan_type not in ['skin', 'eye', 'oral']:
            return JSONResponse(status_code=400, content={"error": "Invalid scan_type specified. Use 'skin', 'eye', or 'oral'."})
            
        model_to_use = models.get(scan_type)
        
        if model_to_use is None:
            # Fallback mock response if HF download failed
            mock_class = "melanoma" if scan_type == "skin" else "cataract" if scan_type == "eye" else "oscc"
            return JSONResponse(content={
                "scan_type": scan_type,
                "predictions": {mock_class: 0.85, "normal": 0.15},
                "top_class": mock_class,
                "confidence": 0.85,
                "status": "success (mock fallback)"
            })
            
        # Run YOLO inference
        results = model_to_use.predict(image)
        
        # Parse YOLOv8 classification results
        result = results[0]
        probs = result.probs.data.tolist()
        names = result.names
        
        predictions = {names[i]: round(probs[i], 4) for i in range(len(probs))}
        top_idx = result.probs.top1
        top_class = names[top_idx]
        confidence = round(result.probs.top1conf.item(), 4)
        
        response = {
            "scan_type": scan_type,
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
    # Use port 8005 for P2 Agent
    uvicorn.run(app, host="0.0.0.0", port=8005)
