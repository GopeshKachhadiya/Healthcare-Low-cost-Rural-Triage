/**
 * Agent P3: Result Interpreter
 * Runs on-device to translate raw API probabilities into patient-friendly UI.
 */

export class ResultInterpreter {
    static determineSeverity(predictions, topClass, confidence) {
        // Rule based overrides
        const redFlagConditions = ['mel', 'bcc', 'akiec']; // Melanoma, Basal Cell, etc.
        
        if (confidence < 0.60) {
            return { tier: "Gray", message: "Result inconclusive. Please retake photo." };
        }
        
        if (redFlagConditions.includes(topClass)) {
            return { tier: "Red", message: "Suspicious lesion detected. Immediate doctor review required." };
        }
        
        return { tier: "Green", message: "No critical abnormalities detected. Monitor for changes." };
    }

    static processApiResult(apiResponse) {
        const { predictions, top_class, confidence } = apiResponse;
        
        const severityInfo = this.determineSeverity(predictions, top_class, confidence);
        
        return {
            condition: top_class,
            confidence: Math.round(confidence * 100) + "%",
            severity: severityInfo.tier,
            patient_instruction: severityInfo.message,
            trigger_escalation: severityInfo.tier === "Red" || severityInfo.tier === "Orange"
        };
    }
}
