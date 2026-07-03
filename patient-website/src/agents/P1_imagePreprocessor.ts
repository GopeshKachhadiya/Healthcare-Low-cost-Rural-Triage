import { checkBlur, checkBrightness } from "../lib/imagePreprocess";

export interface QualityAssessment {
  isValid: boolean;
  blurScore: number;
  brightness: number;
  message: string;
}

/**
 * P1 Image Preprocessor Agent:
 * Evaluates image focus and exposure metrics to prevent uploading diagnostic scans with poor visual biomarkers.
 */
export async function assessImageQuality(imageSrc: string): Promise<QualityAssessment> {
  // Run brightness evaluation
  const brightnessResult = await checkBrightness(imageSrc);
  if (!brightnessResult.isGood) {
    return {
      isValid: false,
      blurScore: 100,
      brightness: brightnessResult.brightness,
      message: brightnessResult.message,
    };
  }

  // Run blur/focus evaluation
  const blurResult = await checkBlur(imageSrc);
  if (blurResult.isBlurry) {
    return {
      isValid: false,
      blurScore: blurResult.score,
      brightness: brightnessResult.brightness,
      message: blurResult.message,
    };
  }

  return {
    isValid: true,
    blurScore: blurResult.score,
    brightness: brightnessResult.brightness,
    message: "Image quality satisfies diagnostic visual requirements.",
  };
}
