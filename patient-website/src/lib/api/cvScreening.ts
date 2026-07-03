export interface CVScreeningResponse {
  condition: string;
  confidence: number;
  tier: "green" | "yellow" | "orange" | "red";
  heatmapUrl: string;
  explanation: string;
  recommendation: string;
}

export async function uploadImageAndScreen(
  imageFile: File,
  modality: "skin_photo" | "eye" | "oral"
): Promise<CVScreeningResponse> {
  // Simulate POST request to HF Spaces / n8n workflow pipeline
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        condition: modality === "skin_photo" ? "Eczema / Dermatitis" : modality === "eye" ? "Acute Conjunctivitis" : "Oral Squamous Spots",
        confidence: 0.91,
        tier: modality === "skin_photo" ? "green" : modality === "eye" ? "yellow" : "red",
        heatmapUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23000' opacity='0.25'/><circle cx='200' cy='150' r='70' fill='url(%23g)'/><defs><radialGradient id='g'><stop offset='0%' stop-color='%23ff0000' stop-opacity='0.9'/><stop offset='60%' stop-color='%23ffff00' stop-opacity='0.5'/><stop offset='100%' stop-color='%2300ff00' stop-opacity='0'/></defs></svg>",
        explanation: "Simulated analysis run from Hugging Face space backend checks.",
        recommendation: "Avoid irritation. Wash with clean running water. Schedule an Ayurvedic or general consultation at PHC if symptoms remain.",
      });
    }, 1200);
  });
}
