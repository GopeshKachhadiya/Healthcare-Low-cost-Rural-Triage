from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import io
import torch
from PIL import Image
import torchvision.transforms as transforms

app = FastAPI(title="X-ray Analyzer API", description="Computer Vision Agent H4 for Chest X-ray Analysis")

try:
    import torchxrayvision as xrv
    import skimage
    print("Loading torchxrayvision model...")
    # Use the densenet121-res224-all model which is trained on multiple datasets
    model = xrv.models.DenseNet(weights="densenet121-res224-all")
    model.eval()
    
    transform = transforms.Compose([
        xrv.datasets.XRayCenterCrop(),
        xrv.datasets.XRayResizer(224)
    ])
    print("Model loaded successfully.")
    HAS_XRV = True
except ImportError:
    print("torchxrayvision not installed. Falling back to mock implementation.")
    HAS_XRV = False

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        content = await file.read()
        
        if HAS_XRV:
            # Process image for torchxrayvision
            import numpy as np
            img = skimage.io.imread(io.BytesIO(content))
            img = xrv.datasets.normalize(img, 255) # normalize to [-1024, 1024]
            # Convert to 2D if it's RGB
            if len(img.shape) == 3:
                img = img.mean(2)
            
            # Add channel dimension
            img = img[None, ...]
            
            # Apply transforms
            img = transform(img)
            img = torch.from_numpy(img).unsqueeze(0)
            
            with torch.no_grad():
                outputs = model(img)
                
            predictions = dict(zip(model.pathologies, outputs[0].detach().numpy().tolist()))
            
            # Find the top class (highest probability)
            top_class = max(predictions, key=predictions.get)
            confidence = predictions[top_class]
            
            # Filter and sort
            sorted_preds = {k: round(v, 4) for k, v in sorted(predictions.items(), key=lambda item: item[1], reverse=True)}
            
            response = {
                "predictions": sorted_preds,
                "top_class": top_class,
                "confidence": round(confidence, 4),
                "status": "success"
            }
        else:
            # MOCK PREDICTION LOGIC if library is missing
            mock_conditions = [
                "Pneumonia", "Tuberculosis", "Cardiomegaly", 
                "Pleural Effusion", "Lung Mass/Nodule", 
                "Atelectasis", "Consolidation", "Normal"
            ]
            
            mock_response = {
                "predictions": {
                    "Tuberculosis": 0.88,
                    "Pneumonia": 0.12,
                    "Lung Mass/Nodule": 0.10,
                    "Pleural Effusion": 0.05,
                    "Cardiomegaly": 0.03,
                    "Atelectasis": 0.02,
                    "Consolidation": 0.01,
                    "Normal": 0.04
                },
                "top_class": "Tuberculosis",
                "confidence": 0.88,
                "status": "success (mock fallback)"
            }
            response = mock_response
        
        return JSONResponse(content=response)
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
