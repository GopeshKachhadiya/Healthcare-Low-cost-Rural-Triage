import { useState } from "react";
import { useApp, Scan, Tier } from "../context/AppContext";
import { assessImageQuality } from "../agents/P1_imagePreprocessor";
import { interpretClassification } from "../agents/P3_resultInterpreter";
import { uploadImageAndScreen } from "../lib/api/cvScreening";

const PRESET_CASES: {
  modality: Scan["modality"];
  condition: string;
  confidence: number;
  tier: Tier;
  image: string;
  heatmap: string;
  explanation: string;
  recommendation: string;
}[] = [
  {
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
    modality: "skin_photo",
    condition: "Suspicious Melanocytic Lesion (Melanoma Risk)",
    confidence: 0.93,
    tier: "red",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23e6d2c4'/><path d='M170,120 Q190,100 210,130 T240,160 T190,180 Z' fill='%23261a15'/><circle cx='180' cy='135' r='12' fill='%233d2a21'/><circle cx='225' cy='165' r='10' fill='%231f130e'/></svg>",
    heatmap: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23000' opacity='0.25'/><circle cx='205' cy='145' r='60' fill='url(%23g2)'/><defs><radialGradient id='g2'><stop offset='0%' stop-color='%23ff0000' stop-opacity='0.98'/><stop offset='50%' stop-color='%23ff5500' stop-opacity='0.7'/><stop offset='100%' stop-color='%2300ff00' stop-opacity='0'/></defs></svg>",
    explanation: "This lesion displays asymmetry, irregular borders, and color variations. These visual biomarkers are strong signs of melanocytic instability.",
    recommendation: "Immediate referral raised. Do not scratch or biopsy locally. An appointment with Dr. Neha Patel has been auto-escalated at the District Referral Hospital.",
  },
  {
    modality: "eye",
    condition: "Acute Conjunctivitis",
    confidence: 0.86,
    tier: "yellow",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23fcebe1'/><path d='M100 150 Q200 80 300 150 Q200 220 100 150 Z' fill='%23fcf0eb' stroke='%23d94141' stroke-width='4'/><circle cx='200' cy='150' r='50' fill='%23fca851' stroke='%232b71ab' stroke-width='8'/><circle cx='200' cy='150' r='20' fill='%23000'/><path d='M120 150 Q160 140 170 145 M230 155 Q270 160 280 152' stroke='%23b82727' stroke-width='2' fill='none'/></svg>",
    heatmap: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23000' opacity='0.25'/><circle cx='150' cy='150' r='60' fill='url(%23ge)'/><circle cx='250' cy='150' r='60' fill='url(%23ge)'/><defs><radialGradient id='ge'><stop offset='0%' stop-color='%23ffaa00' stop-opacity='0.9'/><stop offset='70%' stop-color='%23ffff00' stop-opacity='0.5'/><stop offset='100%' stop-color='%2300ff00' stop-opacity='0'/></defs></svg>",
    explanation: "Severe redness in the conjunctival sclera, indicative of viral or bacterial swelling. Highly infectious. Requires clinical review to differentiate and prescribe antibiotic eye drops.",
    recommendation: "Avoid touching or rubbing the eyes. Wash hands frequently. Do not share towels. Visit the clinic within 24-48 hours.",
  }
];

export const STEPS_TEXT = [
  "Loading quantized TFLite engine on-device...",
  "Resizing image to network target input 224x224 px...",
  "Normalizing pixel ranges (ImageNet weights)...",
  "Running forward convolution block passes...",
  "Generating Grad-CAM localization heatmaps...",
  "Finalizing diagnostic confidence weights..."
];

