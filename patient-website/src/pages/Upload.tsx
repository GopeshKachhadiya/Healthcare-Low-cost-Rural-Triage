import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Scan, Tier } from "../context/AppContext";
import { Camera, Image as ImageIcon, ShieldAlert, Sparkles, RefreshCw, UploadCloud, ArrowLeft } from "lucide-react";
import PulseDivider from "../components/PulseDivider";
import UploadDropzone from "../components/UploadDropzone";
import { useCVScreening } from "../hooks/useCVScreening";
import { useTranslation } from "../hooks/useTranslation";

interface PresetCase {
  name: string;
  modality: Scan["modality"];
  condition: string;
  confidence: number;
  tier: Tier;
  image: string;
  heatmap: string;
  explanation: string;
  recommendation: string;
}

const PRESET_CASES: PresetCase[] = [
  {
    name: "Sample: Skin Lesion (Eczema)",
    modality: "skin_photo",
    condition: "Eczema / Dermatitis",
    confidence: 0.89,
    tier: "green",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23e2ccb8'/><circle cx='180' cy='140' r='55' fill='%23ab4747' opacity='0.7'/><circle cx='210' cy='160' r='45' fill='%239e3d3d' opacity='0.8'/></svg>",
    heatmap: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23000' opacity='0.25'/><circle cx='195' cy='150' r='75' fill='url(%23g)'/><defs><radialGradient id='g'><stop offset='0%' stop-color='%23ff0000' stop-opacity='0.95'/><stop offset='60%' stop-color='%23ffff00' stop-opacity='0.6'/><stop offset='100%' stop-color='%2300ff00' stop-opacity='0'/></defs></svg>",
    explanation: "Eczema causes dry, red, itchy, and bumpy skin. In rural environments, it is commonly triggered by hard water, chemical soaps, and agricultural exposure.",
    recommendation: "Wash with clean water and avoid harsh soaps. Apply coconut oil or emollient cream twice daily. If it does not improve in 5 days, seek a PHC consultation.",
  },
  {
    name: "Sample: Suspected Melanoma (Emergency)",
    modality: "skin_photo",
    condition: "Suspicious Melanocytic Lesion (Melanoma Risk)",
    confidence: 0.93,
    tier: "red",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23e6d2c4'/><path d='M170,120 Q190,100 210,130 T240,160 T190,180 Z' fill='%23261a15'/><circle cx='180' cy='135' r='12' fill='%233d2a21'/><circle cx='225' cy='165' r='10' fill='%231f130e'/></svg>",
    heatmap: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23000' opacity='0.25'/><circle cx='205' cy='145' r='60' fill='url(%23g2)'/><defs><radialGradient id='g2'><stop offset='0%' stop-color='%23ff0000' stop-opacity='0.98'/><stop offset='50%' stop-color='%23ff5500' stop-opacity='0.7'/><stop offset='100%' stop-color='%2300ff00' stop-opacity='0'/></defs></svg>",
    explanation: "This lesion displays asymmetry, irregular borders, and color variations. These visual biomarkers are strong signs of melanocytic instability.",
    recommendation: "Immediate referral raised. Do not scratch or biopsy locally. An appointment with Dr. Neha Patel has been auto-escalated at the District Referral Hospital.",
  },
];

export default function Upload() {
  const navigate = useNavigate();
  const { isAnalyzing, currentStep, stepsText, runScreening } = useCVScreening();
  const { t } = useTranslation();

  const [modality, setModality] = useState<Scan["modality"]>("skin_photo");
  const [selectedCase, setSelectedCase] = useState<PresetCase | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const startAnalysis = async (c: PresetCase | null, file?: File) => {
    if (file) {
      setSelectedCase({
        name: file.name,
        modality: modality,
        condition: "Analyzing Custom Upload...",
        confidence: 0.0,
        tier: "green",
        image: "",
        heatmap: "",
        explanation: "",
        recommendation: ""
      });
      setErrorMsg("");
      try {
        const newScanId = await runScreening(modality, undefined, file);
        navigate(`/scan/result/${newScanId}`);
      } catch (err: any) {
        setErrorMsg(err.message || "Quality check or API screening failed.");
      }
    } else if (c) {
      setSelectedCase(c);
      setErrorMsg("");
      try {
        const newScanId = await runScreening(c.modality, c.condition);
        navigate(`/scan/result/${newScanId}`);
      } catch (err: any) {
        setErrorMsg(err.message || "Quality check failed.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      {isAnalyzing ? (
        <div className="rounded-xl border border-ink/10 bg-white p-8 text-center shadow-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 animate-spin">
            <RefreshCw className="h-8 w-8" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-teal-700">Analysing Image</h2>
          <p className="mt-2 text-sm text-ink/60">This runs entirely on your device and works offline</p>

          <div className="mx-auto mt-8 max-w-md">
            <div className="h-2 w-full overflow-hidden rounded-full bg-teal-50">
              <div
                className="h-full bg-teal-500 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / stepsText.length) * 100}%` }}
              />
            </div>
            <p className="mt-4 font-mono text-xs text-teal-600">{stepsText[currentStep]}</p>
          </div>

          {selectedCase && (
            <div className="mx-auto mt-8 max-w-sm rounded-lg border border-ink/5 bg-paper p-3 text-left">
              <span className="text-xs font-semibold text-ink/40 uppercase">Analyzing file:</span>
              <p className="font-semibold text-ink mt-0.5 truncate">{selectedCase.name}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink hover:border-teal-400 hover:text-teal-600 transition-all shadow-sm shrink-0"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-display text-3xl font-bold text-teal-700">{t("scan.title")}</h1>
              <p className="text-sm text-ink/60">Photograph or select a skin lesion or rash.</p>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-lg border border-tier-red/10 bg-tier-red-bg p-4 text-xs font-semibold text-tier-red">
              <ShieldAlert className="h-5 w-5 shrink-0 text-tier-red" />
              <span>{errorMsg}</span>
            </div>
          )}


          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Upload Zone */}
            <UploadDropzone
              onFileSelected={(file) => {
                startAnalysis(null, file);
              }}
              className="md:col-span-2"
            />

            {/* Config & Modality */}
            <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-ink">Scan Settings</h3>
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase">Scan Target</label>
                <div className="mt-2 space-y-2">
                  {[
                    { id: "skin_photo", label: "Skin Condition / Rash" }
                  ].map((m) => (
                    <label key={m.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="modality"
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                        checked={modality === m.id}
                        onChange={() => setModality(m.id as any)}
                      />
                      <span className="text-sm font-medium text-ink/80">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 rounded-lg bg-marigold-50/70 p-3 text-xs text-marigold-600">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Note:</strong> Neural network models run entirely offline in your browser. Raw images are never uploaded unless you book a referral consultation.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
