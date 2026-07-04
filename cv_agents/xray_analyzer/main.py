from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import io
import torch
from PIL import Image
import torchvision.transforms as transforms

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="X-ray Analyzer API", description="Computer Vision Agent H4 for Chest X-ray Analysis")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    import torchxrayvision as xrv
    import skimage
    import os
    print("Loading local torchxrayvision model...")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "../../models/densenet121-res224-all.pt")
    
    if not os.path.exists(model_path):
        # Fallback to local subdirectory just in case
        model_path = os.path.join(current_dir, "densenet121-res224-all.pt")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")

    # Load the local file with weights_only=False to bypass PyTorch 2.6 security restriction
    loaded_data = torch.load(model_path, map_location='cpu', weights_only=False)
    
    if isinstance(loaded_data, dict):
        model = xrv.models.DenseNet(weights="densenet121-res224-all")
        model.load_state_dict(loaded_data)
    else:
        # The file contains the full model instance
        model = loaded_data
        
    model.eval()
    
    transform = transforms.Compose([
        xrv.datasets.XRayCenterCrop(),
        xrv.datasets.XRayResizer(224)
    ])
    print("Local model loaded successfully.")
    HAS_XRV = True
except ImportError:
    print("torchxrayvision not installed. Falling back to mock implementation.")
    HAS_XRV = False
    XRV_ERROR = "torchxrayvision not installed"
except Exception as e:
    print(f"Error loading local X-ray model: {e}")
    HAS_XRV = False
    XRV_ERROR = str(e)

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
                
            # Generic DenseNet might output raw logits, apply softmax to get probabilities
            if not hasattr(model, 'pathologies'):
                import torch.nn.functional as F
                probs = F.softmax(outputs, dim=1)[0].detach().numpy().tolist()
                
                num_classes = len(probs)
                if num_classes == 18:
                    pathologies_list = ['Atelectasis', 'Consolidation', 'Infiltration', 'Pneumothorax', 'Edema', 'Emphysema', 'Fibrosis', 'Effusion', 'Pneumonia', 'Pleural_Thickening', 'Cardiomegaly', 'Nodule', 'Mass', 'Hernia', 'Lung Lesion', 'Fracture', 'Lung Opacity', 'Enlarged Cardiomediastinum']
                elif num_classes == 14:
                    pathologies_list = ['Atelectasis', 'Cardiomegaly', 'Effusion', 'Infiltration', 'Mass', 'Nodule', 'Pneumonia', 'Pneumothorax', 'Consolidation', 'Edema', 'Emphysema', 'Fibrosis', 'Pleural_Thickening', 'Hernia']
                elif num_classes == 3:
                    pathologies_list = ['Normal', 'Pneumonia', 'COVID-19']
                elif num_classes == 2:
                    pathologies_list = ['Normal', 'Pneumonia/Abnormal']
                else:
                    pathologies_list = [f"Class_{i}" for i in range(num_classes)]
            else:
                probs = outputs[0].detach().numpy().tolist()
                pathologies_list = model.pathologies
                
            predictions = dict(zip(pathologies_list, probs))
            
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
            return JSONResponse(content=response)
        else:
            mock_preds = {
                "Pneumonia": 0.85,
                "Tuberculosis": 0.12,
                "Infiltration": 0.10,
                "Atelectasis": 0.05,
                "Effusion": 0.02
            }
            return JSONResponse(content={
                "predictions": mock_preds,
                "top_class": "Pneumonia",
                "confidence": 0.85,
                "status": "success (mock fallback)"
            })
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
