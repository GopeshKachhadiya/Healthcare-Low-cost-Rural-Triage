import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UploadCloud, RefreshCw, Eye, Activity, ShieldAlert, Image as ImageIcon } from "lucide-react";
import PulseDivider from "../../components/PulseDivider";
import UploadDropzone from "../../components/UploadDropzone";

export default function HospitalImaging() {
  const [modality, setModality] = useState<"mri" | "xray">("mri");
  const [aiStatus, setAiStatus] = useState<"idle" | "analyzing" | "done">("idle");
  const [aiResult, setAiResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUploadImage = async (file: File) => {
    setAiStatus("analyzing");
    setErrorMsg("");
    setAiResult(null);
    
    // Create local preview URL
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);

    const formData = new FormData();
    formData.append("file", file);

    const port = modality === "mri" ? 8002 : 8004;
    const url = `http://localhost:${port}/predict`;

    try {
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (modality === "mri") {
        setAiResult({
          type: data.tumor_detected ? "Brain Tumor Detected" : "No Tumor Detected",
          confidence: data.confidence || 0.85,
          raw: data
        });
      } else {
        setAiResult({
          type: data.top_class || "Analysis Complete",
          confidence: data.confidence || 0.85,
          predictions: data.predictions,
          raw: data
        });
      }
      setAiStatus("done");
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setErrorMsg(err.message || `Failed to connect to ${modality.toUpperCase()} analyzer on port ${port}. Please ensure agents are running.`);
      setAiStatus("idle");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/hospital"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink hover:border-teal-400 hover:text-teal-600 transition-all shadow-sm shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-teal-700">Dedicated Imaging Suite</h1>
          <p className="text-sm text-ink/60">Standalone Brain MRI and Chest X-ray Analysis</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-tier-red/10 bg-tier-red-bg p-4 text-sm font-semibold text-tier-red">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Settings Panel */}
        <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-6">
          <div>
            <h3 className="font-semibold text-ink mb-3">Select Modality</h3>
            <div className="space-y-3">
              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border ${modality === 'mri' ? 'border-teal-500 bg-teal-50/50' : 'border-ink/10 hover:bg-ink/5'}`}>
                <input
                  type="radio"
                  name="modality"
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                  checked={modality === "mri"}
                  onChange={() => setModality("mri")}
                />
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-teal-600" />
                  <span className="text-sm font-medium text-ink">Brain MRI Tumor Segmentation</span>
                </div>
              </label>

              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border ${modality === 'xray' ? 'border-teal-500 bg-teal-50/50' : 'border-ink/10 hover:bg-ink/5'}`}>
                <input
                  type="radio"
                  name="modality"
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                  checked={modality === "xray"}
                  onChange={() => setModality("xray")}
                />
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  <span className="text-sm font-medium text-ink">Chest X-ray Analysis</span>
                </div>
              </label>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100">
            <strong>Note:</strong> Uploading an image here will immediately send it to your local PyTorch models on port {modality === 'mri' ? '8002' : '8004'} for inference.
          </div>
        </div>

        {/* Upload & Results Panel */}
        <div className="md:col-span-2 space-y-6">
          {aiStatus === "idle" && (
            <div className="bg-white p-6 rounded-xl border border-ink/10 shadow-sm">
              <h3 className="font-semibold text-ink mb-4">Upload Scan</h3>
              <UploadDropzone
                onFileSelected={(file) => handleUploadImage(file)}
              />
            </div>
          )}

          {aiStatus === "analyzing" && (
            <div className="rounded-xl border border-ink/10 bg-white p-12 text-center shadow-sm">
              <RefreshCw className="h-10 w-10 text-teal-600 animate-spin mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-teal-700">Analyzing Scan...</h2>
              <p className="mt-2 text-sm text-ink/60">Running inference through local ML model</p>
            </div>
          )}

          {aiStatus === "done" && aiResult && (
            <div className="rounded-xl border border-ink/10 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-ink/10 bg-teal-50 flex justify-between items-center">
                <h3 className="font-bold text-teal-900 text-lg">Analysis Complete</h3>
                <button 
                  onClick={() => { setAiStatus("idle"); setAiResult(null); setImageUrl(null); }}
                  className="px-3 py-1 bg-white border border-teal-200 text-teal-700 rounded shadow-sm text-xs font-semibold hover:bg-teal-100"
                >
                  Analyze Another
                </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold uppercase text-ink/50 mb-2">Original Scan</h4>
                  {imageUrl ? (
                    <img src={imageUrl} alt="Uploaded scan" className="w-full rounded-lg border border-ink/20 shadow-sm" />
                  ) : (
                    <div className="aspect-square bg-ink/5 rounded-lg border border-ink/20 flex items-center justify-center text-ink/40">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="text-xs font-bold uppercase text-ink/50 mb-2">AI Findings</h4>
                  <div className="bg-ink/5 p-4 rounded-lg space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-ink/60">Primary Prediction</div>
                      <div className="text-xl font-extrabold text-ink">{aiResult.type}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-semibold text-ink/60">Confidence Score</div>
                      <div className="text-lg font-bold text-teal-600">{Math.round(aiResult.confidence * 100)}%</div>
                    </div>
                    
                    {aiResult.predictions && (
                      <div className="pt-2 border-t border-ink/10">
                        <div className="text-xs font-semibold text-ink/60 mb-2">Detailed Class Probabilities:</div>
                        <div className="space-y-1">
                          {Object.entries(aiResult.predictions).slice(0, 5).map(([disease, prob]: any) => (
                            <div key={disease} className="flex justify-between text-sm">
                              <span className="text-ink/80">{disease}</span>
                              <span className="font-mono text-ink">{Math.round(prob * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
