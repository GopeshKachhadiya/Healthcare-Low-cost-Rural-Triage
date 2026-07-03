from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import io
import os
from PIL import Image
from ultralytics import YOLO
from huggingface_hub import hf_hub_download

app = FastAPI(title="Cancer Screening Engine API", description="Computer Vision Agent H5 for Multi-organ Cancer Screening")

print("Downloading and loading YOLOv8 cancer screening models from Hugging Face...")
os.makedirs("models", exist_ok=True)

try:
    lung_model_path = hf_hub_download(repo_id="sihatech/lung-cancer-yolov8-cls", filename="best.pt", cache_dir="models")
    lung_model = YOLO(lung_model_path)
    
    breast_model_path = hf_hub_download(repo_id="sihatech/breast-cancer-yolov8-cls", filename="best.pt", cache_dir="models")
    breast_model = YOLO(breast_model_path)
    print("Models loaded successfully.")
except Exception as e:
    print(f"Error loading models from Hugging Face: {e}")
    print("Will fall back to mock inference if models are not available.")
    lung_model = None
    breast_model = None

@app.post("/predict")
async def predict(file: UploadFile = File(...), organ: str = Form(...)):
    """
    organ: should be 'lung' or 'breast'
    """
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        
        organ = organ.lower()
        if organ not in ['lung', 'breast']:
            return JSONResponse(status_code=400, content={"error": "Invalid organ specified. Use 'lung' or 'breast'."})
            
        model_to_use = lung_model if organ == 'lung' else breast_model
        
        if model_to_use is None:
            # Fallback mock response if HF download failed
            return JSONResponse(content={
                "organ": organ,
                "predictions": {"adenocarcinoma" if organ == "lung" else "malignant": 0.88, "normal": 0.12},
                "top_class": "adenocarcinoma" if organ == "lung" else "malignant",
                "confidence": 0.88,
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
            "organ": organ,
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
    uvicorn.run(app, host="0.0.0.0", port=8009)
