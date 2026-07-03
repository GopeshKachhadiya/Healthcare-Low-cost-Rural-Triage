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
  "acne and rosacea photos": {
    name: "Acne and Rosacea",
    tier: "green",
    explanation: "Common inflammatory skin conditions causing pimples, redness, and visible blood vessels on the face.",
    recommendation: "Keep the face clean with a mild cleanser. Avoid squeezing spots. Consult a healthcare worker if severe.",
  },
  "actinic keratosis": {
    name: "Actinic Keratosis",
    tier: "orange",
    explanation: "Rough, scaly patches on the skin caused by years of sun exposure. Can sometimes progress to skin cancer.",
    recommendation: "Protect skin from direct sunlight. Apply sunscreen. Schedule a clinical review at the PHC.",
  },
  "actinic keratosis basal cell carcinoma and other malignant lesions": {
    name: "Malignant Skin Lesion Risk",
    tier: "red",
    explanation: "Highly suspicious scaly or ulcerative lesion indicating risk of carcinoma or malignancy.",
    recommendation: "IMMEDIATE REFERRAL: Seek immediate specialist evaluation at the District Referral Hospital.",
  },
  "atopic dermatitis photos": {
    name: "Atopic Dermatitis",
    tier: "yellow",
    explanation: "A chronic, itchy skin condition (eczema) common in individuals with allergies or sensitive skin.",
    recommendation: "Moisturize skin regularly. Avoid hot showers and known triggers. Consult a health worker for topical care.",
  },
  "basal cell carcinoma": {
    name: "Basal Cell Carcinoma",
    tier: "orange",
    explanation: "A slow-growing form of skin cancer that rarely spreads, but requires local surgical removal.",
    recommendation: "Schedule an appointment at the nearest CHC or referral facility for excision.",
  },
  "benign keratosis": {
    name: "Benign Keratosis",
    tier: "green",
    explanation: "Non-cancerous skin growths such as seborrheic keratosis, common in aging individuals.",
    recommendation: "Harmless. Routine monitoring. Avoid scratching or trying to peel it off.",
  },
  "bullous disease photos": {
    name: "Bullous Disease (Blistering)",
    tier: "orange",
    explanation: "Conditions causing fluid-filled blisters or bullae on the skin, which may be autoimmune or infectious.",
    recommendation: "Keep blisters clean and intact to prevent infection. Seek clinical evaluation.",
  },
  "cellulitis impetigo and other bacterial infections": {
    name: "Bacterial Skin Infection (Cellulitis/Impetigo)",
    tier: "orange",
    explanation: "Bacterial infections causing redness, swelling, heat, or crusting sores that can spread rapidly.",
    recommendation: "Seek clinical evaluation. Antibiotic treatment is typically required.",
  },
  "dermatofibroma": {
    name: "Dermatofibroma",
    tier: "green",
    explanation: "Harmless, firm, red-to-brown skin nodules that commonly develop on the legs.",
    recommendation: "No treatment necessary unless it becomes painful or undergoes rapid growth.",
  },
  "eczema photos": {
    name: "Eczema",
    tier: "yellow",
    explanation: "Skin inflammation causing dry, itchy, red, and cracked skin patches.",
    recommendation: "Wash with clean water, avoid harsh soaps, and apply coconut oil or emollient daily.",
  },
  "exanthems and drug eruptions": {
    name: "Drug Eruption / Exanthem",
    tier: "orange",
    explanation: "A skin reaction or rash triggered by an allergic response to a medication.",
    recommendation: "Consult a doctor immediately to review current medications. Do not stop prescribed drugs without advice.",
  },
  "hair loss photos alopecia and other hair diseases": {
    name: "Alopecia / Hair Condition",
    tier: "green",
    explanation: "Conditions leading to hair thinning, bald patches, or scalp flaking.",
    recommendation: "Maintain good scalp hygiene. Consult a primary care worker for localized treatment options.",
  },
  "herpes hpv and other stds photos": {
    name: "Viral Skin Condition (Herpes / HPV)",
    tier: "orange",
    explanation: "Viral skin lesions such as cold sores, shingles, or other localized viral growths.",
    recommendation: "Avoid close contact to prevent transmission. Keep the area clean and seek antiviral care if needed.",
  },
  "light diseases and disorders of pigmentation": {
    name: "Pigmentation / Light-sensitive Disorder",
    tier: "yellow",
    explanation: "Changes in skin color (hyperpigmentation/hypopigmentation) or abnormal sun/light sensitivity.",
    recommendation: "Apply sunscreen, wear protective clothing, and seek a routing checkup at the PHC.",
  },
  "lupus and other connective tissue diseases": {
    name: "Autoimmune Connective Tissue Condition",
    tier: "orange",
    explanation: "Skin manifestations associated with systemic autoimmune conditions like Lupus.",
    recommendation: "Avoid direct sun exposure. Seek comprehensive clinical evaluation at the CHC.",
  },
  "melanocytic nevi": {
    name: "Melanocytic Nevus (Normal Mole)",
    tier: "green",
    explanation: "A common benign mole composed of pigment-producing melanocytes.",
    recommendation: "Harmless. Standard observation. Retake scan if borders or colors change.",
  },
  "melanoma": {
    name: "Malignant Melanoma",
    tier: "red",
    explanation: "A serious type of skin cancer displaying asymmetry, irregular borders, and color variations.",
    recommendation: "IMMEDIATE URGENT REFERRAL: Please visit the District Referral Hospital immediately.",
  },
  "melanoma skin cancer nevi and moles": {
    name: "Melanoma / Suspicious Nevus Risk",
    tier: "red",
    explanation: "Highly suspicious pigmented lesion with high risk of melanoma malignancy.",
    recommendation: "IMMEDIATE URGENT REFERRAL: Visit the District Referral Hospital as soon as possible.",
  },
  "nail fungus and other nail disease": {
    name: "Nail Disease (Fungal / Onychomycosis)",
    tier: "yellow",
    explanation: "Fungal infections causing thick, brittle, or discolored fingernails or toenails.",
    recommendation: "Keep nails trimmed and dry. Apply antifungal treatment as recommended by a health worker.",
  },
  "poison ivy photos and other contact dermatitis": {
    name: "Contact Dermatitis (Allergic/Irritant)",
    tier: "yellow",
    explanation: "Skin inflammation caused by contact with a specific substance, allergen, or plant.",
    recommendation: "Identify and avoid the trigger substance. Apply cool compresses and soothing lotions.",
  },
  "psoriasis pictures lichen planus and related diseases": {
    name: "Psoriasis / Lichen Planus",
    tier: "yellow",
    explanation: "Chronic autoimmune skin conditions causing scaly, red patches or raised purple bumps.",
    recommendation: "Keep skin moisturized. Seek evaluation at the PHC for topical ointment options.",
  },
  "scabies lyme disease and other infestations and bites": {
    name: "Scabies / Infestation / Insect Bite",
    tier: "yellow",
    explanation: "Skin infestations caused by parasites (like scabies mites) or reactions to bites.",
    recommendation: "Maintain personal hygiene. Wash clothes in hot water. Visit the PHC for Permethrin treatment.",
  },
  "seborrheic keratoses and other benign tumors": {
    name: "Seborrheic Keratosis",
    tier: "green",
    explanation: "Common harmless skin growths that appear warty or wax-like.",
    recommendation: "Harmless. General routine observation. No treatment required.",
  },
  "systemic disease": {
    name: "Systemic Disease Skin Manifestation",
    tier: "orange",
    explanation: "Skin changes that are secondary to an underlying internal health condition.",
    recommendation: "Schedule a comprehensive evaluation at the clinic to assess overall systemic health.",
  },
  "tinea ringworm candidiasis and other fungal infections": {
    name: "Fungal Skin Infection (Ringworm / Tinea)",
    tier: "yellow",
    explanation: "Common fungal infections causing itchy, red, circular rashes on the body.",
    recommendation: "Keep the area dry. Apply over-the-counter antifungal cream daily. Avoid sharing towels.",
  },
  "urticaria hives": {
    name: "Urticaria (Hives)",
    tier: "yellow",
    explanation: "Sudden itchy welts on the skin, often caused by an allergic reaction.",
    recommendation: "Avoid known allergens. Take antihistamines as advised by a health worker.",
  },
  "vascular lesion": {
    name: "Vascular Lesion",
    tier: "yellow",
    explanation: "Abnormalities of the blood vessels, such as cherry angiomas or port-wine stains.",
    recommendation: "Monitor for bleeding. Consult a health worker if it becomes irritated or changes size.",
  },
  "vascular tumors": {
    name: "Vascular Tumor",
    tier: "orange",
    explanation: "Growths containing blood vessels that require diagnostic assessment.",
    recommendation: "Schedule a routine diagnostic review at the PHC or local clinic.",
  },
  "vasculitis photos": {
    name: "Vasculitis",
    tier: "orange",
    explanation: "Inflammation of the blood vessels causing purple or red spots on the skin.",
    recommendation: "Seek clinical evaluation to assess potential systemic vasculitis.",
  },
  "warts molluscum and other viral infections": {
    name: "Viral Infection (Warts / Molluscum)",
    tier: "yellow",
    explanation: "Benign skin growths caused by viral infections of the top skin layer.",
    recommendation: "Avoid picking at lesions. Keep clean. Consult a health worker for options.",
  },
  // Legacy / fallback mappings
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
  
  if (clean.includes("melanoma")) return "melanoma";
  if (clean.includes("basal cell") || clean.includes("bcc")) return "basal cell carcinoma";
  if (clean.includes("actinic") || clean.includes("akiec")) return "actinic keratosis";
  if (clean.includes("seborrheic") || clean.includes("benign keratosis") || clean.includes("bkl")) return "benign keratosis";
  if (clean.includes("dermatofibroma") || clean.includes("df")) return "dermatofibroma";
  if (clean.includes("scabies") || clean.includes("lyme") || clean.includes("infestation")) return "scabies lyme disease and other infestations and bites";
  if (clean.includes("eczema") || clean.includes("dermatitis")) return "eczema photos";
  if (clean.includes("conjunctivitis") || clean.includes("eye")) return "conjunctivitis";
  if (clean.includes("acne") || clean.includes("rosacea")) return "acne and rosacea photos";
  if (clean.includes("nevi") || clean.includes("nevus") || clean.includes("mole")) return "melanocytic nevi";
  if (clean.includes("vascular")) return "vascular lesion";
  if (clean.includes("fungal") || clean.includes("tinea") || clean.includes("ringworm")) return "tinea ringworm candidiasis and other fungal infections";
  if (clean.includes("warts") || clean.includes("viral")) return "warts molluscum and other viral infections";
  if (clean.includes("urticaria") || clean.includes("hives")) return "urticaria hives";
  if (clean.includes("alopecia") || clean.includes("hair")) return "hair loss photos alopecia and other hair diseases";
  
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
