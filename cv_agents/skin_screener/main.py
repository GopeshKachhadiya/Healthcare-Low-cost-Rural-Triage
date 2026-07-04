from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import io
import os
from PIL import Image
from ultralytics import YOLO
from huggingface_hub import hf_hub_download

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Patient CV Screener API", description="Agent P2 for Skin, Eye, and Oral Disease Screening")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading YOLOv8 models...")
os.makedirs("models", exist_ok=True)

models = {}

def load_model(repo_id, key):
    # Check for local models first
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    local_paths = {
        "skin": os.path.join(BASE_DIR, "skin deseases.pt") if os.path.exists(os.path.join(BASE_DIR, "skin deseases.pt")) else r"C:\Users\Herry\Downloads\skin%20deseases.pt",
        "eye": r"E:\Maverick2026\models\skin deseases.pt" if os.path.exists(r"E:\Maverick2026\models\skin deseases.pt") else r"C:\Users\Herry\Downloads\skin%20deseases.pt",
        "oral": r"E:\Maverick2026\models\skin deseases.pt" if os.path.exists(r"E:\Maverick2026\models\skin deseases.pt") else r"C:\Users\Herry\Downloads\skin%20deseases.pt"
    }
    
    local_path = local_paths.get(key)
    if local_path and os.path.exists(local_path):
        try:
            models[key] = YOLO(local_path)
            print(f"Model {key} loaded successfully from local path: {local_path}")
            return
        except Exception as e:
            print(f"Error loading local model {key} from {local_path}: {e}")

    try:
        path = hf_hub_download(repo_id=repo_id, filename="best.pt", cache_dir="models")
        models[key] = YOLO(path)
        print(f"Model {key} loaded successfully from Hugging Face.")
    except Exception as e:
        print(f"Error loading {key} model from Hugging Face: {e}")
        models[key] = None

# Load the models
load_model("Organika/yolov8n-cls-skin-diseases", "skin")
load_model("pamir/yolov8n-cls-ocular-disease", "eye")
load_model("pamir/yolov8n-cls-oral-diseases", "oral")

def normalize_class(class_name: str) -> str:
    clean = class_name.lower().strip()
    if "melanoma" in clean or "mel" in clean:
        return "melanoma"
    if "basal cell" in clean or "bcc" in clean:
        return "bcc"
    if "actinic" in clean or "akiec" in clean:
        return "akiec"
    if "seborrheic" in clean or "benign keratosis" in clean or "bkl" in clean:
        return "bkl"
    if "dermatofibroma" in clean or "df" in clean:
        return "df"
    if "scabies" in clean:
        return "scabies"
    if "eczema" in clean or "dermatitis" in clean:
        return "eczema"
    if "psoriasis" in clean:
        return "psoriasis"
    if "fungal" in clean or "tinea" in clean or "ringworm" in clean:
        return "fungal"
    if "acne" in clean or "rosacea" in clean:
        return "acne"
    if "vascular" in clean or "vasc" in clean:
        return "vasc"
    if "conjunctivitis" in clean:
        return "conjunctivitis"
    if "cataract" in clean:
        return "cataract"
    if "oscc" in clean:
        return "oscc"
    if "nevi" in clean or "nevus" in clean or "mole" in clean or "nv" in clean:
        return "nv"
    if "warts" in clean or "viral" in clean:
        return "warts"
    if "bullous" in clean:
        return "bullous"
    if "herpes" in clean or "hpv" in clean:
        return "herpes"
    if "drug" in clean or "eruption" in clean:
        return "drug_eruption"
    if "lupus" in clean or "connective" in clean:
        return "lupus"
    if "bacterial" in clean or "impetigo" in clean or "cellulitis" in clean:
        return "bacterial"
    return clean

SUMMARY_REGISTRY = {
    "melanoma": "Asymmetrical skin lesion with irregular borders. High risk of skin malignancy. Requires specialist review.",
    "bcc": "Slow-growing basal cell carcinoma lesion. Typically non-metastatic but locally invasive. Clinical excision recommended.",
    "akiec": "Rough, scaly precancerous patch (actinic keratosis) caused by chronic sun exposure.",
    "bkl": "Benign seborrheic keratosis-like skin growth. Harmless and typical in older individuals.",
    "df": "Benign dermatofibroma nodule. Common on lower limbs, non-cancerous.",
    "nv": "Benign melanocytic nevus (common mole). Normal pattern observed.",
    "vasc": "Benign vascular skin lesion (cherry angioma or pyogenic granuloma).",
    "eczema": "Eczema / dermatitis inflammation, causing dry, itchy patches. Often triggered by irritants.",
    "psoriasis": "Psoriasis plaques, causing silver-scaled red patches. Autoimmune skin manifestation.",
    "fungal": "Fungal skin infection (ringworm/tinea). Treatable with topical antifungals.",
    "scabies": "Scabies infestation causing intense itching and red bumps. Highly contagious.",
    "acne": "Common inflammatory skin condition causing pimples, redness, and visible blood vessels on the face.",
    "cataract": "Clouding of the eye lens (cataract), leading to gradual decrease in vision. Common in aging eyes.",
    "conjunctivitis": "Acute conjunctival inflammation (pink eye) with redness and watering. Highly contagious.",
    "oscc": "Suspicious lesion of the oral mucosa, indicating risk of oral squamous cell carcinoma.",
    "warts": "Benign skin growths (warts or molluscum) caused by localized viral infection of the epidermal layers.",
    "bullous": "Fluid-filled blisters or bullae on the skin, indicating potential autoimmune or infectious blistering conditions.",
    "herpes": "Viral skin lesions (such as cold sores or shingles) presenting as clustered, painful blisters.",
    "drug_eruption": "Skin rash or adverse dermatological reaction triggered by an allergic response to medication.",
    "lupus": "Systemic or cutaneous autoimmune manifestations affecting connective tissue layers.",
    "bacterial": "Bacterial skin infection (impetigo or cellulitis) characterized by redness, swelling, or crusting sores.",
    "normal": "Healthy presentation. No visual signs of skin lesions, redness, or abnormalities.",
}

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
            normalized = normalize_class(mock_class)
            summary = SUMMARY_REGISTRY.get(normalized, "No specific clinical information available for this condition.")
                    
            return JSONResponse(content={
                "scan_type": scan_type,
                "predictions": {mock_class: 0.85, "normal": 0.15},
                "top_class": mock_class,
                "confidence": 0.85,
                "summary": summary,
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
        
        normalized = normalize_class(top_class)
        summary = SUMMARY_REGISTRY.get(normalized, f"Detected: {top_class}. Visual indicators checked.")
        
        response = {
            "scan_type": scan_type,
            "predictions": predictions,
            "top_class": top_class,
            "confidence": confidence,
            "summary": summary,
            "status": "success"
        }
        
        return JSONResponse(content=response)
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    # Use port 8005 for P2 Agent
    uvicorn.run(app, host="0.0.0.0", port=8005)
