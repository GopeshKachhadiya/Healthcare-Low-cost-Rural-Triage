/**
 * Image preprocessing and quality metrics (P1 on-device agents)
 */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Assesses average brightness of an image (0 to 255).
 * Flags under-exposure (too dark) or over-exposure (too bright).
 */
export async function checkBrightness(
  imageSrc: string
): Promise<{ brightness: number; isGood: boolean; message: string }> {
  try {
    const img = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not acquire 2D canvas context");
    }

    // Resize canvas down for faster pixel checking
    canvas.width = 100;
    canvas.height = 100;
    ctx.drawImage(img, 0, 0, 100, 100);

    const imgData = ctx.getImageData(0, 0, 100, 100);
    const data = imgData.data;
    let rSum = 0, gSum = 0, bSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
    }

    const numPixels = data.length / 4;
    const avgR = rSum / numPixels;
    const avgG = gSum / numPixels;
    const avgB = bSum / numPixels;

    // Standard relative luminance formula
    const brightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

    let isGood = true;
    let message = "Brightness level is optimal for clinical screening.";

    if (brightness < 45) {
      isGood = false;
      message = "Image is too dark. Please scan in a well-lit area or turn on your flash.";
    } else if (brightness > 220) {
      isGood = false;
      message = "Image has too much glare or overexposure. Avoid direct overhead lighting.";
    }

    return { brightness, isGood, message };
  } catch (error) {
    return { brightness: 128, isGood: true, message: "Could not analyze brightness; proceeding with default settings." };
  }
}

/**
 * Heuristic check for image blur using pixel variance across adjacent blocks.
 * Emulates the Laplacian variance algorithm client-side without loading OpenCV.js weights directly.
 */
export async function checkBlur(
  imageSrc: string
): Promise<{ score: number; isBlurry: boolean; message: string }> {
  try {
    const img = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not acquire canvas context");
    }

    canvas.width = 120;
    canvas.height = 120;
    ctx.drawImage(img, 0, 0, 120, 120);

    const imgData = ctx.getImageData(0, 0, 120, 120);
    const data = imgData.data;
    const width = 120;

    let totalVariance = 0;
    let count = 0;

    // Simple pixel-gradient variance estimator
    for (let y = 1; y < 119; y++) {
      for (let x = 1; x < 119; x++) {
        const idx = (y * width + x) * 4;
        
        // Luminance value of current pixel
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        // Luminance value of adjacent pixel
        const rightIdx = (y * width + (x + 1)) * 4;
        const lumRight = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];

        const diff = Math.abs(lum - lumRight);
        totalVariance += diff * diff;
        count++;
      }
    }

    const score = totalVariance / count;
    const isBlurry = score < 60; // Threshold score calibrated for blurry inputs
    const message = isBlurry
      ? "Image is blurry. Please hold your camera steady and retake the photo."
      : "Focus level is optimal for classification.";

    return { score, isBlurry, message };
  } catch (error) {
    return { score: 100, isBlurry: false, message: "Could not calculate focus; proceeding." };
  }
}