export function useCVScreening() {
  const { addScan, addAppointment, user } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const runScreening = async (
    modality: Scan["modality"],
    selectedCaseName?: string,
    imageFile?: File
  ): Promise<string> => {
    if (imageFile) {
      setIsAnalyzing(true);
      setCurrentStep(0);

      // Create a temporary object URL to assess quality locally using P1 Preprocessor Agent
      const tempUrl = URL.createObjectURL(imageFile);
      try {
        const quality = await assessImageQuality(tempUrl);
        if (!quality.isValid) {
          setIsAnalyzing(false);
          URL.revokeObjectURL(tempUrl);
          throw new Error(quality.message);
        }

        // Simulate on-device progress steps while executing the API request in parallel
        const interval = setInterval(() => {
          setCurrentStep((prev) => {
            if (prev >= STEPS_TEXT.length - 2) {
              clearInterval(interval);
              return prev;
            }
            return prev + 1;
          });
        }, 250);

        // Run actual FastAPI server request on port 8005
        const apiResponse = await uploadImageAndScreen(imageFile, modality);
        
        clearInterval(interval);
        setCurrentStep(STEPS_TEXT.length - 1);

        // Decode top class string to full clinical diagnostic details using P3 Result Interpreter Agent
        const interpretation = interpretClassification(apiResponse.condition, apiResponse.confidence);

        // Call Patient Orchestrator Route to log CV result & auto-escalate if Red/Orange
        try {
          const routeAction = modality === "skin_photo" ? "screen_skin" : modality === "eye" ? "screen_eye" : "screen_oral";
          const response = await fetch("http://127.0.0.1:9000/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patient_id: user?.phone || "+91 98765 43210",
              action: routeAction,
              payload: {
                cv_result: {
                  condition: interpretation.conditionName,
                  confidence: interpretation.confidence,
                  tier: interpretation.tier,
                },
                nearest_hospital_id: interpretation.tier === "red"
                  ? "District Referral Hospital"
                  : "Chandpur Primary Health Centre",
              },
              language: user?.preferredLanguage || "hi",
            }),
          });
        } catch (routeErr) {
          console.error("Orchestrator failed to route CV result:", routeErr);
        }

        const scanId = addScan({
          modality: modality,
          image: tempUrl,
          heatmap: apiResponse.heatmapUrl,
          condition: interpretation.conditionName,
          confidence: interpretation.confidence,
          tier: interpretation.tier,
          explanation: interpretation.explanation,
          recommendation: apiResponse.recommendation || interpretation.recommendation,
          summary: apiResponse.explanation,
        });

        // Auto-schedule referral appointment if it is Red or Orange tier
        if (interpretation.tier === "red" || interpretation.tier === "orange") {
          addAppointment({
            doctorName:
              interpretation.tier === "red"
                ? "Dr. Neha Patel (Dermatology Specialist)"
                : "Dr. Alok Sharma (PHC Medical Officer)",
            facilityName:
              interpretation.tier === "red"
                ? "District Referral Hospital"
                : "Chandpur Primary Health Centre",
            priority: interpretation.tier,
            reason: `AI Screening Triage: ${interpretation.conditionName}`,
          });
        }

        setIsAnalyzing(false);
        return scanId;
      } catch (err: any) {
        setIsAnalyzing(false);
        URL.revokeObjectURL(tempUrl);
        throw new Error(err.message || "Quality check or API screening failed.");
      }
    }

    setIsAnalyzing(true);
    setCurrentStep(0);

    // Find custom case details
    const targetCase =
      PRESET_CASES.find((c) => c.condition.includes(selectedCaseName || "")) ||
      PRESET_CASES.find((c) => c.modality === modality) ||
      PRESET_CASES[0];

    // Assess quality of input image using P1 Agent
    const quality = await assessImageQuality(targetCase.image);
    if (!quality.isValid) {
      setIsAnalyzing(false);
      throw new Error(quality.message);
    }

    // Determine the registry class label for P3 Agent
    let classLabel = "nv";
    if (targetCase.condition.toLowerCase().includes("eczema")) {
      classLabel = "bkl";
    } else if (targetCase.condition.toLowerCase().includes("melanoma")) {
      classLabel = "mel";
    } else if (targetCase.condition.toLowerCase().includes("conjunctivitis")) {
      classLabel = "conjunctivitis";
    }

    // Interpret prediction via P3 Agent
    const interpretation = interpretClassification(classLabel, targetCase.confidence);

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= STEPS_TEXT.length - 1) {
            clearInterval(interval);
            setTimeout(() => {
              // Add scan to history context
              const scanId = addScan({
                modality: targetCase.modality,
                image: targetCase.image,
                heatmap: targetCase.heatmap,
                condition: interpretation.conditionName,
                confidence: interpretation.confidence,
                tier: interpretation.tier,
                explanation: interpretation.explanation,
                recommendation: interpretation.recommendation,
              });

              // Add auto-escalated appointment if tier demands it
              if (interpretation.tier === "red" || interpretation.tier === "orange") {
                addAppointment({
                  doctorName:
                    interpretation.tier === "red"
                      ? "Dr. Neha Patel (Dermatology Specialist)"
                      : "Dr. Alok Sharma (PHC Medical Officer)",
                  facilityName:
                    interpretation.tier === "red"
                      ? "District Referral Hospital"
                      : "Chandpur Primary Health Centre",
                  priority: interpretation.tier,
                  reason: `AI Screening Triage: ${interpretation.conditionName}`,
                });
              }

              setIsAnalyzing(false);
              resolve(scanId);
            }, 600);
            return prev;
          }
          return prev + 1;
        });
      }, 450);
    });
  };

  return {
    isAnalyzing,
    currentStep,
    stepsText: STEPS_TEXT,
    runScreening,
  };
}

