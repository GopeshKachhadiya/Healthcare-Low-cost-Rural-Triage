import { Tier } from "../context/AppContext";

export interface DiagnosticInterpretation {
  conditionName: string;
  tier: Tier;
  confidence: number;
  explanation: string;
  recommendation: string;
}

const CONDITION_REGISTRY: Record<
  string,
  { name: string; tier: Tier; explanation: string; recommendation: string }
> = {
  // HAM10000 classes
  akiec: {
    name: "Actinic Keratosis / Intraepithelial Carcinoma (Bowen's Disease)",
    tier: "orange",
    explanation: "Pre-cancerous skin lesions commonly appearing as rough, scaly patches from chronic UV/sun exposure.",
    recommendation: "Avoid direct sun exposure. Apply recommended sun block. Visit the PHC within a week for clinical review.",
  },
  bcc: {
    name: "Basal Cell Carcinoma",
    tier: "orange",
    explanation: "A common form of skin cancer that grows slowly and rarely spreads, but requires local excision.",
    recommendation: "Book an appointment at the nearest PHC or CHC. Do not attempt to scrub or self-treat.",
  },
  bkl: {
    name: "Benign Keratosis-like Lesions",
    tier: "green",
    explanation: "Non-cancerous skin growths such as seborrheic keratoses. Common in aging populations.",
    recommendation: "Keep the area moisturized. General routine observation. No immediate action required.",
  },
  df: {
    name: "Dermatofibroma",
    tier: "green",
    explanation: "Harmless, firm, red-to-brown skin nodules that typically appear on lower legs.",
    recommendation: "No treatment necessary unless it causes pain or undergoes rapid sizing changes.",
  },
  mel: {
    name: "Malignant Melanoma",
    tier: "red",
    explanation: "A serious type of skin cancer displaying asymmetry, irregular borders, and color variations.",
    recommendation: "IMMEDIATE REFERRAL: Referral generated for dermatology oncologist. Visit the District Hospital immediately.",
  },
  nv: {
    name: "Melanocytic Nevus (Normal Mole)",
    tier: "green",
    explanation: "Common benign mole. A clusters of pigment-producing melanocytes.",
    recommendation: "Harmless. Standard observation. Retake screening scan if the mole edges or colors change.",
  },
  vasc: {
    name: "Vascular Lesions",
    tier: "yellow",
    explanation: "Harmless skin abnormalities containing blood vessels, such as cherry angiomas or localized pyogenic granulomas.",
    recommendation: "Monitor for unexpected bleeding or trauma. Seek clinical guidance if it gets irritated.",
  },
  
  // Extended classes
  scabies: {
    name: "Scabies Infestation",
    tier: "yellow",
    explanation: "Highly contagious skin infestation by microscopic itch mites. Spreads quickly through close contact.",
    recommendation: "Maintain strict personal hygiene. Wash clothes and bedding in hot water. Visit the PHC for Permethrin prescription.",
  },
  oscc: {
    name: "Oral Squamous Cell Carcinoma Risk",
    tier: "red",
    explanation: "Suspicious lesions on oral mucosal linings. Frequently associated with tobacco or betel nut usage.",
    recommendation: "IMMEDIATE URGENT CARE: Strict avoidance of all tobacco. An urgent appointment has been scheduled at the District Referral Hospital.",
  },
  conjunctivitis: {
    name: "Acute Conjunctivitis (Pink Eye)",
    tier: "yellow",
    explanation: "Inflammation or infection of the outer membrane of the eyeball. Highly contagious.",
    recommendation: "Do not touch or rub eyes. Wash hands frequently. Visit local health worker for antibiotic eye drops.",
  },
};

function normalizeClassLabel(label: string): string {
  const clean = label.toLowerCase().trim();
  
  if (clean.includes("melanoma")) return "mel";
  if (clean.includes("basal cell") || clean.includes("bcc")) return "bcc";
  if (clean.includes("actinic") || clean.includes("akiec")) return "akiec";
  if (clean.includes("seborrheic") || clean.includes("benign keratosis") || clean.includes("bkl")) return "bkl";
  if (clean.includes("dermatofibroma") || clean.includes("df")) return "df";
  if (clean.includes("scabies") || clean.includes("lyme") || clean.includes("infestation")) return "scabies";
  if (clean.includes("eczema") || clean.includes("dermatitis")) return "bkl"; // maps to green tier or custom
  if (clean.includes("conjunctivitis") || clean.includes("eye")) return "conjunctivitis";
  if (clean.includes("acne") || clean.includes("rosacea")) return "nv"; // normal / green
  if (clean.includes("nevi") || clean.includes("nevus") || clean.includes("mole")) return "nv";
  if (clean.includes("vascular")) return "vasc";
  if (clean.includes("fungal") || clean.includes("tinea") || clean.includes("ringworm")) return "scabies"; // yellow
  if (clean.includes("warts") || clean.includes("viral")) return "scabies"; // yellow
  if (clean.includes("urticaria") || clean.includes("hives")) return "scabies"; // yellow
  if (clean.includes("alopecia") || clean.includes("hair")) return "df"; // green / harmless
  
  return clean;
}

/**
 * P3 Result Interpreter Agent:
 * Translates machine-learning class labels (e.g. logits or class names) into clinical descriptions
 * and aligns them with Rural Vitals Score guidelines.
 */
export function interpretClassification(
  classLabel: string,
  confidence: number
): DiagnosticInterpretation {
  const normalizedLabel = normalizeClassLabel(classLabel);
  const entry = CONDITION_REGISTRY[normalizedLabel];

  if (!entry) {
    // Default fallback if label is unregistered
    return {
      conditionName: `Unspecified Condition (${classLabel})`,
      tier: "yellow",
      confidence,
      explanation: "The model detected visual anomalies, but the category could not be resolved locally.",
      recommendation: "Please schedule a standard routine checkup at the PHC or consult the local ASHA worker.",
    };
  }

  return {
    conditionName: entry.name,
    tier: entry.tier,
    confidence,
    explanation: entry.explanation,
    recommendation: entry.recommendation,
  };
}
