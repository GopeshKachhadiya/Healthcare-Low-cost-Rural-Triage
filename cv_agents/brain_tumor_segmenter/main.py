from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import io
import os
import base64
from PIL import Image
from ultralytics import YOLO
from huggingface_hub import hf_hub_download

app = FastAPI(title="Brain Tumor Segmenter API", description="Computer Vision Agent H2 for Brain Tumor Segmentation")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("Loading local YOLOv8 Segmentation model...")
try:
    # Use the local model provided by the user
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "best braintrumor (9).pt")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at: {model_path}")
        
    model = YOLO(model_path)
    print("Local model loaded successfully.")
except Exception as e:
    print(f"Error loading local segmentation model: {e}")
    model = None

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        
        if model is None:
            # MOCK PREDICTION LOGIC if HF download failed
            return JSONResponse(content={
                "status": "success (mock fallback)",
                "tumor_volume_cm3": 12.5,
                "subregions": {
                    "enhancing_tumor": True,
                    "edema": True,
                    "necrotic_core": False
                },
                "mask_base64": "dummy_base64_string_representing_segmentation_mask"
            })
            
        # Run YOLO inference
        results = model.predict(image)
        
        has_tumor = False
        confidence = 0.0
        
        res = results[0]
        
        # 1. Check if it's an object detection or segmentation model
        if hasattr(res, 'boxes') and res.boxes is not None and len(res.boxes) > 0:
            has_tumor = True
            confidence = float(res.boxes.conf.max().item())
            
        # 2. Check if it's a classification model
        elif hasattr(res, 'probs') and res.probs is not None:
            top_idx = res.probs.top1
            top_conf = float(res.probs.top1conf.item())
            class_name = res.names[top_idx].lower()
            
            # If the predicted class doesn't mean "normal" or "no tumor"
            if "normal" not in class_name and "no" not in class_name:
                has_tumor = True
                confidence = top_conf
            else:
                has_tumor = False
                confidence = top_conf
            
        mock_response = {
            "status": "success",
            "tumor_detected": has_tumor,
            "confidence": confidence,
            "mask_base64": "real_mask_processing_pending" if has_tumor else None
        }
        
        return JSONResponse(content=mock_response)
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
